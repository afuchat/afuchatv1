import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Mail } from 'lucide-react';
import { emailSchema } from '@/lib/validation';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      emailSchema.parse(email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://afuchat.com/auth/reset-password',
      });
      if (error) throw error;
      toast.success('Reset link sent!');
      setEmailSent(true);
    } catch (error: any) {
      toast.error(error.errors?.[0]?.message || error.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-sm mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-8"
        >
          {/* Back */}
          <button onClick={() => navigate('/auth/signin')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
            <p className="text-sm text-muted-foreground">
              {emailSent
                ? "We've sent you a reset link. Check your inbox."
                : "Enter your email and we'll send you a reset link."}
            </p>
          </div>

          {emailSent ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm text-foreground">
                  Check <span className="font-medium">{email}</span> for the reset link. Don't forget to check spam.
                </p>
              </div>

              <button
                onClick={() => navigate('/auth/signin')}
                className="w-full h-11 rounded-xl border border-border text-foreground font-medium text-sm hover:bg-muted/50 transition-colors"
              >
                Back to sign in
              </button>

              <button
                onClick={() => setEmailSent(false)}
                className="w-full text-sm text-primary hover:underline"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-11 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>

              <p className="text-sm text-center">
                <Link to="/auth/signin" className="text-primary hover:underline">Back to sign in</Link>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
