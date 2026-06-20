-- Create shop_items table for purchasable cosmetics
CREATE TABLE IF NOT EXISTS public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('accessory', 'theme', 'effect', 'badge')),
  xp_cost INTEGER NOT NULL,
  emoji TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_shop_purchases table to track purchases
CREATE TABLE IF NOT EXISTS public.user_shop_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  xp_paid INTEGER NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, shop_item_id)
);

-- Create tips table for tracking XP tips
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_shop_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shop_items
CREATE POLICY "Anyone can view available shop items"
  ON public.shop_items FOR SELECT
  USING (is_available = true);

-- RLS Policies for user_shop_purchases
CREATE POLICY "Users can view their own purchases"
  ON public.user_shop_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
  ON public.user_shop_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tips
CREATE POLICY "Anyone can view tips"
  ON public.tips FOR SELECT
  USING (true);

CREATE POLICY "Users can send tips"
  ON public.tips FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Function to purchase shop item
CREATE OR REPLACE FUNCTION public.purchase_shop_item(
  p_shop_item_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_xp INTEGER;
  v_item_cost INTEGER;
  v_new_xp INTEGER;
  v_new_grade TEXT;
  v_item_name TEXT;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Check if item exists and is available
  SELECT xp_cost, name INTO v_item_cost, v_item_name
  FROM public.shop_items
  WHERE id = p_shop_item_id AND is_available = true;

  IF v_item_cost IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Item not found or unavailable'
    );
  END IF;

  -- Check if user already owns this item
  IF EXISTS (
    SELECT 1 FROM public.user_shop_purchases
    WHERE user_id = v_user_id AND shop_item_id = p_shop_item_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already own this item'
    );
  END IF;

  -- Get user's current XP
  SELECT xp INTO v_user_xp
  FROM public.profiles
  WHERE id = v_user_id;

  -- Check if user has enough XP
  IF v_user_xp < v_item_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient XP',
      'required_xp', v_item_cost,
      'current_xp', v_user_xp
    );
  END IF;

  -- Deduct XP and calculate new grade
  v_new_xp := v_user_xp - v_item_cost;
  v_new_grade := calculate_grade(v_new_xp);

  -- Update user XP and grade
  UPDATE public.profiles
  SET xp = v_new_xp, current_grade = v_new_grade
  WHERE id = v_user_id;

  -- Record purchase
  INSERT INTO public.user_shop_purchases (user_id, shop_item_id, xp_paid)
  VALUES (v_user_id, p_shop_item_id, v_item_cost);

  -- Log activity
  INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (v_user_id, 'shop_purchase', -v_item_cost, jsonb_build_object('item_id', p_shop_item_id, 'item_name', v_item_name));

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Purchase successful!',
    'xp_paid', v_item_cost,
    'new_xp', v_new_xp,
    'new_grade', v_new_grade
  );
END;
$$;

-- Function to send tip
CREATE OR REPLACE FUNCTION public.send_tip(
  p_receiver_id UUID,
  p_xp_amount INTEGER,
  p_post_id UUID DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id UUID := auth.uid();
  v_sender_xp INTEGER;
  v_new_sender_xp INTEGER;
  v_new_receiver_xp INTEGER;
  v_sender_grade TEXT;
  v_receiver_grade TEXT;
BEGIN
  -- Check if user is authenticated
  IF v_sender_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Authentication required'
    );
  END IF;

  -- Can't tip yourself
  IF v_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Cannot tip yourself'
    );
  END IF;

  -- Validate amount
  IF p_xp_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Tip amount must be greater than 0'
    );
  END IF;

  -- Get sender's current XP
  SELECT xp INTO v_sender_xp
  FROM public.profiles
  WHERE id = v_sender_id;

  -- Check if sender has enough XP
  IF v_sender_xp < p_xp_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Insufficient XP to send tip',
      'required_xp', p_xp_amount,
      'current_xp', v_sender_xp
    );
  END IF;

  -- Calculate new XP values
  v_new_sender_xp := v_sender_xp - p_xp_amount;
  v_sender_grade := calculate_grade(v_new_sender_xp);

  -- Deduct XP from sender
  UPDATE public.profiles
  SET xp = v_new_sender_xp, current_grade = v_sender_grade
  WHERE id = v_sender_id;

  -- Add XP to receiver
  UPDATE public.profiles
  SET xp = xp + p_xp_amount
  WHERE id = p_receiver_id
  RETURNING xp, current_grade INTO v_new_receiver_xp, v_receiver_grade;

  -- Recalculate receiver's grade
  v_receiver_grade := calculate_grade(v_new_receiver_xp);
  UPDATE public.profiles
  SET current_grade = v_receiver_grade
  WHERE id = p_receiver_id;

  -- Record tip
  INSERT INTO public.tips (sender_id, receiver_id, post_id, xp_amount, message)
  VALUES (v_sender_id, p_receiver_id, p_post_id, p_xp_amount, p_message);

  -- Log activity for sender
  INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (v_sender_id, 'tip_sent', -p_xp_amount, jsonb_build_object('receiver_id', p_receiver_id, 'post_id', p_post_id));

  -- Log activity for receiver
  INSERT INTO public.user_activity_log (user_id, action_type, xp_earned, metadata)
  VALUES (p_receiver_id, 'tip_received', p_xp_amount, jsonb_build_object('sender_id', v_sender_id, 'post_id', p_post_id));

  -- Create notification for receiver
  INSERT INTO public.notifications (user_id, actor_id, type, post_id)
  VALUES (p_receiver_id, v_sender_id, 'gift', p_post_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Tip sent successfully!',
    'xp_amount', p_xp_amount,
    'new_sender_xp', v_new_sender_xp,
    'sender_grade', v_sender_grade
  );
END;
$$;