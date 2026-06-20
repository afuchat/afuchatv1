import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AdGateProps {
  onAdWatched: () => void;
  gameName: string;
}

export const AdGate = ({ onAdWatched, gameName }: AdGateProps) => {
  const [open, setOpen] = useState(true);
  const [adWatching, setAdWatching] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (adWatching && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (adWatching && countdown === 0) {
      // Ad finished watching
      handleAdComplete();
    }
  }, [adWatching, countdown]);

  const handleWatchAd = () => {
    setAdWatching(true);
    setCountdown(5); // 5 second ad simulation
  };

  const handleAdComplete = () => {
    toast({
      title: "Ad completed!",
      description: `You can now play ${gameName}`,
    });
    setOpen(false);
    onAdWatched();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Watch Ad to Play</DialogTitle>
          <DialogDescription className="text-base">
            Watch a short ad to unlock {gameName} and start playing!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-6">
          {/* Ad Container */}
          <div className="relative border-2 border-border rounded-xl overflow-hidden bg-accent/10 min-h-[300px] flex items-center justify-center">
            {!adWatching ? (
              <div className="text-center space-y-4 p-6">
                <div className="text-6xl">🎮</div>
                <p className="text-muted-foreground">
                  Click below to watch a 5-second ad
                </p>
              </div>
            ) : (
              <div className="text-center space-y-6 p-6">
                <div className="relative">
                  <div className="text-8xl font-bold text-primary animate-pulse">
                    {countdown}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Please wait...
                  </p>
                </div>
                
                {/* Simulated Ad Content */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Ad playing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          {!adWatching ? (
            <Button
              onClick={handleWatchAd}
              size="lg"
              className="w-full h-14 text-lg font-semibold"
            >
              Watch Ad ({5} seconds)
            </Button>
          ) : (
            <Button
              disabled
              size="lg"
              className="w-full h-14 text-lg font-semibold"
            >
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Watching Ad... {countdown}s
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};