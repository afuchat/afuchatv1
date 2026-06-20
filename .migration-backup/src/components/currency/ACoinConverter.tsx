import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNexa } from '@/hooks/useNexa';
import { Coins, ArrowRightLeft, Info, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PesapalPaymentDialog } from './PesapalPaymentDialog';

interface ACoinConverterProps {
  currentNexa: number;
  currentACoin: number;
  onConversionSuccess?: () => void;
}

export const ACoinConverter = ({ currentNexa, currentACoin, onConversionSuccess }: ACoinConverterProps) => {
  const [nexaAmount, setNexaAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [showPesapalDialog, setShowPesapalDialog] = useState(false);
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

  return (
    <>
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
              <TabsTrigger value="buy">Buy ACoin</TabsTrigger>
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
              <Alert className="border-yellow-500/30 bg-yellow-500/10">
                <CreditCard className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                  Buy ACoin instantly with Mobile Money, Card, or Bank Transfer
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-muted/50 rounded-lg text-center space-y-2">
                <Coins className="w-12 h-12 text-yellow-500 mx-auto" />
                <p className="font-semibold">Purchase ACoin</p>
                <p className="text-sm text-muted-foreground">
                  Secure payment powered by PesaPal
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports MTN, Airtel, Visa, Mastercard & more
                </p>
              </div>

              <Button
                onClick={() => setShowPesapalDialog(true)}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                size="lg"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Buy ACoin Now
              </Button>
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

      <PesapalPaymentDialog
        open={showPesapalDialog}
        onOpenChange={setShowPesapalDialog}
        onSuccess={onConversionSuccess}
      />
    </>
  );
};