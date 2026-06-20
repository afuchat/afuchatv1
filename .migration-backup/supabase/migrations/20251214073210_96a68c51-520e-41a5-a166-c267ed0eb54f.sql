-- Create ad campaigns table
CREATE TABLE public.ad_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad_type text NOT NULL CHECK (ad_type IN ('promoted_post', 'sponsored_product', 'custom_ad')),
  placement text NOT NULL DEFAULT 'all' CHECK (placement IN ('feed', 'search', 'featured', 'all')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'rejected')),
  
  -- Content fields
  title text,
  content text,
  image_url text,
  target_url text,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.merchant_products(id) ON DELETE SET NULL,
  
  -- Budget and pricing
  daily_budget integer NOT NULL DEFAULT 0,
  total_spent integer NOT NULL DEFAULT 0,
  
  -- Metrics
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  
  -- Dates
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ad impressions log table
CREATE TABLE public.ad_impressions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  placement text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ad clicks log table
CREATE TABLE public.ad_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  clicker_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  placement text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_campaigns
CREATE POLICY "Users can view active ads"
  ON public.ad_campaigns FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can view their own ads"
  ON public.ad_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ads"
  ON public.ad_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ads"
  ON public.ad_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ads"
  ON public.ad_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for ad_impressions
CREATE POLICY "Service can insert impressions"
  ON public.ad_impressions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Ad owners can view their impressions"
  ON public.ad_impressions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ad_campaigns
    WHERE ad_campaigns.id = ad_impressions.ad_id
    AND ad_campaigns.user_id = auth.uid()
  ));

-- RLS Policies for ad_clicks
CREATE POLICY "Service can insert clicks"
  ON public.ad_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Ad owners can view their clicks"
  ON public.ad_clicks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ad_campaigns
    WHERE ad_campaigns.id = ad_clicks.ad_id
    AND ad_campaigns.user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_ad_campaigns_status ON public.ad_campaigns(status);
CREATE INDEX idx_ad_campaigns_user_id ON public.ad_campaigns(user_id);
CREATE INDEX idx_ad_campaigns_placement ON public.ad_campaigns(placement);
CREATE INDEX idx_ad_impressions_ad_id ON public.ad_impressions(ad_id);
CREATE INDEX idx_ad_clicks_ad_id ON public.ad_clicks(ad_id);

-- Function to create ad campaign with ACoin payment
CREATE OR REPLACE FUNCTION public.create_ad_campaign(
  p_ad_type text,
  p_placement text,
  p_daily_budget integer,
  p_title text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_image_url text DEFAULT NULL,
  p_target_url text DEFAULT NULL,
  p_post_id uuid DEFAULT NULL,
  p_product_id uuid DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_acoin INTEGER;
  v_campaign_id UUID;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  -- Validate daily budget (minimum 10 ACoin)
  IF p_daily_budget < 10 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Minimum daily budget is 10 ACoin');
  END IF;

  -- Get user's ACoin balance
  SELECT acoin INTO v_user_acoin
  FROM public.profiles
  WHERE id = v_user_id;

  -- Check if user has enough ACoin for at least 1 day
  IF v_user_acoin < p_daily_budget THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Insufficient ACoin balance',
      'required', p_daily_budget,
      'current', v_user_acoin
    );
  END IF;

  -- Create the campaign
  INSERT INTO public.ad_campaigns (
    user_id, ad_type, placement, daily_budget, title, content, 
    image_url, target_url, post_id, product_id, end_date, status
  ) VALUES (
    v_user_id, p_ad_type, p_placement, p_daily_budget, p_title, p_content,
    p_image_url, p_target_url, p_post_id, p_product_id, p_end_date, 'active'
  )
  RETURNING id INTO v_campaign_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ad campaign created successfully!',
    'campaign_id', v_campaign_id
  );
END;
$$;

-- Function to charge daily budget (called by cron job)
CREATE OR REPLACE FUNCTION public.charge_ad_daily_budgets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_charged_count INTEGER := 0;
  v_user_acoin INTEGER;
BEGIN
  FOR v_campaign IN 
    SELECT ac.*, p.acoin 
    FROM public.ad_campaigns ac
    JOIN public.profiles p ON ac.user_id = p.id
    WHERE ac.status = 'active'
    AND (ac.end_date IS NULL OR ac.end_date > now())
  LOOP
    -- Check if user has enough ACoin
    IF v_campaign.acoin >= v_campaign.daily_budget THEN
      -- Deduct daily budget
      UPDATE public.profiles
      SET acoin = acoin - v_campaign.daily_budget
      WHERE id = v_campaign.user_id;
      
      -- Update total spent
      UPDATE public.ad_campaigns
      SET total_spent = total_spent + v_campaign.daily_budget,
          updated_at = now()
      WHERE id = v_campaign.id;
      
      -- Log transaction
      INSERT INTO public.acoin_transactions (user_id, amount, transaction_type, metadata)
      VALUES (v_campaign.user_id, -v_campaign.daily_budget, 'ad_spend', 
        jsonb_build_object('campaign_id', v_campaign.id));
      
      v_charged_count := v_charged_count + 1;
    ELSE
      -- Pause campaign due to insufficient funds
      UPDATE public.ad_campaigns
      SET status = 'paused',
          updated_at = now()
      WHERE id = v_campaign.id;
    END IF;
  END LOOP;
  
  RETURN v_charged_count;
END;
$$;

-- Function to record ad impression
CREATE OR REPLACE FUNCTION public.record_ad_impression(p_ad_id uuid, p_placement text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert impression record
  INSERT INTO public.ad_impressions (ad_id, viewer_id, placement)
  VALUES (p_ad_id, auth.uid(), p_placement);
  
  -- Update impression count
  UPDATE public.ad_campaigns
  SET impressions = impressions + 1
  WHERE id = p_ad_id;
END;
$$;

-- Function to record ad click
CREATE OR REPLACE FUNCTION public.record_ad_click(p_ad_id uuid, p_placement text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert click record
  INSERT INTO public.ad_clicks (ad_id, clicker_id, placement)
  VALUES (p_ad_id, auth.uid(), p_placement);
  
  -- Update click count
  UPDATE public.ad_campaigns
  SET clicks = clicks + 1
  WHERE id = p_ad_id;
END;
$$;

-- Function to get random ads for placement
CREATE OR REPLACE FUNCTION public.get_ads_for_placement(p_placement text, p_limit integer DEFAULT 3)
RETURNS TABLE(
  id uuid,
  ad_type text,
  title text,
  content text,
  image_url text,
  target_url text,
  post_id uuid,
  product_id uuid,
  user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ac.id, ac.ad_type, ac.title, ac.content, ac.image_url, 
    ac.target_url, ac.post_id, ac.product_id, ac.user_id
  FROM public.ad_campaigns ac
  WHERE ac.status = 'active'
    AND (ac.placement = p_placement OR ac.placement = 'all')
    AND (ac.end_date IS NULL OR ac.end_date > now())
    AND ac.user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000')
  ORDER BY random()
  LIMIT p_limit;
$$;