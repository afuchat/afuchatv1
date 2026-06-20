import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNexa } from '@/hooks/useNexa';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { X, Sparkles, Image as ImageIcon, Globe, Wand2, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { ImageEditor } from '@/components/image-editor/ImageEditor';
import { BatchImageEditor } from '@/components/image-editor/BatchImageEditor';
import { postSchema } from '@/lib/validation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useImageDescription } from '@/hooks/useImageDescription';
import { AltTextEditor } from '@/components/ui/AltTextEditor';
import { compressImageFile } from '@/lib/imageCompression';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useLinkPreview } from '@/hooks/useLinkPreview';
import { LinkPreviewCard } from '@/components/ui/LinkPreviewCard';
import { useNavigate } from 'react-router-dom';
import { QuotedPostCard } from '@/components/feed/QuotedPostCard';
import { checkContentAllowed, getPreviewableLinks, validateLinks } from '@/lib/contentModeration';
import { PostAutocomplete } from '@/components/ui/PostAutocomplete';

interface QuotedPost {
    id: string;
    content: string;
    created_at: string;
    author_id: string;
    image_url?: string | null;
    post_images?: Array<{ image_url: string; display_order: number; alt_text?: string }>;
    profiles: {
        display_name: string;
        handle: string;
        is_verified: boolean;
        is_organization_verified: boolean;
        avatar_url?: string | null;
    };
}

interface WallTarget {
    id: string;
    display_name: string;
    handle: string;
    avatar_url?: string | null;
}

interface NewPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    quotedPost?: QuotedPost | null;
    wallTarget?: WallTarget | null;
}

const NewPostModal: React.FC<NewPostModalProps> = ({ isOpen, onClose, quotedPost, wallTarget }) => {
    const { user } = useAuth();
    const { awardNexa } = useNexa();
    const { isPremium } = usePremiumStatus();
    const navigate = useNavigate();
    
    const [newPost, setNewPost] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [showAIDialog, setShowAIDialog] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiMode, setAiMode] = useState<'generate' | 'improve' | 'complete'>('generate');
    const [generatingAI, setGeneratingAI] = useState(false);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [imageAltTexts, setImageAltTexts] = useState<string[]>([]);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
    const [editingImagePreview, setEditingImagePreview] = useState<string>('');
    const [showBatchEditor, setShowBatchEditor] = useState(false);
    const [showAltTextEditor, setShowAltTextEditor] = useState(false);
    const [editingAltTextIndex, setEditingAltTextIndex] = useState<number | null>(null);
    const [userProfile, setUserProfile] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { generateDescription, isGenerating } = useImageDescription();
    const { fetchPreview } = useLinkPreview();
    const [linkPreviews, setLinkPreviews] = useState<any[]>([]);

    const charCount = 280 - newPost.length;
    const charCountColor = charCount < 20 ? 'text-destructive' : charCount < 50 ? 'text-warning' : 'text-muted-foreground';

    React.useEffect(() => {
        if (user) {
            supabase
                .from('profiles')
                .select('display_name, avatar_url')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) setUserProfile(data);
                });
        }
    }, [user]);

    // Handle mobile keyboard visibility
    React.useEffect(() => {
        if (!isOpen) return;

        const handleResize = () => {
            // Adjust sheet position when keyboard appears on mobile
            if (window.visualViewport) {
                const viewportHeight = window.visualViewport.height;
                document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', handleResize);
            handleResize();
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            }
        };
    }, [isOpen]);

    const handleClose = () => {
        setNewPost('');
        setSelectedImages([]);
        setImagePreviews([]);
        setImageAltTexts([]);
        setShowAIDialog(false);
        setAiTopic('');
        setLinkPreviews([]);
        onClose();
    };

    const handlePost = async () => {
        if (!newPost.trim() && selectedImages.length === 0) {
            toast.error('Post cannot be empty');
            return;
        }

        const validation = postSchema.safeParse(newPost);
        if (!validation.success) {
            toast.error(validation.error.errors[0].message);
            return;
        }

        // Content moderation - check for blocked links
        const contentError = checkContentAllowed(newPost);
        if (contentError) {
            toast.error(contentError, {
                duration: 5000,
                icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
            });
            return;
        }

        setIsPosting(true);

        try {
            const imageUrls: string[] = [];
            
            for (let i = 0; i < selectedImages.length; i++) {
                const file = selectedImages[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${user?.id}-${Date.now()}-${i}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('post-images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage
                    .from('post-images')
                    .getPublicUrl(fileName);
                
                imageUrls.push(publicUrl);
            }

            const { data: postData, error: postError } = await supabase
                .from('posts')
                .insert({
                    content: newPost,
                    author_id: user?.id,
                    image_url: imageUrls.length > 0 ? imageUrls[0] : null,
                    quoted_post_id: quotedPost?.id || null,
                    wall_user_id: wallTarget?.id || null,
                })
                .select()
                .single();

            if (postError) throw postError;

            // Emit event so Feed can add this post to the top immediately
            window.dispatchEvent(new CustomEvent('own-post-created', { 
              detail: { id: postData.id } 
            }));

            if (imageUrls.length > 0 && postData) {
                const imageInserts = imageUrls.map((url, index) => ({
                    post_id: postData.id,
                    image_url: url,
                    display_order: index,
                    alt_text: imageAltTexts[index] || '',
                }));

                const { error: imageError } = await supabase
                    .from('post_images')
                    .insert(imageInserts);

                if (imageError) throw imageError;
            }

            // Save link previews
            if (linkPreviews.length > 0 && postData) {
                const previewInserts = linkPreviews.map(preview => ({
                    post_id: postData.id,
                    url: preview.url,
                    title: preview.title,
                    description: preview.description,
                    image_url: preview.image_url,
                    site_name: preview.site_name,
                }));

                await supabase.from('post_link_previews').insert(previewInserts);
            }

            toast.success('Post created successfully!');
            handleClose();
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error('Failed to create post. Please try again.');
        } finally {
            setIsPosting(false);
        }
    };

    const handleAIGenerate = async (mode: 'generate' | 'improve' | 'complete' = 'generate') => {
        if (!isPremium) {
            toast.error('Premium subscription required for AI features');
            navigate('/premium');
            return;
        }

        const content = mode === 'generate' ? aiTopic : newPost;
        
        if (!content.trim()) {
            toast.error(mode === 'generate' ? 'Please enter a topic' : 'Please write some content first');
            return;
        }

        setGeneratingAI(true);
        try {
            const { data, error } = await supabase.functions.invoke('generate-post', {
                body: { 
                    topic: content, 
                    tone: 'casual', 
                    length: 'medium',
                    mode: mode
                }
            });

            if (error) {
                if (error.message?.includes('requiresPremium')) {
                    toast.error('Premium subscription required');
                    navigate('/premium');
                    return;
                }
                throw error;
            }
            
            if (!data || typeof data.post !== 'string') {
                throw new Error('Invalid response from AI service');
            }
            
            setNewPost(data.post);
            setShowAIDialog(false);
            setAiTopic('');
            
            const successMessages = {
                generate: 'AI post generated! ✨',
                improve: 'Post improved! ✨',
                complete: 'Post completed! ✨'
            };
            toast.success(successMessages[mode]);
        } catch (error: any) {
            console.error('AI generation error:', error);
            if (error.status === 429) {
                toast.error('Rate limit exceeded, try again later');
            } else if (error.status === 402) {
                toast.error('AI service unavailable, try again later');
            } else {
                toast.error('Failed to generate post');
            }
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (selectedImages.length + files.length > 4) {
            toast.error('You can only upload up to 4 images per post');
            return;
        }

        const validFiles: File[] = [];
        const newPreviews: string[] = [];
        let processedCount = 0;

        toast.info('Compressing images...');

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                toast.error(`${file.name} is not an image file`);
                continue;
            }

            if (file.size > 5 * 1024 * 1024) {
                toast.error(`${file.name} is larger than 5MB`);
                continue;
            }

            try {
                const compressedFile = await compressImageFile(file);
                validFiles.push(compressedFile);
                const reader = new FileReader();
                reader.onloadend = async () => {
                    newPreviews.push(reader.result as string);
                    processedCount++;
                    if (processedCount === validFiles.length) {
                        setSelectedImages(prev => [...prev, ...validFiles]);
                        setImagePreviews(prev => [...prev, ...newPreviews]);
                        // Skip AI description generation - add empty alt texts
                        const newAltTexts: string[] = newPreviews.map(() => '');
                        setImageAltTexts(prev => [...prev, ...newAltTexts]);
                        toast.success('Images ready!');
                    }
                };
                reader.readAsDataURL(compressedFile);
            } catch (error) {
                console.error('Compression error:', error);
                toast.error(`Failed to compress ${file.name}`);
            }
        }
    };

    const handleRemoveImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setImageAltTexts(prev => prev.filter((_, i) => i !== index));
    };

    const handleTextChange = async (text: string) => {
        setNewPost(text);
        
        // Only fetch previews for allowed links (Telegram and AfuChat only)
        const urls = getPreviewableLinks(text);
        for (const url of urls) {
            if (!linkPreviews.find(p => p.url === url)) {
                const preview = await fetchPreview(url);
                if (preview) {
                    setLinkPreviews(prev => [...prev, preview]);
                }
            }
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <Sheet open={isOpen} onOpenChange={handleClose}>
                <SheetContent 
                    side="bottom" 
                    className="max-h-[85vh] max-w-2xl mx-auto p-0 gap-0 overflow-y-auto rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50"
                    onOpenChange={handleClose}
                    style={{
                        position: 'fixed',
                        bottom: '0',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '100%',
                        maxWidth: '42rem',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-end px-6 py-4 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-xl z-10">
                        <Button
                            onClick={handlePost}
                            disabled={isPosting || (!newPost.trim() && selectedImages.length === 0)}
                            className="rounded-xl px-8 font-semibold h-11 bg-primary hover:bg-primary/90"
                        >
                            {isPosting ? (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                                    Posting...
                                </>
                            ) : (
                                'Post'
                            )}
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="p-4 pb-safe">
                        {/* Wall Post Target Banner */}
                        {wallTarget && (
                            <div className="mb-3 p-3 bg-muted/50 rounded-lg border border-border/50 flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Posting on</span>
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={wallTarget.avatar_url || undefined} alt={wallTarget.display_name} />
                                    <AvatarFallback>{wallTarget.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-sm">{wallTarget.display_name}</span>
                                <span className="text-muted-foreground text-sm">@{wallTarget.handle}'s wall</span>
                            </div>
                        )}
                        
                        <div className="flex gap-3">
                            {/* Avatar */}
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarImage src={userProfile?.avatar_url || undefined} alt={userProfile?.display_name || 'You'} />
                              <AvatarFallback>{(userProfile?.display_name || 'You').charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>

                            {/* Post Content */}
                            <div className="flex-1 min-w-0">
                                <PostAutocomplete
                                    value={newPost}
                                    onChange={handleTextChange}
                                    placeholder={wallTarget ? `Write something on ${wallTarget.display_name}'s wall...` : "What's happening?"}
                                    textareaRef={textareaRef as any}
                                />

                                {/* Quoted Post Preview */}
                                {quotedPost && (
                                    <QuotedPostCard quotedPost={quotedPost} className="mt-0" />
                                )}

                                {/* Link Previews */}
                                {linkPreviews.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {linkPreviews.map((preview, index) => (
                                            <LinkPreviewCard key={index} {...preview} />
                                        ))}
                                    </div>
                                )}

                                {/* Image Previews */}
                                {imagePreviews.length > 0 && (
                                    <div className={cn(
                                        "mt-3 gap-2 rounded-2xl overflow-hidden border border-border/50",
                                        imagePreviews.length === 1 && "grid grid-cols-1",
                                        imagePreviews.length === 2 && "grid grid-cols-2",
                                        imagePreviews.length >= 3 && "grid grid-cols-2"
                                    )}>
                                        {imagePreviews.map((preview, index) => (
                                            <div
                                                key={index}
                                                className={cn(
                                                    "relative group aspect-square overflow-hidden bg-muted",
                                                    imagePreviews.length === 3 && index === 0 && "col-span-2"
                                                )}
                                            >
                                                <img
                                                    src={preview}
                                                    alt={`Upload ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveImage(index)}
                                                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Bottom Toolbar */}
                                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="h-9 w-9 rounded-full text-primary hover:bg-primary/10"
                                        >
                                            <ImageIcon className="h-5 w-5" />
                                        </Button>
                                        
                                        {/* AI Features - Premium Only */}
                                        {isPremium && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setShowAIDialog(true)}
                                                    className="h-9 w-9 rounded-full text-primary hover:bg-primary/10"
                                                    title="Generate with AI"
                                                >
                                                    <Sparkles className="h-5 w-5" />
                                                </Button>
                                                {newPost.trim().length > 10 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleAIGenerate('improve')}
                                                        disabled={generatingAI}
                                                        className="h-9 w-9 rounded-full text-primary hover:bg-primary/10"
                                                        title="Improve with AI"
                                                    >
                                                        {generatingAI ? (
                                                            <RefreshCw className="h-5 w-5 animate-spin" />
                                                        ) : (
                                                            <Wand2 className="h-5 w-5" />
                                                        )}
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                        
                                        {/* Premium Upgrade Hint */}
                                        {!isPremium && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    toast.info('Upgrade to Premium for AI writing assistance');
                                                    navigate('/premium');
                                                }}
                                                className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 relative"
                                                title="AI Features (Premium)"
                                            >
                                                <Sparkles className="h-5 w-5" />
                                                <Badge 
                                                    variant="secondary" 
                                                    className="absolute -top-1 -right-1 text-[8px] px-1 py-0 h-4 bg-primary/20"
                                                >
                                                    PRO
                                                </Badge>
                                            </Button>
                                        )}
                                        
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-full text-primary hover:bg-primary/10"
                                        >
                                            <Globe className="h-5 w-5" />
                                        </Button>
                                    </div>

                                    {/* Character Count */}
                                    {newPost.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-sm tabular-nums", charCountColor)}>
                                                {charCount}
                                            </span>
                                            <div className="w-8 h-8 relative">
                                                <svg className="transform -rotate-90 w-8 h-8">
                                                    <circle
                                                        cx="16"
                                                        cy="16"
                                                        r="14"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        fill="none"
                                                        className="text-muted/20"
                                                    />
                                                    <circle
                                                        cx="16"
                                                        cy="16"
                                                        r="14"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        fill="none"
                                                        strokeDasharray={`${2 * Math.PI * 14}`}
                                                        strokeDashoffset={`${2 * Math.PI * 14 * (1 - newPost.length / 280)}`}
                                                        className={cn(
                                                            "transition-all",
                                                            charCount < 20 ? "text-destructive" : 
                                                            charCount < 50 ? "text-warning" : "text-primary"
                                                        )}
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                    />
                </SheetContent>
            </Sheet>

            {/* AI Sheet */}
            <Sheet open={showAIDialog} onOpenChange={setShowAIDialog}>
                <SheetContent 
                    side="bottom" 
                    className="max-h-[85vh] max-w-md mx-auto rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/50 p-6" 
                    onOpenChange={setShowAIDialog}
                >
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-2xl font-bold mb-2">AI Post Generator</h3>
                            <p className="text-sm text-muted-foreground">
                                Tell AI what you want to post about and it will learn from your style
                            </p>
                        </div>
                        
                        {/* Mode Selection */}
                        <div className="flex gap-2">
                            <Button
                                variant={aiMode === 'generate' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setAiMode('generate')}
                                className="flex-1 rounded-xl h-10 font-semibold"
                            >
                                <Sparkles className="mr-1.5 h-4 w-4" />
                                Generate
                            </Button>
                            <Button
                                variant={aiMode === 'complete' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setAiMode('complete')}
                                className="flex-1 rounded-xl h-10 font-semibold"
                                disabled={newPost.trim().length < 5}
                            >
                                <CheckCircle className="mr-1.5 h-4 w-4" />
                                Complete
                            </Button>
                        </div>
                        
                        <Textarea
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            placeholder={aiMode === 'generate' 
                                ? "E.g., my thoughts on climate change..." 
                                : "Enter additional context for completion..."
                            }
                            className="min-h-[100px] rounded-xl"
                        />
                        
                        <p className="text-xs text-muted-foreground">
                            ✨ AI learns from your previous posts and engagement to match your style
                        </p>
                        
                        <div className="flex gap-2">
                            <Button
                                onClick={() => handleAIGenerate(aiMode)}
                                disabled={generatingAI || !aiTopic.trim()}
                                className="flex-1 rounded-xl h-12 font-semibold"
                            >
                                {generatingAI ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        {aiMode === 'generate' ? 'Generating...' : 'Completing...'}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        {aiMode === 'generate' ? 'Generate Post' : 'Complete Post'}
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" onClick={() => setShowAIDialog(false)} className="rounded-xl h-12 font-semibold">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Image Editor */}
            {showImageEditor && editingImagePreview && (
                <ImageEditor
                    image={editingImagePreview}
                    onSave={(blob) => {
                        if (editingImageIndex !== null) {
                            const file = new File([blob], selectedImages[editingImageIndex]?.name || 'edited.png', {
                                type: 'image/png',
                            });
                            const newImages = [...selectedImages];
                            newImages[editingImageIndex] = file;
                            setSelectedImages(newImages);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const newPreviews = [...imagePreviews];
                                newPreviews[editingImageIndex] = reader.result as string;
                                setImagePreviews(newPreviews);
                            };
                            reader.readAsDataURL(file);
                        }
                        setShowImageEditor(false);
                        setEditingImageIndex(null);
                    }}
                    onCancel={() => {
                        setShowImageEditor(false);
                        setEditingImageIndex(null);
                    }}
                />
            )}

            {/* Batch Editor */}
            {showBatchEditor && imagePreviews.length > 0 && (
                <BatchImageEditor
                    isOpen={showBatchEditor}
                    onClose={() => setShowBatchEditor(false)}
                    images={imagePreviews}
                    onApply={(editedImages) => {
                        setImagePreviews(editedImages);
                        setShowBatchEditor(false);
                    }}
                />
            )}

            {/* Alt Text Editor removed - simplified design */}
        </>
    );
};

export default NewPostModal;
