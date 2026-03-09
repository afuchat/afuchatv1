import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Camera, Lock, Eye, MessageCircle, Building2, Github, Globe, Code2, Briefcase, Sparkles, CheckCircle2, AlertCircle, Coins, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { handleSchema, displayNameSchema, bioSchema } from '@/lib/validation';
import { useNexa } from '@/hooks/useNexa';
import { useDeveloperStatus } from '@/hooks/useDeveloperStatus';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CircularImageCrop } from '@/components/profile/CircularImageCrop';
import { SquareImageCrop } from '@/components/profile/SquareImageCrop';
import { getCountryPhoneCode, getPhoneLimits, validatePhoneLength } from '@/lib/countries';
import { getCountryFlag } from '@/lib/countryFlags';
import { validateUsernameFormat } from '@/lib/validation';

import type { Database } from '@/integrations/supabase/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

interface EditProfileForm {
  display_name: string;
  handle: string;
  bio: string;
  website_url: string;
  github_url: string;
  portfolio_url: string;
  developer_tagline: string;
  available_for_hire: boolean;
  is_private: boolean;
  show_online_status: boolean;
  show_read_receipts: boolean;
  show_balance: boolean;
  tipping_enabled: boolean;
  avatar_url: string | null;
  country: string;
  business_category: string;
  phone_number: string;
}

const EditProfile = () => {
  const { user, loading: isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { checkProfileCompletion } = useNexa();
  const { isDeveloper } = useDeveloperStatus();

  const [profile, setProfile] = useState<EditProfileForm>({
    display_name: '',
    handle: '',
    bio: '',
    website_url: '',
    github_url: '',
    portfolio_url: '',
    developer_tagline: '',
    available_for_hire: false,
    is_private: false,
    show_online_status: true,
    show_read_receipts: true,
    show_balance: true,
    tipping_enabled: false,
    avatar_url: null,
    country: '',
    business_category: '',
    phone_number: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showCropEditor, setShowCropEditor] = useState(false);

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [originalHandle, setOriginalHandle] = useState('');

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user?.id) {
      setLoadingProfile(false);
      toast.error("You must be logged in to edit your profile.");
      navigate('/auth/signin');
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single() as { data: ProfileRow | null; error: any };

        if (error) throw error;

        if (userId && data && userId !== user.id && userId !== data.handle) {
          toast.error('Access denied: Can only edit your own profile');
          navigate(`/@${data.handle}`);
          return;
        }

        if (data) {
          setProfile({
            display_name: data.display_name || '',
            handle: data.handle || '',
            bio: data.bio || '',
            website_url: data.website_url || '',
            github_url: (data as any).github_url || '',
            portfolio_url: (data as any).portfolio_url || '',
            developer_tagline: (data as any).developer_tagline || '',
            available_for_hire: (data as any).available_for_hire || false,
            is_private: data.is_private || false,
            show_online_status: data.show_online_status ?? true,
            show_read_receipts: data.show_read_receipts ?? true,
            show_balance: data.show_balance ?? true,
            tipping_enabled: (data as any).tipping_enabled ?? false,
            avatar_url: data.avatar_url || null,
            country: data.country || '',
            business_category: data.business_category || '',
            phone_number: data.phone_number || '',
          });
          setOriginalHandle(data.handle || '');
          setIsBusiness(data.is_business_mode || false);
          setIsAffiliate(data.is_affiliate || false);
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [user, navigate, userId, isLoadingAuth]);

  // Username validation
  useEffect(() => {
    const handle = profile.handle;
    if (handle === originalHandle) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

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
  }, [profile.handle, user?.id, originalHandle]);

  // Phone validation
  useEffect(() => {
    const localNumber = profile.phone_number.replace(getCountryPhoneCode(profile.country), '');
    if (!localNumber || !profile.country) {
      setPhoneError('');
      return;
    }

    const result = validatePhoneLength(profile.country, localNumber);
    if (result.message) {
      setPhoneError(result.message);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, phone_number')
          .eq('phone_number', profile.phone_number)
          .neq('id', user?.id || '')
          .maybeSingle();

        if (data) {
          setPhoneError('This phone number is already registered');
        } else {
          setPhoneError('');
        }
      } catch {
        // Ignore
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [profile.phone_number, profile.country, user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'handle') {
      const sanitizedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setProfile((prev) => ({ ...prev, [name]: sanitizedValue }));
      return;
    }
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleChange = (key: keyof Pick<EditProfileForm, 'is_private' | 'show_online_status' | 'show_read_receipts' | 'show_balance' | 'tipping_enabled' | 'available_for_hire'>) => {
    setProfile((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user) return;

    const normalizedHandle = profile.handle.toLowerCase().trim();

    if (!profile.display_name.trim()) {
      toast.error('Please enter your display name');
      return;
    }

    if (!normalizedHandle) {
      toast.error('Please enter a username');
      return;
    }

    if (usernameStatus === 'taken') {
      toast.error('This username is already taken');
      return;
    }

    if (usernameStatus === 'invalid') {
      toast.error('Please enter a valid username');
      return;
    }

    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    try {
      handleSchema.parse(normalizedHandle);
    } catch (e: any) {
      toast.error(e?.errors?.[0]?.message || 'Invalid username format');
      return;
    }

    try {
      displayNameSchema.parse(profile.display_name);
    } catch (e: any) {
      toast.error(e?.errors?.[0]?.message || 'Invalid display name');
      return;
    }

    if (profile.bio) {
      try {
        bioSchema.parse(profile.bio);
      } catch (e: any) {
        toast.error(e?.errors?.[0]?.message || 'Bio is too long');
        return;
      }
    }

    setSaving(true);
    try {
      if (normalizedHandle !== originalHandle) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .ilike('handle', normalizedHandle)
          .neq('id', user.id)
          .maybeSingle();

        if (existingUser) {
          setUsernameStatus('taken');
          setUsernameMessage('Username taken');
          setSaving(false);
          return;
        }
      }

      const updateData: ProfileUpdate = {
        id: user.id,
        display_name: profile.display_name.trim(),
        handle: normalizedHandle,
        bio: profile.bio.trim() || null,
        website_url: profile.website_url.trim() || null,
        is_private: profile.is_private,
        show_online_status: profile.show_online_status,
        show_read_receipts: profile.show_read_receipts,
        show_balance: profile.show_balance,
        phone_number: profile.phone_number.trim() || null,
        business_category: isBusiness ? (profile.business_category.trim() || null) : null,
        updated_at: new Date().toISOString(),
      };

      if (isDeveloper) {
        (updateData as any).github_url = profile.github_url.trim() || null;
        (updateData as any).portfolio_url = profile.portfolio_url.trim() || null;
        (updateData as any).developer_tagline = profile.developer_tagline.trim() || null;
        (updateData as any).available_for_hire = profile.available_for_hire;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated!');
      await checkProfileCompletion();
      navigate(-1);
    } catch (error: any) {
      console.error('Update error:', error);
      if (error.code === '23505' || error.message.includes('already taken')) {
        toast.error('Username is already taken');
      } else {
        toast.error(`Failed to update profile: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setSelectedImageFile(file);
    setShowCropEditor(true);
    e.target.value = '';
  };

  const handleSaveAvatar = async (blob: Blob) => {
    if (!user) return;

    setUploadingAvatar(true);
    try {
      if (profile.avatar_url) {
        const oldFileName = profile.avatar_url.split('/avatars/').pop();
        if (oldFileName) {
          await supabase.storage.from('avatars').remove([oldFileName]);
        }
      }

      const fileName = `\( {user.id}/ \){Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Avatar updated!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (isLoadingAuth || loadingProfile) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-base">Edit Profile</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Scrollable main content */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain pb-12">
        {/* Avatar Section */}
        <div className="flex flex-col items-center pt-6 pb-4">
          <div className="relative">
            <Avatar className={cn("h-24 w-24 border-4 border-background shadow-lg", isBusiness && "rounded-xl")}>
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name} className={isBusiness ? "rounded-xl" : ""} />
              <AvatarFallback className={cn("bg-muted text-2xl font-semibold", isBusiness && "rounded-xl")}>
                {profile.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              disabled={uploadingAvatar}
            />
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-colors"
            >
              <Camera className="h-4 w-4" />
            </label>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Tap to change photo</p>
        </div>

        {/* Form Sections */}
        <div className="px-4 space-y-6">
          {/* Basic Info Section */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Basic Information</h2>

            <div className="space-y-1.5">
              <Label htmlFor="display_name" className="text-sm font-medium px-1">Display Name</Label>
              <Input
                id="display_name"
                name="display_name"
                value={profile.display_name}
                onChange={handleInputChange}
                placeholder="Your name"
                disabled={saving}
                className="h-12 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="handle" className="text-sm font-medium px-1">Username</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="handle"
                  name="handle"
                  value={profile.handle}
                  onChange={handleInputChange}
                  placeholder="username"
                  disabled={saving}
                  className={cn(
                    "h-12 pl-8 pr-10 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all",
                    usernameStatus === 'available' && "border-green-500/50 focus:border-green-500",
                    (usernameStatus === 'taken' || usernameStatus === 'invalid') && "border-destructive/50 focus:border-destructive"
                  )}
                />
                {usernameStatus === 'checking' && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {usernameStatus === 'available' && (
                  <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                  <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                )}
              </div>
              {usernameMessage && (
                <p className={cn("text-xs px-1", usernameStatus === 'available' ? "text-green-600" : "text-destructive")}>
                  {usernameMessage}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-sm font-medium px-1">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                value={profile.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={150}
                disabled={saving}
                className="rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all resize-none"
              />
              <p className="text-xs text-muted-foreground px-1 text-right">{profile.bio.length}/150</p>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium px-1">Phone Number</Label>
              <div className="flex gap-2">
                <div className="h-12 min-w-[90px] flex items-center justify-center gap-1.5 bg-muted/50 rounded-xl px-3 text-sm font-medium">
                  <span className="text-lg">{getCountryFlag(profile.country)}</span>
                  <span>{getCountryPhoneCode(profile.country)}</span>
                </div>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={profile.phone_number.replace(getCountryPhoneCode(profile.country), '')}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    const countryCode = getCountryPhoneCode(profile.country);
                    const limits = getPhoneLimits(profile.country);
                    if (cleaned.length <= limits.max) {
                      setProfile(prev => ({ ...prev, phone_number: countryCode + cleaned }));
                    }
                  }}
                  placeholder="Phone number"
                  disabled={saving}
                  className={cn(
                    "h-12 flex-1 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all",
                    phoneError && "border-destructive/50 focus:border-destructive"
                  )}
                />
              </div>
              {phoneError && (
                <p className="text-xs text-destructive flex items-center gap-1 px-1">
                  <AlertCircle className="h-3 w-3" /> {phoneError}
                </p>
              )}
            </div>

            {/* Country (read-only) */}
            {profile.country && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium px-1">Country</Label>
                <div className="h-12 px-4 flex items-center gap-3 bg-muted/30 rounded-xl">
                  <span className="text-xl">{getCountryFlag(profile.country)}</span>
                  <span className="font-medium">{profile.country}</span>
                  <Lock className="h-4 w-4 ml-auto text-muted-foreground" />
                </div>
              </div>
            )}
          </section>

          {/* Business Category */}
          {isBusiness && (
            <section className="space-y-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" /> Business
              </h2>
              <Select value={profile.business_category} onValueChange={(value) => setProfile((prev) => ({ ...prev, business_category: value }))}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-transparent">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {['Restaurant', 'Tech Company', 'Retail', 'Services', 'Healthcare', 'Education', 'Finance', 'Real Estate', 'Entertainment', 'E-commerce', 'Other'].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>
          )}

          {/* Website for business/affiliate */}
          {(isBusiness || isAffiliate) && (
            <section className="space-y-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" /> Website
              </h2>
              <Input
                name="website_url"
                value={profile.website_url}
                onChange={handleInputChange}
                placeholder="https://yourwebsite.com"
                disabled={saving}
                className="h-12 rounded-xl bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all"
              />
            </section>
          )}

          {/* Developer Section */}
          {isDeveloper && (
            <section className="space-y-4 p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-background to-accent/5 border border-primary/20">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Code2 className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                Developer Profile
                <Sparkles className="h-4 w-4 text-amber-400" />
              </h2>

              <div className="space-y-3">
                <Input
                  name="developer_tagline"
                  value={profile.developer_tagline}
                  onChange={handleInputChange}
                  placeholder="e.g., Full-Stack Developer | React Expert"
                  disabled={saving}
                  maxLength={80}
                  className="h-11 rounded-xl bg-background/50 border-transparent focus:border-primary transition-all"
                />

                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-muted-foreground" />
                  <Input
                    name="github_url"
                    value={profile.github_url}
                    onChange={handleInputChange}
                    placeholder="https://github.com/username"
                    disabled={saving}
                    className="h-11 rounded-xl bg-background/50 border-transparent focus:border-primary transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Input
                    name="portfolio_url"
                    value={profile.portfolio_url}
                    onChange={handleInputChange}
                    placeholder="https://yourportfolio.com"
                    disabled={saving}
                    className="h-11 rounded-xl bg-background/50 border-transparent focus:border-primary transition-all"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium">Available for Hire</span>
                  </div>
                  <Switch
                    checked={profile.available_for_hire}
                    onCheckedChange={() => handleToggleChange('available_for_hire')}
                    disabled={saving}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Privacy Settings */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Privacy & Display</h2>

            <ToggleItem
              icon={<Lock className="h-4 w-4" />}
              label="Private Account"
              description="Only approved followers can see your posts"
              checked={profile.is_private}
              onCheckedChange={() => handleToggleChange('is_private')}
              disabled={saving}
            />

            <ToggleItem
              icon={<Eye className="h-4 w-4" />}
              label="Online Status"
              description="Show when you're active"
              checked={profile.show_online_status}
              onCheckedChange={() => handleToggleChange('show_online_status')}
              disabled={saving}
            />

            <ToggleItem
              icon={<MessageCircle className="h-4 w-4" />}
              label="Read Receipts"
              description="Let others see when you've read messages"
              checked={profile.show_read_receipts}
              onCheckedChange={() => handleToggleChange('show_read_receipts')}
              disabled={saving}
            />

            <ToggleItem
              icon={<Wallet className="h-4 w-4" />}
              label="Show Balance"
              description="Display Nexa balance on profile"
              checked={profile.show_balance}
              onCheckedChange={() => handleToggleChange('show_balance')}
              disabled={saving}
            />

            <ToggleItem
              icon={<Coins className="h-4 w-4" />}
              label="Enable Tipping"
              description="Allow others to send you tips"
              checked={profile.tipping_enabled}
              onCheckedChange={() => handleToggleChange('tipping_enabled')}
              disabled={saving}
            />
          </section>
        </div>

        {/* Image Crop Editor */}
        {isBusiness ? (
          <SquareImageCrop
            imageFile={selectedImageFile}
            open={showCropEditor}
            onOpenChange={setShowCropEditor}
            onSave={handleSaveAvatar}
          />
        ) : (
          <CircularImageCrop
            imageFile={selectedImageFile}
            open={showCropEditor}
            onOpenChange={setShowCropEditor}
            onSave={handleSaveAvatar}
          />
        )}
      </div>
    </div>
  );
};

// Toggle Item Component
const ToggleItem = ({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
  </div>
);

export default EditProfile;
