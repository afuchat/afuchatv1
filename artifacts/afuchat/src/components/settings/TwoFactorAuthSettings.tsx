import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Smartphone, Key, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SettingsSection, SettingsRow, SettingsInfoBox } from './SettingsUI';

export const TwoFactorAuthSettings = () => {
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => { if (user) checkEnrollmentStatus(); }, [user]);

  const checkEnrollmentStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const totpFactors = data?.totp || [];
      const verifiedFactor = totpFactors.find(f => f.friendly_name?.includes('Authenticator App'));
      setIsEnrolled(!!verifiedFactor);
      if (verifiedFactor) setFactorId(verifiedFactor.id);
      const oldFactors = totpFactors.filter(f => f.friendly_name?.includes('Authenticator App') && !verifiedFactor);
      for (const factor of oldFactors) {
        try { await supabase.auth.mfa.unenroll({ factorId: factor.id }); } catch {}
      }
    } catch (error) { console.error('Error checking MFA status:', error); }
  };

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const existing = factorsData?.totp?.filter(f => f.friendly_name?.includes('Authenticator App')) || [];
      for (const factor of existing) {
        try { await supabase.auth.mfa.unenroll({ factorId: factor.id }); } catch {}
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Authenticator App ${Date.now()}` });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (error: any) {
      toast.error(error.message || 'Failed to set up 2FA');
      setIsEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || !verificationCode) { toast.error('Please enter the verification code'); return; }
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: verificationCode });
      if (error) throw error;
      setIsEnrolled(true); setIsEnrolling(false); setQrCode(null); setSecret(null); setVerificationCode('');
      toast.success('Two-factor authentication enabled!');
      checkEnrollmentStatus();
    } catch (error: any) { toast.error(error.message || 'Invalid verification code'); }
  };

  const handleDisable = async () => {
    if (!factorId) return;
    setIsDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setIsEnrolled(false); setFactorId(null); setShowDisableConfirm(false);
      toast.success('Two-factor authentication disabled');
    } catch (error: any) { toast.error(error.message || 'Failed to disable 2FA'); }
    finally { setIsDisabling(false); }
  };

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopiedSecret(true);
      toast.success('Secret copied');
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  if (isEnrolling) {
    return (
      <div className="space-y-0">
        <SettingsSection title="Set Up Authenticator">
          <div className="p-4 space-y-4">
            <SettingsInfoBox variant="default" icon={AlertCircle}>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </SettingsInfoBox>

            {qrCode && (
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-white rounded-xl">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
                <div className="w-full">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Or enter manually:</p>
                  <div className="flex gap-2">
                    <Input value={secret || ''} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="icon-sm" onClick={handleCopySecret}>
                      {copiedSecret ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Enter 6-digit code</label>
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-xl tracking-[0.3em] font-mono"
                  maxLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleVerify} disabled={verificationCode.length !== 6} className="flex-1" size="sm">
                  Verify & Enable
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setIsEnrolling(false); setQrCode(null); setSecret(null); setVerificationCode(''); setFactorId(null); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <SettingsSection title="Authenticator App">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Authenticator App</p>
              <p className="text-xs text-muted-foreground">
                {isEnrolled ? '2FA is currently enabled' : 'Add extra security with an authenticator app'}
              </p>
            </div>
          </div>
          {isEnrolled && (
            <SettingsInfoBox variant="success" icon={Check}>
              <span className="font-semibold">Enabled</span> — your account has extra protection
            </SettingsInfoBox>
          )}
          <Button
            variant={isEnrolled ? "outline" : "default"}
            size="sm"
            className="w-full"
            onClick={isEnrolled ? () => setShowDisableConfirm(true) : handleEnroll}
          >
            {isEnrolled ? 'Disable 2FA' : 'Enable 2FA'}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title="How it Works">
        <div className="p-4 space-y-2.5 text-sm text-muted-foreground">
          {[
            'Download an authenticator app (Google Authenticator, Authy)',
            'Scan the QR code or enter the secret key',
            'Enter the 6-digit code to verify',
            'You\'ll need this code every time you sign in',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </SettingsSection>

      <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will be less secure without 2FA. You can always enable it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisable} disabled={isDisabling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDisabling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Disabling...</> : 'Disable 2FA'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
