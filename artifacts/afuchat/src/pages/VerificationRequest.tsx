import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, FileText, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";

export default function VerificationRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; url: string; type: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    accountType: "business" as "business" | "influencer",
    fullName: "",
    email: "",
    phone: "",
    websiteUrl: "",
    socialLinks: "",
    verificationReason: "",
    // Business-specific fields
    businessRegistration: "",
    taxId: "",
    // Influencer-specific fields
    primaryPlatform: "",
    followerCount: "",
    engagementRate: "",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const uploadedUrls: Array<{ name: string; url: string; type: string }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('verification-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('verification-documents')
          .getPublicUrl(fileName);

        uploadedUrls.push({
          name: file.name,
          url: publicUrl,
          type: file.type
        });

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setUploadedFiles([...uploadedFiles, ...uploadedUrls]);
      toast.success(`${files.length} file(s) uploaded successfully`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error(error.message || "Failed to upload files");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to apply for verification");
      return;
    }

    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one supporting document");
      return;
    }

    setLoading(true);

    try {
      // Parse social links (comma-separated)
      const socialLinksArray = formData.socialLinks
        .split(",")
        .map(link => link.trim())
        .filter(link => link.length > 0);

      const { error } = await supabase
        .from("verification_requests")
        .insert({
          user_id: user.id,
          account_type: formData.accountType,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          website_url: formData.websiteUrl || null,
          social_links: socialLinksArray,
          verification_reason: formData.verificationReason,
          supporting_documents: uploadedFiles.map(f => f.url),
          status: "pending",
          // Business-specific fields
          business_registration: formData.accountType === "business" ? formData.businessRegistration : null,
          tax_id: formData.accountType === "business" ? formData.taxId : null,
          // Influencer-specific fields
          primary_platform: formData.accountType === "influencer" ? formData.primaryPlatform : null,
          follower_count: formData.accountType === "influencer" ? formData.followerCount : null,
          engagement_rate: formData.accountType === "influencer" ? formData.engagementRate : null,
        });

      if (error) throw error;

      toast.success("Verification request submitted successfully! Our team will review your application.");
      navigate(-1);
    } catch (error: any) {
      console.error("Error submitting verification request:", error);
      toast.error(error.message || "Failed to submit verification request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Get Verified</h1>
            <p className="text-sm text-muted-foreground">Apply to get your account verified</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Get Verified</CardTitle>
            <CardDescription>
              Fill out this form to apply for account verification. Our team will review your application within 3-5 business days.
            </CardDescription>
            <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-primary">Permanent Verification</p>
                  <p className="text-muted-foreground">Manual verification is permanent and won't expire, unlike premium subscription verification.</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Type */}
              <div className="space-y-3">
                <Label>Account Type *</Label>
                <RadioGroup
                  value={formData.accountType}
                  onValueChange={(value: "business" | "influencer") =>
                    setFormData({ ...formData, accountType: value })
                  }
                >
                  <div className="flex items-center space-x-2 rounded-lg p-4 cursor-pointer hover:bg-accent bg-muted/30">
                    <RadioGroupItem value="business" id="business" />
                    <Label htmlFor="business" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Business / Organization</div>
                      <div className="text-sm text-muted-foreground">
                        Official business accounts, brands, or organizations
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg p-4 cursor-pointer hover:bg-accent bg-muted/30">
                    <RadioGroupItem value="influencer" id="influencer" />
                    <Label htmlFor="influencer" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Influencer / Creator</div>
                      <div className="text-sm text-muted-foreground">
                        Content creators, public figures, or influencers
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">
                  {formData.accountType === "business" ? "Business Name *" : "Full Name / Stage Name *"}
                </Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder={formData.accountType === "business" ? "Your registered business name" : "Your full name or stage name"}
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  {formData.accountType === "business" ? "Business Email *" : "Email Address *"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={formData.accountType === "business" ? "business@company.com" : "your@email.com"}
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>

              {/* Business-specific fields */}
              {formData.accountType === "business" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="businessRegistration">Business Registration Number *</Label>
                    <Input
                      id="businessRegistration"
                      value={formData.businessRegistration}
                      onChange={(e) => setFormData({ ...formData, businessRegistration: e.target.value })}
                      placeholder="Enter your business registration number"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">Tax ID / EIN (Optional)</Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      placeholder="Enter your tax identification number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Business Website URL *</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://yourbusiness.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="socialLinks">Social Media Links (Optional)</Label>
                    <Textarea
                      id="socialLinks"
                      value={formData.socialLinks}
                      onChange={(e) => setFormData({ ...formData, socialLinks: e.target.value })}
                      placeholder="Enter business social media URLs, separated by commas
Example: https://twitter.com/yourbusiness, https://linkedin.com/company/yourbusiness"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Influencer-specific fields */}
              {formData.accountType === "influencer" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="primaryPlatform">Primary Social Media Platform *</Label>
                    <Input
                      id="primaryPlatform"
                      value={formData.primaryPlatform}
                      onChange={(e) => setFormData({ ...formData, primaryPlatform: e.target.value })}
                      placeholder="e.g., Instagram, YouTube, TikTok"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="followerCount">Total Follower/Subscriber Count *</Label>
                    <Input
                      id="followerCount"
                      value={formData.followerCount}
                      onChange={(e) => setFormData({ ...formData, followerCount: e.target.value })}
                      placeholder="e.g., 50,000"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Combined followers across all platforms
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="engagementRate">Average Engagement Rate (Optional)</Label>
                    <Input
                      id="engagementRate"
                      value={formData.engagementRate}
                      onChange={(e) => setFormData({ ...formData, engagementRate: e.target.value })}
                      placeholder="e.g., 5.2%"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="socialLinks">Social Media Profile Links *</Label>
                    <Textarea
                      id="socialLinks"
                      value={formData.socialLinks}
                      onChange={(e) => setFormData({ ...formData, socialLinks: e.target.value })}
                      placeholder="Enter all your social media profile URLs, separated by commas
Example: https://instagram.com/yourprofile, https://youtube.com/@yourchannel, https://tiktok.com/@yourprofile"
                      rows={4}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide all relevant social media profiles to verify your influence
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Portfolio/Website URL (Optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </>
              )}

              {/* Verification Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Why do you want to get verified? *</Label>
                <Textarea
                  id="reason"
                  value={formData.verificationReason}
                  onChange={(e) => setFormData({ ...formData, verificationReason: e.target.value })}
                  placeholder="Explain why your account should be verified. Include details about your business, influence, or notable achievements."
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 50 characters. Be specific about your accomplishments and why verification would benefit the community.
                </p>
              </div>

              {/* Supporting Documents */}
              <div className="space-y-3">
                <Label>Supporting Documents *</Label>
                <div className="space-y-3">
                  <div className="rounded-lg p-6 text-center space-y-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Upload Supporting Documents</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, JPG, PNG up to 10MB each
                      </p>
                    </div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      {loading && uploadProgress > 0 ? "Uploading..." : "Choose Files"}
                    </Button>
                  </div>

                  {uploadProgress > 0 && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">
                        Uploading... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  )}

                  {/* Uploaded Files List */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Uploaded Documents ({uploadedFiles.length})</p>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                          >
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {file.type.startsWith('image/') ? (
                                <ImageIcon className="w-5 h-5 text-primary" />
                              ) : (
                                <FileText className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">Uploaded</p>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="flex-shrink-0"
                              onClick={() => handleRemoveFile(index)}
                              disabled={loading}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                      {formData.accountType === "business" ? "Accepted Business Documents:" : "Accepted Influencer Documents:"}
                    </p>
                    {formData.accountType === "business" ? (
                      <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4">
                        <li>• Business registration or incorporation certificate</li>
                        <li>• Tax registration documents or EIN letter</li>
                        <li>• Business license or permit</li>
                        <li>• Proof of business address (utility bill, lease)</li>
                        <li>• Company letterhead or official documentation</li>
                      </ul>
                    ) : (
                      <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 ml-4">
                        <li>• Screenshots of verified social media accounts</li>
                        <li>• Analytics dashboard showing follower counts and engagement</li>
                        <li>• Media coverage, press mentions, or interviews</li>
                        <li>• Government-issued ID (passport, driver's license)</li>
                        <li>• Collaboration emails with brands or media outlets</li>
                        <li>• Awards, certifications, or recognition documents</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={
                  loading || 
                  !formData.fullName || 
                  !formData.email || 
                  !formData.verificationReason || 
                  formData.verificationReason.length < 50 ||
                  uploadedFiles.length === 0 ||
                  (formData.accountType === "business" && (!formData.businessRegistration || !formData.websiteUrl)) ||
                  (formData.accountType === "influencer" && (!formData.primaryPlatform || !formData.followerCount || !formData.socialLinks))
                }
              >
                {loading ? (
                  <>
                    Submitting...
                  </>
                ) : (
                  "Get Verified"
                )}
              </Button>

              {uploadedFiles.length === 0 && (
                <p className="text-xs text-center text-destructive">
                  Please upload at least one supporting document to continue
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
