const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NewsArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category = 'general', country = 'us', pageSize = 10, page = 1 } = await req.json();

    const apiKey = Deno.env.get('NEWS_API_KEY');
    if (!apiKey) {
      console.error('NEWS_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'News API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching news for category:', category, 'page:', page);

    // Fetch from top headlines for latest news
    const topHeadlinesUrl = new URL('https://newsapi.org/v2/top-headlines');
    topHeadlinesUrl.searchParams.set('apiKey', apiKey);
    topHeadlinesUrl.searchParams.set('category', category);
    topHeadlinesUrl.searchParams.set('country', country);
    topHeadlinesUrl.searchParams.set('pageSize', String(Math.ceil(pageSize / 2)));
    topHeadlinesUrl.searchParams.set('page', String(page));

    // Fetch from everything endpoint for older news (1-2 days ago)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const everythingUrl = new URL('https://newsapi.org/v2/everything');
    everythingUrl.searchParams.set('apiKey', apiKey);
    everythingUrl.searchParams.set('q', category === 'general' ? 'news' : category);
    everythingUrl.searchParams.set('language', 'en');
    everythingUrl.searchParams.set('from', twoDaysAgo.toISOString().split('T')[0]);
    everythingUrl.searchParams.set('to', yesterday.toISOString().split('T')[0]);
    everythingUrl.searchParams.set('sortBy', 'publishedAt');
    everythingUrl.searchParams.set('pageSize', String(Math.ceil(pageSize / 2)));
    everythingUrl.searchParams.set('page', String(page));

    const [topResponse, everythingResponse] = await Promise.all([
      fetch(topHeadlinesUrl.toString()),
      fetch(everythingUrl.toString())
    ]);

    const topData: NewsAPIResponse = await topResponse.json();
    const everythingData: NewsAPIResponse = await everythingResponse.json();

    // Combine and format articles
    const allArticles: NewsArticle[] = [];
    
    if (topResponse.ok && topData.status === 'ok') {
      allArticles.push(...topData.articles);
    }
    
    if (everythingResponse.ok && everythingData.status === 'ok') {
      allArticles.push(...everythingData.articles);
    }

    if (allArticles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No news found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Shuffle to mix latest with older articles
    const shuffled = allArticles.sort(() => Math.random() - 0.5);

    // Format the articles for the frontend
    const articles = shuffled
      .filter(article => article.title && article.title !== '[Removed]')
      .map((article, index) => ({
        id: `news-${page}-${index}-${Date.now()}`,
        title: article.title,
        description: article.description || '',
        url: article.url,
        source: article.source.name || 'News',
        image: article.urlToImage,
        publishedAt: article.publishedAt,
        author: article.author,
      }));

    console.log(`Fetched ${articles.length} mixed articles for page ${page}`);

    const totalResults = (topData.totalResults || 0) + (everythingData.totalResults || 0);
    const hasMore = articles.length >= pageSize / 2;

    return new Response(
      JSON.stringify({ success: true, articles, hasMore, totalResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching news:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch news';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
