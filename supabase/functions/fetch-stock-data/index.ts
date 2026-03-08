import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Stock symbols to fetch
const STOCK_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM'];

// Index ETFs as proxies for market indices
const INDEX_SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'DIA', name: 'Dow Jones' },
  { symbol: 'QQQ', name: 'NASDAQ' },
  { symbol: 'IWM', name: 'Russell 2000' },
];

interface StockQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High
  l: number;  // Low
  o: number;  // Open
  pc: number; // Previous close
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FINNHUB_API_KEY');
    if (!apiKey) {
      throw new Error('Finnhub API key not configured');
    }

    const allSymbols = [...STOCK_SYMBOLS, ...INDEX_SYMBOLS.map(i => i.symbol)];

    // Fetch quotes for all symbols in parallel
    const quotePromises = allSymbols.map(async (symbol) => {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`
      );

      if (!response.ok) {
        console.error(`Failed to fetch ${symbol}:`, response.status);
        return null;
      }

      const data: StockQuote = await response.json();
      
      if (data.c === 0 && data.pc === 0) {
        console.log(`No data for ${symbol}`);
        return null;
      }

      return {
        symbol,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
      };
    });

    const results = await Promise.all(quotePromises);
    const allQuotes = results.filter(Boolean);

    const stocks = allQuotes.filter(q => q && STOCK_SYMBOLS.includes(q.symbol));
    const indices = allQuotes
      .filter(q => q && INDEX_SYMBOLS.some(i => i.symbol === q!.symbol))
      .map(q => {
        const indexInfo = INDEX_SYMBOLS.find(i => i.symbol === q!.symbol);
        return {
          ...q,
          indexName: indexInfo?.name || q!.symbol,
        };
      });

    console.log(`Fetched ${stocks.length} stocks, ${indices.length} indices`);

    return new Response(
      JSON.stringify({
        success: true,
        stocks,
        indices,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching stock data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock data';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
