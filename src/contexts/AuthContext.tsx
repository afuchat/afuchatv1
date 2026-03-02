import * as React from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    
    // Function to record session and login
    const recordUserSession = async (session: Session) => {
      if (!session?.user || !session?.access_token || !isMounted) return;
      
      try {
        const userAgent = navigator.userAgent;
        const browser = userAgent.includes('Chrome') ? 'Chrome' 
          : userAgent.includes('Firefox') ? 'Firefox'
          : userAgent.includes('Safari') ? 'Safari'
          : 'Unknown';
        
        const deviceName = /Mobile|Android|iPhone|iPad/.test(userAgent) 
          ? 'Mobile Device' 
          : 'Desktop';

        // Record login history and session - fire and forget
        await Promise.all([
          supabase.rpc('record_login_attempt', {
            p_user_id: session.user.id,
            p_success: true,
            p_user_agent: userAgent
          }).then(),
          supabase.rpc('upsert_active_session', {
            p_user_id: session.user.id,
            p_session_token: session.access_token,
            p_device_name: deviceName,
            p_browser: browser,
            p_expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
          }).then()
        ]);
      } catch {
        // Silent fail - don't block user experience
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        // For OAuth sign-ins, check if user already has an account
        if (event === 'SIGNED_IN' && session) {
          const provider = session.user.app_metadata?.provider;
          const isOAuthProvider = provider && provider !== 'email';
          
        if (isOAuthProvider) {
            // Check for pending signup data - use localStorage (more reliable across OAuth redirects)
            const pendingSignupData = localStorage.getItem('pendingSignupData');
            
            // Check if this is a brand new OAuth user by comparing timestamps
            const userCreatedAt = new Date(session.user.created_at).getTime();
            const now = Date.now();
            
            // If user was created within last 30 seconds and no pending signup data, it's unauthorized OAuth login
            const isNewAccount = (now - userCreatedAt < 30000);
            
            if (isNewAccount && !pendingSignupData) {
              try {
                // Sign them out silently
                await supabase.auth.signOut();
                
                // Delete the auto-created profile (best effort)
                await supabase.from('profiles').delete().eq('id', session.user.id);
              } catch {
                // Ignore errors during cleanup
              }
              
              if (isMounted) {
                setSession(null);
                setUser(null);
                setLoading(false);
              }
              
              // Redirect to signup silently
              window.location.href = '/auth/signup';
              return;
            }
          }
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          setTimeout(() => recordUserSession(session), 100);
          
          if (event === 'SIGNED_IN') {
            const currentPath = window.location.pathname;
            
            // If already on onboarding, just ensure step is correct
            if (currentPath === '/onboarding' || currentPath === '/complete-profile') {
              const savedStep = localStorage.getItem('onboarding_step');
              if (!savedStep || savedStep === '0') {
                localStorage.setItem('onboarding_step', '1');
              }
              return;
            }
            
            // Apply pending signup data (country, business mode) from OAuth
            const pendingSignupData = localStorage.getItem('pendingSignupData');
            if (pendingSignupData) {
              try {
                const signupData = JSON.parse(pendingSignupData);
                // Don't remove yet - onboarding needs referral_code from it
                const updateData: Record<string, any> = {};
                if (signupData.country) updateData.country = signupData.country;
                if (signupData.is_business_mode !== undefined) updateData.is_business_mode = signupData.is_business_mode;
                
                if (Object.keys(updateData).length > 0) {
                  setTimeout(async () => {
                    await supabase
                      .from('profiles')
                      .update(updateData)
                      .eq('id', session.user.id);
                  }, 500);
                }
              } catch (e) {
                console.error('Error parsing pending signup data:', e);
              }
            }
            
            // Apply user metadata country (email signup flow)
            const userMetadata = session.user.user_metadata;
            if (userMetadata?.country && !pendingSignupData) {
              setTimeout(async () => {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('country')
                  .eq('id', session.user.id)
                  .maybeSingle();
                
                if (profile && !profile.country) {
                  const updateData: Record<string, any> = { country: userMetadata.country };
                  if (userMetadata.is_business_mode !== undefined) {
                    updateData.is_business_mode = userMetadata.is_business_mode;
                  }
                  await supabase
                    .from('profiles')
                    .update(updateData)
                    .eq('id', session.user.id);
                }
              }, 500);
            }
            
            // Only redirect if on landing/auth pages
            if (currentPath === '/' || currentPath.startsWith('/auth') || currentPath === '/welcome') {
              // Check profile completion to decide destination
              setTimeout(() => {
                supabase
                  .from('profiles')
                  .select('display_name, handle, country, avatar_url, date_of_birth')
                  .eq('id', session.user.id)
                  .maybeSingle()
                  .then(({ data: profile, error }) => {
                    if (error) {
                      console.error('Profile check error:', error);
                      return;
                    }

                    const hasEssentialFields =
                      !!profile?.display_name &&
                      !!profile?.handle &&
                      !!profile?.country &&
                      !!profile?.avatar_url &&
                      !!profile?.date_of_birth;

                    if (hasEssentialFields) {
                      window.location.href = '/home';
                    } else {
                      localStorage.setItem('onboarding_step', '1');
                      window.location.href = '/onboarding';
                    }
                  });
              }, 300);
            }
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session) {
          setTimeout(() => recordUserSession(session), 100);
        }
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
