import React, { useState, useEffect } from 'react';
import { 
  Ellipsis, Trash2, Flag, Share, LogIn, EyeOff, UserPlus, UserMinus, List, VolumeX, Volume2, UserX, Pencil, Quote, Loader2, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReportPostSheet from './ReportPostSheet';

interface Post {
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
    author_id: string;
    image_url: string | null;
    profiles: {
        display_name: string;
        handle: string;
        is_verified: boolean;
        is_organization_verified: boolean;
    };
    replies: any[];
    like_count: number;
    reply_count: number;
    has_liked: boolean;
}

interface AuthUser {
    id: string;
    user_metadata: {
        display_name?: string;
        handle?: string;
        is_verified?: boolean;
        is_organization_verified?: boolean;
    }
}

interface PostActionsSheetProps {
  post: Post;
  user: AuthUser | null; 
  navigate: (path: string) => void;
  onDelete: (postId: string) => void;
  onReport: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onQuote?: (post: Post) => void;
  onHidePost?: (postId: string) => void;
}

const PostActionsSheet: React.FC<PostActionsSheetProps> = ({ 
  post, 
  user, 
  navigate, 
  onDelete, 
  onReport, 
  onEdit, 
  onQuote,
  onHidePost 
}) => {
    const { t } = useTranslation();
    const isAuthor = user?.id === post.author_id;
    
    const [isOpen, setIsOpen] = useState(false);
    const [showReportSheet, setShowReportSheet] = useState(false);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [showMuteConfirm, setShowMuteConfirm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isReporting, setIsReporting] = useState(false);

    // Check follow/block status on mount
    useEffect(() => {
        if (user && post.author_id && user.id !== post.author_id) {
            checkUserStatus();
        }
    }, [user, post.author_id]);

    const checkUserStatus = async () => {
        if (!user) return;

        try {
            // Check if following
            const { data: followData } = await supabase
                .from('follows')
                .select('id')
                .eq('follower_id', user.id)
                .eq('following_id', post.author_id)
                .maybeSingle();
            
            setIsFollowing(!!followData);

            // Check if blocked
            const { data: blockData } = await supabase
                .from('blocked_users')
                .select('id')
                .eq('blocker_id', user.id)
                .eq('blocked_id', post.author_id)
                .maybeSingle();
            
            setIsBlocked(!!blockData);
            
            // Check muted status from localStorage (until muted_users table exists)
            const mutedUsers = JSON.parse(localStorage.getItem('mutedUsers') || '[]');
            setIsMuted(mutedUsers.includes(post.author_id));
        } catch (error) {
            console.error('Error checking user status:', error);
        }
    };

    const [activeSnapPoint, setActiveSnapPoint] = React.useState<number | string | null>(0.5);
    const isFullScreen = activeSnapPoint === 1;

    const handleShare = () => {
        const postUrl = `${window.location.origin}/post/${post.id}`;
        
        if (navigator.share) {
            navigator.share({
                title: `Post by @${post.profiles.handle}`,
                text: post.content.substring(0, 100) + '...',
                url: postUrl,
            }).catch(error => console.error('Error sharing:', error));
        } else {
            navigator.clipboard.writeText(postUrl)
                .then(() => toast.success('Link copied to clipboard!'))
                .catch(() => toast.error('Could not copy link.'));
        }
        setIsOpen(false);
    };

    const handleNotInterested = () => {
        // Store hidden posts in localStorage
        const hiddenPosts = JSON.parse(localStorage.getItem('hiddenPosts') || '[]');
        if (!hiddenPosts.includes(post.id)) {
            hiddenPosts.push(post.id);
            localStorage.setItem('hiddenPosts', JSON.stringify(hiddenPosts));
        }
        
        onHidePost?.(post.id);
        toast.success('Post hidden from your feed');
        setIsOpen(false);
    };

    const handleFollow = async () => {
        if (!user) return;

        setIsProcessing(true);
        try {
            if (isFollowing) {
                // Unfollow
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', user.id)
                    .eq('following_id', post.author_id);

                if (error) throw error;
                setIsFollowing(false);
                toast.success(`Unfollowed @${post.profiles.handle}`);
            } else {
                // Follow
                const { error } = await supabase
                    .from('follows')
                    .insert({
                        follower_id: user.id,
                        following_id: post.author_id
                    });

                if (error) throw error;
                setIsFollowing(true);
                toast.success(`Following @${post.profiles.handle}`);
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
            toast.error(isFollowing ? 'Failed to unfollow' : 'Failed to follow');
        } finally {
            setIsProcessing(false);
            setIsOpen(false);
        }
    };

    const handleMute = () => {
        // Store muted users in localStorage (until muted_users table exists)
        const mutedUsers = JSON.parse(localStorage.getItem('mutedUsers') || '[]');
        
        if (isMuted) {
            // Unmute
            const updatedMuted = mutedUsers.filter((id: string) => id !== post.author_id);
            localStorage.setItem('mutedUsers', JSON.stringify(updatedMuted));
            setIsMuted(false);
            toast.success(`Unmuted @${post.profiles.handle}`);
        } else {
            // Mute
            if (!mutedUsers.includes(post.author_id)) {
                mutedUsers.push(post.author_id);
                localStorage.setItem('mutedUsers', JSON.stringify(mutedUsers));
            }
            setIsMuted(true);
            toast.success(`Muted @${post.profiles.handle}`);
        }
        setShowMuteConfirm(false);
        setIsOpen(false);
    };

    const handleBlock = async () => {
        if (!user) return;

        setIsProcessing(true);
        try {
            if (isBlocked) {
                // Unblock
                const { error } = await supabase
                    .from('blocked_users')
                    .delete()
                    .eq('blocker_id', user.id)
                    .eq('blocked_id', post.author_id);

                if (error) throw error;
                setIsBlocked(false);
                toast.success(`Unblocked @${post.profiles.handle}`);
            } else {
                // Block
                const { error } = await supabase
                    .from('blocked_users')
                    .insert({
                        blocker_id: user.id,
                        blocked_id: post.author_id
                    });

                if (error) throw error;
                setIsBlocked(true);
                toast.success(`Blocked @${post.profiles.handle}`, {
                    description: 'They can no longer see your posts or message you.'
                });
                onHidePost?.(post.id);
            }
            setShowBlockConfirm(false);
        } catch (error) {
            console.error('Error toggling block:', error);
            toast.error(isBlocked ? 'Failed to unblock' : 'Failed to block');
        } finally {
            setIsProcessing(false);
            setIsOpen(false);
        }
    };

    const handleReportPost = (reason: string) => {
        // Call the parent onReport handler
        onReport(post.id);
        setShowReportSheet(false);
        toast.success('Report submitted', {
            description: 'Thank you for helping keep our community safe.'
        });
    };

    const handleAddToLists = () => {
        toast.info('Lists feature coming soon!');
        setIsOpen(false);
    };

    // --- RENDER LOGIC ---
    const renderActions = () => {
        if (!user) {
            return (
                <div className="px-4 pb-6 space-y-4 bg-background">
                    <div className="text-center text-muted-foreground text-sm py-6">
                        Log in to interact with this post.
                    </div>
                    <Button 
                        variant="default"
                        className="w-full justify-center py-4 h-auto bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-base rounded-2xl transition-all duration-300 ease-out hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => {
                            setIsOpen(false);
                            navigate('/auth');
                        }}
                    >
                        <LogIn className="h-5 w-5 mr-3 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                        Log In to Engage
                    </Button>
                </div>
            );
        }

        return (
            <div className="bg-background">
                <div className="px-4 pb-4">
                    {/* Quote Post */}
                    {onQuote && (
                        <Button 
                            variant="ghost" 
                            className="justify-start w-full text-left py-3.5 h-auto text-foreground hover:bg-muted/80 text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.005] group"
                            onClick={() => {
                                onQuote(post);
                                setIsOpen(false);
                            }}
                        >
                            <Quote className="h-4 w-4 mr-4 flex-shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-foreground" />
                            <span className="font-normal transition-colors duration-300 group-hover:text-foreground">Quote Post</span>
                        </Button>
                    )}

                    {/* Not interested - hides the post */}
                    {!isAuthor && (
                        <Button 
                            variant="ghost" 
                            className="justify-start w-full text-left py-3.5 h-auto text-foreground hover:bg-muted/80 text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.005] group"
                            onClick={handleNotInterested}
                            disabled={isProcessing}
                        >
                            <EyeOff className="h-4 w-4 mr-4 flex-shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-foreground" />
                            <span className="font-normal transition-colors duration-300 group-hover:text-foreground">Not interested in this post</span>
                        </Button>
                    )}

                    {/* Follow/Unfollow - only show if not author */}
                    {!isAuthor && (
                        <Button 
                            variant="ghost" 
                            className="justify-start w-full text-left py-3.5 h-auto text-foreground hover:bg-muted/80 text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.005] group"
                            onClick={handleFollow}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 mr-4 flex-shrink-0 animate-spin text-muted-foreground" />
                            ) : isFollowing ? (
                                <UserMinus className="h-4 w-4 mr-4 flex-shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-foreground" />
                            ) : (
                                <UserPlus className="h-4 w-4 mr-4 flex-shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-foreground" />
                            )}
                            <span className="font-normal transition-colors duration-300 group-hover:text-foreground">
                                {isFollowing ? `Unfollow @${post.profiles.handle}` : `Follow @${post.profiles.handle}`}
                            </span>
                            {isFollowing && (
                                <Check className="h-4 w-4 ml-auto text-primary" />
                            )}
                        </Button>
                    )}

                    {/* Add/remove from lists */}
                    <Button 
                        variant="ghost" 
                        className="justify-start w-full text-left py-3.5 h-auto text-foreground hover:bg-muted/80 text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.005] group"
                        onClick={handleAddToLists}
                    >
                        <List className="h-4 w-4 mr-4 flex-shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-foreground" />
                        <span className="font-normal transition-colors duration-300 group-hover:text-foreground">Add/remove from lists</span>
                    </Button>

                    {/* Mute - only show if not author */}
                    {!isAuthor && (
                        <Button 
                            variant="ghost" 
                            className="justify-start w-full text-left py-3.5 h-auto text-foreground hover:bg-muted/80 text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.005] group"
                            onClick={() => isMuted ? handleMute() : setShowMuteConfirm(true)}
                            disabled={isProcessing}
                        >
                            {isMuted ? (
                                <Volume2 className="h-4 w-4 mr-4 flex-shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-foreground" />
                            ) : (
                                <VolumeX className="h-4 w-4 mr-4 flex-shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-foreground" />
                            )}
                            <span className="font-normal transition-colors duration-300 group-hover:text-foreground">
                                {isMuted ? `Unmute @${post.profiles.handle}` : `Mute @${post.profiles.handle}`}
                            </span>
                            {isMuted && (
                                <Check className="h-4 w-4 ml-auto text-primary" />
                            )}
                        </Button>
                    )}

                    {/* Block - only show if not author */}
                    {!isAuthor && (
                        <Button 
                            variant="ghost" 
                            className="justify-start w-full text-left py-3.5 h-auto text-foreground hover:bg-muted/80 text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.005] group"
                            onClick={() => isBlocked ? handleBlock() : setShowBlockConfirm(true)}
                            disabled={isProcessing}
                        >
                            <UserX className="h-4 w-4 mr-4 flex-shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-foreground" />
                            <span className="font-normal transition-colors duration-300 group-hover:text-foreground">
                                {isBlocked ? `Unblock @${post.profiles.handle}` : `Block @${post.profiles.handle}`}
                            </span>
                        </Button>
                    )}

                    {/* Report Post - only show if not author */}
                    {!isAuthor && (
                        <Button 
                            variant="ghost" 
                            className="justify-start w-full text-left py-3.5 h-auto text-foreground hover:bg-destructive/10 text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.005] group" 
                            onClick={() => {
                                setIsOpen(false);
                                setShowReportSheet(true);
                            }}
                        >
                            <Flag className="h-4 w-4 mr-4 flex-shrink-0 text-destructive transition-colors duration-300 group-hover:text-destructive/90" />
                            <span className="font-normal text-destructive transition-colors duration-300 group-hover:text-destructive/90">Report post</span>
                        </Button>
                    )}

                    {/* Edit (Author Only) */}
                    {isAuthor && onEdit && (
                        <Button 
                            variant="ghost" 
                            className="justify-start w-full text-left py-3.5 h-auto text-foreground hover:bg-muted/80 text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.005] hover:shadow-sm group"
                            onClick={() => {
                                onEdit(post.id);
                                setIsOpen(false);
                            }}
                        >
                            <Pencil className="h-4 w-4 mr-4 flex-shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-foreground" />
                            <span className="font-normal transition-colors duration-300 group-hover:text-foreground">Edit Post</span>
                        </Button>
                    )}

                    {/* Share */}
                    <Button 
                        variant="ghost" 
                        className="justify-start w-full text-left py-3.5 h-auto text-foreground hover:bg-muted/80 text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.005] group"
                        onClick={handleShare}
                    >
                        <Share className="h-4 w-4 mr-4 flex-shrink-0 text-muted-foreground transition-colors duration-300 group-hover:text-foreground" />
                        <span className="font-normal transition-colors duration-300 group-hover:text-foreground">Share post</span>
                    </Button>

                    {/* Delete (Author Only) */}
                    {isAuthor && (
                        <Button 
                            variant="ghost" 
                            className="justify-start w-full text-left py-3.5 h-auto text-destructive hover:bg-destructive/10 font-semibold text-sm rounded-lg transition-all duration-300 ease-out hover:scale-[1.005] group"
                            onClick={() => {
                                onDelete(post.id);
                                setIsOpen(false);
                            }}
                        >
                            <Trash2 className="h-4 w-4 mr-4 flex-shrink-0 text-destructive transition-colors duration-300 group-hover:text-destructive/90" />
                            <span className="font-semibold text-destructive transition-colors duration-300 group-hover:text-destructive/90">Delete Post</span>
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <Drawer.Root
                open={isOpen}
                onOpenChange={setIsOpen}
                snapPoints={[0.5, 1]}
                activeSnapPoint={activeSnapPoint}
                setActiveSnapPoint={setActiveSnapPoint}
                fadeFromIndex={0}
            >
                <Drawer.Trigger asChild>
                    <button className="p-1 opacity-60 hover:opacity-100 transition-opacity">
                        <Ellipsis className="h-4 w-4 text-muted-foreground" />
                    </button>
                </Drawer.Trigger>
                
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
                    <Drawer.Content 
                        className={cn(
                            "fixed inset-x-0 bottom-0 z-50 h-full bg-background flex flex-col focus:outline-none shadow-2xl transition-[border-radius] duration-200",
                            isFullScreen ? 'rounded-none' : 'rounded-t-3xl border-t border-border'
                        )}
                    >
                        <div className="flex justify-center pt-4 pb-2 flex-shrink-0">
                            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors" />
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {renderActions()}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Report Post Sheet */}
            <ReportPostSheet
                isOpen={showReportSheet}
                onClose={() => setShowReportSheet(false)}
                onReport={handleReportPost}
                isReporting={isReporting}
            />

            {/* Block Confirmation Dialog */}
            <AlertDialog open={showBlockConfirm} onOpenChange={setShowBlockConfirm}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Block @{post.profiles.handle}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They won't be able to see your posts, send you messages, or interact with your content. You can unblock them later from Settings.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl" disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBlock}
                            disabled={isProcessing}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Block
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Mute Confirmation Dialog */}
            <AlertDialog open={showMuteConfirm} onOpenChange={setShowMuteConfirm}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Mute @{post.profiles.handle}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will no longer see posts from @{post.profiles.handle} in your feed. You can unmute them anytime.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl" disabled={isProcessing}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleMute}
                            disabled={isProcessing}
                            className="rounded-xl"
                        >
                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Mute
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default PostActionsSheet;
