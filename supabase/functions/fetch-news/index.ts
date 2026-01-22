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

    // Build the API URL for top headlines
    const url = new URL('https://newsapi.org/v2/top-headlines');
    url.searchParams.set('apiKey', apiKey);
    url.searchParams.set('category', category);
    url.searchParams.set('country', country);
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('page', String(page));

    console.log('Fetching news for category:', category, 'page:', page);

    const response = await fetch(url.toString());
    const data: NewsAPIResponse = await response.json();

    if (!response.ok || data.status !== 'ok') {
      console.error('News API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch news' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the articles for the frontend
    const articles = data.articles
      .filter(article => article.title && article.title !== '[Removed]')
      .map((article, index) => ({
        id: `news-${index}-${Date.now()}`,
        title: article.title,
        description: article.description || '',
        url: article.url,
        source: article.source.name || 'News',
        image: article.urlToImage,
        publishedAt: article.publishedAt,
        author: article.author,
      }));

    console.log(`Fetched ${articles.length} articles for page ${page}`);

    const totalPages = Math.ceil(data.totalResults / pageSize);
    const hasMore = page < totalPages && articles.length > 0;

    return new Response(
      JSON.stringify({ success: true, articles, hasMore, totalResults: data.totalResults }),
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
