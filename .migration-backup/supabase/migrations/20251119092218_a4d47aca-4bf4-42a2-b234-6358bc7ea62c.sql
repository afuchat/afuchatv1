-- Fix remaining functions with mutable search_path
-- Functions identified by linter that still need fixing

ALTER FUNCTION public.approve_affiliate_by_business(uuid, numeric, text) SET search_path = public;
ALTER FUNCTION public.check_and_unlock_accessories(uuid) SET search_path = public;
ALTER FUNCTION public.create_marketplace_listing(uuid, integer, uuid) SET search_path = public;
ALTER FUNCTION public.create_new_chat(uuid) SET search_path = public;
ALTER FUNCTION public.finalize_auction(uuid) SET search_path = public;
ALTER FUNCTION public.get_or_create_chat(uuid) SET search_path = public;
ALTER FUNCTION public.get_trending_topics(integer, integer) SET search_path = public;
ALTER FUNCTION public.handle_new_profile_avatar() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.mark_notifications_as_read() SET search_path = public;
ALTER FUNCTION public.place_bid(uuid, integer) SET search_path = public;
ALTER FUNCTION public.process_referral_reward(text, uuid) SET search_path = public;
ALTER FUNCTION public.purchase_marketplace_item(uuid) SET search_path = public;
ALTER FUNCTION public.purchase_shop_item(uuid) SET search_path = public;
ALTER FUNCTION public.reject_affiliate_by_business(uuid, text) SET search_path = public;
ALTER FUNCTION public.rotate_featured_items() SET search_path = public;
ALTER FUNCTION public.send_message(uuid, text) SET search_path = public;
ALTER FUNCTION public.send_tip(uuid, integer, uuid, text) SET search_path = public;
ALTER FUNCTION public.set_chat_creator() SET search_path = public;
ALTER FUNCTION public.tip_post_author(uuid, integer, uuid, text) SET search_path = public;