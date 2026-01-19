import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext'; 
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator'; 
import { User, Lock, Eye, MessageCircle, Upload, X, Building2, Github, Globe, Code2, Briefcase, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { handleSchema, displayNameSchema, bioSchema } from '@/lib/validation';
import { useNexa } from '@/hooks/useNexa';
import { useDeveloperStatus } from '@/hooks/useDeveloperStatus';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CircularImageCrop } from '@/components/profile/CircularImageCrop';
import { SquareImageCrop } from '@/components/profile/SquareImageCrop';
import { countries, getCountryPhoneCode, getPhoneLimits, validatePhoneLength } from '@/lib/countries';
import { getCountryFlag } from '@/lib/countryFlags';
import { validateUsernameFormat } from '@/lib/validation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// Import Supabase types
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

const EditProfile: React.FC = () => {
  // 🚨 FIX 1: Access the 'loading' state from useAuth. This is the global auth status.
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
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true); 
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [showCropEditor, setShowCropEditor] = useState(false);
  
  // Validation states
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [originalHandle, setOriginalHandle] = useState('');

  useEffect(() => {
    // Check the global Auth loading state first. Exit if still checking session.
    if (isLoadingAuth) {
        return; 
    }

    // Now that auth check is complete:
    if (!user?.id) {
        setLoadingProfile(false); 
        toast.error("You must be logged in to edit your profile.");
        navigate('/login'); 
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

        // Verify route matches current user (check both ID and handle)
        if (userId && data && userId !== user.id && userId !== data.handle) {
          toast.error('Access denied: Can only edit your own profile');
          navigate(`/${data.handle}`);
          return;
        }

        if (data) {
          setProfile({
            display_name: data.display_name,
            handle: data.handle,
            bio: data.bio || '',
            website_url: data.website_url || '',
            github_url: (data as any).github_url || '',
            portfolio_url: (data as any).portfolio_url || '',
            developer_tagline: (data as any).developer_tagline || '',
            available_for_hire: (data as any).available_for_hire || false,
            is_private: data.is_private || false,
            show_online_status: data.show_online_status || true,
            show_read_receipts: data.show_read_receipts || true,
            show_balance: data.show_balance ?? true,
            tipping_enabled: (data as any).tipping_enabled ?? false,
            avatar_url: data.avatar_url || null,
            country: data.country || '',
            business_category: data.business_category || '',
            phone_number: data.phone_number || '',
          });
          setOriginalHandle(data.handle);
          setIsBusiness(data.is_business_mode || false);
          setIsAffiliate(data.is_affiliate || false);
        } else {
          setProfile({
            display_name: user.user_metadata?.full_name || '',
            handle: user.user_metadata?.user_name || '',
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
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile');
      } finally {
        // Set the profile loading state to false
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  // 🚨 FIX 3: Add the global auth loading state to the dependency array
  }, [user, navigate, userId, isLoadingAuth]); 

  // Username validation effect
  useEffect(() => {
    const handle = profile.handle;
    
    // Skip validation if handle hasn't changed from original
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

  // Phone number validation effect (length + uniqueness)
  useEffect(() => {
    const localNumber = profile.phone_number.replace(getCountryPhoneCode(profile.country), '');
    if (!localNumber || !profile.country) {
      setPhoneError('');
      return;
    }
    
    // First validate length
    const result = validatePhoneLength(profile.country, localNumber);
    if (result.message) {
      setPhoneError(result.message);
      return;
    }
    
    // Then check uniqueness with debounce
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
        // Ignore errors silently
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [profile.phone_number, profile.country, user?.id]);

  // ... (Input handlers and Save handler remain as previously corrected)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'handle') {
      const sanitizedValue = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setProfile((prev) => ({ ...prev, [name as keyof EditProfileForm]: sanitizedValue }));
      return;
    }
    setProfile((prev) => ({ ...prev, [name as keyof EditProfileForm]: value }));
  };

  const handleToggleChange = (key: keyof Pick<EditProfileForm, 'is_private' | 'show_online_status' | 'show_read_receipts' | 'show_balance' | 'tipping_enabled'>) => {
    setProfile((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user) return;

    // Normalize handle to lowercase
    const normalizedHandle = profile.handle.toLowerCase().trim();

    // Validation with toast feedback
    if (!profile.display_name.trim()) {
      toast.error('Please enter your display name');
      return;
    }
    
    if (!normalizedHandle) {
      toast.error('Please enter a username');
      return;
    }
    
    // Check username status
    if (usernameStatus === 'taken') {
      toast.error('This username is already taken');
      return;
    }
    
    if (usernameStatus === 'invalid') {
      toast.error('Please enter a valid username');
      return;
    }

    // Check phone validation
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    
    // Validate inputs with detailed feedback
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
      // Double-check username uniqueness if changed
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
        // Note: country is intentionally excluded - set only during signup
        phone_number: profile.phone_number.trim() || null,
        business_category: isBusiness ? (profile.business_category.trim() || null) : null,
        updated_at: new Date().toISOString(),
      };

      // Add developer fields
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

      toast.success('Profile updated successfully!');
      
      // Check for profile completion reward
      await checkProfileCompletion();
      
      navigate(`/${user.id}`);
    } catch (error: any) {
      console.error('Update error:', error);
      if (error.code === '23505' || error.message.includes('already taken')) { 
          toast.error('Username is already taken (usernames are case-insensitive)');
      } else if (error.code === '42501' || error.message.includes('permission denied')) {
          toast.error('Permission denied. Please ensure RLS policies are correct in Supabase.');
      } else {
          toast.error(`Failed to update profile. Error: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/${user?.id}`);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Open crop editor with selected file
    setSelectedImageFile(file);
    setShowCropEditor(true);
    
    // Reset file input
    e.target.value = '';
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    setUploadingAvatar(true);
    try {
      // Remove from storage if exists
      if (profile.avatar_url) {
        const fileName = profile.avatar_url.split('/avatars/').pop();
        if (fileName) {
          await supabase.storage.from('avatars').remove([fileName]);
        }
      }

      // Update profile
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);

      setProfile((prev) => ({ ...prev, avatar_url: null }));
      toast.success('Avatar removed');
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      toast.error(error.message || 'Failed to remove avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveAvatar = async (blob: Blob) => {
    if (!user) return;

    setUploadingAvatar(true);
    try {
      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldFileName = profile.avatar_url.split('/avatars/').pop();
        if (oldFileName) {
          await supabase.storage.from('avatars').remove([oldFileName]);
        }
      }

      // Upload new avatar with proper folder structure
      const fileName = `${user.id}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      // Update profile
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Avatar updated successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 🚨 FIX 4: Check BOTH the global auth loading and the local profile fetching state.
  if (isLoadingAuth || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-2">
            <User className="h-6 w-6 text-primary" /> Edit Profile
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Update your profile information and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">
                {isBusiness ? 'Business Logo' : 'Profile Picture'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className={`h-20 w-20 sm:h-24 sm:w-24 border-2 border-border ${isBusiness ? 'rounded-lg' : ''}`}>
                  <AvatarImage 
                    src={profile.avatar_url || undefined} 
                    alt={profile.display_name} 
                    className={isBusiness ? 'rounded-lg' : ''}
                  />
                  <AvatarFallback className={`bg-muted text-2xl ${isBusiness ? 'rounded-lg' : ''}`}>
                    {profile.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 w-full space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                    <Label htmlFor="avatar-upload" className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingAvatar}
                        className="w-full"
                        asChild
                      >
                        <span className="cursor-pointer">
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadingAvatar ? 'Uploading...' : isBusiness ? 'Upload Logo' : 'Upload Photo'}
                        </span>
                      </Button>
                    </Label>
                    {profile.avatar_url && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        className="w-full sm:w-auto"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center sm:text-left">
                    JPG, PNG, or GIF (max 5MB). Square images work best.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-sm font-medium">Display Name</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  value={profile.display_name}
                  onChange={handleInputChange}
                  placeholder="Your display name"
                  disabled={saving}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="handle" className="text-sm font-medium">Handle (Username)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    id="handle"
                    name="handle"
                    value={profile.handle}
                    onChange={handleInputChange}
                    placeholder="unique_handle"
                    disabled={saving}
                    className={cn(
                      "pl-7 pr-10 h-11",
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
                {usernameMessage ? (
                  <p className={cn(
                    "text-xs",
                    usernameStatus === 'available' ? "text-green-600" : "text-destructive"
                  )}>
                    {usernameMessage}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Only lowercase letters, numbers, and underscores.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-sm font-medium">Phone Number</Label>
                <div className="flex gap-2">
                  <div className="min-w-[100px] h-11 flex items-center justify-center gap-1.5 bg-muted rounded-md px-3 text-sm font-medium border border-input">
                    <span className="text-xl">{getCountryFlag(profile.country)}</span>
                    <span>{getCountryPhoneCode(profile.country)}</span>
                  </div>
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    inputMode="numeric"
                    value={profile.phone_number.replace(getCountryPhoneCode(profile.country), '')}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, '');
                      const countryCode = getCountryPhoneCode(profile.country);
                      const limits = getPhoneLimits(profile.country);
                      // Limit input to max length
                      if (cleaned.length <= limits.max) {
                        setProfile(prev => ({ ...prev, phone_number: countryCode + cleaned }));
                      }
                    }}
                    placeholder={profile.country ? `${getPhoneLimits(profile.country).min} digits` : 'Phone number'}
                    disabled={saving}
                    className={cn(
                      "h-11 flex-1",
                      phoneError && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
                {phoneError ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {phoneError}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Country code is based on your profile country
                  </p>
                )}
              </div>

              {/* Country - Read-only after signup */}
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                {profile.country ? (
                  <div className="h-12 px-3 flex items-center gap-2.5 bg-muted/50 rounded-md border border-border/50">
                    <span className="text-2xl">{getCountryFlag(profile.country)}</span>
                    <span className="font-medium">{profile.country}</span>
                    <Lock className="h-4 w-4 ml-auto text-muted-foreground" />
                  </div>
                ) : (
                  <div className="h-12 px-3 flex items-center gap-2 bg-muted/50 rounded-md border border-border/50">
                    <span className="text-muted-foreground">Not set during signup</span>
                    <Lock className="h-4 w-4 ml-auto text-muted-foreground" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Country is set during signup and cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={profile.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself (max 150 chars)"
                  rows={4}
                  maxLength={150}
                  disabled={saving}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground flex justify-between">
                  <span>Keep it short and engaging!</span>
                  <span>{profile.bio.length}/150</span>
                </p>
              </div>

              {/* Business Category - Only for business accounts */}
              {isBusiness && (
                <div className="space-y-2">
                  <Label htmlFor="business_category" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Business Category
                  </Label>
                  <Select 
                    value={profile.business_category} 
                    onValueChange={(value) => setProfile((prev) => ({ ...prev, business_category: value }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select your business category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="Restaurant">Restaurant</SelectItem>
                      <SelectItem value="Tech Company">Tech Company</SelectItem>
                      <SelectItem value="Retail">Retail</SelectItem>
                      <SelectItem value="Services">Services</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Real Estate">Real Estate</SelectItem>
                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="E-commerce">E-commerce</SelectItem>
                      <SelectItem value="Consulting">Consulting</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose the category that best describes your business
                  </p>
                </div>
              )}

              {/* Website URL - Only for business/affiliate users */}
              {(isBusiness || isAffiliate) && (
                <div className="space-y-2">
                  <Label htmlFor="website_url" className="text-sm font-medium">
                    Website URL
                  </Label>
                  <Input
                    id="website_url"
                    name="website_url"
                    value={profile.website_url}
                    onChange={handleInputChange}
                    placeholder="https://yourwebsite.com"
                    disabled={saving}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your business website or portfolio
                  </p>
                </div>
              )}

              {/* Developer Section - Only for developers */}
              {isDeveloper && (
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg">
                        <Code2 className="h-4 w-4 text-primary-foreground" />
                      </div>
                      Developer Profile
                      <Sparkles className="h-4 w-4 text-amber-400" />
                    </CardTitle>
                    <CardDescription>
                      Showcase your work and get discovered by potential clients
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Developer Tagline */}
                    <div className="space-y-2">
                      <Label htmlFor="developer_tagline" className="text-sm font-medium">
                        Tagline / Specialty
                      </Label>
                      <Input
                        id="developer_tagline"
                        name="developer_tagline"
                        value={profile.developer_tagline}
                        onChange={handleInputChange}
                        placeholder="e.g., Full-Stack Developer | React & Node.js Expert"
                        disabled={saving}
                        className="h-11"
                        maxLength={80}
                      />
                      <p className="text-xs text-muted-foreground">
                        A short description of your expertise (max 80 chars)
                      </p>
                    </div>

                    {/* GitHub URL */}
                    <div className="space-y-2">
                      <Label htmlFor="github_url" className="text-sm font-medium flex items-center gap-2">
                        <Github className="h-4 w-4 text-muted-foreground" />
                        GitHub Profile
                      </Label>
                      <Input
                        id="github_url"
                        name="github_url"
                        value={profile.github_url}
                        onChange={handleInputChange}
                        placeholder="https://github.com/username"
                        disabled={saving}
                        className="h-11"
                      />
                    </div>

                    {/* Portfolio URL */}
                    <div className="space-y-2">
                      <Label htmlFor="portfolio_url" className="text-sm font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        Portfolio Website
                      </Label>
                      <Input
                        id="portfolio_url"
                        name="portfolio_url"
                        value={profile.portfolio_url}
                        onChange={handleInputChange}
                        placeholder="https://yourportfolio.com"
                        disabled={saving}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Your portfolio or personal website to showcase your work
                      </p>
                    </div>

                    {/* Available for Hire Toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex-1 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="h-4 w-4 text-emerald-500" />
                          <Label className="text-sm font-medium cursor-pointer">Available for Hire</Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Show a badge on your profile indicating you're open to work
                        </p>
                      </div>
                      <Switch
                        checked={profile.available_for_hire}
                        onCheckedChange={() => setProfile(prev => ({ ...prev, available_for_hire: !prev.available_for_hire }))}
                        disabled={saving}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Privacy & Display</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Private Account Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium cursor-pointer">Private Account</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only approved followers can see your posts
                  </p>
                </div>
                <Switch
                  checked={profile.is_private}
                  onCheckedChange={() => handleToggleChange('is_private')}
                  disabled={saving}
                />
              </div>

              {/* Show Online Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium cursor-pointer">Show Online Status</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Display when you're active
                  </p>
                </div>
                <Switch
                  checked={profile.show_online_status}
                  onCheckedChange={() => handleToggleChange('show_online_status')}
                  disabled={saving}
                />
              </div>

              {/* Show Read Receipts Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium cursor-pointer">Read Receipts</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Let others see when you've read messages
                  </p>
                </div>
                <Switch
                  checked={profile.show_read_receipts}
                  onCheckedChange={() => handleToggleChange('show_read_receipts')}
                  disabled={saving}
                />
              </div>

              {/* Show Balance Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium cursor-pointer">Show Balance</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Display your Nexa balance on profile
                  </p>
                </div>
                <Switch
                  checked={profile.show_balance}
                  onCheckedChange={() => handleToggleChange('show_balance')}
                  disabled={saving}
                />
              </div>

              {/* Enable Tipping Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium cursor-pointer">Enable Tipping</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allow others to send you tips on your profile
                  </p>
                </div>
                <Switch
                  checked={profile.tipping_enabled}
                  onCheckedChange={() => handleToggleChange('tipping_enabled')}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
              className="w-full sm:flex-1 h-12 text-base"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:flex-1 h-12 text-base"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Image Crop Editor - Square for business, Circular for personal */}
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
  );
};

export default EditProfile;
