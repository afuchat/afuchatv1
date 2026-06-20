import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Share2, QrCode as QrCodeIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';

const QRCode = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const profileUrl = `${window.location.origin}/${profile?.handle}`;

  const handleDownload = () => {
    const svg = document.getElementById('qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${profile?.handle}-qr-code.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('QR code downloaded!');
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile?.display_name} on AfuChat`,
          text: `Check out my profile!`,
          url: profileUrl
        });
      } else {
        await navigator.clipboard.writeText(profileUrl);
        toast.success('Profile URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader 
        title="My QR Code" 
        subtitle="Share your profile"
        icon={<QrCodeIcon className="h-5 w-5 text-primary" />}
      />

      {/* Main Content */}
      <main className="container max-w-md mx-auto px-4 sm:px-6 py-8 pb-24">

        <Card>
          <CardHeader className="text-center">
            <div className="flex flex-col items-center gap-4 mb-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>{profile.display_name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{profile.display_name}</CardTitle>
                <CardDescription className="text-base">@{profile.handle}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            {/* QR Code */}
            <div className="bg-white p-6 rounded-lg">
              <QRCodeSVG
                id="qr-code"
                value={profileUrl}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Scan this code to view my profile
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>

            {/* Profile URL */}
            <div className="w-full p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Profile URL</p>
              <p className="text-sm font-mono break-all">{profileUrl}</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default QRCode;
