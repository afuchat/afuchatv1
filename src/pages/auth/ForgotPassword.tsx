import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { X, ArrowLeft } from 'lucide-react';
import Logo from '@/components/Logo';
import { emailSchema } from '@/lib/validation';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      emailSchema.parse(email);

      // Generate the reset link using Supabase with production redirect
      const redirectUrl = 'https://afuchat.com/auth/reset-password';
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
      setEmailSent(true);
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || error.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background animate-fade-in">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/auth/signin')}
            className="mb-4"
          >
            <X className="h-5 w-5" />
          </Button>
          <Logo size="md" className="mb-6" />
          <h1 className="text-3xl font-bold mb-2">Reset your password</h1>
          <p className="text-muted-foreground">
            {emailSent
              ? 'We sent you an email with a link to reset your password.'
              : "Enter your email address and we'll send you a link to reset your password."}
          </p>
        </div>

        {emailSent ? (
          <div className="space-y-6 animate-scale-in">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                Check your email ({email}) for a password reset link. If you don't see it, check
                your spam folder.
              </p>
            </div>

            <Button
              onClick={() => navigate('/auth/signin')}
              variant="outline"
              className="w-full h-12 text-base"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setEmailSent(false)}
                className="text-sm text-primary hover:underline"
              >
                Try a different email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>

            <div className="text-center">
              <Link to="/auth/signin" className="text-sm text-primary hover:underline">
                <ArrowLeft className="inline mr-1 h-3 w-3" />
                Back to sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
