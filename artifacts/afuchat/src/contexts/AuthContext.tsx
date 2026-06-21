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
            p_expires_at: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : undefined
          }).then()
        ]);
      } catch {
        // Silent fail - don't block user experience
      }
    };

    // Safety timeout — if auth never resolves (Supabase unreachable, network hang),
    // force loading=false after 5 s so the app is never permanently stuck on a spinner.
    const authTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 5000);

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
                clearTimeout(authTimeout);
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
        
        clearTimeout(authTimeout);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          setTimeout(() => recordUserSession(session), 100);
          
          // Check for pending signup data from OAuth flow
          if (event === 'SIGNED_IN' && session) {
            // Use localStorage (more reliable across OAuth redirects)
            const pendingSignupData = localStorage.getItem('pendingSignupData');
            
            if (pendingSignupData) {
              try {
                const signupData = JSON.parse(pendingSignupData);
                localStorage.removeItem('pendingSignupData');
                
                // Build update object with only non-empty values
                const updateData: Record<string, any> = {};
                if (signupData.country) updateData.country = signupData.country;
                if (signupData.is_business_mode !== undefined) updateData.is_business_mode = signupData.is_business_mode;
                
                // Only update if there's data to update
                if (Object.keys(updateData).length > 0) {
                  // Wait a moment for profile to be created by trigger
                  setTimeout(async () => {
                    const { error } = await (supabase
                      .from('profiles') as any)
                      .update(updateData)
                      .eq('id', session.user.id);
                    
                    if (error) {
                      console.error('Error updating profile with signup data:', error);
                    }
                  }, 500);
                }
              } catch (e) {
                console.error('Error parsing pending signup data:', e);
              }
            }
            
            // Also check user metadata for country (email signup flow)
            const userMetadata = session.user.user_metadata;
            if (userMetadata?.country && !pendingSignupData) {
              setTimeout(async () => {
                // Check if country is already set
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('country')
                  .eq('id', session.user.id)
                  .maybeSingle();
                
                if (profile && !profile.country) {
                  const updateData: Record<string, any> = {
                    country: userMetadata.country,
                  };
                  if (userMetadata.is_business_mode !== undefined) {
                    updateData.is_business_mode = userMetadata.is_business_mode;
                  }
                  
                  await (supabase
                    .from('profiles') as any)
                    .update(updateData)
                    .eq('id', session.user.id);
                }
              }, 500);
            }
            
            const currentPath = window.location.pathname;
            
            // Skip profile check if already on onboarding page
            if (currentPath === '/onboarding' || currentPath === '/complete-profile') {
              return;
            }
            
            // Check if essential profile fields are complete (include country + avatar + DOB)
            supabase
              .from('profiles')
              .select('display_name, handle, country, avatar_url, date_of_birth')
              .eq('id', session.user.id)
              .maybeSingle()
              .then(({ data: profile, error }) => {
                // If we got a hard error (network/permission), don't lock users in a redirect loop.
                if (error) {
                  console.error('Profile check error:', error);
                  return;
                }

                // If profile row is missing or essential fields are missing, then user must complete profile.
                const hasEssentialFields =
                  !!profile?.display_name &&
                  !!profile?.handle &&
                  !!profile?.country &&
                  !!profile?.avatar_url &&
                  !!profile?.date_of_birth;

                // If on landing/auth pages
                if (currentPath === '/' || currentPath.startsWith('/auth')) {
                  window.location.href = '/home';
                }
              });
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!isMounted) return;
        clearTimeout(authTimeout);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session) {
          setTimeout(() => recordUserSession(session), 100);
        }
      })
      .catch((error) => {
        console.error('Error getting session:', error);
        if (isMounted) {
          clearTimeout(authTimeout);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
