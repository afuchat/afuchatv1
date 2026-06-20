import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Smartphone, 
  Globe, 
  FileText, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Shield,
  MapPin,
  Download,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { MiniAppImageUpload } from './MiniAppImageUpload';
import { countries } from '@/lib/countries';

interface SubmitAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const appCategories = [
  { id: 'games', name: 'Games', icon: '🎮' },
  { id: 'services', name: 'Services', icon: '⚙️' },
  { id: 'shopping', name: 'Shopping', icon: '🛒' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'utilities', name: 'Utilities', icon: '🔧' },
  { id: 'social', name: 'Social', icon: '💬' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'finance', name: 'Finance', icon: '💰' },
];

export const SubmitAppDialog = ({ open, onOpenChange }: SubmitAppDialogProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [apkUploading, setApkUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    url: '',
    iconUrl: '',
    screenshots: [] as string[],
    features: '',
    contactEmail: '',
    privacyUrl: '',
    termsUrl: '',
    targetCountries: [] as string[],
    appType: 'web' as 'web' | 'android' | 'both',
    apkUrl: '',
    agreeTerms: false,
    agreeGuidelines: false,
  });
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addScreenshot = (url: string) => {
    if (url && formData.screenshots.length < 6) {
      setFormData(prev => ({ 
        ...prev, 
        screenshots: [...prev.screenshots, url] 
      }));
    }
  };

  const removeScreenshot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index)
    }));
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      toast.error('App name is required');
      return false;
    }
    if (formData.name.length < 3 || formData.name.length > 50) {
      toast.error('App name must be 3-50 characters');
      return false;
    }
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return false;
    }
    if (formData.description.length < 20) {
      toast.error('Description must be at least 20 characters');
      return false;
    }
    if (!formData.category) {
      toast.error('Please select a category');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    // Web apps require URL
    if (formData.appType === 'web' || formData.appType === 'both') {
      if (!formData.url.trim()) {
        toast.error('App URL is required for web apps');
        return false;
      }
      try {
        new URL(formData.url);
      } catch {
        toast.error('Please enter a valid URL');
        return false;
      }
    }
    // Android apps require APK
    if (formData.appType === 'android' || formData.appType === 'both') {
      if (!formData.apkUrl.trim()) {
        toast.error('APK file is required for Android apps');
        return false;
      }
    }
    if (!formData.iconUrl.trim()) {
      toast.error('App icon is required');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.contactEmail.trim()) {
      toast.error('Contact email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contactEmail)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (!formData.agreeTerms) {
      toast.error('You must agree to the Terms of Service');
      return false;
    }
    if (!formData.agreeGuidelines) {
      toast.error('You must agree to follow the App Guidelines');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    if (!user) {
      toast.error('Please sign in to submit an app');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('mini_programs')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category,
          url: formData.appType === 'android' ? null : formData.url.trim(),
          icon_url: formData.iconUrl.trim(),
          screenshots: formData.screenshots,
          features: formData.features.trim() || null,
          developer_id: user.id,
          developer_email: formData.contactEmail.trim(),
          privacy_url: formData.privacyUrl.trim() || null,
          terms_url: formData.termsUrl.trim() || null,
          target_countries: formData.targetCountries.length > 0 ? formData.targetCountries : null,
          app_type: formData.appType,
          apk_url: formData.apkUrl || null,
          status: 'pending',
          is_published: false,
        });

      if (error) throw error;

      toast.success('App submitted successfully! Our team will review it within 24-48 hours.');
      onOpenChange(false);
      setStep(1);
      setFormData({
        name: '',
        description: '',
        category: '',
        url: '',
        iconUrl: '',
        screenshots: [],
        features: '',
        contactEmail: '',
        privacyUrl: '',
        termsUrl: '',
        targetCountries: [],
        appType: 'web',
        apkUrl: '',
        agreeTerms: false,
        agreeGuidelines: false,
      });
    } catch (error: any) {
      console.error('Error submitting app:', error);
      toast.error(error.message || 'Failed to submit app. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-6 px-4">
      {[
        { step: 1, label: 'Details' },
        { step: 2, label: 'Assets' },
        { step: 3, label: 'Submit' }
      ].map((s, index) => (
        <div key={s.step} className="flex items-center flex-1">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all shadow-sm ${
              s.step === step 
                ? 'bg-primary text-primary-foreground scale-110' 
                : s.step < step 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
            }`}>
              {s.step < step ? <CheckCircle2 className="h-5 w-5" /> : s.step}
            </div>
            <span className={`text-[10px] font-medium ${
              s.step === step ? 'text-primary' : 'text-muted-foreground'
            }`}>{s.label}</span>
          </div>
          {index < 2 && (
            <div className={`flex-1 h-0.5 mx-2 ${s.step < step ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            Submit Your App
          </DialogTitle>
          <DialogDescription className="text-sm">
            {step === 1 && 'Add basic information about your app'}
            {step === 2 && 'Upload your app assets and links'}
            {step === 3 && 'Review and submit for approval'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh]">
          <div className="p-5 pt-4">
            <StepIndicator />

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2 text-sm font-medium">
                    <Smartphone className="h-4 w-4 text-primary" />
                    App Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="My Awesome App"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    maxLength={50}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">{formData.name.length}/50 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-primary" />
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what your app does and why users will love it..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    maxLength={500}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">{formData.description.length}/500 characters</p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange('category', value)}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {appCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Assets & Links */}
            {step === 2 && (
              <div className="space-y-5">
                {/* App Type Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">App Type <span className="text-destructive">*</span></Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('appType', 'web')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.appType === 'web' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Globe className="h-5 w-5 mx-auto mb-1 text-primary" />
                      <p className="text-xs font-medium">Web App</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('appType', 'android')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.appType === 'android' 
                          ? 'border-green-500 bg-green-500/5' 
                          : 'border-border hover:border-green-500/50'
                      }`}
                    >
                      <Package className="h-5 w-5 mx-auto mb-1 text-green-500" />
                      <p className="text-xs font-medium">Android APK</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('appType', 'both')}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.appType === 'both' 
                          ? 'border-purple-500 bg-purple-500/5' 
                          : 'border-border hover:border-purple-500/50'
                      }`}
                    >
                      <Smartphone className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                      <p className="text-xs font-medium">Both</p>
                    </button>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                      <AlertCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {formData.appType === 'web' && (
                        <>
                          <p className="font-semibold text-foreground">📱 Web App</p>
                          <p>Your app will open inside AfuChat. Host it on any web hosting service.</p>
                        </>
                      )}
                      {formData.appType === 'android' && (
                        <>
                          <p className="font-semibold text-foreground">📦 Android APK</p>
                          <p>Upload your APK file. Users will download and install it on their Android devices.</p>
                        </>
                      )}
                      {formData.appType === 'both' && (
                        <>
                          <p className="font-semibold text-foreground">🔄 Web + Android</p>
                          <p>Provide both web URL and APK for maximum reach across all devices.</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Web URL Input */}
                {(formData.appType === 'web' || formData.appType === 'both') && (
                  <div className="space-y-2">
                    <Label htmlFor="url" className="flex items-center gap-2 text-sm font-medium">
                      <Globe className="h-4 w-4 text-primary" />
                      App URL <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://myapp.example.com"
                      value={formData.url}
                      onChange={(e) => handleInputChange('url', e.target.value)}
                      className="h-11"
                    />
                  </div>
                )}

                {/* APK Upload */}
                {(formData.appType === 'android' || formData.appType === 'both') && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <Package className="h-4 w-4 text-green-500" />
                      APK File <span className="text-destructive">*</span>
                    </Label>
                    {formData.apkUrl ? (
                      <div className="flex items-center gap-3 p-3 border border-green-500/30 rounded-lg bg-green-500/5">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <Download className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">APK Uploaded</p>
                          <p className="text-xs text-muted-foreground">Ready for review</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInputChange('apkUrl', '')}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept=".apk,application/vnd.android.package-archive"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const maxSizeBytes = 50 * 1024 * 1024; // 50MB (Supabase free tier limit)
                            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                            
                            if (file.size > maxSizeBytes) {
                              toast.error(`APK file (${fileSizeMB}MB) exceeds the 50MB limit. Please compress your APK.`);
                              return;
                            }
                            
                            setApkUploading(true);
                            toast.info(`Uploading APK (${fileSizeMB}MB)... This may take a while.`);
                            
                            try {
                              const fileName = `${user!.id}/${Date.now()}-${file.name}`;
                              const { data, error } = await supabase.storage
                                .from('mini-app-apks')
                                .upload(fileName, file, {
                                  cacheControl: '3600',
                                  upsert: false
                                });
                              
                              if (error) {
                                // Provide more helpful error messages
                                if (error.message?.includes('size') || error.message?.includes('limit')) {
                                  throw new Error(`Upload failed: File size (${fileSizeMB}MB) may exceed server limits. Try compressing your APK.`);
                                }
                                throw error;
                              }
                              
                              const { data: urlData } = supabase.storage
                                .from('mini-app-apks')
                                .getPublicUrl(data.path);
                              
                              handleInputChange('apkUrl', urlData.publicUrl);
                              toast.success('APK uploaded successfully!');
                            } catch (error: any) {
                              console.error('APK upload error:', error);
                              toast.error(error.message || 'Failed to upload APK. Please try again.');
                            } finally {
                              setApkUploading(false);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          disabled={apkUploading}
                        />
                        <div className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl transition-colors ${
                          apkUploading ? 'border-green-500/50 bg-green-500/5' : 'border-border hover:border-green-500/50'
                        }`}>
                          {apkUploading ? (
                            <>
                              <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                              <p className="text-sm text-muted-foreground">Uploading APK...</p>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Click to upload APK file</p>
                              <p className="text-xs text-muted-foreground">Max 50MB</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Icon Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">App Icon <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
                    <MiniAppImageUpload
                      type="icon"
                      currentImage={formData.iconUrl}
                      onUploadComplete={(url) => handleInputChange('iconUrl', url)}
                    />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Upload a 512x512 PNG icon for your app</p>
                    </div>
                  </div>
                </div>

                {/* Screenshots Upload */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Screenshots <span className="text-muted-foreground">(optional)</span></Label>
                  <p className="text-xs text-muted-foreground mb-2">Add up to 6 screenshots to showcase your app</p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {formData.screenshots.map((screenshot, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-border shadow-sm">
                        <img 
                          src={screenshot} 
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeScreenshot(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {formData.screenshots.length < 6 && (
                      <MiniAppImageUpload
                        type="screenshot"
                        onUploadComplete={addScreenshot}
                        className="aspect-video"
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features" className="text-sm font-medium">Key Features <span className="text-muted-foreground">(optional)</span></Label>
                  <Textarea
                    id="features"
                    placeholder="• Feature 1&#10;• Feature 2&#10;• Feature 3"
                    value={formData.features}
                    onChange={(e) => handleInputChange('features', e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="border-t pt-5 space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Legal & Privacy
                  </h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="privacyUrl" className="text-sm font-medium">
                      Privacy Policy URL <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="privacyUrl"
                      type="url"
                      placeholder="https://yourapp.com/privacy"
                      value={formData.privacyUrl}
                      onChange={(e) => handleInputChange('privacyUrl', e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="termsUrl" className="text-sm font-medium">
                      Terms of Service URL <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="termsUrl"
                      type="url"
                      placeholder="https://yourapp.com/terms"
                      value={formData.termsUrl}
                      onChange={(e) => handleInputChange('termsUrl', e.target.value)}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Country Targeting Section */}
                <div className="border-t pt-5 space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Country Availability
                  </h4>
                  
                  <p className="text-xs text-muted-foreground">
                    Choose which countries can access your app. Leave empty to make it available worldwide.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={formData.targetCountries.length === 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleInputChange('targetCountries', [])}
                        className="flex-1"
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        All Countries
                      </Button>
                      <Button
                        type="button"
                        variant={formData.targetCountries.length > 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (formData.targetCountries.length === 0) {
                            handleInputChange('targetCountries', ['Uganda']); // Default to one country
                          }
                        }}
                        className="flex-1"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Specific Countries
                      </Button>
                    </div>
                    
                    {formData.targetCountries.length > 0 && (
                      <div className="space-y-3">
                        {/* Selected countries */}
                        {formData.targetCountries.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {formData.targetCountries.map((country) => (
                              <Badge 
                                key={country} 
                                variant="secondary"
                                className="pl-2 pr-1 py-1 gap-1"
                              >
                                {country}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleInputChange(
                                      'targetCountries',
                                      formData.targetCountries.filter(c => c !== country)
                                    );
                                  }}
                                  className="ml-1 hover:bg-muted rounded p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Country search and selection */}
                        <div className="space-y-2">
                          <Input
                            placeholder="Search countries..."
                            value={countrySearchQuery}
                            onChange={(e) => setCountrySearchQuery(e.target.value)}
                            className="h-10"
                          />
                          <ScrollArea className="h-32 border rounded-lg">
                            <div className="p-2 space-y-1">
                              {countries
                                .filter(c => 
                                  c.toLowerCase().includes(countrySearchQuery.toLowerCase()) &&
                                  !formData.targetCountries.includes(c)
                                )
                                .slice(0, 20)
                                .map((country) => (
                                  <button
                                    key={country}
                                    type="button"
                                    onClick={() => {
                                      handleInputChange('targetCountries', [...formData.targetCountries, country]);
                                      setCountrySearchQuery('');
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                                  >
                                    {country}
                                  </button>
                                ))}
                              {countries.filter(c => 
                                c.toLowerCase().includes(countrySearchQuery.toLowerCase()) &&
                                !formData.targetCountries.includes(c)
                              ).length === 0 && (
                                <p className="text-sm text-muted-foreground p-2 text-center">No countries found</p>
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    App Summary
                  </h4>
                  <div className="flex items-center gap-4">
                    {formData.iconUrl && (
                      <img 
                        src={formData.iconUrl} 
                        alt={formData.name}
                        className="w-16 h-16 rounded-2xl object-cover shadow-md"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-base">{formData.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {appCategories.find(c => c.id === formData.category)?.icon} {appCategories.find(c => c.id === formData.category)?.name}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 bg-background/50 rounded-lg p-2">{formData.description}</p>
                  {formData.screenshots.length > 0 && (
                    <p className="text-xs text-muted-foreground">📷 {formData.screenshots.length} screenshot(s) uploaded</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="text-sm font-medium">
                    Contact Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="developer@example.com"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">We'll contact you about your submission</p>
                </div>

                <div className="space-y-4 pt-2 border-t">
                  <h4 className="text-sm font-semibold pt-2">Agreements</h4>
                  
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeTerms}
                      onCheckedChange={(checked) => handleInputChange('agreeTerms', checked as boolean)}
                      className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-sm cursor-pointer leading-tight">
                      I agree to the <button onClick={() => window.open('/terms', '_blank')} className="text-primary hover:underline font-medium">Terms of Service</button> and <button onClick={() => window.open('/privacy', '_blank')} className="text-primary hover:underline font-medium">Privacy Policy</button>
                    </label>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Checkbox
                      id="guidelines"
                      checked={formData.agreeGuidelines}
                      onCheckedChange={(checked) => handleInputChange('agreeGuidelines', checked as boolean)}
                      className="mt-0.5"
                    />
                    <label htmlFor="guidelines" className="text-sm cursor-pointer leading-tight">
                      My app follows the <button onClick={() => window.open('/terms', '_blank')} className="text-primary hover:underline font-medium">AfuChat App Guidelines</button>
                    </label>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <p className="text-sm text-center flex items-center justify-center gap-2">
                    <span className="text-lg">📱</span>
                    Your app will be reviewed within <strong>24-48 hours</strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 pt-3 gap-3 border-t bg-muted/20">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} className="flex-1 h-11">
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext} className="flex-1 h-11 font-semibold">
              Continue
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 h-11 font-semibold">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit App
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
