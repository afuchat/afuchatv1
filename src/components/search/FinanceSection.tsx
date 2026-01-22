import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, MapPin } from 'lucide-react';
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

// Base rates for different currency pairs (approximate)
const baseRates: Record<string, { rate: number; change: number }> = {
  "USD": { rate: 1, change: 0 },
  "EUR": { rate: 0.92, change: -0.12 },
  "GBP": { rate: 0.79, change: 0.08 },
  "JPY": { rate: 154.32, change: 0.24 },
  "CHF": { rate: 0.88, change: -0.15 },
  "AUD": { rate: 1.53, change: 0.05 },
  "CAD": { rate: 1.36, change: -0.11 },
  "CNY": { rate: 7.25, change: 0.18 },
  "INR": { rate: 83.12, change: -0.02 },
  "KES": { rate: 153.50, change: 0.35 },
  "UGX": { rate: 3742.50, change: -0.22 },
  "TZS": { rate: 2650.00, change: 0.15 },
  "RWF": { rate: 1285.00, change: 0.08 },
  "NGN": { rate: 1520.00, change: 1.25 },
  "ZAR": { rate: 18.45, change: 0.42 },
  "GHS": { rate: 15.20, change: 0.55 },
  "EGP": { rate: 48.50, change: 0.32 },
  "MAD": { rate: 10.05, change: -0.08 },
  "ETB": { rate: 56.80, change: 0.18 },
  "BIF": { rate: 2870.00, change: 0.05 },
  "SSP": { rate: 1325.00, change: 0.75 },
  "SOS": { rate: 571.00, change: 0.12 },
  "XAF": { rate: 605.00, change: -0.10 },
  "XOF": { rate: 605.00, change: -0.10 },
  "AED": { rate: 3.67, change: 0.01 },
  "SAR": { rate: 3.75, change: 0.02 },
  "PKR": { rate: 278.50, change: 0.45 },
  "BDT": { rate: 119.50, change: 0.22 },
  "IDR": { rate: 15850.00, change: 0.18 },
  "MYR": { rate: 4.72, change: -0.05 },
  "SGD": { rate: 1.35, change: 0.03 },
  "THB": { rate: 35.80, change: 0.15 },
  "PHP": { rate: 55.80, change: 0.08 },
  "VND": { rate: 24850.00, change: 0.12 },
  "KRW": { rate: 1345.00, change: 0.28 },
  "BRL": { rate: 4.95, change: 0.35 },
  "MXN": { rate: 17.15, change: -0.18 },
  "TRY": { rate: 32.50, change: 0.85 },
  "RUB": { rate: 92.50, change: 0.42 },
  "PLN": { rate: 4.02, change: 0.12 },
  "SEK": { rate: 10.45, change: 0.08 },
  "NOK": { rate: 10.85, change: 0.15 },
  "DKK": { rate: 6.88, change: -0.05 },
  "ZMW": { rate: 26.50, change: 0.22 },
  "BWP": { rate: 13.65, change: 0.08 },
  "MWK": { rate: 1720.00, change: 0.45 },
  "MZN": { rate: 63.80, change: 0.18 },
  "NAD": { rate: 18.45, change: 0.42 },
  "AOA": { rate: 825.00, change: 0.55 },
  "CDF": { rate: 2720.00, change: 0.32 },
  "ZWL": { rate: 14500.00, change: 2.15 },
};

// Major currencies to always show
const majorCurrencies = ["USD", "EUR", "GBP", "JPY", "CNY"];

// Crypto and commodities
const cryptoAndCommodities: CurrencyRate[] = [
  { symbol: 'BTC/USD', name: 'Bitcoin', rate: 42567.00, change: 2.34, flag: '₿' },
  { symbol: 'ETH/USD', name: 'Ethereum', rate: 2234.50, change: 1.87, flag: 'Ξ' },
  { symbol: 'XAU/USD', name: 'Gold', rate: 2024.30, change: 0.45, flag: '🥇' },
];

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

const generateRatesForCountry = (userCountry: string | null): CurrencyRate[] => {
  const userCurrency = getCurrencyForCountry(userCountry);
  const userCurrencyCode = userCurrency.code;
  const userFlag = userCountry ? countryFlags[userCountry] || '🌍' : '🌍';
  
  const rates: CurrencyRate[] = [];
  
  // Add user's local currency first (against USD)
  if (userCurrencyCode !== "USD" && baseRates[userCurrencyCode]) {
    rates.push({
      symbol: `USD/${userCurrencyCode}`,
      name: userCurrency.name,
      rate: baseRates[userCurrencyCode].rate,
      change: baseRates[userCurrencyCode].change,
      flag: userFlag,
      isLocal: true,
    });
  }
  
  // Add major currencies against user's currency or USD
  majorCurrencies.forEach(code => {
    if (code === userCurrencyCode) return;
    
    const currencyInfo = Object.entries(countryCurrencyMap).find(([_, info]) => info.code === code);
    const flag = code === "USD" ? "🇺🇸" : 
                 code === "EUR" ? "🇪🇺" :
                 code === "GBP" ? "🇬🇧" :
                 code === "JPY" ? "🇯🇵" :
                 code === "CNY" ? "🇨🇳" : "💱";
    
    if (baseRates[code]) {
      if (userCurrencyCode === "USD") {
        // Show other currencies against USD
        rates.push({
          symbol: code === "JPY" || code === "CNY" ? `USD/${code}` : `${code}/USD`,
          name: currencyInfo?.[1].name || code,
          rate: code === "JPY" || code === "CNY" ? baseRates[code].rate : 1 / baseRates[code].rate,
          change: baseRates[code].change,
          flag,
        });
      } else {
        // Show USD and major currencies against user's local currency
        const localRate = baseRates[userCurrencyCode]?.rate || 1;
        const crossRate = localRate / (baseRates[code]?.rate || 1);
        rates.push({
          symbol: `${code}/${userCurrencyCode}`,
          name: currencyInfo?.[1].name || code,
          rate: crossRate,
          change: baseRates[code].change,
          flag,
        });
      }
    }
  });
  
  // Add regional currencies based on user's location
  const africanCountries = ["Uganda", "Kenya", "Tanzania", "Rwanda", "Nigeria", "Ghana", "South Africa", "Egypt", "Ethiopia"];
  const asianCountries = ["India", "Pakistan", "Bangladesh", "Indonesia", "Malaysia", "Singapore", "Thailand", "Philippines", "Vietnam"];
  const europeanCountries = ["Germany", "France", "Italy", "Spain", "Poland", "Turkey", "Russia", "Ukraine"];
  
  let regionalCurrencies: string[] = [];
  
  if (userCountry && africanCountries.includes(userCountry)) {
    regionalCurrencies = ["KES", "UGX", "TZS", "NGN", "ZAR", "GHS"].filter(c => c !== userCurrencyCode);
  } else if (userCountry && asianCountries.includes(userCountry)) {
    regionalCurrencies = ["INR", "PKR", "IDR", "MYR", "SGD", "THB"].filter(c => c !== userCurrencyCode);
  } else if (userCountry && europeanCountries.includes(userCountry)) {
    regionalCurrencies = ["PLN", "TRY", "RUB", "SEK", "NOK", "CHF"].filter(c => c !== userCurrencyCode);
  }
  
  regionalCurrencies.slice(0, 3).forEach(code => {
    if (baseRates[code]) {
      const country = Object.entries(countryCurrencyMap).find(([_, info]) => info.code === code)?.[0];
      rates.push({
        symbol: `USD/${code}`,
        name: countryCurrencyMap[country || ""]?.name || code,
        rate: baseRates[code].rate,
        change: baseRates[code].change,
        flag: country ? countryFlags[country] || '💱' : '💱',
      });
    }
  });
  
  // Add crypto and commodities
  rates.push(...cryptoAndCommodities);
  
  return rates;
};

interface CurrencyTickerProps {
  userCountry: string | null;
}

const CurrencyTicker = ({ userCountry }: CurrencyTickerProps) => {
  const [rates, setRates] = useState<CurrencyRate[]>(() => generateRatesForCountry(userCountry));
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRates(generateRatesForCountry(userCountry));
  }, [userCountry]);

  // Simulate rate updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRates(prev => prev.map(rate => ({
        ...rate,
        rate: rate.rate * (1 + (Math.random() - 0.5) * 0.001),
        change: rate.change + (Math.random() - 0.5) * 0.1
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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
        className="flex gap-6 py-3"
        animate={{
          x: isPaused ? undefined : [0, -50 * rates.length],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 40,
            ease: "linear",
          },
        }}
        style={{ x: isPaused ? undefined : 0 }}
      >
        {duplicatedRates.map((rate, index) => (
          <div 
            key={`${rate.symbol}-${index}`}
            className={`flex items-center gap-2 whitespace-nowrap select-none px-3 py-2 rounded-lg border ${
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
                  <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">YOUR CURRENCY</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-mono">
                  {rate.rate.toLocaleString(undefined, { 
                    minimumFractionDigits: rate.rate > 100 ? 2 : 4,
                    maximumFractionDigits: rate.rate > 100 ? 2 : 4 
                  })}
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${
                  rate.change > 0 ? 'text-green-500' : rate.change < 0 ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {rate.change > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : rate.change < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {Math.abs(rate.change).toFixed(2)}%
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
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [stocks, setStocks] = useState<StockData[]>(STOCK_DATA);

  useEffect(() => {
    const fetchUserCountry = async () => {
      if (!user) {
        setLoading(false);
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
        }
      } catch (error) {
        console.error('Error fetching user country:', error);
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg text-foreground">Currency Rates</h2>
            </div>
            {userCountry && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                <MapPin className="h-3 w-3" />
                <span>{userCountry}</span>
                <span className="font-medium text-foreground">({userCurrency.code})</span>
              </div>
            )}
          </div>
        </div>
        <div className="px-2">
          <CurrencyTicker userCountry={userCountry} />
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
