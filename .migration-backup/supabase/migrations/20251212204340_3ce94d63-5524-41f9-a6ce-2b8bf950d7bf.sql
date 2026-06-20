-- Update get_gift_price function to use last_sale_price when available
CREATE OR REPLACE FUNCTION public.get_gift_price(p_gift_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_cost INTEGER;
  v_last_sale_price INTEGER;
  v_final_price INTEGER;
BEGIN
  SELECT g.base_xp_cost, gs.last_sale_price
  INTO v_base_cost, v_last_sale_price
  FROM public.gifts g
  LEFT JOIN public.gift_statistics gs ON gs.gift_id = g.id
  WHERE g.id = p_gift_id;
  
  -- Use last_sale_price if available, otherwise use base_xp_cost
  v_final_price := COALESCE(v_last_sale_price, v_base_cost);
  
  RETURN v_final_price;
END;
$$;