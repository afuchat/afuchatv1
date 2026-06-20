import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
// X is only imported for use in the password toggle now
import { X, Eye, EyeOff, User, AtSign, Mail, Lock, MessageCircle, ShoppingCart, Cpu } from 'lucide-react'; 
import Logo from '@/components/Logo';
import { emailSchema, passwordSchema, handleSchema, displayNameSchema } from '@/lib/validation';
import { countries } from '@/lib/countries';

interface AuthSheetContentProps {
  onClose: () => void;
}

interface AuthSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuthSheetContent: React.FC<AuthSheetContentProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [country, setCountry] = useState('');

  // Capture referral code from URL
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs
      try {
        emailSchema.parse(email);
        passwordSchema.parse(password);
        if (isSignUp) {
          handleSchema.parse(handle);
          displayNameSchema.parse(displayName);
        }
      } catch (error: any) {
        toast.error(error.errors?.[0]?.message || 'Validation failed');
        setLoading(false);
        return;
      }

      if (isSignUp) {
        const signupData: any = {
          display_name: displayName,
          handle,
          country,
        };

        // Include referral code if present
        if (referralCode) {
          signupData.referral_code = referralCode;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: signupData,
            emailRedirectTo: `${window.location.origin}/home`,
          },
        });
        if (error) throw error;
        toast.success('Account created! Check your email for verification.');
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            if (error.message.includes('Email not confirmed')) {
                toast.error('Email not confirmed. Please check your inbox for a verification link.');
            } else {
                throw error;
            }
        }
        toast.success('Signed in successfully!');
        onClose();
        navigate('/home');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleForgotPassword = () => {
    toast.info("Forgot Password functionality pending implementation.");
    // navigate('/reset-password'); // Uncomment and implement actual navigation/flow
  };

  return (
    <Card className="w-full rounded-2xl flex flex-col h-full bg-card">
      <CardHeader className="pt-4 pb-2 relative flex flex-col items-center">
        {/* The icon has been removed from here */}

        <Logo size="sm" className="mb-2" />
        <CardTitle className="text-lg font-bold text-center bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </CardTitle>
        <CardDescription className="text-xs text-center text-muted-foreground leading-snug">
          Post. Chat. Shop. AI. All in One
        </CardDescription>
        
        {referralCode && isSignUp && (
          <div className="mt-2 text-xs text-center text-primary font-medium">
            🎉 Signing up with a referral code!
          </div>
        )}

        {/* Mini feature section */}
        <div className="flex justify-center gap-4 mt-3">
          <div className="flex flex-col items-center text-center text-xs text-muted-foreground">
            <MessageCircle className="h-5 w-5 text-primary mb-1" />
            Post
          </div>
          <div className="flex flex-col items-center text-center text-xs text-muted-foreground">
            <Cpu className="h-5 w-5 text-primary mb-1" />
            AI
          </div>
          <div className="flex flex-col items-center text-center text-xs text-muted-foreground">
            <ShoppingCart className="h-5 w-5 text-primary mb-1" />
            Shop
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4 flex-1 overflow-y-auto flex flex-col">
        <form onSubmit={handleAuth} className="space-y-3 flex-1">
          {isSignUp && (
            <>
              <div className="space-y-0.5">
                <Label htmlFor="displayName" className="text-xs font-medium flex items-center gap-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  Display Name
                </Label>
                <div className="relative">
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Full name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="h-9 pl-7 pr-2 text-xs bg-background/80 backdrop-blur-sm border border-border/40 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-md"
                  />
                  <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="handle" className="text-xs font-medium flex items-center gap-1">
                  <AtSign className="h-3 w-3 text-muted-foreground" />
                  Handle
                </Label>
                <div className="relative">
                  <Input
                    id="handle"
                    type="text"
                    placeholder="@handle"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    required
                    className="h-9 pl-7 pr-2 text-xs bg-background/80 backdrop-blur-sm border border-border/40 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-md"
                  />
                  <AtSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            </>
          )}

          {isSignUp && (
            <div className="space-y-0.5">
              <Label htmlFor="country" className="text-xs font-medium">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-9 text-xs bg-background/80">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {countries.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-0.5">
            <Label htmlFor="email" className="text-xs font-medium flex items-center gap-1">
              <Mail className="h-3 w-3 text-muted-foreground" />
              Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 pl-7 pr-2 text-xs bg-background/80 backdrop-blur-sm border border-border/40 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-md"
              />
              <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="password" className="text-xs font-medium flex items-center gap-1">
              <Lock className="h-3 w-3 text-muted-foreground" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 6 chars"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-9 pl-7 pr-9 text-xs bg-background/80 backdrop-blur-sm border border-border/40 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-md"
              />
              <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 p-0 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {/* X is now only imported and available here for the password toggle */}
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Added 'Forgot Password' Link */}
          {!isSignUp && (
            <div className="text-right pb-1">
                <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] text-primary/80 hover:text-primary transition-colors font-medium underline"
                >
                    Forgot Password?
                </button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-9 text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-100 bg-gradient-to-r from-primary to-secondary hover:from-primary/90"
            disabled={loading}
          >
            {loading ? (
              <>
                
                Processing...
              </>
            ) : isSignUp ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-3 text-center flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors duration-100"
          >
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span className="font-medium underline hover:no-underline">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

const AuthSheet: React.FC<AuthSheetProps> = ({ isOpen, onOpenChange }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        // ADDED 'data-[state=open]:[&>button]:hidden' to hide the built-in Radix close button (the X icon)
        className="w-full max-w-[320px] sm:max-w-xs lg:max-w-sm mx-auto p-3 max-h-[95vh] overflow-hidden rounded-2xl bg-card data-[state=open]:[&>button]:hidden"
      >
        <div className="h-full flex flex-col
          data-[state=open]:animate-in
          data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0
          data-[state=open]:fade-in-0
          data-[state=closed]:zoom-out-95
          data-[state=open]:zoom-in-95
          data-[state=closed]:slide-out-to-left-1/2
          data-[state=closed]:slide-out-to-top-[48%]
          data-[state=open]:slide-in-from-left-1/2
          data-[state=open]:slide-in-from-top-[48%]"
        >
          <AuthSheetContent onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthSheet;
