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
  Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'auth', title: 'Account', icon: User },
  { id: 'profile', title: 'Profile', icon: Camera },
  { id: 'interests', title: 'Interests', icon: Heart },
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
  
  // Interests state
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Skip to correct step if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      // Skip to profile step if already logged in
      if (currentStep < 2) {
        setCurrentStep(2);
      }
      // Load existing profile data
      loadProfileData();
    }
  }, [user, authLoading]);

  const loadProfileData = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, handle, bio, avatar_url, interests')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profile) {
      if (profile.display_name) setDisplayName(profile.display_name);
      if (profile.handle) setHandle(profile.handle);
      if (profile.bio) setBio(profile.bio);
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url);
      if (profile.interests) setSelectedInterests(profile.interests as string[]);
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
      // Auth state change will trigger step progression
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
    
    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true });

    if (error) {
      console.error('Avatar upload error:', error);
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleProfileSubmit = async () => {
    if (!user) return;
    
    const normalizedHandle = handle.toLowerCase().trim();
    
    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }
    
    if (normalizedHandle && normalizedHandle.length < 4) {
      toast.error('Username must be at least 4 characters');
      return;
    }
    
    if (normalizedHandle && !/^[a-z0-9_]+$/.test(normalizedHandle)) {
      toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    try {
      // Check username uniqueness if provided
      if (normalizedHandle) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .ilike('handle', normalizedHandle)
          .neq('id', user.id)
          .maybeSingle();
        
        if (existingUser) {
          toast.error('Username is already taken');
          setLoading(false);
          return;
        }
      }

      // Upload avatar if new file
      let avatarUrl = avatarPreview;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) avatarUrl = uploadedUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          handle: normalizedHandle || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setCurrentStep(3);
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
      
      toast.success('Welcome to AfuChat! 🎉');
      navigate('/home');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save interests');
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const handleSkip = () => {
    if (currentStep === 3) {
      // Skip interests and go to home
      navigate('/home');
    } else if (currentStep === 2 && user) {
      // Skip to interests
      setCurrentStep(3);
    }
  };

  const canGoBack = currentStep > 0 && !(currentStep === 2 && user);
  const canSkip = currentStep >= 2;

  const renderStepIndicator = () => (
    <div className="w-full max-w-md mx-auto mb-8">
      <div className="flex items-center justify-between mb-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isComplete = index < currentStep;
          
          return (
            <div key={step.id} className="flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                isComplete && "bg-primary text-primary-foreground",
                isActive && "bg-primary/20 text-primary ring-2 ring-primary",
                !isComplete && !isActive && "bg-muted text-muted-foreground"
              )}>
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className={cn(
                "text-xs mt-1.5 font-medium",
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

  const renderProfileStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-sm mx-auto px-6"
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
          <Label htmlFor="handle">Username</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              id="handle"
              placeholder="username"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              className="pl-8"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Write a short bio about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
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
                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
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
        {loading ? 'Finishing...' : 'Complete Setup'}
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
          {currentStep === 2 && renderProfileStep()}
          {currentStep === 3 && renderInterestsStep()}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Onboarding;
