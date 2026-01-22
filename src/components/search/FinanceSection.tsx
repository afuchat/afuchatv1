import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';

interface CurrencyRate {
  symbol: string;
  name: string;
  rate: number;
  change: number;
  flag?: string;
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// Mock currency data
const CURRENCY_RATES: CurrencyRate[] = [
  { symbol: 'EUR/USD', name: 'Euro', rate: 1.0847, change: 0.12, flag: '🇪🇺' },
  { symbol: 'GBP/USD', name: 'British Pound', rate: 1.2634, change: -0.08, flag: '🇬🇧' },
  { symbol: 'USD/JPY', name: 'Japanese Yen', rate: 154.32, change: 0.24, flag: '🇯🇵' },
  { symbol: 'USD/CHF', name: 'Swiss Franc', rate: 0.8812, change: -0.15, flag: '🇨🇭' },
  { symbol: 'AUD/USD', name: 'Australian Dollar', rate: 0.6543, change: 0.05, flag: '🇦🇺' },
  { symbol: 'USD/CAD', name: 'Canadian Dollar', rate: 1.3567, change: -0.11, flag: '🇨🇦' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar', rate: 0.5987, change: 0.03, flag: '🇳🇿' },
  { symbol: 'USD/CNY', name: 'Chinese Yuan', rate: 7.2456, change: 0.18, flag: '🇨🇳' },
  { symbol: 'USD/INR', name: 'Indian Rupee', rate: 83.12, change: -0.02, flag: '🇮🇳' },
  { symbol: 'USD/KES', name: 'Kenyan Shilling', rate: 153.50, change: 0.35, flag: '🇰🇪' },
  { symbol: 'USD/UGX', name: 'Ugandan Shilling', rate: 3742.50, change: -0.22, flag: '🇺🇬' },
  { symbol: 'USD/NGN', name: 'Nigerian Naira', rate: 1520.00, change: 1.25, flag: '🇳🇬' },
  { symbol: 'USD/ZAR', name: 'South African Rand', rate: 18.45, change: 0.42, flag: '🇿🇦' },
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

const CurrencyTicker = () => {
  const [rates, setRates] = useState<CurrencyRate[]>(CURRENCY_RATES);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
            className="flex items-center gap-2 whitespace-nowrap select-none px-3 py-2 rounded-lg bg-card/50 border border-border/50"
          >
            <span className="text-lg">{rate.flag}</span>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-foreground">{rate.symbol}</span>
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
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<StockData[]>(STOCK_DATA);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Currency Ticker */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg text-foreground">Currency Rates</h2>
          </div>
        </div>
        <div className="px-2">
          <CurrencyTicker />
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
