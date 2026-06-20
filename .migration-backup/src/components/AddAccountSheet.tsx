import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserPlus, Mail, Lock } from 'lucide-react';
import { ButtonLoader } from '@/components/ui/CustomLoader';

interface AddAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddAccountSheet({ open, onOpenChange, onSuccess }: AddAccountSheetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to add accounts');
      return;
    }

    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      // Store current session
      const currentSession = (await supabase.auth.getSession()).data.session;
      
      // Try to sign in with the new account credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        toast.error(signInError.message);
        setLoading(false);
        return;
      }

      const linkedUserId = signInData.user?.id;
      const linkedSession = signInData.session;
      
      if (!linkedUserId || !linkedSession) {
        toast.error('Failed to authenticate the account');
        setLoading(false);
        return;
      }

      // Check if trying to link to self
      if (linkedUserId === user.id) {
        // Sign back to original account
        if (currentSession) {
          await supabase.auth.setSession(currentSession);
        }
        toast.error('You cannot link your own account');
        setLoading(false);
        return;
      }

      // Check if this account is already linked
      const { data: existingLink } = await supabase
        .from('linked_accounts')
        .select('id')
        .or(`and(primary_user_id.eq.${user.id},linked_user_id.eq.${linkedUserId}),and(primary_user_id.eq.${linkedUserId},linked_user_id.eq.${user.id})`)
        .maybeSingle();

      if (existingLink) {
        // Sign back to original account
        if (currentSession) {
          await supabase.auth.setSession(currentSession);
        }
        toast.error('This account is already linked');
        setLoading(false);
        return;
      }

      // Store linked account session for seamless switching
      const storedSessions = JSON.parse(localStorage.getItem('afuchat_linked_sessions') || '{}');
      storedSessions[linkedUserId] = {
        access_token: linkedSession.access_token,
        refresh_token: linkedSession.refresh_token,
      };
      // Also store current user's session for switching back
      if (currentSession) {
        storedSessions[user.id] = {
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        };
      }
      localStorage.setItem('afuchat_linked_sessions', JSON.stringify(storedSessions));

      // Sign back to original account
      if (currentSession) {
        await supabase.auth.setSession(currentSession);
      }

      // Create bidirectional links
      const { error: linkError } = await supabase
        .from('linked_accounts')
        .insert([
          { primary_user_id: user.id, linked_user_id: linkedUserId },
          { primary_user_id: linkedUserId, linked_user_id: user.id },
        ]);

      if (linkError) {
        console.error('Link error:', linkError);
        toast.error('Failed to link account');
        setLoading(false);
        return;
      }

      toast.success('Account linked successfully!');
      setEmail('');
      setPassword('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Add account error:', error);
      toast.error('An error occurred while adding the account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] z-[200]" overlayClassName="z-[200]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Existing Account
          </DrawerTitle>
        </DrawerHeader>
        <form onSubmit={handleAddAccount} className="px-4 pb-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Sign in to another account to link it. You can then switch between accounts instantly.
          </p>

          <div className="space-y-2">
            <Label htmlFor="link-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="link-email"
                type="email"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="link-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="link-password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <ButtonLoader className="mr-2" />
                Linking Account...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Link Account
              </>
            )}
          </Button>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
