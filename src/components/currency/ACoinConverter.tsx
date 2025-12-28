import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNexa } from '@/hooks/useNexa';
import { Coins, ArrowRightLeft, Info, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ACoinConverterProps {
  currentNexa: number;
  currentACoin: number;
  onConversionSuccess?: () => void;
}

const ACOIN_PACKAGES = [
  { acoin: 100, stars: 1, price: '$1.00' },
  { acoin: 500, stars: 4, price: '$5.00' },
  { acoin: 1000, stars: 8, price: '$10.00' },
  { acoin: 5000, stars: 39, price: '$50.00' },
  { acoin: 10000, stars: 77, price: '$100.00' },
];

export const ACoinConverter = ({ currentNexa, currentACoin, onConversionSuccess }: ACoinConverterProps) => {
  const [nexaAmount, setNexaAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const { convertNexaToACoin } = useNexa();

  const conversionRate = 100; // 100 Nexa = 1 ACoin
  const feePercent = 5.99; // 5.99% fee

  const calculateACoin = (nexa: number) => {
    const afterFee = nexa * (1 - feePercent / 100);
    return Math.floor(afterFee / conversionRate);
  };

  const calculateFee = (nexa: number) => {
    return Math.ceil(nexa * feePercent / 100);
  };

  const acoinReceived = nexaAmount ? calculateACoin(parseInt(nexaAmount)) : 0;
  const feeAmount = nexaAmount ? calculateFee(parseInt(nexaAmount)) : 0;

  const handleConvert = async () => {
    const amount = parseInt(nexaAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > currentNexa) {
      toast.error('Insufficient Nexa balance');
      return;
    }

    if (acoinReceived < 1) {
      toast.error(`Minimum ${Math.ceil(conversionRate * (1 + feePercent / 100))} Nexa required`);
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertNexaToACoin(amount);
      if (result?.success) {
        setNexaAmount('');
        onConversionSuccess?.();
      }
    } finally {
      setIsConverting(false);
    }
  };

  const handleTelegramRecharge = () => {
    // Open Telegram bot for payment
    window.open('https://t.me/afuchatbot?start=buy_acoin', '_blank');
    toast.info('Opening Telegram to complete your purchase');
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          Get ACoin
        </CardTitle>
        <CardDescription>
          Premium currency for exclusive items and experiences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="convert" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="convert">Convert Nexa</TabsTrigger>
            <TabsTrigger value="buy">Buy with Telegram</TabsTrigger>
          </TabsList>
          
          <TabsContent value="convert" className="space-y-4 mt-4">
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Conversion Rate: {conversionRate} Nexa = 1 ACoin • Fee: {feePercent}%
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount of Nexa to Convert</label>
              <Input
                type="number"
                placeholder="Enter Nexa amount"
                value={nexaAmount}
                onChange={(e) => setNexaAmount(e.target.value)}
                min="0"
                max={currentNexa}
              />
              <p className="text-xs text-muted-foreground">
                Available: {currentNexa.toLocaleString()} Nexa
              </p>
            </div>

            {nexaAmount && parseInt(nexaAmount) > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-center gap-3 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-lg">{parseInt(nexaAmount).toLocaleString()}</p>
                    <p className="text-muted-foreground">Nexa</p>
                  </div>
                  <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                  <div className="text-center">
                    <p className="font-semibold text-lg text-primary">{acoinReceived}</p>
                    <p className="text-muted-foreground">ACoin</p>
                  </div>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  Fee: {feeAmount} Nexa ({feePercent}%)
                </div>
              </div>
            )}

            <Button
              onClick={handleConvert}
              disabled={isConverting || !nexaAmount || parseInt(nexaAmount) <= 0 || acoinReceived < 1}
              className="w-full"
              size="lg"
            >
              {isConverting ? 'Converting...' : 'Convert to ACoin'}
            </Button>
          </TabsContent>
          
          <TabsContent value="buy" className="space-y-4 mt-4">
            <Alert className="border-blue-500/30 bg-blue-500/10">
              <Send className="w-4 h-4 text-blue-500" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                Buy ACoin instantly via Telegram at <strong>$0.01 per ACoin</strong>
              </AlertDescription>
            </Alert>

            <div className="grid gap-2">
              {ACOIN_PACKAGES.map((pkg) => (
                <div
                  key={pkg.acoin}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold">{pkg.acoin.toLocaleString()} ACoin</p>
                    <p className="text-xs text-muted-foreground">⭐ {pkg.stars} Stars</p>
                  </div>
                  <p className="font-bold text-primary">{pkg.price}</p>
                </div>
              ))}
            </div>

            <Button
              onClick={handleTelegramRecharge}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              Buy via Telegram
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected to our Telegram bot to complete the purchase
            </p>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Card className="p-3">
            <p className="text-muted-foreground text-xs">Current Nexa</p>
            <p className="font-bold text-lg">{currentNexa.toLocaleString()}</p>
          </Card>
          <Card className="p-3">
            <p className="text-muted-foreground text-xs">Current ACoin</p>
            <p className="font-bold text-lg text-primary">{currentACoin}</p>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};