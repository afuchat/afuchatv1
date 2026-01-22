import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, MapPin, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrencyForCountry, countryCurrencyMap } from '@/lib/currencyUtils';

interface CurrencyRate {
  symbol: string;
  name: string;
  rate: number;
  change: number;
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

// Country to flag emoji mapping
const countryFlags: Record<string, string> = {
  "Uganda": "🇺🇬",
  "Kenya": "🇰🇪",
  "Tanzania": "🇹🇿",
  "Rwanda": "🇷🇼",
  "Burundi": "🇧🇮",
  "South Sudan": "🇸🇸",
  "Ethiopia": "🇪🇹",
  "Somalia": "🇸🇴",
  "Democratic Republic of the Congo": "🇨🇩",
  "Congo": "🇨🇬",
  "Nigeria": "🇳🇬",
  "Ghana": "🇬🇭",
  "South Africa": "🇿🇦",
  "Egypt": "🇪🇬",
  "Morocco": "🇲🇦",
  "United States": "🇺🇸",
  "United Kingdom": "🇬🇧",
  "Germany": "🇩🇪",
  "France": "🇫🇷",
  "Italy": "🇮🇹",
  "Spain": "🇪🇸",
  "Netherlands": "🇳🇱",
  "Belgium": "🇧🇪",
  "Austria": "🇦🇹",
  "Ireland": "🇮🇪",
  "Portugal": "🇵🇹",
  "Greece": "🇬🇷",
  "Finland": "🇫🇮",
  "Canada": "🇨🇦",
  "Australia": "🇦🇺",
  "New Zealand": "🇳🇿",
  "Japan": "🇯🇵",
  "China": "🇨🇳",
  "India": "🇮🇳",
  "Pakistan": "🇵🇰",
  "Bangladesh": "🇧🇩",
  "Indonesia": "🇮🇩",
  "Malaysia": "🇲🇾",
  "Singapore": "🇸🇬",
  "Thailand": "🇹🇭",
  "Vietnam": "🇻🇳",
  "Philippines": "🇵🇭",
  "South Korea": "🇰🇷",
  "Brazil": "🇧🇷",
  "Mexico": "🇲🇽",
  "Argentina": "🇦🇷",
  "Colombia": "🇨🇴",
  "Chile": "🇨🇱",
  "Peru": "🇵🇪",
  "United Arab Emirates": "🇦🇪",
  "Saudi Arabia": "🇸🇦",
  "Qatar": "🇶🇦",
  "Kuwait": "🇰🇼",
  "Bahrain": "🇧🇭",
  "Oman": "🇴🇲",
  "Israel": "🇮🇱",
  "Turkey": "🇹🇷",
  "Russia": "🇷🇺",
  "Ukraine": "🇺🇦",
  "Poland": "🇵🇱",
  "Czech Republic": "🇨🇿",
  "Hungary": "🇭🇺",
  "Romania": "🇷🇴",
  "Sweden": "🇸🇪",
  "Norway": "🇳🇴",
  "Denmark": "🇩🇰",
  "Switzerland": "🇨🇭",
  "Zimbabwe": "🇿🇼",
  "Zambia": "🇿🇲",
  "Malawi": "🇲🇼",
  "Mozambique": "🇲🇿",
  "Botswana": "🇧🇼",
  "Namibia": "🇳🇦",
  "Angola": "🇦🇴",
  "Senegal": "🇸🇳",
  "Ivory Coast": "🇨🇮",
  "Cameroon": "🇨🇲",
};

// Currency code to flag mapping
const currencyFlags: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
  AUD: "🇦🇺",
  CAD: "🇨🇦",
  CNY: "🇨🇳",
  INR: "🇮🇳",
  KES: "🇰🇪",
  UGX: "🇺🇬",
  TZS: "🇹🇿",
  RWF: "🇷🇼",
  NGN: "🇳🇬",
  ZAR: "🇿🇦",
  GHS: "🇬🇭",
  EGP: "🇪🇬",
  MAD: "🇲🇦",
  ETB: "🇪🇹",
  BIF: "🇧🇮",
  SSP: "🇸🇸",
  SOS: "🇸🇴",
  XAF: "🇨🇲",
  XOF: "🇸🇳",
  AED: "🇦🇪",
  SAR: "🇸🇦",
  PKR: "🇵🇰",
  BDT: "🇧🇩",
  IDR: "🇮🇩",
  MYR: "🇲🇾",
  SGD: "🇸🇬",
  THB: "🇹🇭",
  PHP: "🇵🇭",
  VND: "🇻🇳",
  KRW: "🇰🇷",
  BRL: "🇧🇷",
  MXN: "🇲🇽",
  TRY: "🇹🇷",
  RUB: "🇷🇺",
  PLN: "🇵🇱",
  SEK: "🇸🇪",
  NOK: "🇳🇴",
  DKK: "🇩🇰",
  ZMW: "🇿🇲",
  BWP: "🇧🇼",
  MWK: "🇲🇼",
  MZN: "🇲🇿",
  NAD: "🇳🇦",
  AOA: "🇦🇴",
  CDF: "🇨🇩",
  NZD: "🇳🇿",
};

// Currency names
const currencyNames: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CHF: "Swiss Franc",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  CNY: "Chinese Yuan",
  INR: "Indian Rupee",
  KES: "Kenyan Shilling",
  UGX: "Ugandan Shilling",
  TZS: "Tanzanian Shilling",
  RWF: "Rwandan Franc",
  NGN: "Nigerian Naira",
  ZAR: "South African Rand",
  GHS: "Ghanaian Cedi",
  EGP: "Egyptian Pound",
  AED: "UAE Dirham",
  SAR: "Saudi Riyal",
  PKR: "Pakistani Rupee",
  BDT: "Bangladeshi Taka",
  IDR: "Indonesian Rupiah",
  MYR: "Malaysian Ringgit",
  SGD: "Singapore Dollar",
  THB: "Thai Baht",
  PHP: "Philippine Peso",
  VND: "Vietnamese Dong",
  KRW: "South Korean Won",
  BRL: "Brazilian Real",
  MXN: "Mexican Peso",
  TRY: "Turkish Lira",
  RUB: "Russian Ruble",
  PLN: "Polish Zloty",
  SEK: "Swedish Krona",
  NOK: "Norwegian Krone",
  NZD: "New Zealand Dollar",
};

// Major currencies to always show
const majorCurrencies = ["USD", "EUR", "GBP", "JPY", "CNY"];

// Regional currencies by continent/region
const africanCurrencies = ["KES", "UGX", "TZS", "NGN", "ZAR", "GHS", "EGP"];
const asianCurrencies = ["INR", "PKR", "IDR", "MYR", "SGD", "THB", "PHP"];
const europeanCurrencies = ["PLN", "TRY", "SEK", "NOK", "CHF"];

// Mock stock data
const STOCK_DATA: StockData[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change: 2.34, changePercent: 1.27 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 141.80, change: -0.85, changePercent: -0.60 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.91, change: 4.21, changePercent: 1.12 },
  { symbol: 'AMZN', name: 'Amazon.com', price: 178.25, change: 1.56, changePercent: 0.88 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.48, change: -3.72, changePercent: -1.47 },
  { symbol: 'META', name: 'Meta Platforms', price: 505.95, change: 8.32, changePercent: 1.67 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.28, change: 15.42, changePercent: 1.79 },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 195.34, change: 1.23, changePercent: 0.63 },
];

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

  // Duplicate rates for seamless loop
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

export const FinanceSection = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [stocks, setStocks] = useState<StockData[]>(STOCK_DATA);

  const fetchRates = async (userCurrencyCode: string) => {
    setRatesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-currency-rates', {
        body: { baseCurrency: 'USD' },
      });

      if (error) throw error;

      if (data?.success && data?.rates) {
        const rates: CurrencyRate[] = [];
        const apiRates = data.rates as Record<string, number>;

        // Add user's local currency first
        if (userCurrencyCode !== "USD" && apiRates[userCurrencyCode]) {
          rates.push({
            symbol: `USD/${userCurrencyCode}`,
            name: currencyNames[userCurrencyCode] || userCurrencyCode,
            rate: apiRates[userCurrencyCode],
            change: 0,
            flag: currencyFlags[userCurrencyCode] || '💱',
            isLocal: true,
          });
        }

        // Add major currencies
        majorCurrencies.forEach(code => {
          if (code === userCurrencyCode || code === "USD") return;
          if (apiRates[code]) {
            rates.push({
              symbol: `USD/${code}`,
              name: currencyNames[code] || code,
              rate: apiRates[code],
              change: 0,
              flag: currencyFlags[code] || '💱',
            });
          }
        });

        // Determine regional currencies based on user's country
        let regionalCodes: string[] = [];
        const africanCountries = ["Uganda", "Kenya", "Tanzania", "Rwanda", "Nigeria", "Ghana", "South Africa", "Egypt", "Ethiopia"];
        const asianCountries = ["India", "Pakistan", "Bangladesh", "Indonesia", "Malaysia", "Singapore", "Thailand", "Philippines", "Vietnam"];
        const europeanCountries = ["Germany", "France", "Italy", "Spain", "Poland", "Turkey", "Russia", "Ukraine", "Sweden", "Norway"];

        if (userCountry && africanCountries.includes(userCountry)) {
          regionalCodes = africanCurrencies;
        } else if (userCountry && asianCountries.includes(userCountry)) {
          regionalCodes = asianCurrencies;
        } else if (userCountry && europeanCountries.includes(userCountry)) {
          regionalCodes = europeanCurrencies;
        } else {
          // Default mix
          regionalCodes = ["KES", "NGN", "INR", "AED"];
        }

        regionalCodes.forEach(code => {
          if (code === userCurrencyCode || majorCurrencies.includes(code)) return;
          if (apiRates[code]) {
            rates.push({
              symbol: `USD/${code}`,
              name: currencyNames[code] || code,
              rate: apiRates[code],
              change: 0,
              flag: currencyFlags[code] || '💱',
            });
          }
        });

        setCurrencyRates(rates);
        setLastUpdate(data.lastUpdate);
      }
    } catch (error) {
      console.error('Error fetching currency rates:', error);
      // Fallback to showing empty state
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserCountry = async () => {
      if (!user) {
        setLoading(false);
        setRatesLoading(false);
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
          const userCurrency = getCurrencyForCountry(profile.country);
          fetchRates(userCurrency.code);
        } else {
          fetchRates('USD');
        }
      } catch (error) {
        console.error('Error fetching user country:', error);
        fetchRates('USD');
      } finally {
        setLoading(false);
      }
    };

    fetchUserCountry();
  }, [user]);

  // Simulate stock updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prev => prev.map(stock => {
        const priceChange = (Math.random() - 0.5) * 2;
        const newPrice = stock.price + priceChange;
        const newChange = stock.change + priceChange * 0.1;
        return {
          ...stock,
          price: newPrice,
          change: newChange,
          changePercent: (newChange / newPrice) * 100
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
      {/* Currency Ticker */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">Live Currency Rates</h2>
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
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Updated: {new Date(lastUpdate).toLocaleString()}
            </p>
          )}
        </div>
        <div className="px-2">
          <CurrencyTicker rates={currencyRates} isLoading={ratesLoading} />
        </div>
      </div>

      {/* Market Overview */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg text-foreground">Market Overview</h2>
        </div>

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
