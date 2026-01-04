import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { countries, detectUserCountry, getCountryPhoneCode, getPhoneLimits, validatePhoneLength } from '@/lib/countries';
import { getCountryFlag } from '@/lib/countryFlags';
import { DateOfBirthSelector } from '@/components/DateOfBirthSelector';
import { clearProfileCache } from '@/hooks/useProfileCheck';
import { ReferralWelcomeBanner } from '@/components/gamification/ReferralWelcomeBanner';
import { validateUsernameFormat } from '@/lib/validation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { 
  ArrowRight, 
  ArrowLeft, 
  Camera, 
  Check, 
  Sparkles, 
  User, 
  Mail, 
  Lock,
  Eye,
  EyeOff,
  Palette,
  Music,
  Gamepad2,
  BookOpen,
  Film,
  Utensils,
  Plane,
  Dumbbell,
  Code,
  Heart,
  MessageCircle,
  Gift,
  Trophy,
  Zap,
  Store,
  Globe,
  ChevronsUpDown,
  MapPin,
  Phone,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'auth', title: 'Account', icon: User },
  { id: 'accountType', title: 'Type', icon: Store },
  { id: 'profile', title: 'Profile', icon: Camera },
  { id: 'interests', title: 'Interests', icon: Heart },
  { id: 'suggestions', title: 'Connect', icon: Users },
  { id: 'tour', title: 'Explore', icon: Globe },
];

// Pinned recommended users
const PINNED_USERNAMES = ['afuchat', 'amkaweesi'];

// Account types
const ACCOUNT_TYPES = [
  { 
    id: 'personal', 
    title: 'Personal', 
    description: 'Connect with friends and share your moments',
    icon: User,
    color: 'from-blue-500 to-cyan-500'
  },
  { 
    id: 'business', 
    title: 'Business', 
    description: 'Promote your brand and reach customers',
    icon: Store,
    color: 'from-purple-500 to-pink-500'
  },
];

const FEATURES = [
  { 
    id: 'chat', 
    title: 'Chat & Connect', 
    description: 'Message friends with real-time chat, voice messages, and more',
    icon: MessageCircle,
    color: 'from-blue-500 to-cyan-500',
    path: '/chats'
  },
  { 
    id: 'gifts', 
    title: 'Send Gifts', 
    description: 'Surprise friends with virtual gifts and show appreciation',
    icon: Gift,
    color: 'from-pink-500 to-rose-500',
    path: '/gifts'
  },
  { 
    id: 'games', 
    title: 'Play Games', 
    description: 'Challenge friends to fun mini-games and earn rewards',
    icon: Gamepad2,
    color: 'from-purple-500 to-indigo-500',
    path: '/games'
  },
  { 
    id: 'leaderboard', 
    title: 'Climb Rankings', 
    description: 'Compete with others and rise to the top of leaderboards',
    icon: Trophy,
    color: 'from-amber-500 to-orange-500',
    path: '/leaderboard'
  },
  { 
    id: 'miniapps', 
    title: 'Mini Programs', 
    description: 'Explore a world of apps right inside AfuChat',
    icon: Zap,
    color: 'from-emerald-500 to-teal-500',
    path: '/mini-programs'
  },
  { 
    id: 'shop', 
    title: 'Shop & Earn', 
    description: 'Discover products and earn rewards on purchases',
    icon: Store,
    color: 'from-violet-500 to-purple-500',
    path: '/shop'
  },
];

const INTERESTS = [
  { id: 'art', label: 'Art & Design', icon: Palette },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'movies', label: 'Movies & TV', icon: Film },
  { id: 'food', label: 'Food & Cooking', icon: Utensils },
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell },
  { id: 'tech', label: 'Technology', icon: Code },
];

interface SuggestedUser {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  isPinned?: boolean;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Auth state
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [existingAvatarUrl, setExistingAvatarUrl] = useState('');
  const [country, setCountry] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  
  // Validation states
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  // Interests state
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  // Account type state
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  
  // Suggested users state
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followedUsers, setFollowedUsers] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Referral & reward state
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showReferralWelcome, setShowReferralWelcome] = useState(false);
  const [referrerName, setReferrerName] = useState<string | undefined>();

  // Debounced username check
  useEffect(() => {
    if (!handle || handle.length < 4) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    const formatCheck = validateUsernameFormat(handle);
    if (!formatCheck.valid) {
      setUsernameStatus('invalid');
      setUsernameMessage(formatCheck.message);
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .ilike('handle', handle.toLowerCase())
          .neq('id', user?.id || '')
          .maybeSingle();
        
        if (data) {
          setUsernameStatus('taken');
          setUsernameMessage('Username taken');
        } else {
          setUsernameStatus('available');
          setUsernameMessage('Available');
        }
      } catch {
        setUsernameStatus('idle');
        setUsernameMessage('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [handle, user?.id]);

  // Phone number validation (length + uniqueness)
  useEffect(() => {
    if (!phoneNumber || !country) {
      setPhoneError('');
      return;
    }
    
    // First validate length
    const result = validatePhoneLength(country, phoneNumber);
    if (result.message) {
      setPhoneError(result.message);
      return;
    }
    
    // Then check uniqueness with debounce
    const fullPhoneNumber = getCountryPhoneCode(country) + phoneNumber;
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone_number', fullPhoneNumber)
          .neq('id', user?.id || '')
          .maybeSingle();
        
        if (data) {
          setPhoneError('This phone number is already registered');
        } else {
          setPhoneError('');
        }
      } catch {
        // Ignore errors silently
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [phoneNumber, country, user?.id]);

  // Helper to get cookie value
  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  // Check for referral code on mount
  useEffect(() => {
    const checkReferralCode = () => {
      let foundCode: string | null = null;
      
      const urlParams = new URLSearchParams(window.location.search);
      const refFromUrl = urlParams.get('ref');
      if (refFromUrl) foundCode = refFromUrl;
      
      if (!foundCode) {
        const cookieCode = getCookie('afuchat_referral');
        if (cookieCode) foundCode = cookieCode;
      }
      
      if (!foundCode) {
        const pendingDataLocal = localStorage.getItem('pendingSignupData');
        if (pendingDataLocal) {
          try {
            const parsed = JSON.parse(pendingDataLocal);
            if (parsed.referral_code) foundCode = parsed.referral_code;
          } catch (e) {}
        }
      }
      
      if (!foundCode) {
        const pendingDataSession = sessionStorage.getItem('pendingSignupData');
        if (pendingDataSession) {
          try {
            const parsed = JSON.parse(pendingDataSession);
            if (parsed.referral_code) foundCode = parsed.referral_code;
          } catch (e) {}
        }
      }
      
      if (foundCode) setReferralCode(foundCode);
    };
    
    checkReferralCode();
  }, []);

  // Auto-detect country on mount
  useEffect(() => {
    const autoDetectCountry = async () => {
      const detected = await detectUserCountry();
      if (detected && countries.includes(detected)) {
        setCountry(detected);
      }
    };
    autoDetectCountry();
  }, []);

  // Skip to correct step if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      if (currentStep < 2) {
        setCurrentStep(2); // Go to account type selection
      }
      loadProfileData();
    }
  }, [user, authLoading]);

  const loadProfileData = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, handle, bio, avatar_url, interests, country, date_of_birth, phone_number')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profile) {
      if (profile.display_name) setDisplayName(profile.display_name);
      if (profile.handle) setHandle(profile.handle);
      if (profile.bio) setBio(profile.bio);
      if (profile.avatar_url) {
        setAvatarPreview(profile.avatar_url);
        setExistingAvatarUrl(profile.avatar_url);
      }
      if (profile.interests) setSelectedInterests(profile.interests as string[]);
      if (profile.country) setCountry(profile.country);
      if (profile.date_of_birth) setDateOfBirth(profile.date_of_birth);
      if (profile.phone_number) setPhoneNumber(profile.phone_number);
      
      // Check if profile is already complete
      const isComplete = profile.display_name && profile.handle && profile.country && 
                        profile.date_of_birth && profile.avatar_url;
      if (isComplete) {
        navigate('/home', { replace: true });
      }
    }
  };

  const loadSuggestedUsers = async () => {
    if (!user) return;
    setLoadingSuggestions(true);
    
    try {
      // Fetch pinned users first
      const { data: pinnedUsers } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, bio')
        .in('handle', PINNED_USERNAMES)
        .neq('id', user.id);
      
      // Fetch other random users
      const { data: otherUsers } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, bio')
        .neq('id', user.id)
        .not('handle', 'in', `(${PINNED_USERNAMES.join(',')})`)
        .not('avatar_url', 'is', null)
        .limit(10);
      
      // Mark pinned users and shuffle others
      const pinned = (pinnedUsers || []).map(u => ({ ...u, isPinned: true }));
      const others = (otherUsers || []).sort(() => Math.random() - 0.5);
      
      // Combine: pinned first, then random others
      setSuggestedUsers([...pinned, ...others]);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Process referral reward
  const processReferral = async (): Promise<boolean> => {
    let codeToUse = referralCode || getCookie('afuchat_referral');
    
    if (!codeToUse) {
      const urlParams = new URLSearchParams(window.location.search);
      codeToUse = urlParams.get('ref');
    }
    
    if (!codeToUse || !user) return false;
    
    try {
      const { data, error } = await supabase.rpc('process_referral_reward', {
        referral_code_input: codeToUse,
        new_user_id: user.id
      });
      
      if (error) return false;
      
      const result = Array.isArray(data) ? data[0] : data;
      
      if (result?.success) {
        if (result.referrer_name) setReferrerName(result.referrer_name);
        
        localStorage.removeItem('pendingSignupData');
        sessionStorage.removeItem('pendingSignupData');
        document.cookie = 'afuchat_referral=; path=/; max-age=0';
        
        toast.success('Welcome! You received 1 week free Premium!');
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleAuth = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'signup') {
        const redirectUrl = `${window.location.origin}/onboarding`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl }
        });
        if (error) throw error;
        toast.success('Account created! Check your email to verify.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Welcome back!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    
    try {
      // Determine file extension and content type
      const fileExt = avatarFile.name?.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = avatarFile.type || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { 
          upsert: true,
          contentType,
          cacheControl: '3600'
        });

      if (error) {
        console.error('Avatar upload error:', error);
        return null;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error('Avatar upload exception:', err);
      return null;
    }
  };

  const handleProfileSubmit = async () => {
    if (!user) return;
    
    const normalizedHandle = handle.toLowerCase().trim();
    
    // Validation with toast feedback
    if (!displayName.trim()) {
      toast.error('Please enter your display name');
      return;
    }
    
    if (!normalizedHandle) {
      toast.error('Please enter a username');
      return;
    }
    
    if (normalizedHandle.length < 4) {
      toast.error('Username must be at least 4 characters');
      return;
    }
    
    if (!/^[a-z0-9_]+$/.test(normalizedHandle)) {
      toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    if (!country) {
      toast.error('Please select your country');
      return;
    }
    
    if (!dateOfBirth) {
      toast.error('Please enter your date of birth');
      return;
    }

    // Check username availability
    if (usernameStatus === 'taken') {
      toast.error('This username is already taken');
      return;
    }
    
    if (usernameStatus === 'invalid') {
      toast.error('Please enter a valid username');
      return;
    }

    // Validate phone if provided
    if (phoneNumber && phoneError) {
      toast.error(phoneError);
      return;
    }

    // Validate age (must be at least 13)
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age;
    
    if (actualAge < 13) {
      toast.error('You must be at least 13 years old to use AfuChat');
      return;
    }

    // Check avatar
    const hasAvatar = avatarFile || existingAvatarUrl;
    if (!hasAvatar) {
      toast.error('Please add a profile picture');
      return;
    }

    setLoading(true);
    try {
      // Double-check username uniqueness
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .ilike('handle', normalizedHandle)
        .neq('id', user.id)
        .maybeSingle();
      
      if (existingUser) {
        setUsernameStatus('taken');
        setUsernameMessage('Username taken');
        setLoading(false);
        return;
      }

      // Upload avatar if new file
      let avatarUrl = existingAvatarUrl;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) avatarUrl = uploadedUrl;
        else {
          toast.error('Failed to upload profile picture');
          setLoading(false);
          return;
        }
      }

      // Check if user should be rewarded
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completion_rewarded, xp')
        .eq('id', user.id)
        .single();

      const isFullyCompleted = phoneNumber && country && dateOfBirth;
      const shouldReward = isFullyCompleted && !profile?.profile_completion_rewarded;

      const updateData: any = {
        display_name: displayName.trim(),
        handle: normalizedHandle,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        country: country,
        date_of_birth: dateOfBirth,
      };

      if (phoneNumber) {
        const fullPhoneNumber = getCountryPhoneCode(country) + phoneNumber;
        updateData.phone_number = fullPhoneNumber;
      }

      if (shouldReward) {
        updateData.xp = (profile?.xp || 0) + 100;
        updateData.profile_completion_rewarded = true;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;
      
      clearProfileCache(user.id);
      
      if (shouldReward) {
        setShowRewardModal(true);
        setTimeout(() => {
          setShowRewardModal(false);
          setCurrentStep(4);
        }, 2500);
      } else {
        setCurrentStep(4);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestsSubmit = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ interests: selectedInterests })
        .eq('id', user.id);

      if (error) throw error;
      
      // Load suggested users and go to suggestions step
      await loadSuggestedUsers();
      setCurrentStep(5);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save interests');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUser = async (userId: string) => {
    if (!user || followedUsers.includes(userId)) return;
    
    try {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });
      
      if (!error) {
        setFollowedUsers(prev => [...prev, userId]);
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleSuggestionsComplete = () => {
    setCurrentStep(6);
  };

  const handleTourComplete = async () => {
    const referralSuccess = await processReferral();
    
    if (referralSuccess) {
      setShowReferralWelcome(true);
      setTimeout(() => {
        window.location.href = '/home';
      }, 4000);
    } else {
      toast.success('Welcome to AfuChat! 🎉');
      navigate('/home');
    }
  };

  const handleFeatureClick = (path: string) => {
    navigate(path);
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const handleSkip = () => {
    if (currentStep === 6) {
      handleTourComplete();
    } else if (currentStep === 5) {
      setCurrentStep(6);
    } else if (currentStep === 4) {
      loadSuggestedUsers();
      setCurrentStep(5);
    }
  };

  const handleAccountTypeSelect = (type: 'personal' | 'business') => {
    setAccountType(type);
    setCurrentStep(3); // Go to profile step
  };

  const canGoBack = currentStep > 0 && !(currentStep === 2 && user);
  const canSkip = currentStep >= 4;

  const renderStepIndicator = () => (
    <div className="w-full max-w-md mx-auto mb-6">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;
          
          return (
            <div key={step.id} className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300",
                isComplete && "bg-primary text-primary-foreground",
                isActive && "bg-primary/20 text-primary ring-2 ring-primary",
                !isComplete && !isActive && "bg-muted text-muted-foreground"
              )}>
                {isComplete ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span className={cn(
                "text-[10px] md:text-xs mt-1 font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );

  const renderWelcomeStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center text-center px-6"
    >
      <div className="mb-8">
        <Logo className="h-20 w-20 mx-auto" />
      </div>
      
      <h1 className="text-3xl font-bold text-foreground mb-3">
        Welcome to AfuChat
      </h1>
      <p className="text-muted-foreground text-lg mb-8 max-w-sm">
        Connect with friends, share moments, and discover amazing content.
      </p>
      
      <div className="space-y-4 w-full max-w-xs">
        <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-muted/50">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Personalized Experience</p>
            <p className="text-xs text-muted-foreground">Content tailored for you</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-muted/50">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Build Your Profile</p>
            <p className="text-xs text-muted-foreground">Express yourself authentically</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-muted/50">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">Find Your Community</p>
            <p className="text-xs text-muted-foreground">Connect with like-minded people</p>
          </div>
        </div>
      </div>
      
      <Button 
        onClick={() => setCurrentStep(1)} 
        className="mt-10 w-full max-w-xs"
        size="lg"
      >
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  );

  const renderAuthStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm mx-auto px-6"
    >
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-muted-foreground mt-1">
          {authMode === 'signup' 
            ? 'Join our community today' 
            : 'Sign in to continue'}
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        
        <Button 
          onClick={handleAuth} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'Please wait...' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
        </Button>
        
        <p className="text-center text-sm text-muted-foreground">
          {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
            className="text-primary font-medium hover:underline"
          >
            {authMode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </motion.div>
  );

  const renderAccountTypeStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto px-6"
    >
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Store className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Choose Account Type</h2>
        <p className="text-muted-foreground mt-1">Select how you want to use AfuChat</p>
      </div>
      
      <div className="space-y-4 mb-8">
        {ACCOUNT_TYPES.map((type) => {
          const Icon = type.icon;
          const isSelected = accountType === type.id;
          
          return (
            <button
              key={type.id}
              onClick={() => handleAccountTypeSelect(type.id as 'personal' | 'business')}
              className={cn(
                "w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left",
                isSelected 
                  ? "border-primary bg-primary/5 shadow-lg" 
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className={cn(
                "h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-md",
                type.color
              )}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-foreground">
                  {type.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
              </div>
              {isSelected && (
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      <p className="text-xs text-center text-muted-foreground">
        You can change this later in settings
      </p>
    </motion.div>
  );

  const renderProfileStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm mx-auto px-6 overflow-y-auto max-h-[calc(100vh-200px)]"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Set Up Your Profile</h2>
        <p className="text-muted-foreground mt-1">Tell us a bit about yourself</p>
      </div>
      
      {/* Avatar */}
      <div className="flex justify-center mb-6">
        <label className="relative cursor-pointer group">
          <Avatar className="h-24 w-24 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
            <AvatarImage src={avatarPreview} />
            <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
              {displayName?.[0]?.toUpperCase() || <Camera className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <Camera className="h-4 w-4" />
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </label>
      </div>
      <p className="text-center text-xs text-muted-foreground mb-4">Tap to add profile picture *</p>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name *</Label>
          <Input
            id="displayName"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="handle">Username *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              id="handle"
              placeholder="username"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className={cn(
                "pl-8 pr-10",
                usernameStatus === 'available' && "border-green-500 focus-visible:ring-green-500",
                (usernameStatus === 'taken' || usernameStatus === 'invalid') && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {usernameStatus === 'checking' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {usernameStatus === 'available' && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
            {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
            )}
          </div>
          {usernameMessage && (
            <p className={cn(
              "text-xs flex items-center gap-1",
              usernameStatus === 'available' ? "text-green-600" : "text-destructive"
            )}>
              {usernameMessage}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label>Country *</Label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full justify-between font-normal h-12",
                  !country && "text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  {country ? (
                    <>
                      <span className="text-xl">{getCountryFlag(country)}</span>
                      <span>{country}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Select your country</span>
                    </>
                  )}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-popover border shadow-lg z-50" align="start">
              <Command className="bg-popover">
                <CommandInput placeholder="Search country..." className="h-10" />
                <CommandList className="max-h-60">
                  <CommandEmpty>No country found.</CommandEmpty>
                  <CommandGroup>
                    {countries.map((c) => (
                      <CommandItem
                        key={c}
                        value={c}
                        onSelect={() => {
                          setCountry(c);
                          setCountryOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            country === c ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="mr-2 text-lg">{getCountryFlag(c)}</span>
                        {c}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">⚠️ Country cannot be changed after signup</p>
        </div>

        <DateOfBirthSelector 
          value={dateOfBirth} 
          onChange={setDateOfBirth}
          minAge={13}
        />

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number (Optional)</Label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 h-12 rounded-md border border-input bg-muted/50 text-sm min-w-[80px] justify-center">
              <span>{country ? getCountryFlag(country) : '🌍'}</span>
              <span className="font-medium">{country ? getCountryPhoneCode(country) : '+--'}</span>
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder={country ? `${getPhoneLimits(country).min} digits` : 'Phone number'}
                value={phoneNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const limits = getPhoneLimits(country);
                  // Limit input to max length
                  if (digits.length <= limits.max) {
                    setPhoneNumber(digits);
                  }
                }}
                maxLength={getPhoneLimits(country).max}
                className={cn(
                  "pl-10 h-12",
                  phoneError && "border-destructive focus-visible:ring-destructive"
                )}
              />
            </div>
          </div>
          {phoneError ? (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {phoneError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-yellow-500" />
              Add phone to earn 100 Nexa reward!
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio (Optional)</Label>
          <Textarea
            id="bio"
            placeholder="Write a short bio about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>
        
        <Button 
          onClick={handleProfileSubmit} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? 'Saving...' : 'Continue'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderInterestsStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto px-6"
    >
      <div className="text-center mb-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">What do you love?</h2>
        <p className="text-muted-foreground mt-1">Select your interests to personalize your feed</p>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mb-8">
        {INTERESTS.map((interest) => {
          const Icon = interest.icon;
          const isSelected = selectedInterests.includes(interest.id);
          
          return (
            <button
              key={interest.id}
              onClick={() => toggleInterest(interest.id)}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 relative",
                isSelected 
                  ? "border-primary bg-primary/10 text-primary" 
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <Icon className={cn(
                "h-6 w-6 mb-2",
                isSelected ? "text-primary" : "text-muted-foreground"
              )} />
              <span className="text-xs font-medium text-center">{interest.label}</span>
              {isSelected && (
                <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      <Button 
        onClick={handleInterestsSubmit} 
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? 'Saving...' : 'Continue'}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  );

  const renderSuggestionsStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto px-6"
    >
      <div className="text-center mb-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Find Friends</h2>
        <p className="text-muted-foreground mt-1">Follow people you might know</p>
      </div>
      
      {loadingSuggestions ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
          {suggestedUsers.map((suggestedUser) => (
            <div 
              key={suggestedUser.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl bg-card border",
                suggestedUser.isPinned ? "border-primary/50 bg-primary/5" : "border-border"
              )}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={suggestedUser.avatar_url || undefined} />
                <AvatarFallback className="bg-muted">
                  {suggestedUser.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{suggestedUser.display_name}</p>
                  {suggestedUser.isPinned && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">@{suggestedUser.handle}</p>
              </div>
              <Button
                size="sm"
                variant={followedUsers.includes(suggestedUser.id) ? "secondary" : "default"}
                onClick={() => handleFollowUser(suggestedUser.id)}
                disabled={followedUsers.includes(suggestedUser.id)}
              >
                {followedUsers.includes(suggestedUser.id) ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Following
                  </>
                ) : 'Follow'}
              </Button>
            </div>
          ))}
          
          {suggestedUsers.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No suggestions available right now
            </p>
          )}
        </div>
      )}
      
      <Button 
        onClick={handleSuggestionsComplete}
        className="w-full"
        size="lg"
      >
        {followedUsers.length > 0 ? `Continue (${followedUsers.length} followed)` : 'Continue'}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  );

  const renderTourStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto px-6"
    >
      <div className="text-center mb-6">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 ring-2 ring-primary/20">
          <Globe className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Explore AfuChat</h2>
        <p className="text-muted-foreground mt-1">Discover everything you can do</p>
      </div>
      
      <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.button
              key={feature.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleFeatureClick(feature.path)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-200 group text-left"
            >
              <div className={cn(
                "h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-md",
                feature.color
              )}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {feature.description}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative mb-6"
      >
        <div className="flex items-center gap-3 p-3 rounded-xl bg-primary text-primary-foreground shadow-lg">
          <Zap className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm font-medium">Tap any feature to explore, or continue below!</p>
        </div>
        <div className="absolute -bottom-2 left-8 w-4 h-4 bg-primary rotate-45" />
      </motion.div>
      
      <Button 
        onClick={handleTourComplete}
        className="w-full"
        size="lg"
      >
        Start Exploring
        <Sparkles className="ml-2 h-4 w-4" />
      </Button>
    </motion.div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
        {/* Header with progress */}
        <header className="pt-6 pb-2 px-4">
          <div className="flex items-center justify-between max-w-md mx-auto mb-4">
            {canGoBack && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setCurrentStep(prev => prev - 1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {!canGoBack && <div className="w-10" />}
            
            <Logo className="h-8" />
            
            {canSkip ? (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip
              </Button>
            ) : (
              <div className="w-10" />
            )}
          </div>
          
          {renderStepIndicator()}
        </header>
        
        {/* Main content */}
        <main className="flex-1 flex items-center justify-center pb-12">
          <AnimatePresence mode="wait">
            {currentStep === 0 && renderWelcomeStep()}
            {currentStep === 1 && renderAuthStep()}
            {currentStep === 2 && renderAccountTypeStep()}
            {currentStep === 3 && renderProfileStep()}
            {currentStep === 4 && renderInterestsStep()}
            {currentStep === 5 && renderSuggestionsStep()}
            {currentStep === 6 && renderTourStep()}
          </AnimatePresence>
        </main>
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

export default Onboarding;
