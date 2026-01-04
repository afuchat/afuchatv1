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
import { CircularImageCrop } from '@/components/profile/CircularImageCrop';
import { SquareImageCrop } from '@/components/profile/SquareImageCrop';
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
  Users,
  Shield,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';

// Background images for each step
import signupBg from '@/assets/auth/signup-bg.jpg';
import signinBg from '@/assets/auth/signin-bg.jpg';

const STEPS = [
  { id: 'auth', title: 'Account', icon: User },
  { id: 'accountType', title: 'Type', icon: Store },
  { id: 'profile', title: 'Profile', icon: Camera },
  { id: 'interests', title: 'Interests', icon: Heart },
  { id: 'suggestions', title: 'Connect', icon: Users },
  { id: 'tour', title: 'Explore', icon: Globe },
];

// Pinned recommended users
const PINNED_USERNAMES = ['afuchat', 'amkaweesi'];

// Account types - using only brand colors
const ACCOUNT_TYPES = [
  { 
    id: 'personal', 
    title: 'Personal', 
    description: 'Connect with friends, share moments, and join communities',
    icon: User,
    features: ['Connect with friends', 'Share posts & stories', 'Send & receive gifts'],
    gradient: 'from-primary to-accent'
  },
  { 
    id: 'business', 
    title: 'Business', 
    description: 'Grow your brand, reach customers, and sell products',
    icon: Store,
    features: ['Business analytics', 'Promote products', 'Customer engagement'],
    gradient: 'from-primary/80 to-primary'
  },
];

// Features using only brand colors (primary/accent variations)
const FEATURES = [
  { 
    id: 'chat', 
    title: 'Chat & Connect', 
    description: 'Message friends with real-time chat, voice messages, and more',
    icon: MessageCircle,
    gradient: 'from-primary to-accent',
    path: '/chats'
  },
  { 
    id: 'gifts', 
    title: 'Send Gifts', 
    description: 'Surprise friends with virtual gifts and show appreciation',
    icon: Gift,
    gradient: 'from-accent to-primary',
    path: '/gifts'
  },
  { 
    id: 'games', 
    title: 'Play Games', 
    description: 'Challenge friends to fun mini-games and earn rewards',
    icon: Gamepad2,
    gradient: 'from-primary/90 to-primary',
    path: '/games'
  },
  { 
    id: 'leaderboard', 
    title: 'Climb Rankings', 
    description: 'Compete with others and rise to the top of leaderboards',
    icon: Trophy,
    gradient: 'from-warning to-warning/80',
    path: '/leaderboard'
  },
  { 
    id: 'miniapps', 
    title: 'Mini Programs', 
    description: 'Explore a world of apps right inside AfuChat',
    icon: Zap,
    gradient: 'from-success to-success/80',
    path: '/mini-programs'
  },
  { 
    id: 'shop', 
    title: 'Shop & Earn', 
    description: 'Discover products and earn rewards on purchases',
    icon: Store,
    gradient: 'from-primary to-primary/80',
    path: '/shop'
  },
];

const INTERESTS = [
  { id: 'art', label: 'Art & Design', icon: Palette, emoji: '🎨' },
  { id: 'music', label: 'Music', icon: Music, emoji: '🎵' },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2, emoji: '🎮' },
  { id: 'reading', label: 'Reading', icon: BookOpen, emoji: '📚' },
  { id: 'movies', label: 'Movies & TV', icon: Film, emoji: '🎬' },
  { id: 'food', label: 'Food & Cooking', icon: Utensils, emoji: '🍳' },
  { id: 'travel', label: 'Travel', icon: Plane, emoji: '✈️' },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell, emoji: '💪' },
  { id: 'tech', label: 'Technology', icon: Code, emoji: '💻' },
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
  
  // Persist step in localStorage to survive page refresh
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('onboarding_step');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [loading, setLoading] = useState(false);

  // Save step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('onboarding_step', currentStep.toString());
  }, [currentStep]);
  const [showPassword, setShowPassword] = useState(false);
  
  // Auth state - check for signin query param
  const [authMode, setAuthMode] = useState<'signup' | 'login'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('signin') === 'true' ? 'login' : 'signup';
  });
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
  
  // Image crop modal state
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);

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
      // Load existing profile data into state
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
      
      // Check completion status for each step
      const isProfileComplete = profile.display_name && profile.handle && profile.country && 
                                profile.date_of_birth && profile.avatar_url;
      const hasInterests = profile.interests && (profile.interests as string[]).length > 0;
      
      // Check if user has followed anyone
      const { data: follows } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .limit(1);
      
      const hasFollows = follows && follows.length > 0;
      
      // Determine correct step based on saved localStorage step vs actual completion
      const savedStep = parseInt(localStorage.getItem('onboarding_step') || '0', 10);
      
      // If user has completed everything - go to home
      if (isProfileComplete && hasInterests && hasFollows) {
        localStorage.removeItem('onboarding_step');
        navigate('/home', { replace: true });
        return;
      }
      
      // Otherwise, determine the correct step the user should be on
      // Step 0: Auth (skip if user exists)
      // Step 1: Account Type
      // Step 2: Profile
      // Step 3: Interests
      // Step 4: Suggestions
      // Step 5: Tour
      
      let correctStep = savedStep;
      
      // If at auth step but user exists, move to account type
      if (savedStep === 0) {
        correctStep = 1;
      }
      
      // Enforce sequential completion - can't skip ahead of required steps
      // Profile must be complete before interests (step 3)
      if (!isProfileComplete && correctStep >= 3) {
        correctStep = 2;
      }
      // Interests must be complete before suggestions (step 4)
      else if (isProfileComplete && !hasInterests && correctStep >= 4) {
        correctStep = 3;
      }
      // Must follow at least one user before tour (step 5)
      else if (isProfileComplete && hasInterests && !hasFollows && correctStep >= 5) {
        correctStep = 4;
      }
      
      // Load suggested users if we're at or going to step 4
      if (correctStep === 4) {
        await loadSuggestedUsers();
      }
      
      setCurrentStep(correctStep);
    } else {
      // No profile data, ensure we're at step 1 (account type) if authenticated
      if (currentStep === 0) {
        setCurrentStep(1);
      }
    }
  };

  const loadSuggestedUsers = async () => {
    if (!user) return;
    setLoadingSuggestions(true);
    
    try {
      // Fetch pinned users first
      const { data: pinnedUsers, error: pinnedError } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, bio')
        .in('handle', PINNED_USERNAMES)
        .neq('id', user.id);
      
      if (pinnedError) {
        console.error('Error fetching pinned users:', pinnedError);
      }
      
      // Fetch other random users (excluding pinned ones and current user)
      const { data: otherUsers, error: othersError } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url, bio')
        .neq('id', user.id)
        .not('handle', 'in', `("${PINNED_USERNAMES.join('","')}")`)
        .not('avatar_url', 'is', null)
        .limit(15);
      
      if (othersError) {
        console.error('Error fetching other users:', othersError);
      }
      
      // Sort pinned users: afuchat first, then amkaweesi
      const sortedPinned = (pinnedUsers || []).sort((a, b) => {
        const order = ['afuchat', 'amkaweesi'];
        return order.indexOf(a.handle || '') - order.indexOf(b.handle || '');
      }).map(u => ({ ...u, isPinned: true }));
      
      // Shuffle and limit other users
      const shuffledOthers = (otherUsers || [])
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      
      // Combine: pinned first, then random others
      const allUsers = [...sortedPinned, ...shuffledOthers];
      setSuggestedUsers(allUsers);
      
      console.log('Loaded suggestions:', allUsers.length, 'users');
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load suggestions');
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
      setTempImageFile(file);
      setShowImageCrop(true);
    }
  };

  const handleImageCropSave = (blob: Blob) => {
    const file = new File([blob], 'avatar.png', { type: 'image/png' });
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    setShowImageCrop(false);
    setTempImageFile(null);
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
          // Profile done - go to interests step (step 3)
          setCurrentStep(3);
        }, 2500);
      } else {
        // Profile done - go to interests step (step 3)
        setCurrentStep(3);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestsSubmit = async () => {
    if (!user) return;
    
    // Require at least 1 interest
    if (selectedInterests.length === 0) {
      toast.error('Please select at least one interest to continue');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ interests: selectedInterests })
        .eq('id', user.id);

      if (error) throw error;
      
      // Load suggested users and go to suggestions step (step 4)
      await loadSuggestedUsers();
      setCurrentStep(4);
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

  const handleSuggestionsComplete = async () => {
    if (followedUsers.length === 0) {
      toast.error('Please follow at least one user to continue');
      return;
    }
    
    // Go to tour/explore step (final step 5)
    setCurrentStep(5);
  };

  const handleTourComplete = async () => {
    // Clear onboarding step from localStorage - onboarding is complete
    localStorage.removeItem('onboarding_step');
    
    // Final step - process referral and go to home
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

  const handleSkip = async () => {
    if (currentStep === 5) {
      // Tour/Explore step - complete onboarding
      handleTourComplete();
    } else if (currentStep === 4) {
      // Suggestions step - cannot skip, must follow at least one user
      if (followedUsers.length === 0) {
        toast.error('Please follow at least one user to continue');
        return;
      }
      setCurrentStep(5);
    } else if (currentStep === 3) {
      // Interests step - require at least 1 interest
      if (selectedInterests.length === 0) {
        toast.error('Please select at least one interest to continue');
        return;
      }
      await loadSuggestedUsers();
      setCurrentStep(4);
    }
  };

  const handleAccountTypeSelect = async (type: 'personal' | 'business') => {
    setAccountType(type);
    
    // Save account type to database
    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_business_mode: type === 'business' })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error saving account type:', error);
        }
      } catch (error) {
        console.error('Error saving account type:', error);
      }
    }
    
    setCurrentStep(2); // Go to profile step
  };

  const canGoBack = currentStep > 0 && !(currentStep === 1 && user);
  // Can skip tour (5) only, interests (3) requires selection, suggestions (4) requires follow
  const canSkip = currentStep === 5 || (currentStep === 3 && selectedInterests.length > 0) || (currentStep === 4 && followedUsers.length > 0);

  const renderStepIndicator = () => (
    <div className="w-full max-w-lg mx-auto mb-8">
      {/* Modern step dots */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;
          
          return (
            <div key={step.id} className="flex items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  backgroundColor: isComplete || isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                }}
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300",
                  isActive ? "w-8" : "w-2.5"
                )}
              />
            </div>
          );
        })}
      </div>
      
      {/* Step title */}
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>
    </div>
  );

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/onboarding`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl }
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || `Failed to sign in with ${provider}`);
      setLoading(false);
    }
  };

  const renderAuthStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm mx-auto px-6"
    >
      {/* Premium header with gradient accent */}
      <div className="text-center mb-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="relative mx-auto mb-6"
        >
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
            <User className="h-10 w-10 text-primary-foreground" />
          </div>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-card border-2 border-background flex items-center justify-center shadow-md"
          >
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          {authMode === 'signup' ? 'Join AfuChat' : 'Welcome Back'}
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-muted-foreground"
        >
          {authMode === 'signup' 
            ? 'Create your account to get started' 
            : 'Sign in to continue your journey'}
        </motion.p>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-12 h-12 text-base rounded-xl border-2 border-border focus:border-primary bg-card/50"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">Password</Label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-12 pr-12 h-12 text-base rounded-xl border-2 border-border focus:border-primary bg-card/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        
        <Button 
          onClick={handleAuth} 
          disabled={loading}
          className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
          size="lg"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Please wait...
            </div>
          ) : (
            <>
              {authMode === 'signup' ? 'Create Account' : 'Sign In'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
        
        <p className="text-center text-sm text-muted-foreground pt-2">
          {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'signup' ? 'login' : 'signup')}
            className="text-primary font-semibold hover:underline"
          >
            {authMode === 'signup' ? 'Sign in' : 'Sign up'}
          </button>
        </p>
        
        {/* Divider */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-sm text-muted-foreground">or</span>
          </div>
        </div>
        
        {/* OAuth Icons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            className="h-12 w-12 rounded-full border-2 border-border hover:border-primary bg-card/50 hover:bg-card"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleOAuthLogin('github')}
            disabled={loading}
            className="h-12 w-12 rounded-full border-2 border-border hover:border-primary bg-card/50 hover:bg-card"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </Button>
        </div>
        
        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground pt-2">
          <Shield className="h-4 w-4" />
          <span className="text-xs">Secure & encrypted</span>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderAccountTypeStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto px-6"
    >
      <div className="text-center mb-10">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25"
        >
          <Store className="h-10 w-10 text-primary-foreground" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Path</h2>
        <p className="text-muted-foreground">How will you use AfuChat?</p>
      </div>
      
      <div className="space-y-4 mb-8">
        {ACCOUNT_TYPES.map((type, index) => {
          const Icon = type.icon;
          const isSelected = accountType === type.id;
          
          return (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => handleAccountTypeSelect(type.id as 'personal' | 'business')}
              className={cn(
                "w-full p-5 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden group",
                isSelected 
                  ? "border-primary bg-card shadow-xl shadow-primary/10" 
                  : "border-border bg-card/50 hover:border-primary/50 hover:bg-card"
              )}
            >
              {/* Gradient background on select */}
              {isSelected && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn("absolute inset-0 bg-gradient-to-r opacity-5", type.gradient)}
                />
              )}
              
              <div className="relative flex items-start gap-4">
                <div className={cn(
                  "h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg transition-transform group-hover:scale-105",
                  type.gradient
                )}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg text-foreground">
                      {type.title}
                    </h3>
                    {isSelected && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                      >
                        <Check className="h-3 w-3" />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {type.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {type.features.map((feature, i) => (
                      <span 
                        key={i}
                        className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
      
      <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
        <Sparkles className="h-3 w-3" />
        You can change this later in settings
      </p>
    </motion.div>
  );

  const renderProfileStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm mx-auto px-6 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-hide"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Create Your Profile</h2>
        <p className="text-muted-foreground">Let's make your account unique</p>
      </div>
      
      {/* Avatar with premium styling - different shape based on account type */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center mb-8"
      >
        <label className="relative cursor-pointer group">
          <div className="relative">
            <div className={cn(
              "absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary opacity-75 blur-sm group-hover:opacity-100 transition-opacity",
              accountType === 'business' ? 'rounded-2xl' : 'rounded-full'
            )} />
            <Avatar className={cn(
              "relative h-28 w-28 ring-4 ring-background",
              accountType === 'business' && 'rounded-2xl'
            )}>
              <AvatarImage src={avatarPreview} className={cn("object-cover", accountType === 'business' && 'rounded-2xl')} />
              <AvatarFallback className={cn(
                "bg-gradient-to-br from-muted to-muted/50 text-muted-foreground text-3xl font-bold",
                accountType === 'business' && 'rounded-2xl'
              )}>
                {displayName?.[0]?.toUpperCase() || <Camera className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>
          </div>
          <motion.div 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25"
          >
            <Camera className="h-5 w-5" />
          </motion.div>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </label>
      </motion.div>
      <p className="text-center text-xs text-muted-foreground mb-6">
        Tap to add {accountType === 'business' ? 'business logo' : 'profile picture'} <span className="text-primary">*</span>
      </p>
      
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="displayName" className="text-sm font-medium">Display Name <span className="text-primary">*</span></Label>
          <Input
            id="displayName"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-12 rounded-xl border-2 border-border focus:border-primary bg-card/50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="handle" className="text-sm font-medium">Username <span className="text-primary">*</span></Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">@</span>
            <Input
              id="handle"
              placeholder="username"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className={cn(
                "pl-10 pr-12 h-12 rounded-xl border-2 bg-card/50",
                usernameStatus === 'available' && "border-success focus:border-success",
                (usernameStatus === 'taken' || usernameStatus === 'invalid') && "border-destructive focus:border-destructive",
                usernameStatus === 'idle' && "border-border focus:border-primary"
              )}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking' && (
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              {usernameStatus === 'available' && (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
            </div>
          </div>
          {usernameMessage && (
            <p className={cn(
              "text-xs flex items-center gap-1 font-medium",
              usernameStatus === 'available' ? "text-success" : "text-destructive"
            )}>
              {usernameStatus === 'available' && <CheckCircle2 className="h-3 w-3" />}
              {usernameMessage}
            </p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">Country <span className="text-primary">*</span></Label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full justify-between font-normal h-12 rounded-xl border-2 border-border hover:border-primary bg-card/50",
                  !country && "text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  {country ? (
                    <>
                      <span className="text-2xl">{getCountryFlag(country)}</span>
                      <span className="font-medium">{country}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <span>Select your country</span>
                    </>
                  )}
                </div>
                <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-popover border-2 shadow-xl z-50" align="start">
              <Command className="bg-popover">
                <CommandInput placeholder="Search country..." className="h-12" />
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
                        className="cursor-pointer py-3"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 text-primary",
                            country === c ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="mr-3 text-xl">{getCountryFlag(c)}</span>
                        {c}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-warning flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Country cannot be changed after signup
          </p>
        </div>

        <DateOfBirthSelector 
          value={dateOfBirth} 
          onChange={setDateOfBirth}
          minAge={13}
        />

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">Phone Number <span className="text-muted-foreground font-normal">(Optional)</span></Label>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-4 h-12 rounded-xl border-2 border-border bg-muted/50 text-sm min-w-[90px] justify-center">
              <span className="text-xl">{country ? getCountryFlag(country) : '🌍'}</span>
              <span className="font-semibold">{country ? getCountryPhoneCode(country) : '+--'}</span>
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder={country ? `${getPhoneLimits(country).min} digits` : 'Phone number'}
                value={phoneNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const limits = getPhoneLimits(country);
                  if (digits.length <= limits.max) {
                    setPhoneNumber(digits);
                  }
                }}
                maxLength={getPhoneLimits(country).max}
                className={cn(
                  "pl-12 h-12 rounded-xl border-2 bg-card/50",
                  phoneError ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
                )}
              />
            </div>
          </div>
          {phoneError ? (
            <p className="text-xs text-destructive flex items-center gap-1 font-medium">
              <AlertCircle className="h-3 w-3" />
              {phoneError}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3 text-warning" />
              Add phone to earn <span className="font-semibold text-primary">100 Nexa</span> reward!
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio" className="text-sm font-medium">Bio <span className="text-muted-foreground font-normal">(Optional)</span></Label>
          <Textarea
            id="bio"
            placeholder="Write a short bio about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            className="resize-none rounded-xl border-2 border-border focus:border-primary bg-card/50"
          />
        </div>
        
        <Button 
          onClick={handleProfileSubmit} 
          disabled={loading}
          className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
          size="lg"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Saving...
            </div>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
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
      <div className="text-center mb-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="h-20 w-20 rounded-3xl bg-gradient-to-br from-accent via-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25"
        >
          <Heart className="h-10 w-10 text-primary-foreground" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">What interests you?</h2>
        <p className="text-muted-foreground">Select topics to personalize your feed</p>
        {selectedInterests.length > 0 && (
          <p className="text-sm text-primary font-medium mt-2">
            {selectedInterests.length} selected
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-3 gap-3 mb-8">
        {INTERESTS.map((interest, index) => {
          const Icon = interest.icon;
          const isSelected = selectedInterests.includes(interest.id);
          
          return (
            <motion.button
              key={interest.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleInterest(interest.id)}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 relative overflow-hidden group",
                isSelected 
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/10" 
                  : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
              )}
            >
              {/* Animated background */}
              {isSelected && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10"
                />
              )}
              
              <motion.span 
                animate={{ scale: isSelected ? 1.2 : 1 }}
                className="text-2xl mb-2 relative z-10"
              >
                {interest.emoji}
              </motion.span>
              <span className={cn(
                "text-xs font-medium text-center relative z-10",
                isSelected ? "text-primary" : "text-foreground"
              )}>
                {interest.label}
              </span>
              
              {isSelected && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md"
                >
                  <Check className="h-3 w-3" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
      
      <Button 
        onClick={handleInterestsSubmit} 
        disabled={loading || selectedInterests.length === 0}
        className={cn(
          "w-full h-14 text-base font-semibold rounded-xl transition-opacity shadow-lg",
          selectedInterests.length > 0 
            ? "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-primary/25" 
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
        size="lg"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Saving...
          </div>
        ) : (
          <>
            {selectedInterests.length > 0 ? `Continue with ${selectedInterests.length} interests` : 'Select at least 1 interest'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
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
      <div className="text-center mb-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25"
        >
          <Users className="h-10 w-10 text-primary-foreground" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Find Your People</h2>
        <p className="text-muted-foreground">Follow accounts you might like</p>
        {followedUsers.length > 0 && (
          <p className="text-sm text-primary font-medium mt-2">
            {followedUsers.length} following
          </p>
        )}
      </div>
      
      {loadingSuggestions ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Finding people for you...</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto scrollbar-hide">
          {suggestedUsers.map((suggestedUser, index) => (
            <motion.div 
              key={suggestedUser.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl bg-card border-2 transition-all duration-200",
                suggestedUser.isPinned 
                  ? "border-primary/50 bg-gradient-to-r from-primary/5 to-accent/5 shadow-lg shadow-primary/5" 
                  : "border-border hover:border-primary/30"
              )}
            >
              <div className="relative">
                <Avatar className="h-14 w-14 ring-2 ring-background">
                  <AvatarImage src={suggestedUser.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-muted to-muted/50 font-bold">
                    {suggestedUser.display_name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {suggestedUser.isPinned && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                    <Star className="h-3 w-3" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-bold text-sm truncate">{suggestedUser.display_name}</p>
                  {suggestedUser.isPinned && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">@{suggestedUser.handle}</p>
              </div>
              
              <Button
                size="sm"
                variant={followedUsers.includes(suggestedUser.id) ? "secondary" : "default"}
                onClick={() => handleFollowUser(suggestedUser.id)}
                disabled={followedUsers.includes(suggestedUser.id)}
                className={cn(
                  "rounded-xl font-semibold transition-all",
                  followedUsers.includes(suggestedUser.id) 
                    ? "bg-muted" 
                    : "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-md shadow-primary/20"
                )}
              >
                {followedUsers.includes(suggestedUser.id) ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Following
                  </>
                ) : 'Follow'}
              </Button>
            </motion.div>
          ))}
          
          {suggestedUsers.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No suggestions available right now</p>
            </div>
          )}
        </div>
      )}
      
      <Button 
        onClick={handleSuggestionsComplete}
        disabled={followedUsers.length === 0}
        className={cn(
          "w-full h-14 text-base font-semibold rounded-xl transition-opacity shadow-lg",
          followedUsers.length > 0 
            ? "bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-primary/25" 
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
        size="lg"
      >
        {followedUsers.length > 0 ? `Continue (${followedUsers.length} followed)` : 'Follow at least 1 user to continue'}
        <ArrowRight className="ml-2 h-5 w-5" />
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
      <div className="text-center mb-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="relative mx-auto mb-6"
        >
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-success via-success/90 to-primary flex items-center justify-center mx-auto shadow-lg shadow-success/25">
            <Globe className="h-10 w-10 text-success-foreground" />
          </div>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-2 rounded-full border-2 border-dashed border-primary/20"
          />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground mb-2">You're All Set!</h2>
        <p className="text-muted-foreground">Explore everything AfuChat has to offer</p>
      </div>
      
      <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto scrollbar-hide">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.button
              key={feature.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleFeatureClick(feature.path)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border-2 border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 group text-left"
            >
              <div className={cn(
                "h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg transition-transform group-hover:scale-110",
                feature.gradient
              )}>
                <Icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
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
        className="mb-6"
      >
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25">
          <Sparkles className="h-6 w-6 flex-shrink-0 animate-pulse" />
          <p className="text-sm font-medium">Tap any feature to explore, or get started below!</p>
        </div>
      </motion.div>
      
      <Button 
        onClick={handleTourComplete}
        className="w-full h-14 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
        size="lg"
      >
        Start Using AfuChat
        <Sparkles className="ml-2 h-5 w-5" />
      </Button>
    </motion.div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Logo className="h-12 mb-2" />
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </motion.div>
      </div>
    );
  }

  // Get background image based on current step
  const getBackgroundImage = () => {
    switch (currentStep) {
      case 0: // Auth step
        return authMode === 'signup' ? signupBg : signinBg;
      case 1: // Account type
      case 2: // Profile
        return signupBg;
      case 3: // Interests
      case 4: // Suggestions
      case 5: // Tour/Explore
        return signinBg;
      default:
        return signupBg;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={getBackgroundImage()} 
            alt="" 
            className="w-full h-full object-cover opacity-10 transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>
        
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        
        {/* Header with progress */}
        <header className="relative pt-6 pb-2 px-4 z-10">
          <div className="flex items-center justify-between max-w-lg mx-auto mb-4">
            {canGoBack ? (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="rounded-xl hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <div className="w-10" />
            )}
            
            <Logo className="h-8" />
            
            {canSkip ? (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground font-medium"
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
        <main className="relative flex-1 flex items-center justify-center pb-12 z-10">
          <AnimatePresence mode="wait">
            {currentStep === 0 && renderAuthStep()}
            {currentStep === 1 && renderAccountTypeStep()}
            {currentStep === 2 && renderProfileStep()}
            {currentStep === 3 && renderInterestsStep()}
            {currentStep === 4 && renderSuggestionsStep()}
            {currentStep === 5 && renderTourStep()}
          </AnimatePresence>
        </main>
      </div>

      {/* Reward Modal */}
      <Dialog open={showRewardModal} onOpenChange={setShowRewardModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center animate-scale-in">
                <Trophy className="h-10 w-10 text-warning-foreground" />
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
              <Sparkles className="h-6 w-6 text-warning" />
              <span className="text-4xl font-bold text-primary">+100</span>
              <span className="text-2xl font-semibold text-foreground">Nexa</span>
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

      {/* Image Crop Modals */}
      {accountType === 'personal' ? (
        <CircularImageCrop
          imageFile={tempImageFile}
          open={showImageCrop}
          onOpenChange={setShowImageCrop}
          onSave={handleImageCropSave}
        />
      ) : (
        <SquareImageCrop
          imageFile={tempImageFile}
          open={showImageCrop}
          onOpenChange={setShowImageCrop}
          onSave={handleImageCropSave}
        />
      )}
    </>
  );
};

export default Onboarding;
