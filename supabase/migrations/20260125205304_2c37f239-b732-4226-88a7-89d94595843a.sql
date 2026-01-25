-- Clear existing AI summaries so they can regenerate fresh
UPDATE blog_articles SET ai_summary = NULL WHERE ai_summary IS NOT NULL;