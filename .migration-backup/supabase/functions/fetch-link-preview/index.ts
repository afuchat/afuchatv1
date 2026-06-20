import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate URL to prevent SSRF attacks
function validateUrl(urlString: string): { valid: boolean; error?: string; url?: URL } {
  try {
    const url = new URL(urlString);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
    
    const hostname = url.hostname.toLowerCase();
    
    // Block localhost and common localhost aliases
    const localhostPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
    ];
    
    if (localhostPatterns.includes(hostname)) {
      return { valid: false, error: 'Localhost URLs are not allowed' };
    }
    
    // Block private IP ranges
    const privateIpPatterns = [
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,           // 10.0.0.0/8
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
      /^192\.168\.\d{1,3}\.\d{1,3}$/,              // 192.168.0.0/16
      /^169\.254\.\d{1,3}\.\d{1,3}$/,              // 169.254.0.0/16 (link-local)
      /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/, // 100.64.0.0/10 (CGNAT)
    ];
    
    if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
      return { valid: false, error: 'Private network URLs are not allowed' };
    }
    
    // Block cloud metadata endpoints
    const metadataPatterns = [
      /^169\.254\.169\.254$/,                      // AWS/GCP metadata
      /^metadata\.google\.internal$/,              // GCP metadata
      /^metadata$/,                                // Azure metadata
    ];
    
    if (metadataPatterns.some(pattern => pattern.test(hostname))) {
      return { valid: false, error: 'Metadata endpoints are not allowed' };
    }
    
    // Block internal domains
    const internalDomains = [
      '.local',
      '.internal',
      '.corp',
      '.home',
      '.lan',
    ];
    
    if (internalDomains.some(domain => hostname.endsWith(domain))) {
      return { valid: false, error: 'Internal domain URLs are not allowed' };
    }
    
    return { valid: true, url };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL to prevent SSRF
    const validation = validateUrl(url);
    if (!validation.valid) {
      console.log('URL validation failed:', url, validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the URL with timeout to prevent resource exhaustion
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error('Failed to fetch URL');
      }

      // Limit response size to prevent memory exhaustion (5MB max)
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
        throw new Error('Response too large');
      }

      const html = await response.text();
      
      // Limit HTML processing to first 500KB
      const truncatedHtml = html.substring(0, 500 * 1024);
      
      // Extract Open Graph and meta tags
      const getMetaContent = (name: string, property: string = name): string | null => {
        const metaRegex = new RegExp(`<meta[^>]*(?:name|property)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
        const match = truncatedHtml.match(metaRegex);
        return match ? match[1] : null;
      };

      const title = 
        getMetaContent('og:title') || 
        getMetaContent('twitter:title') ||
        truncatedHtml.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
        '';

      const description = 
        getMetaContent('og:description') ||
        getMetaContent('twitter:description') ||
        getMetaContent('description') ||
        '';

      const imageUrl = 
        getMetaContent('og:image') ||
        getMetaContent('twitter:image') ||
        '';

      const siteName = 
        getMetaContent('og:site_name') ||
        validation.url!.hostname;

      return new Response(
        JSON.stringify({
          url,
          title: title.substring(0, 200),
          description: description.substring(0, 500),
          image_url: imageUrl,
          site_name: siteName,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (fetchError) {
      clearTimeout(timeout);
      throw fetchError;
    }
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Failed to fetch link preview' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
