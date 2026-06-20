import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface CurrencyRate {
  symbol: string;
  name: string;
  rate: number;
  change: number;
  flag?: string;
}

// Mock currency data - in production, this would come from an API
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

export const CurrencyTicker = () => {
  const [rates, setRates] = useState<CurrencyRate[]>(CURRENCY_RATES);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

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
    <div className="relative overflow-hidden bg-card/50 backdrop-blur border-b border-border">
      <div 
        className="flex"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <motion.div
          ref={scrollRef}
          className="flex gap-6 py-3 px-4"
          animate={{
            x: isPaused ? 0 : [0, -50 * rates.length],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
        >
          {duplicatedRates.map((rate, index) => (
            <div 
              key={`${rate.symbol}-${index}`}
              className="flex items-center gap-2 whitespace-nowrap select-none"
            >
              <span className="text-base">{rate.flag}</span>
              <span className="font-semibold text-sm text-foreground">{rate.symbol}</span>
              <span className="text-sm text-muted-foreground font-mono">
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
          ))}
        </motion.div>
      </div>
    </div>
  );
};
