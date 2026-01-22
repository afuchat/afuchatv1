import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, MapPin, RefreshCw, Clock } from 'lucide-react';
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

// Stock symbol to company name mapping
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

// Currency code to flag mapping
const currencyFlags: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", JPY: "🇯🇵", CHF: "🇨🇭",
  AUD: "🇦🇺", CAD: "🇨🇦", CNY: "🇨🇳", INR: "🇮🇳", KES: "🇰🇪",
  UGX: "🇺🇬", TZS: "🇹🇿", RWF: "🇷🇼", NGN: "🇳🇬", ZAR: "🇿🇦",
  GHS: "🇬🇭", EGP: "🇪🇬", MAD: "🇲🇦", ETB: "🇪🇹", BIF: "🇧🇮",
  SSP: "🇸🇸", SOS: "🇸🇴", XAF: "🇨🇲", XOF: "🇸🇳", AED: "🇦🇪",
  SAR: "🇸🇦", PKR: "🇵🇰", BDT: "🇧🇩", IDR: "🇮🇩", MYR: "🇲🇾",
  SGD: "🇸🇬", THB: "🇹🇭", PHP: "🇵🇭", VND: "🇻🇳", KRW: "🇰🇷",
  BRL: "🇧🇷", MXN: "🇲🇽", TRY: "🇹🇷", RUB: "🇷🇺", PLN: "🇵🇱",
  SEK: "🇸🇪", NOK: "🇳🇴", DKK: "🇩🇰", ZMW: "🇿🇲", BWP: "🇧🇼",
  MWK: "🇲🇼", MZN: "🇲🇿", NAD: "🇳🇦", AOA: "🇦🇴", CDF: "🇨🇩",
  NZD: "🇳🇿", HKD: "🇭🇰", TWD: "🇹🇼", CZK: "🇨🇿", HUF: "🇭🇺",
  ILS: "🇮🇱", CLP: "🇨🇱", COP: "🇨🇴", PEN: "🇵🇪", ARS: "🇦🇷",
};

// Currency names
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
  RUB: "Russian Ruble", PLN: "Polish Zloty", SEK: "Swedish Krona",
  NOK: "Norwegian Krone", NZD: "New Zealand Dollar", HKD: "Hong Kong Dollar",
  TWD: "Taiwan Dollar", CZK: "Czech Koruna", HUF: "Hungarian Forint",
  ILS: "Israeli Shekel", CLP: "Chilean Peso", COP: "Colombian Peso",
  PEN: "Peruvian Sol", ARS: "Argentine Peso",
};

// Major currencies to always show
const majorCurrencies = ["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "AUD", "CAD"];

// Regional currencies by continent/region
const africanCurrencies = ["KES", "UGX", "TZS", "NGN", "ZAR", "GHS", "EGP"];
const asianCurrencies = ["INR", "PKR", "IDR", "MYR", "SGD", "THB", "PHP", "KRW"];
const europeanCurrencies = ["PLN", "TRY", "SEK", "NOK", "CZK", "HUF"];

// Country lists for regional detection
const africanCountries = ["Uganda", "Kenya", "Tanzania", "Rwanda", "Nigeria", "Ghana", "South Africa", "Egypt", "Ethiopia"];
const asianCountries = ["India", "Pakistan", "Bangladesh", "Indonesia", "Malaysia", "Singapore", "Thailand", "Philippines", "Vietnam", "South Korea"];
const europeanCountries = ["Germany", "France", "Italy", "Spain", "Poland", "Turkey", "Russia", "Ukraine", "Sweden", "Norway", "Czech Republic", "Hungary"];

interface CurrencyTickerProps {
  rates: CurrencyRate[];
  isLoading: boolean;
}

const CurrencyTicker = ({ rates, isLoading }: CurrencyTickerProps) => {
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (isLoading || rates.length === 0) {
    return (
      <div className="flex gap-4 py-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-32 rounded-lg shrink-0" />
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
        className="flex gap-4 py-3"
        animate={{
          x: isPaused ? undefined : [0, -160 * rates.length],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: rates.length * 3,
            ease: "linear",
          },
        }}
        style={{ x: isPaused ? undefined : 0 }}
      >
        {duplicatedRates.map((rate, index) => (
          <div 
            key={`${rate.symbol}-${index}`}
            className={`flex items-center gap-2 whitespace-nowrap select-none px-3 py-2 rounded-lg border shrink-0 ${
              rate.isLocal 
                ? 'bg-primary/10 border-primary/30' 
                : 'bg-card/50 border-border/50'
            }`}
          >
            <span className="text-lg">{rate.flag}</span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-sm text-foreground">{rate.symbol}</span>
                {rate.isLocal && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">LOCAL</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-mono">
                  {rate.rate.toLocaleString(undefined, { 
                    minimumFractionDigits: rate.rate > 100 ? 2 : 4,
                    maximumFractionDigits: rate.rate > 100 ? 2 : 4 
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

// Real-time clock component
const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm font-mono bg-muted/50 px-3 py-1.5 rounded-lg">
      <Clock className="h-4 w-4 text-primary" />
      <span className="text-foreground font-semibold">
        {time.toLocaleTimeString()}
      </span>
      <span className="text-muted-foreground text-xs">
        {time.toLocaleDateString()}
      </span>
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

        // Add user's local currency first
        if (currencyCode !== "USD" && apiRates[currencyCode]) {
          rates.push({
            symbol: `USD/${currencyCode}`,
            name: currencyNames[currencyCode] || currencyCode,
            rate: apiRates[currencyCode],
            flag: currencyFlags[currencyCode] || '💱',
            isLocal: true,
          });
        }

        // Add major currencies
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

        // Determine regional currencies based on user's country
        let regionalCodes: string[] = [];
        if (country && africanCountries.includes(country)) {
          regionalCodes = africanCurrencies;
        } else if (country && asianCountries.includes(country)) {
          regionalCodes = asianCurrencies;
        } else if (country && europeanCountries.includes(country)) {
          regionalCodes = europeanCurrencies;
        } else {
          regionalCodes = ["KES", "NGN", "INR", "AED", "BRL", "MXN"];
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

      if (data?.success && data?.stocks) {
        const formattedStocks: StockData[] = data.stocks.map((stock: any) => ({
          symbol: stock.symbol,
          name: stockNames[stock.symbol] || stock.symbol,
          price: stock.price,
          change: stock.change,
          changePercent: stock.changePercent,
        }));
        setStocks(formattedStocks);
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

  // Initial data fetch
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

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshAll]);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const userCurrency = getCurrencyForCountry(userCountry);

  return (
    <div className="space-y-6">
      {/* Header with Real-time Clock */}
      <div className="px-4 pt-4 flex items-center justify-between">
        <RealTimeClock />
        <button
          onClick={refreshAll}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted/50 px-2 py-1.5 rounded-lg"
        >
          <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {/* Currency Ticker */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">Live Currency Rates</h2>
              <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                LIVE
              </span>
            </div>
            {userCountry && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                <MapPin className="h-3 w-3" />
                <span>{userCountry}</span>
                <span className="font-medium text-foreground">({userCurrency.code})</span>
              </div>
            )}
          </div>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="px-2">
          <CurrencyTicker rates={currencyRates} isLoading={ratesLoading} />
        </div>
      </div>

      {/* Market Overview */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg text-foreground">Market Overview</h2>
            <span className="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        </div>

        {stocksLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stocks.map((stock) => (
              <motion.div
                key={stock.symbol}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card className="p-3 cursor-pointer hover:bg-muted/30 transition-colors border-border/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-sm text-foreground">{stock.symbol}</span>
                      <p className="text-xs text-muted-foreground truncate max-w-[80px]">{stock.name}</p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      stock.changePercent >= 0 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-lg font-bold text-foreground">
                      ${stock.price.toFixed(2)}
                    </span>
                    <div className={`flex items-center gap-1 text-xs ${
                      stock.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {stock.change >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Market Indices */}
      <div className="px-4 pb-6">
        <h3 className="font-semibold text-sm text-muted-foreground mb-3">INDICES</h3>
        <div className="space-y-2">
          {[
            { name: 'S&P 500', value: 4783.45, change: 0.82 },
            { name: 'Dow Jones', value: 37545.33, change: 0.56 },
            { name: 'NASDAQ', value: 14972.76, change: 1.24 },
            { name: 'Russell 2000', value: 1987.23, change: -0.34 },
          ].map((index) => (
            <Card key={index.name} className="p-3 flex items-center justify-between border-border/50">
              <span className="font-medium text-sm text-foreground">{index.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-foreground">
                  {index.value.toLocaleString()}
                </span>
                <span className={`flex items-center gap-1 text-xs font-medium ${
                  index.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {index.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {index.change >= 0 ? '+' : ''}{index.change}%
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
