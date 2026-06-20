-- Create merchants table for storing merchant information
CREATE TABLE public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  api_endpoint TEXT NOT NULL,
  api_key TEXT,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create merchant_products table for imported products
CREATE TABLE public.merchant_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  category TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(merchant_id, external_id)
);

-- Create cart table for buyer shopping cart
CREATE TABLE public.shopping_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.merchant_products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create orders table
CREATE TABLE public.merchant_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order items table
CREATE TABLE public.merchant_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.merchant_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.merchant_products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create merchant wallet/ledger table
CREATE TABLE public.merchant_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_sales NUMERIC(12,2) DEFAULT 0,
  total_commission_owed NUMERIC(12,2) DEFAULT 0,
  total_commission_paid NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_wallet ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchants
CREATE POLICY "Anyone can view active merchants" ON public.merchants
  FOR SELECT USING (is_active = true);

CREATE POLICY "Business users can create merchant profile" ON public.merchants
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_business_mode = true)
  );

CREATE POLICY "Merchants can update own profile" ON public.merchants
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for merchant_products
CREATE POLICY "Anyone can view available products" ON public.merchant_products
  FOR SELECT USING (is_available = true);

-- RLS Policies for shopping_cart
CREATE POLICY "Users can manage own cart" ON public.shopping_cart
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS Policies for merchant_orders
CREATE POLICY "Buyers can view own orders" ON public.merchant_orders
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Merchants can view their orders" ON public.merchant_orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM merchants WHERE id = merchant_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create orders" ON public.merchant_orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Merchants can update order status" ON public.merchant_orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM merchants WHERE id = merchant_id AND user_id = auth.uid())
  );

-- RLS Policies for merchant_order_items
CREATE POLICY "Users can view own order items" ON public.merchant_order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM merchant_orders WHERE id = order_id AND buyer_id = auth.uid())
  );

CREATE POLICY "Merchants can view their order items" ON public.merchant_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM merchant_orders o
      JOIN merchants m ON o.merchant_id = m.id
      WHERE o.id = order_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert order items" ON public.merchant_order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM merchant_orders WHERE id = order_id AND buyer_id = auth.uid())
  );

-- RLS Policies for merchant_wallet
CREATE POLICY "Merchants can view own wallet" ON public.merchant_wallet
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM merchants WHERE id = merchant_id AND user_id = auth.uid())
  );

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTR(gen_random_uuid()::text, 1, 6));
END;
$$;

-- Function to create order from cart
CREATE OR REPLACE FUNCTION public.create_order_from_cart(p_merchant_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_order_id UUID;
  v_order_number TEXT;
  v_total NUMERIC(10,2) := 0;
  v_commission NUMERIC(10,2);
  v_commission_rate NUMERIC(5,2);
  v_cart_item RECORD;
BEGIN
  -- Get commission rate
  SELECT commission_rate INTO v_commission_rate
  FROM merchants WHERE id = p_merchant_id;
  
  IF v_commission_rate IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Merchant not found');
  END IF;
  
  -- Calculate total from cart
  SELECT COALESCE(SUM(sc.quantity * mp.price), 0) INTO v_total
  FROM shopping_cart sc
  JOIN merchant_products mp ON sc.product_id = mp.id
  WHERE sc.user_id = v_user_id AND mp.merchant_id = p_merchant_id;
  
  IF v_total = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cart is empty');
  END IF;
  
  -- Calculate commission
  v_commission := v_total * (v_commission_rate / 100);
  
  -- Generate order number
  v_order_number := generate_order_number();
  
  -- Create order
  INSERT INTO merchant_orders (order_number, buyer_id, merchant_id, total_amount, commission_amount, commission_rate)
  VALUES (v_order_number, v_user_id, p_merchant_id, v_total, v_commission, v_commission_rate)
  RETURNING id INTO v_order_id;
  
  -- Create order items
  INSERT INTO merchant_order_items (order_id, product_id, product_name, product_price, quantity, subtotal)
  SELECT v_order_id, mp.id, mp.name, mp.price, sc.quantity, (sc.quantity * mp.price)
  FROM shopping_cart sc
  JOIN merchant_products mp ON sc.product_id = mp.id
  WHERE sc.user_id = v_user_id AND mp.merchant_id = p_merchant_id;
  
  -- Clear cart for this merchant's products
  DELETE FROM shopping_cart
  WHERE user_id = v_user_id AND product_id IN (
    SELECT id FROM merchant_products WHERE merchant_id = p_merchant_id
  );
  
  -- Update merchant wallet
  INSERT INTO merchant_wallet (merchant_id, total_sales, total_commission_owed)
  VALUES (p_merchant_id, v_total, v_commission)
  ON CONFLICT (merchant_id) DO UPDATE
  SET total_sales = merchant_wallet.total_sales + v_total,
      total_commission_owed = merchant_wallet.total_commission_owed + v_commission,
      updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_total,
    'commission_amount', v_commission
  );
END;
$$;