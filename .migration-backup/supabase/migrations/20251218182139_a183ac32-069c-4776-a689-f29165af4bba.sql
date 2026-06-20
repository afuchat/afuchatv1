-- Clean up remaining orphaned data with correct column names
DO $$
BEGIN
  -- posts (uses author_id)
  BEGIN
    DELETE FROM public.posts WHERE author_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- post_replies (uses author_id)
  BEGIN
    DELETE FROM public.post_replies WHERE author_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- post_acknowledgments
  BEGIN
    DELETE FROM public.post_acknowledgments WHERE user_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- push_subscriptions
  BEGIN
    DELETE FROM public.push_subscriptions WHERE user_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- red_envelopes
  BEGIN
    DELETE FROM public.red_envelopes WHERE sender_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- shopping_cart
  BEGIN
    DELETE FROM public.shopping_cart WHERE user_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- stories
  BEGIN
    DELETE FROM public.stories WHERE user_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- tips (uses sender_id)
  BEGIN
    DELETE FROM public.tips WHERE sender_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- typing_indicators
  BEGIN
    DELETE FROM public.typing_indicators WHERE user_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- user_achievements
  BEGIN
    DELETE FROM public.user_achievements WHERE user_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- user_gifts
  BEGIN
    DELETE FROM public.user_gifts WHERE user_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- user_subscriptions
  BEGIN
    DELETE FROM public.user_subscriptions WHERE user_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- security_alerts
  BEGIN
    DELETE FROM public.security_alerts WHERE user_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- telegram_users
  BEGIN
    DELETE FROM public.telegram_users WHERE user_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
  
  -- message_reports
  BEGIN
    DELETE FROM public.message_reports WHERE reporter_id NOT IN (SELECT id FROM public.profiles);
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
  END;
END $$;