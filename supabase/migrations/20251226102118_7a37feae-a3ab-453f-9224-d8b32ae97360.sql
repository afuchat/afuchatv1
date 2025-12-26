-- Functions to fetch aggregate counts for many posts without exposing user IDs

CREATE OR REPLACE FUNCTION public.get_post_like_counts(post_ids uuid[])
RETURNS TABLE (post_id uuid, like_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa.post_id, COUNT(*)::bigint AS like_count
  FROM public.post_acknowledgments pa
  WHERE pa.post_id = ANY (post_ids)
  GROUP BY pa.post_id;
$$;

REVOKE ALL ON FUNCTION public.get_post_like_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_post_like_counts(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_post_reply_counts(post_ids uuid[])
RETURNS TABLE (post_id uuid, reply_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.post_id, COUNT(*)::bigint AS reply_count
  FROM public.post_replies pr
  WHERE pr.post_id = ANY (post_ids)
  GROUP BY pr.post_id;
$$;

REVOKE ALL ON FUNCTION public.get_post_reply_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_post_reply_counts(uuid[]) TO anon, authenticated;
