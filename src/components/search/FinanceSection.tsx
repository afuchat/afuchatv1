import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, BarChart2, MapPin, RefreshCw, Clock, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrencyForCountry } from '@/lib/currencyUtils';

interface CurrencyRate {
  symbol: string;
  name: string;
  rate: number;
  flag?: string;
  isLocal?: boolean;
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface IndexData {
  symbol: string;
  indexName: string;
  price: number;
  change: number;
  changePercent: number;
}

const stockNames: Record<string, string> = {
  AAPL: 'Apple Inc.',
  GOOGL: 'Alphabet Inc.',
  MSFT: 'Microsoft Corp.',
  AMZN: 'Amazon.com',
  TSLA: 'Tesla Inc.',
  META: 'Meta Platforms',
  NVDA: 'NVIDIA Corp.',
  JPM: 'JPMorgan Chase',
};

const currencyFlags: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", CHF: "🇨🇭",
  AUD: "🇦🇺", CAD: "🇨🇦", CNY: "🇨🇳", INR: "🇮🇳", KES: "🇰🇪",
  UGX: "🇺🇬", TZS: "🇹🇿", RWF: "🇷🇼", NGN: "🇳🇬", ZAR: "🇿🇦",
  GHS: "🇬🇭", EGP: "🇪🇬", AED: "🇦🇪", SAR: "🇸🇦", PKR: "🇵🇰",
  BDT: "🇧🇩", IDR: "🇮🇩", MYR: "🇲🇾", SGD: "🇸🇬", THB: "🇹🇭",
  PHP: "🇵🇭", VND: "🇻🇳", KRW: "🇰🇷", BRL: "🇧🇷", MXN: "🇲🇽",
  TRY: "🇹🇷", RUB: "🇷🇺", PLN: "🇵🇱", SEK: "🇸🇪", NOK: "🇳🇴",
  NZD: "🇳🇿", HKD: "🇭🇰",
};

const currencyNames: Record<string, string> = {
  USD: "US Dollar", EUR: "Euro", GBP: "British Pound", JPY: "Japanese Yen",
  CHF: "Swiss Franc", AUD: "Australian Dollar", CAD: "Canadian Dollar",
  CNY: "Chinese Yuan", INR: "Indian Rupee", KES: "Kenyan Shilling",
  UGX: "Ugandan Shilling", TZS: "Tanzanian Shilling", RWF: "Rwandan Franc",
  NGN: "Nigerian Naira", ZAR: "South African Rand", GHS: "Ghanaian Cedi",
  EGP: "Egyptian Pound", AED: "UAE Dirham", SAR: "Saudi Riyal",
  PKR: "Pakistani Rupee", BDT: "Bangladeshi Taka", IDR: "Indonesian Rupiah",
  MYR: "Malaysian Ringgit", SGD: "Singapore Dollar", THB: "Thai Baht",
  PHP: "Philippine Peso", VND: "Vietnamese Dong", KRW: "South Korean Won",
  BRL: "Brazilian Real", MXN: "Mexican Peso", TRY: "Turkish Lira",
  NZD: "New Zealand Dollar", HKD: "Hong Kong Dollar",
};

const majorCurrencies = ["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "AUD", "CAD"];
const africanCurrencies = ["KES", "UGX", "TZS", "NGN", "ZAR", "GHS", "EGP"];
const asianCurrencies = ["INR", "PKR", "IDR", "MYR", "SGD", "THB", "PHP", "KRW"];
const europeanCurrencies = ["PLN", "TRY", "SEK", "NOK"];

const africanCountries = ["Uganda", "Kenya", "Tanzania", "Rwanda", "Nigeria", "Ghana", "South Africa", "Egypt", "Ethiopia"];
const asianCountries = ["India", "Pakistan", "Bangladesh", "Indonesia", "Malaysia", "Singapore", "Thailand", "Philippines", "Vietnam", "South Korea"];
const europeanCountries = ["Germany", "France", "Italy", "Spain", "Poland", "Turkey", "Russia", "Ukraine", "Sweden", "Norway"];

interface CurrencyTickerProps {
  rates: CurrencyRate[];
  isLoading: boolean;
}

const CurrencyTicker = ({ rates, isLoading }: CurrencyTickerProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (isLoading || rates.length === 0) {
    return (
      <div className="flex gap-3 py-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-28 rounded-lg shrink-0" />
        ))}
      </div>
    );
  }

  const duplicatedRates = [...rates, ...rates];

  return (
    <div 
      className="relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <motion.div
        ref={containerRef}
        className="flex gap-3 py-2"
        animate={{
          x: isPaused ? undefined : [0, -140 * rates.length],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: rates.length * 2.5,
            ease: "linear",
          },
        }}
        style={{ x: isPaused ? undefined : 0 }}
      >
        {duplicatedRates.map((rate, index) => (
          <div 
            key={`${rate.symbol}-${index}`}
            className={`flex items-center gap-2 whitespace-nowrap select-none px-3 py-2 rounded-lg shrink-0 ${
              rate.isLocal 
                ? 'bg-primary/15 border border-primary/30' 
                : 'bg-muted/50'
            }`}
          >
            <span className="text-base">{rate.flag}</span>
            <div>
              <span className="font-bold text-xs text-foreground">{rate.symbol}</span>
              <p className="text-xs text-muted-foreground font-mono">
                {rate.rate.toLocaleString(undefined, { 
                  minimumFractionDigits: rate.rate > 100 ? 2 : 4,
                  maximumFractionDigits: rate.rate > 100 ? 2 : 4 
                })}
              </p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export const FinanceSection = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [userCurrencyCode, setUserCurrencyCode] = useState<string>('USD');
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchRates = useCallback(async (currencyCode: string, country: string | null, isAutoRefresh = false) => {
    if (!isAutoRefresh) setRatesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-currency-rates', {
        body: { baseCurrency: 'USD' },
      });

      if (error) throw error;

      if (data?.success && data?.rates) {
        const rates: CurrencyRate[] = [];
        const apiRates = data.rates as Record<string, number>;

        if (currencyCode !== "USD" && apiRates[currencyCode]) {
          rates.push({
            symbol: `USD/${currencyCode}`,
            name: currencyNames[currencyCode] || currencyCode,
            rate: apiRates[currencyCode],
            flag: currencyFlags[currencyCode] || '💱',
            isLocal: true,
          });
        }

        majorCurrencies.forEach(code => {
          if (code === currencyCode || code === "USD") return;
          if (apiRates[code]) {
            rates.push({
              symbol: `USD/${code}`,
              name: currencyNames[code] || code,
              rate: apiRates[code],
              flag: currencyFlags[code] || '💱',
            });
          }
        });

        let regionalCodes: string[] = [];
        if (country && africanCountries.includes(country)) {
          regionalCodes = africanCurrencies;
        } else if (country && asianCountries.includes(country)) {
          regionalCodes = asianCurrencies;
        } else if (country && europeanCountries.includes(country)) {
          regionalCodes = europeanCurrencies;
        } else {
          regionalCodes = ["KES", "NGN", "INR", "AED"];
        }

        regionalCodes.forEach(code => {
          if (code === currencyCode || majorCurrencies.includes(code)) return;
          if (apiRates[code]) {
            rates.push({
              symbol: `USD/${code}`,
              name: currencyNames[code] || code,
              rate: apiRates[code],
              flag: currencyFlags[code] || '💱',
            });
          }
        });

        setCurrencyRates(rates);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching currency rates:', error);
    } finally {
      if (!isAutoRefresh) setRatesLoading(false);
    }
  }, []);

  const fetchStocks = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setStocksLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-stock-data');

      if (error) throw error;

      if (data?.success) {
        if (data.stocks) {
          const formattedStocks: StockData[] = data.stocks.map((stock: any) => ({
            symbol: stock.symbol,
            name: stockNames[stock.symbol] || stock.symbol,
            price: stock.price,
            change: stock.change,
            changePercent: stock.changePercent,
          }));
          setStocks(formattedStocks);
        }

        if (data.indices) {
          const formattedIndices: IndexData[] = data.indices.map((idx: any) => ({
            symbol: idx.symbol,
            indexName: idx.indexName,
            price: idx.price,
            change: idx.change,
            changePercent: idx.changePercent,
          }));
          setIndices(formattedIndices);
        }

        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      if (!isAutoRefresh) setStocksLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchRates(userCurrencyCode, userCountry, true),
      fetchStocks(true),
    ]);
    setIsRefreshing(false);
  }, [fetchRates, fetchStocks, userCurrencyCode, userCountry]);

  useEffect(() => {
    const fetchUserCountry = async () => {
      if (!user) {
        setLoading(false);
        setRatesLoading(false);
        fetchStocks();
        fetchRates('USD', null);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('country')
          .eq('id', user.id)
          .single();

        if (profile?.country) {
          setUserCountry(profile.country);
          const currency = getCurrencyForCountry(profile.country);
          setUserCurrencyCode(currency.code);
          fetchRates(currency.code, profile.country);
        } else {
          fetchRates('USD', null);
        }
        fetchStocks();
      } catch (error) {
        console.error('Error fetching user country:', error);
        fetchRates('USD', null);
        fetchStocks();
      } finally {
        setLoading(false);
      }
    };

    fetchUserCountry();
  }, [user, fetchRates, fetchStocks]);

  useEffect(() => {
    const interval = setInterval(() => refreshAll(), 60000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  if (loading) {
    return (
      <div className="p-4 space-y-6">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const userCurrency = getCurrencyForCountry(userCountry);

  return (
    <div className="pb-6">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm font-medium text-foreground">
                {currentTime.toLocaleTimeString()}
              </span>
            </div>
            <span className="text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {currentTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <button
            onClick={refreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        {userCountry && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{userCountry}</span>
            <span className="font-medium text-foreground">({userCurrency.code})</span>
          </div>
        )}
      </div>

      {/* Currency Section */}
      <section className="mt-4">
        <div className="px-4 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" strokeWidth={2.5} />
            <h2 className="text-base font-bold text-foreground">Exchange Rates</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-500">Live</span>
          </div>
        </div>
        <div className="px-3">
          <CurrencyTicker rates={currencyRates} isLoading={ratesLoading} />
        </div>
        {lastUpdate && (
          <p className="px-4 mt-1 text-[11px] text-muted-foreground">
            Updated {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </section>

      {/* Stocks Section */}
      <section className="mt-6 px-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" strokeWidth={2.5} />
            <h2 className="text-base font-bold text-foreground">Stocks</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-500">Live</span>
          </div>
        </div>

        {stocksLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {stocks.map((stock) => (
              <Card 
                key={stock.symbol} 
                className="p-3 border-border/60 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-bold text-sm text-foreground">{stock.symbol}</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[70px]">{stock.name}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                    stock.changePercent >= 0 
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-red-500/15 text-red-600 dark:text-red-400'
                  }`}>
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
                <p className="text-lg font-bold text-foreground">${stock.price.toFixed(2)}</p>
                <div className={`flex items-center gap-1 text-xs ${
                  stock.change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Market Indices Section - Real Data */}
      <section className="mt-6 px-4">
        <div className="mb-3">
          <h2 className="text-base font-bold text-foreground">Market Indices</h2>
        </div>
        {stocksLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : indices.length > 0 ? (
          <div className="space-y-2">
            {indices.map((idx) => (
              <Card key={idx.symbol} className="p-3 flex items-center justify-between border-border/60">
                <div>
                  <span className="font-semibold text-sm text-foreground">{idx.indexName}</span>
                  <p className="text-[11px] text-muted-foreground">{idx.symbol}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-medium text-foreground">
                    ${idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`flex items-center gap-1 text-xs font-semibold ${
                    idx.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {idx.changePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Market data unavailable</p>
        )}
      </section>
    </div>
  );
};
