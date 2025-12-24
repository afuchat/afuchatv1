import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Loader2, Check, Trophy, Sparkles, Calendar } from 'lucide-react';
import { DateOfBirthSelector } from '@/components/DateOfBirthSelector';
import { toast } from 'sonner';
import Logo from '@/components/Logo';
import { countries } from '@/lib/countries';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getCountryFlag } from '@/lib/countryFlags';
import { PageSkeleton } from '@/components/skeletons';
import { ButtonLoader } from '@/components/ui/CustomLoader';
import { ReferralWelcomeBanner } from '@/components/gamification/ReferralWelcomeBanner';
import { clearProfileCache } from '@/hooks/useProfileCheck';

const CompleteProfile = () => {
  const { user, loading: authLoading } = useAuth();

  // Redirect non-authenticated users
  if (authLoading) {
    return <PageSkeleton variant="centered" />;
  }

  if (!user) {
    return <Navigate to="/auth/signup" replace />;
  }

  return <CompleteProfileContent user={user} />;
};

interface CompleteProfileContentProps {
  user: { id: string };
}

const CompleteProfileContent = ({ user }: CompleteProfileContentProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showReferralWelcome, setShowReferralWelcome] = useState(false);
  const [referrerName, setReferrerName] = useState<string | undefined>();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    display_name: '',
    handle: '',
    phone_number: '',
    country: '',
    date_of_birth: '',
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string>('');

  // Helper to get cookie value
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  // Check for referral code on mount from multiple sources
  useEffect(() => {
    const checkReferralCode = () => {
      let foundCode: string | null = null;
      
      // 1. Check URL params first (highest priority)
      const urlParams = new URLSearchParams(window.location.search);
      const refFromUrl = urlParams.get('ref');
      if (refFromUrl) {
        foundCode = refFromUrl;
        console.log('[Referral] Found in URL:', foundCode);
      }
      
      // 2. Check cookie (most reliable across OAuth redirects)
      if (!foundCode) {
        const cookieCode = getCookie('afuchat_referral');
        if (cookieCode) {
          foundCode = cookieCode;
          console.log('[Referral] Found in cookie:', foundCode);
        }
      }
      
      // 3. Check localStorage
      if (!foundCode) {
        const pendingDataLocal = localStorage.getItem('pendingSignupData');
        if (pendingDataLocal) {
          try {
            const parsed = JSON.parse(pendingDataLocal);
            if (parsed.referral_code) {
              foundCode = parsed.referral_code;
              console.log('[Referral] Found in localStorage:', foundCode);
            }
          } catch (e) {
            console.error('Error parsing localStorage:', e);
          }
        }
      }
      
      // 4. Check sessionStorage as last resort
      if (!foundCode) {
        const pendingDataSession = sessionStorage.getItem('pendingSignupData');
        if (pendingDataSession) {
          try {
            const parsed = JSON.parse(pendingDataSession);
            if (parsed.referral_code) {
              foundCode = parsed.referral_code;
              console.log('[Referral] Found in sessionStorage:', foundCode);
            }
          } catch (e) {
            console.error('Error parsing sessionStorage:', e);
          }
        }
      }
      
      if (foundCode) {
        console.log('[Referral] Final code set:', foundCode);
        setReferralCode(foundCode);
      } else {
        console.log('[Referral] No referral code found in any source');
      }
    };
    
    checkReferralCode();
  }, []);

  // Load existing profile data on mount
  useEffect(() => {
    const loadExistingProfile = async () => {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('display_name, handle, phone_number, country, avatar_url, date_of_birth')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile:', error);
          return;
        }

        if (profile) {
          setFormData({
            display_name: profile.display_name || '',
            handle: profile.handle || '',
            phone_number: profile.phone_number || '',
            country: profile.country || '',
            date_of_birth: profile.date_of_birth || '',
          });

          if (profile.avatar_url) {
            setExistingAvatarUrl(profile.avatar_url);
            setAvatarPreview(profile.avatar_url);
          }

          const isAlreadyComplete =
            !!profile.display_name &&
            !!profile.handle &&
            !!profile.country &&
            !!profile.avatar_url &&
            !!profile.date_of_birth;

          if (isAlreadyComplete) {
            navigate('/home', { replace: true });
            return;
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadExistingProfile();
  }, [user, navigate]);

  // Process referral reward - returns true if successful
  const processReferral = async (): Promise<boolean> => {
    // Get code from state first, then try all backup sources
    let codeToUse = referralCode;
    
    // Try cookie (most reliable)
    if (!codeToUse) {
      codeToUse = getCookie('afuchat_referral');
      if (codeToUse) console.log('[Referral Process] Got code from cookie:', codeToUse);
    }
    
    // Try URL params
    if (!codeToUse) {
      const urlParams = new URLSearchParams(window.location.search);
      codeToUse = urlParams.get('ref');
      if (codeToUse) console.log('[Referral Process] Got code from URL:', codeToUse);
    }
    
    // Try localStorage
    if (!codeToUse) {
      const pendingDataLocal = localStorage.getItem('pendingSignupData');
      if (pendingDataLocal) {
        try {
          const parsed = JSON.parse(pendingDataLocal);
          if (parsed.referral_code) {
            codeToUse = parsed.referral_code;
            console.log('[Referral Process] Got code from localStorage:', codeToUse);
          }
        } catch (e) {
          console.error('Error parsing localStorage:', e);
        }
      }
    }
    
    if (!codeToUse || !user) {
      console.log('[Referral Process] No referral code or user. Code:', codeToUse, 'User:', user?.id);
      return false;
    }
    
    try {
      console.log('[Referral Process] Calling RPC with code:', codeToUse, 'for user:', user.id);
      
      const { data, error } = await supabase.rpc('process_referral_reward', {
        referral_code_input: codeToUse,
        new_user_id: user.id
      });
      
      if (error) {
        console.error('[Referral Process] RPC error:', error);
        return false;
      }
      
      console.log('[Referral Process] RPC result:', data);
      
      const result = Array.isArray(data) ? data[0] : data;
      
      if (result?.success) {
        if (result.referrer_name) {
          setReferrerName(result.referrer_name);
        }
        
        // Clear all referral storage
        localStorage.removeItem('pendingSignupData');
        sessionStorage.removeItem('pendingSignupData');
        // Clear cookie
        document.cookie = 'afuchat_referral=; path=/; max-age=0';
        
        toast.success('Welcome! You received 1 week free Premium!', {
          description: 'Thank you for joining through a referral link.',
        });
        
        return true;
      }
      
      console.log('[Referral Process] Result not successful:', result);
      return false;
    } catch (error) {
      console.error('[Referral Process] Error:', error);
      return false;
    }
  };

  useEffect(() => {
    calculateProgress();
  }, [formData, avatarFile, existingAvatarUrl, avatarPreview]);

  const calculateProgress = () => {
    let completed = 0;
    const total = 6; // 6 fields total (5 required + 1 optional)
    
    if (formData.display_name) completed++;
    if (formData.handle) completed++;
    if (avatarFile || existingAvatarUrl) completed++;
    if (formData.country) completed++;
    if (formData.date_of_birth) completed++;
    if (formData.phone_number) completed++; // Optional but counts toward progress
    
    setProgress((completed / total) * 100);
  };

  const getStepStatus = (fieldName: string) => {
    switch (fieldName) {
      case 'avatar':
        return (avatarFile || existingAvatarUrl) ? 'complete' : 'pending';
      case 'display_name':
        return formData.display_name ? 'complete' : 'pending';
      case 'handle':
        return formData.handle ? 'complete' : 'pending';
      case 'phone_number':
        return formData.phone_number ? 'complete' : 'pending';
      case 'country':
        return formData.country ? 'complete' : 'pending';
      case 'date_of_birth':
        return formData.date_of_birth ? 'complete' : 'pending';
      default:
        return 'pending';
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    // Use user.id as folder name to match RLS policy: (auth.uid())::text = (storage.foldername(name))[1]
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Normalize handle to lowercase
    const normalizedHandle = formData.handle.toLowerCase().trim();
    
    // Validation - require essential fields including country
    if (!formData.display_name || !normalizedHandle) {
      toast.error('Display name and username are required');
      return;
    }
    
    // Validate handle format
    if (normalizedHandle.length < 4) {
      toast.error('Username must be at least 4 characters');
      return;
    }
    
    if (normalizedHandle.length > 20) {
      toast.error('Username must be less than 20 characters');
      return;
    }
    
    if (!/^[a-z0-9_]+$/.test(normalizedHandle)) {
      toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    if (!formData.country) {
      toast.error('Country selection is required');
      return;
    }
    
    if (!formData.date_of_birth) {
      toast.error('Date of birth is required');
      return;
    }
    
    // Validate age (must be at least 13 years old)
    const dob = new Date(formData.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    if (age < 13) {
      toast.error('You must be at least 13 years old to use this platform');
      return;
    }
    
    // Check if we have an avatar (either new file or existing)
    const hasAvatar = avatarFile || existingAvatarUrl;
    if (!hasAvatar) {
      toast.error('Profile picture is required');
      return;
    }

    setLoading(true);

    try {
      // Check username uniqueness (case-insensitive)
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('handle', normalizedHandle)
        .neq('id', user.id)
        .maybeSingle();
      
      if (existingUser) {
        toast.error('Username is already taken (usernames are case-insensitive)');
        setLoading(false);
        return;
      }
      // Upload avatar only if new file selected
      let avatarUrl = existingAvatarUrl;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (!uploadedUrl) {
          toast.error('Failed to upload profile picture');
          setLoading(false);
          return;
        }
        avatarUrl = uploadedUrl;
      }

      // Check if user has already been rewarded
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completion_rewarded, xp')
        .eq('id', user.id)
        .single();

      const isFullyCompleted = formData.phone_number && formData.country && formData.date_of_birth;
      const shouldReward = isFullyCompleted && !profile?.profile_completion_rewarded;

      // Update profile with normalized handle
      const updateData: any = {
        display_name: formData.display_name.trim(),
        handle: normalizedHandle,
        avatar_url: avatarUrl,
      };

      if (formData.phone_number) updateData.phone_number = formData.phone_number;
      if (formData.country) updateData.country = formData.country;
      if (formData.date_of_birth) updateData.date_of_birth = formData.date_of_birth;

      // Award XP if fully completed and not rewarded before
      if (shouldReward) {
        updateData.xp = (profile?.xp || 0) + 100;
        updateData.profile_completion_rewarded = true;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      // Clear profile cache so route guards re-check
      clearProfileCache(user.id);
      const referralSuccess = await processReferral();

      // Check if this account should be linked to another account
      const linkToUserId = localStorage.getItem('afuchat_link_to_user');
      if (linkToUserId && linkToUserId !== user.id) {
        try {
          // Store new account's session for seamless switching
          const { data: currentSession } = await supabase.auth.getSession();
          if (currentSession?.session) {
            const storedSessions = JSON.parse(localStorage.getItem('afuchat_linked_sessions') || '{}');
            storedSessions[user.id] = {
              access_token: currentSession.session.access_token,
              refresh_token: currentSession.session.refresh_token,
            };
            localStorage.setItem('afuchat_linked_sessions', JSON.stringify(storedSessions));
          }

          // Create bidirectional links
          await supabase
            .from('linked_accounts')
            .upsert([
              { primary_user_id: linkToUserId, linked_user_id: user.id },
              { primary_user_id: user.id, linked_user_id: linkToUserId }
            ], { onConflict: 'primary_user_id,linked_user_id' });
          
          localStorage.removeItem('afuchat_link_to_user');
          toast.success('Account created and linked successfully!');
        } catch (linkError) {
          console.error('Error linking accounts:', linkError);
        }
      }

      // Determine redirect destination (AfuMail signups go to /afumail)
      const afumailRedirect = sessionStorage.getItem('afumail_post_signup_redirect');
      const redirectTo = afumailRedirect ? '/afumail' : '/home';
      sessionStorage.removeItem('afumail_post_signup_redirect');

      if (referralSuccess) {
        // Show referral welcome banner
        setShowReferralWelcome(true);
        // Redirect after 4 seconds
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 4000);
      } else if (shouldReward) {
        setShowRewardModal(true);
        setTimeout(() => {
          setShowRewardModal(false);
          window.location.href = redirectTo;
        }, 3000);
      } else {
        toast.success('Profile completed successfully!');
        window.location.href = redirectTo;
      }
    } catch (error: any) {
      console.error('Profile completion error:', error);
      toast.error(error.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <PageSkeleton variant="centered" />;
  }

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              All fields are required to continue. Phone number is optional but earns rewards!
            </CardDescription>
            
            {/* Progress Indicator */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Profile Progress</span>
                <span className="font-semibold text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {/* Progress Steps */}
              <div className="grid grid-cols-6 gap-1.5 mt-4">
                {[
                  { name: 'avatar', label: 'Photo', icon: Camera, required: true },
                  { name: 'display_name', label: 'Name', icon: Check, required: true },
                  { name: 'handle', label: 'User', icon: Check, required: true },
                  { name: 'country', label: 'Country', icon: Check, required: true },
                  { name: 'date_of_birth', label: 'Birthday', icon: Calendar, required: true },
                  { name: 'phone_number', label: 'Phone', icon: Sparkles, required: false },
                ].map((step) => {
                  const StepIcon = step.icon;
                  const status = getStepStatus(step.name);
                  return (
                    <div
                      key={step.name}
                      className={`flex flex-col items-center gap-1 transition-all ${
                        status === 'complete' ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          status === 'complete'
                            ? 'bg-primary text-primary-foreground scale-110'
                            : 'bg-muted'
                        }`}
                      >
                        {status === 'complete' ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <StepIcon className="h-5 w-5" />
                        )}
                      </div>
                      <span className="text-xs text-center">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center space-y-2">
              <Label>Profile Picture *</Label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="flex items-center justify-center w-24 h-24 rounded-full bg-muted cursor-pointer hover:bg-muted/80 transition-colors overflow-hidden"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </label>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="Your display name"
                required
              />
            </div>

            {/* Username/Handle */}
            <div className="space-y-2">
              <Label htmlFor="handle">Username *</Label>
              <Input
                id="handle"
                value={formData.handle}
                onChange={(e) => setFormData({ ...formData, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                placeholder="username"
                required
              />
            </div>

            {/* Country - Required and cannot be changed after signup */}
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger className="h-12 bg-background">
                  <SelectValue placeholder="Select your country">
                    {formData.country && (
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{getCountryFlag(formData.country)}</span>
                        <span className="font-medium">{formData.country}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[400px] bg-background/98 backdrop-blur-xl border border-border/50 z-50">
                  <div className="p-2">
                    {countries.map((country) => (
                      <SelectItem 
                        key={country} 
                        value={country}
                        className="h-11 cursor-pointer rounded-lg hover:bg-accent/80 focus:bg-accent/80 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getCountryFlag(country)}</span>
                          <span className="font-medium">{country}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                ⚠️ Country cannot be changed after signup
              </p>
            </div>

            {/* Date of Birth - Required */}
            <DateOfBirthSelector
              value={formData.date_of_birth}
              onChange={(value) => setFormData({ ...formData, date_of_birth: value })}
              minAge={13}
            />

            {/* Phone Number - Optional */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number (Optional)</Label>
              <Input
                id="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="+1234567890"
              />
              <p className="text-xs text-muted-foreground">
                Add phone number to earn bonus Nexa!
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <ButtonLoader className="mr-2" />
                  Completing Profile...
                </>
              ) : (
                <>
                  Complete Profile
                  {formData.phone_number && (
                    <Trophy className="h-4 w-4 ml-2 text-yellow-500" />
                  )}
                </>
              )}
            </Button>
            
            {formData.phone_number && (
              <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-500" />
                Complete all fields to earn 100 Nexa reward!
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>

    {/* Reward Modal */}
    <Dialog open={showRewardModal} onOpenChange={setShowRewardModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center animate-scale-in">
              <Trophy className="h-10 w-10 text-white" />
            </div>
          </div>
          <DialogTitle className="text-2xl text-center">Congratulations! 🎉</DialogTitle>
          <DialogDescription className="text-center text-base">
            You've completed your profile and earned your reward!
          </DialogDescription>
        </DialogHeader>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">Profile Completion Reward</p>
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            <span className="text-4xl font-bold text-primary">+100</span>
            <span className="text-2xl font-semibold">Nexa</span>
          </div>
          <p className="text-xs text-muted-foreground">Keep earning by staying active!</p>
        </div>
      </DialogContent>
    </Dialog>

    {/* Referral Welcome Banner */}
    {showReferralWelcome && (
      <ReferralWelcomeBanner 
        referrerName={referrerName}
        onClose={() => {
          setShowReferralWelcome(false);
          window.location.href = '/home';
        }}
      />
    )}
    </>
  );
};

export default CompleteProfile;
