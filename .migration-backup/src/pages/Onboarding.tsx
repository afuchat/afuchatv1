import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';
import { useIsMobile } from '@/hooks/use-mobile';
import { PageSkeleton } from '@/components/skeletons';

// Steps
const STEPS = [
  { id: 'accountType', title: 'Type', icon: Store },
  { id: 'profile', title: 'Profile', icon: Camera },
  { id: 'interests', title: 'Interests', icon: Heart },
  { id: 'suggestions', title: 'Connect', icon: Users },
  { id: 'tour', title: 'Explore', icon: Globe },
];

const PINNED_USERNAMES = ['afuchat', 'amkaweesi'];

const ACCOUNT_TYPES = [
  { 
    id: 'personal', 
    title: 'Personal', 
    description: 'Connect with friends, share moments, and join communities',
    icon: User,
    features: ['Connect with friends', 'Share posts & stories', 'Send & receive gifts'],
  },
  { 
    id: 'business', 
    title: 'Business', 
    description: 'Grow your brand, reach customers, and sell products',
    icon: Store,
    features: ['Business analytics', 'Promote products', 'Customer engagement'],
  },
];

const FEATURES = [
  { id: 'chat', title: 'Chat & Connect', description: 'Message friends with real-time chat', icon: MessageCircle, path: '/chats' },
  { id: 'gifts', title: 'Send Gifts', description: 'Surprise friends with virtual gifts', icon: Gift, path: '/gifts' },
  { id: 'games', title: 'Play Games', description: 'Challenge friends to mini-games', icon: Gamepad2, path: '/games' },
  { id: 'leaderboard', title: 'Climb Rankings', description: 'Compete and rise to the top', icon: Trophy, path: '/leaderboard' },
  { id: 'miniapps', title: 'Mini Programs', description: 'Explore apps inside AfuChat', icon: Zap, path: '/mini-programs' },
  { id: 'shop', title: 'Shop & Earn', description: 'Discover products and earn rewards', icon: Store, path: '/shop' },
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
  const isMobile = useIsMobile();
  
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem('onboarding_step');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [loading, setLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    localStorage.setItem('onboarding_step', currentStep.toString());
  }, [currentStep]);
  
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
  
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followedUsers, setFollowedUsers] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showReferralWelcome, setShowReferralWelcome] = useState(false);
  const [referrerName, setReferrerName] = useState<string | undefined>();
  
  const [showImageCrop, setShowImageCrop] = useState(false);
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);

  // === ALL BUSINESS LOGIC (unchanged) ===

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
        setUsernameStatus(data ? 'taken' : 'available');
        setUsernameMessage(data ? 'Username taken' : 'Available');
      } catch {
        setUsernameStatus('idle');
        setUsernameMessage('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [handle, user?.id]);

  useEffect(() => {
    if (!phoneNumber || !country) { setPhoneError(''); return; }
    const result = validatePhoneLength(country, phoneNumber);
    if (result.message) { setPhoneError(result.message); return; }
    const fullPhoneNumber = getCountryPhoneCode(country) + phoneNumber;
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.from('profiles').select('id').eq('phone_number', fullPhoneNumber).neq('id', user?.id || '').maybeSingle();
        setPhoneError(data ? 'This phone number is already registered' : '');
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [phoneNumber, country, user?.id]);

  const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  useEffect(() => {
    let code: string | null = null;
    const urlParams = new URLSearchParams(window.location.search);
    code = urlParams.get('ref') || getCookie('afuchat_referral');
    if (!code) {
      try { code = JSON.parse(localStorage.getItem('pendingSignupData') || '{}').referral_code || null; } catch {}
    }
    if (code) setReferralCode(code);
  }, []);

  useEffect(() => {
    const autoDetect = async () => {
      try {
        const detected = await detectUserCountry();
        if (detected && countries.includes(detected)) setCountry(detected);
      } catch {}
    };
    autoDetect();
  }, []);

  useEffect(() => {
    if (!authLoading && user && !profileLoaded) {
      loadProfileData();
    }
  }, [user, authLoading, profileLoaded]);

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
      if (profile.avatar_url) { setAvatarPreview(profile.avatar_url); setExistingAvatarUrl(profile.avatar_url); }
      if (profile.interests) setSelectedInterests(profile.interests as string[]);
      if (profile.country) setCountry(profile.country);
      if (profile.date_of_birth) setDateOfBirth(profile.date_of_birth);
      if (profile.phone_number) setPhoneNumber(profile.phone_number);
      
      const isProfileComplete = profile.display_name && profile.handle && profile.country && profile.date_of_birth && profile.avatar_url;
      const hasInterests = profile.interests && (profile.interests as string[]).length > 0;
      
      const { data: follows } = await supabase.from('follows').select('id').eq('follower_id', user.id).limit(1);
      const hasFollows = follows && follows.length > 0;
      
      // Fully complete users → redirect to home immediately
      if (isProfileComplete && hasInterests && hasFollows) {
        localStorage.removeItem('onboarding_step');
        navigate('/home', { replace: true });
        setProfileLoaded(true);
        return;
      }
      
      // Determine correct step based on what's missing
      let correctStep = 0;
      
      if (isProfileComplete && hasInterests && !hasFollows) {
        // Only need to follow people
        correctStep = 3;
      } else if (isProfileComplete && !hasInterests) {
        // Need to select interests
        correctStep = 2;
      } else if (!isProfileComplete) {
        // Need to complete profile - skip account type (step 0), go directly to profile (step 1)
        correctStep = 1;
      }
      
      if (correctStep === 3) await loadSuggestedUsers();
      
      setCurrentStep(correctStep);
    }
    setProfileLoaded(true);
  };

  const loadSuggestedUsers = async () => {
    if (!user) return;
    setLoadingSuggestions(true);
    try {
      const { data: pinnedUsers } = await supabase.from('profiles').select('id, display_name, handle, avatar_url, bio').in('handle', PINNED_USERNAMES).neq('id', user.id);
      const { data: otherUsers } = await supabase.from('profiles').select('id, display_name, handle, avatar_url, bio').neq('id', user.id).not('handle', 'in', `("${PINNED_USERNAMES.join('","')}")`).not('avatar_url', 'is', null).limit(15);
      
      const sortedPinned = (pinnedUsers || []).sort((a, b) => {
        const order = ['afuchat', 'amkaweesi'];
        return order.indexOf(a.handle || '') - order.indexOf(b.handle || '');
      }).map(u => ({ ...u, isPinned: true }));
      
      const shuffledOthers = (otherUsers || []).sort(() => Math.random() - 0.5).slice(0, 10);
      setSuggestedUsers([...sortedPinned, ...shuffledOthers]);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const processReferral = async (): Promise<boolean> => {
    let codeToUse = referralCode || getCookie('afuchat_referral');
    if (!codeToUse) codeToUse = new URLSearchParams(window.location.search).get('ref');
    if (!codeToUse || !user) return false;
    try {
      const { data, error } = await supabase.rpc('process_referral_reward', { referral_code_input: codeToUse, new_user_id: user.id });
      if (error) return false;
      const result = Array.isArray(data) ? data[0] : data;
      if (result?.success) {
        if (result.referrer_name) setReferrerName(result.referrer_name);
        localStorage.removeItem('pendingSignupData');
        document.cookie = 'afuchat_referral=; path=/; max-age=0';
        toast.success('Welcome! You received 1 week free Premium!');
        return true;
      }
      return false;
    } catch { return false; }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setTempImageFile(file); setShowImageCrop(true); }
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
      const fileExt = avatarFile.name?.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = avatarFile.type || `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true, contentType, cacheControl: '3600' });
      if (error) return null;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch { return null; }
  };

  const handleAccountTypeSelect = async (type: 'personal' | 'business') => {
    setAccountType(type);
    if (user) {
      try {
        await supabase.from('profiles').update({ is_business_mode: type === 'business' }).eq('id', user.id);
      } catch {}
    }
    setCurrentStep(1);
  };

  const handleProfileSubmit = async () => {
    if (!user) return;
    const normalizedHandle = handle.toLowerCase().trim();
    
    if (!displayName.trim()) { toast.error('Please enter your display name'); return; }
    if (!normalizedHandle || normalizedHandle.length < 4) { toast.error('Username must be at least 4 characters'); return; }
    if (!/^[a-z0-9_]+$/.test(normalizedHandle)) { toast.error('Username can only contain letters, numbers, and underscores'); return; }
    if (!country) { toast.error('Please select your country'); return; }
    if (!dateOfBirth) { toast.error('Please enter your date of birth'); return; }
    if (usernameStatus === 'taken') { toast.error('This username is already taken'); return; }
    if (usernameStatus === 'invalid') { toast.error('Please enter a valid username'); return; }
    if (phoneNumber && phoneError) { toast.error(phoneError); return; }

    const dob = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age;
    if (actualAge < 13) { toast.error('You must be at least 13 years old'); return; }

    const hasAvatar = avatarFile || existingAvatarUrl;
    if (!hasAvatar) { toast.error('Please add a profile picture'); return; }

    setLoading(true);
    try {
      const { data: existingUser } = await supabase.from('profiles').select('id').ilike('handle', normalizedHandle).neq('id', user.id).maybeSingle();
      if (existingUser) { setUsernameStatus('taken'); setUsernameMessage('Username taken'); setLoading(false); return; }

      let avatarUrl = existingAvatarUrl;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) avatarUrl = uploadedUrl;
        else { toast.error('Failed to upload profile picture'); setLoading(false); return; }
      }

      const { data: profile } = await supabase.from('profiles').select('profile_completion_rewarded, xp').eq('id', user.id).single();
      const isFullyCompleted = phoneNumber && country && dateOfBirth;
      const shouldReward = isFullyCompleted && !profile?.profile_completion_rewarded;

      const updateData: any = {
        display_name: displayName.trim(),
        handle: normalizedHandle,
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        country,
        date_of_birth: dateOfBirth,
      };

      if (phoneNumber) updateData.phone_number = getCountryPhoneCode(country) + phoneNumber;
      if (shouldReward) {
        updateData.xp = (profile?.xp || 0) + 100;
        updateData.profile_completion_rewarded = true;
      }

      const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);
      if (error) throw error;
      
      clearProfileCache(user.id);
      
      if (shouldReward) {
        setShowRewardModal(true);
        setTimeout(() => { setShowRewardModal(false); setCurrentStep(2); }, 2500);
      } else {
        setCurrentStep(2);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestsSubmit = async () => {
    if (!user) return;
    if (selectedInterests.length === 0) { toast.error('Please select at least one interest'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ interests: selectedInterests }).eq('id', user.id);
      if (error) throw error;
      await loadSuggestedUsers();
      setCurrentStep(3);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save interests');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUser = async (userId: string) => {
    if (!user || followedUsers.includes(userId)) return;
    try {
      const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
      if (!error) setFollowedUsers(prev => [...prev, userId]);
    } catch {}
  };

  const handleSuggestionsComplete = async () => {
    if (followedUsers.length === 0) { toast.error('Please follow at least one user'); return; }
    setCurrentStep(4);
  };

  const handleTourComplete = async () => {
    localStorage.removeItem('onboarding_step');
    const referralSuccess = await processReferral();
    if (referralSuccess) {
      setShowReferralWelcome(true);
      setTimeout(() => { window.location.href = '/home'; }, 4000);
    } else {
      toast.success('Welcome to AfuChat! 🎉');
      navigate('/home');
    }
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSkip = async () => {
    if (currentStep === 4) handleTourComplete();
    else if (currentStep === 3 && followedUsers.length > 0) setCurrentStep(4);
    else if (currentStep === 2 && selectedInterests.length > 0) { await loadSuggestedUsers(); setCurrentStep(3); }
  };

  const canGoBack = currentStep > 0;
  const canSkip = currentStep === 4 || (currentStep === 2 && selectedInterests.length > 0) || (currentStep === 3 && followedUsers.length > 0);

  if (authLoading) return <PageSkeleton variant="centered" />;
  if (!user) return <Navigate to="/auth/signin" replace />;

  // ============ RENDER STEPS (REDESIGNED) ============

  const renderAccountTypeStep = () => (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-foreground tracking-tight">How will you use AfuChat?</h2>
        <p className="text-sm text-muted-foreground mt-1">You can switch anytime in settings</p>
      </div>

      <div className="space-y-3">
        {ACCOUNT_TYPES.map((type, index) => {
          const Icon = type.icon;
          const isSelected = accountType === type.id;
          return (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.08 }}
              onClick={() => handleAccountTypeSelect(type.id as 'personal' | 'business')}
              className={cn(
                "w-full p-4 rounded-2xl border transition-all duration-200 text-left group",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-center gap-3.5">
                <div className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[15px] text-foreground">{type.title}</h3>
                    {isSelected && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 ml-[3.25rem]">
                {type.features.map((feature, i) => (
                  <span key={i} className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full font-medium",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>{feature}</span>
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );

  const renderProfileStep = () => (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-foreground tracking-tight">Set up your profile</h2>
        <p className="text-sm text-muted-foreground mt-1">This is how others will see you</p>
      </div>
      
      {/* Avatar */}
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="flex justify-center mb-6">
        <label className="relative cursor-pointer group">
          <Avatar className={cn("h-24 w-24 ring-2 ring-border group-hover:ring-primary transition-all", accountType === 'business' && 'rounded-xl')}>
            <AvatarImage src={avatarPreview} className={cn("object-cover", accountType === 'business' && 'rounded-xl')} />
            <AvatarFallback className={cn("bg-muted text-muted-foreground text-2xl font-bold", accountType === 'business' && 'rounded-xl')}>
              {displayName?.[0]?.toUpperCase() || <Camera className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Camera className="h-4 w-4" />
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </label>
      </motion.div>
      <p className="text-center text-[11px] text-muted-foreground mb-5">
        {accountType === 'business' ? 'Add business logo' : 'Add profile picture'} <span className="text-primary">*</span>
      </p>
      
      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Display Name <span className="text-primary">*</span></Label>
          <Input placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-11" />
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username <span className="text-primary">*</span></Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">@</span>
            <Input
              placeholder="username"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className={cn(
                "pl-8 pr-10 h-11",
                usernameStatus === 'available' && "border-success",
                (usernameStatus === 'taken' || usernameStatus === 'invalid') && "border-destructive"
              )}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {usernameStatus === 'checking' && <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              {usernameStatus === 'available' && <CheckCircle2 className="h-4 w-4 text-success" />}
              {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <AlertCircle className="h-4 w-4 text-destructive" />}
            </div>
          </div>
          {usernameMessage && (
            <p className={cn("text-[11px] font-medium", usernameStatus === 'available' ? "text-success" : "text-destructive")}>
              {usernameMessage}
            </p>
          )}
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Country <span className="text-primary">*</span></Label>
          <Popover open={countryOpen} onOpenChange={setCountryOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal h-11 rounded-xl", !country && "text-muted-foreground")}>
                <div className="flex items-center gap-2">
                  {country ? (
                    <>
                      <span className="text-lg">{getCountryFlag(country)}</span>
                      <span className="text-sm">{country}</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">Select country</span>
                    </>
                  )}
                </div>
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 bg-popover border shadow-xl z-50" align="start">
              <Command className="bg-popover">
                <CommandInput placeholder="Search..." className="h-10" />
                <CommandList className="max-h-52">
                  <CommandEmpty>Not found.</CommandEmpty>
                  <CommandGroup>
                    {countries.map((c) => (
                      <CommandItem key={c} value={c} onSelect={() => { setCountry(c); setCountryOpen(false); }} className="cursor-pointer py-2.5">
                        <Check className={cn("mr-2 h-3.5 w-3.5 text-primary", country === c ? "opacity-100" : "opacity-0")} />
                        <span className="mr-2 text-lg">{getCountryFlag(c)}</span>
                        <span className="text-sm">{c}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-[11px] text-warning flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />Cannot be changed later
          </p>
        </div>

        <DateOfBirthSelector value={dateOfBirth} onChange={setDateOfBirth} minAge={13} />

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></Label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 h-11 rounded-xl border border-border bg-muted/50 text-sm min-w-[80px] justify-center">
              <span className="text-base">{country ? getCountryFlag(country) : '🌍'}</span>
              <span className="font-semibold text-xs">{country ? getCountryPhoneCode(country) : '+--'}</span>
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                inputMode="numeric"
                placeholder={country ? `${getPhoneLimits(country).min} digits` : 'Phone'}
                value={phoneNumber}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const limits = getPhoneLimits(country);
                  if (digits.length <= limits.max) setPhoneNumber(digits);
                }}
                maxLength={getPhoneLimits(country).max}
                className={cn("pl-10 h-11", phoneError && "border-destructive")}
              />
            </div>
          </div>
          {phoneError ? (
            <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{phoneError}</p>
          ) : (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Star className="h-3 w-3 text-warning" />Add phone → earn <span className="font-semibold text-primary">100 Nexa</span>
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bio <span className="text-muted-foreground/60 normal-case font-normal">(optional)</span></Label>
          <Textarea placeholder="A few words about you..." value={bio} onChange={(e) => setBio(e.target.value)} rows={2} className="resize-none text-sm" />
        </div>
        
        <Button onClick={handleProfileSubmit} disabled={loading} className="w-full h-12 font-semibold rounded-xl" size="lg">
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <>Continue <ArrowRight className="ml-1.5 h-4 w-4" /></>
          )}
        </Button>
      </div>
    </motion.div>
  );

  const renderInterestsStep = () => (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-foreground tracking-tight">Pick your interests</h2>
        <p className="text-sm text-muted-foreground mt-1">
          We'll personalize your feed
          {selectedInterests.length > 0 && <span className="text-primary font-medium"> · {selectedInterests.length} selected</span>}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {INTERESTS.map((interest, index) => {
          const isSelected = selectedInterests.includes(interest.id);
          return (
            <motion.button
              key={interest.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 + index * 0.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleInterest(interest.id)}
              className={cn(
                "flex flex-col items-center justify-center py-4 px-2 rounded-2xl border transition-all duration-150 relative",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <span className="text-2xl mb-1.5">{interest.emoji}</span>
              <span className={cn("text-[11px] font-semibold text-center leading-tight", isSelected ? "text-primary" : "text-foreground")}>
                {interest.label}
              </span>
              {isSelected && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-2.5 w-2.5" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      <Button
        onClick={handleInterestsSubmit}
        disabled={loading || selectedInterests.length === 0}
        className="w-full h-12 font-semibold rounded-xl"
        size="lg"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Saving...
          </span>
        ) : selectedInterests.length > 0 ? (
          <>Continue <ArrowRight className="ml-1.5 h-4 w-4" /></>
        ) : (
          'Select at least 1'
        )}
      </Button>
    </motion.div>
  );

  const renderSuggestionsStep = () => (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-foreground tracking-tight">Follow people</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your feed starts with who you follow
          {followedUsers.length > 0 && <span className="text-primary font-medium"> · {followedUsers.length} following</span>}
        </p>
      </div>

      {loadingSuggestions ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Finding people...</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6 max-h-[45vh] overflow-y-auto scrollbar-hide -mx-1 px-1">
          {suggestedUsers.map((suggestedUser, index) => (
            <motion.div
              key={suggestedUser.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                suggestedUser.isPinned
                  ? "border-primary/30 bg-primary/[0.03]"
                  : "border-border bg-card"
              )}
            >
              <Avatar className="h-11 w-11 flex-shrink-0">
                <AvatarImage src={suggestedUser.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-muted font-bold text-sm">
                  {suggestedUser.display_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm truncate">{suggestedUser.display_name}</p>
                  {suggestedUser.isPinned && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary whitespace-nowrap">★</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">@{suggestedUser.handle}</p>
              </div>
              <Button
                size="sm"
                variant={followedUsers.includes(suggestedUser.id) ? "secondary" : "default"}
                onClick={() => handleFollowUser(suggestedUser.id)}
                disabled={followedUsers.includes(suggestedUser.id)}
                className={cn(
                  "rounded-lg text-xs h-8 px-3 font-semibold",
                  followedUsers.includes(suggestedUser.id) && "bg-muted text-muted-foreground"
                )}
              >
                {followedUsers.includes(suggestedUser.id) ? (
                  <><Check className="h-3.5 w-3.5 mr-1" />Done</>
                ) : 'Follow'}
              </Button>
            </motion.div>
          ))}
          {suggestedUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No suggestions yet</p>
            </div>
          )}
        </div>
      )}

      <Button
        onClick={handleSuggestionsComplete}
        disabled={followedUsers.length === 0}
        className="w-full h-12 font-semibold rounded-xl"
        size="lg"
      >
        {followedUsers.length > 0 ? (
          <>Continue <ArrowRight className="ml-1.5 h-4 w-4" /></>
        ) : 'Follow at least 1'}
      </Button>
    </motion.div>
  );

  const renderTourStep = () => (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">You're all set!</h2>
            <p className="text-sm text-muted-foreground">Explore what AfuChat offers</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-6 max-h-[45vh] overflow-y-auto scrollbar-hide">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.button
              key={feature.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(feature.path)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/[0.02] transition-all group text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-foreground">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>

      <Button onClick={handleTourComplete} className="w-full h-12 font-semibold rounded-xl" size="lg">
        Start Using AfuChat
        <Sparkles className="ml-1.5 h-4 w-4" />
      </Button>
    </motion.div>
  );

  // ============ STEP INDICATOR ============
  const renderStepIndicator = () => (
    <div className="flex items-center gap-1.5">
      {STEPS.map((step, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;
        return (
          <motion.div
            key={step.id}
            initial={false}
            animate={{
              backgroundColor: isComplete || isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
            }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              isActive ? "w-6" : "w-1.5"
            )}
          />
        );
      })}
    </div>
  );

  // ============ HEADER ============
  const onboardingHeader = (
    <header className="flex items-center justify-between px-5 py-4">
      {canGoBack ? (
        <Button variant="ghost" size="icon" onClick={() => setCurrentStep(prev => prev - 1)} className="rounded-xl h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      ) : <div className="w-9" />}
      
      {renderStepIndicator()}
      
      {canSkip ? (
        <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground text-xs font-medium h-9 px-3">
          Skip
        </Button>
      ) : <div className="w-9" />}
    </header>
  );

  // ============ CONTENT ============
  const onboardingContent = (
    <div className="flex-1 overflow-y-auto px-5 pb-8">
      <AnimatePresence mode="wait">
        {currentStep === 0 && renderAccountTypeStep()}
        {currentStep === 1 && renderProfileStep()}
        {currentStep === 2 && renderInterestsStep()}
        {currentStep === 3 && renderSuggestionsStep()}
        {currentStep === 4 && renderTourStep()}
      </AnimatePresence>
    </div>
  );

  // ============ LAYOUT ============
  return (
    <>
      {isMobile ? (
        <div className="min-h-[100dvh] bg-background flex flex-col">
          {onboardingHeader}
          {onboardingContent}
        </div>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center bg-muted/50">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-md max-h-[85vh] bg-card border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            {onboardingHeader}
            {onboardingContent}
          </motion.div>
        </div>
      )}

      <Dialog open={showRewardModal} onOpenChange={setShowRewardModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-xl text-center">Profile Complete! 🎉</DialogTitle>
            <DialogDescription className="text-center text-sm">You earned a reward for completing your profile</DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-xl p-5 text-center space-y-1">
            <p className="text-xs text-muted-foreground">Profile Completion Reward</p>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-3xl font-black text-primary">+100</span>
              <span className="text-lg font-bold text-foreground">Nexa</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showReferralWelcome && (
        <ReferralWelcomeBanner
          referrerName={referrerName}
          onClose={() => { setShowReferralWelcome(false); window.location.href = '/home'; }}
        />
      )}

      {accountType === 'personal' ? (
        <CircularImageCrop imageFile={tempImageFile} open={showImageCrop} onOpenChange={setShowImageCrop} onSave={handleImageCropSave} />
      ) : (
        <SquareImageCrop imageFile={tempImageFile} open={showImageCrop} onOpenChange={setShowImageCrop} onSave={handleImageCropSave} />
      )}
    </>
  );
};

export default Onboarding;
