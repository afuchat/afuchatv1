import { useEffect, useState, useMemo, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationsSkeleton } from '@/components/skeletons';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, UserPlus, Gift, Check, X, Eye, UserCheck, UserX, Trash2, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TwitterVerifiedBadge = ({ size = 'w-4 h-4' }: { size?: string }) => (
  <svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" className={`${size} ml-1`}>
    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#00C2CB" />
  </svg>
);

const GoldVerifiedBadge = ({ size = 'w-4 h-4' }: { size?: string }) => (
  <svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" className={`${size} ml-1`}>
    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFD43B" />
  </svg>
);

const VerifiedBadge = ({ isVerified, isOrgVerified }: { isVerified?: boolean; isOrgVerified?: boolean }) => {
  if (isOrgVerified) return <GoldVerifiedBadge />;
  if (isVerified) return <TwitterVerifiedBadge />;
  return null;
};

export interface Notification {
  id: string;
  created_at: string;
  type: 'new_follower' | 'new_like' | 'new_reply' | 'new_mention' | 'gift' | 'follow_request';
  is_read: boolean;
  post_id: string | null;
  actor_id: string | null;
  actor: {
    display_name: string;
    handle: string;
    avatar_url?: string;
    is_verified?: boolean;
    is_organization_verified?: boolean;
  };
  post?: {
    content: string;
  };
}

interface FollowRequest {
  id: string;
  requester_id: string;
  status: string;
  created_at: string;
  requester: {
    display_name: string;
    handle: string;
    avatar_url?: string;
    is_verified?: boolean;
    is_organization_verified?: boolean;
  };
}

interface NotificationRowProps {
  notification: Notification;
  onFollowBack: (actorId: string, handle: string) => void;
  isFollowingBack: string | null;
  followingIds: Set<string>;
  onDelete: (id: string) => void;
  isDeleting: string | null;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const NotificationRow = ({ 
  notification, 
  onFollowBack, 
  isFollowingBack, 
  followingIds, 
  onDelete, 
  isDeleting,
  isSelectionMode,
  isSelected,
  onToggleSelect 
}: NotificationRowProps) => {
  const navigate = useNavigate();
  const { actor, post, type, created_at, post_id, actor_id } = notification;
  const isAlreadyFollowing = actor_id ? followingIds.has(actor_id) : false;
  const isCurrentlyDeleting = isDeleting === notification.id;

  const renderIcon = () => {
    switch (type) {
      case 'new_like':
        return <Heart className="h-5 w-5 text-red-500 fill-red-500" />;
      case 'new_reply':
      case 'new_mention':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'new_follower':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'gift':
        return <Gift className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const truncateName = (name: string) => name.length > 12 ? `${name.slice(0, 10)}...` : name;

  const renderMessage = () => {
    switch (type) {
      case 'new_like':
        return <span><span className="font-semibold" title={actor.display_name}>{truncateName(actor.display_name)}</span> liked your post</span>;
      case 'new_reply':
        return <span><span className="font-semibold" title={actor.display_name}>{truncateName(actor.display_name)}</span> replied to your post</span>;
      case 'new_mention':
        return <span><span className="font-semibold" title={actor.display_name}>{truncateName(actor.display_name)}</span> mentioned you</span>;
      case 'new_follower':
        return <span><span className="font-semibold" title={actor.display_name}>{truncateName(actor.display_name)}</span> started following you</span>;
      case 'gift':
        return <span><span className="font-semibold" title={actor.display_name}>{truncateName(actor.display_name)}</span> sent you a gift</span>;
      default:
        return 'New notification';
    }
  };

  const renderActionButtons = () => {
    if (isSelectionMode) return null;
    
    switch (type) {
      case 'new_like':
      case 'new_reply':
      case 'new_mention':
        return (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                if (post_id) navigate(`/post/${post_id}`);
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              View Post
            </Button>
          </div>
        );
      case 'new_follower':
        return (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/@${actor.handle}`);
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              View Profile
            </Button>
            {!isAlreadyFollowing && (
              <Button
                size="sm"
                className="h-8 text-xs"
                disabled={isFollowingBack === actor_id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (actor_id) onFollowBack(actor_id, actor.handle);
                }}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                {isFollowingBack === actor_id ? 'Following...' : 'Follow Back'}
              </Button>
            )}
          </div>
        );
      case 'gift':
        return (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/@${actor.handle}`);
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              View Profile
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/gifts');
              }}
            >
              <Gift className="h-3.5 w-3.5 mr-1" />
              View Gifts
            </Button>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div 
      className={cn(
        "flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border-b border-border relative group cursor-pointer",
        !notification.is_read && "bg-primary/5",
        isSelected && "bg-primary/10"
      )}
      onClick={() => isSelectionMode && onToggleSelect(notification.id)}
    >
      {isSelectionMode && (
        <button 
          className="flex-shrink-0 mt-1"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(notification.id);
          }}
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-primary" />
          ) : (
            <Square className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      )}
      <Link 
        to={`/@${actor.handle}`} 
        onClick={(e) => {
          if (isSelectionMode) {
            e.preventDefault();
            onToggleSelect(notification.id);
          } else {
            e.stopPropagation();
          }
        }}
      >
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={actor.avatar_url} alt={actor.display_name} />
          <AvatarFallback>{actor.display_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">{renderIcon()}</div>
          <div className="text-xs sm:text-sm text-foreground flex items-center flex-wrap gap-1">
            {renderMessage()}
            <VerifiedBadge isVerified={actor.is_verified} isOrgVerified={actor.is_organization_verified} />
          </div>
        </div>
        
        {post?.content && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 p-2 border border-border rounded-md bg-muted/30 line-clamp-2">
            {post.content}
          </p>
        )}

        {renderActionButtons()}
        
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
          {new Date(created_at).toLocaleString('en-UG')}
        </p>
      </div>
      {!isSelectionMode && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          disabled={isCurrentlyDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

interface FollowRequestRowProps {
  request: FollowRequest;
  onApprove: (requestId: string, requesterId: string) => void;
  onReject: (requestId: string) => void;
  isProcessing: string | null;
}

const FollowRequestRow = ({ request, onApprove, onReject, isProcessing }: FollowRequestRowProps) => {
  const navigate = useNavigate();
  const { requester, created_at } = request;

  return (
    <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border-b border-border bg-primary/5">
      <Link to={`/@${requester.handle}`} onClick={(e) => e.stopPropagation()}>
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={requester.avatar_url} alt={requester.display_name} />
          <AvatarFallback>{requester.display_name?.charAt(0)?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div className="text-xs sm:text-sm text-foreground flex items-center flex-wrap gap-1">
            <span><span className="font-semibold" title={requester.display_name}>{requester.display_name.length > 12 ? `${requester.display_name.slice(0, 10)}...` : requester.display_name}</span> wants to follow you</span>
            <VerifiedBadge isVerified={requester.is_verified} isOrgVerified={requester.is_organization_verified} />
          </div>
        </div>
        
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/${requester.handle}`);
            }}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View Profile
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-green-600 hover:bg-green-700"
            disabled={isProcessing === request.id}
            onClick={(e) => {
              e.stopPropagation();
              onApprove(request.id, request.requester_id);
            }}
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            {isProcessing === request.id ? 'Approving...' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs"
            disabled={isProcessing === request.id}
            onClick={(e) => {
              e.stopPropagation();
              onReject(request.id);
            }}
          >
            <UserX className="h-3.5 w-3.5 mr-1" />
            Reject
          </Button>
        </div>
        
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
          {new Date(created_at).toLocaleString('en-UG')}
        </p>
      </div>
    </div>
  );
};

const Notifications = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isFollowingBack, setIsFollowingBack] = useState<string | null>(null);
  const [isDeletingNotification, setIsDeletingNotification] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null; display_name: string } | null>(null);
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  
  // Track deleted notification IDs to prevent them from reappearing
  const deletedIdsRef = useRef<Set<string>>(new Set());

  // Fetch user profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('id', user.id)
        .single();
      if (data) setUserProfile(data);
    };
    fetchProfile();
  }, [user]);

  const markAsRead = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('mark_notifications_as_read');
      if (error) {
        console.error('Error marking notifications as read:', error);
        return;
      }
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Deduplicate notifications - keep only the most recent per actor+type+post combination
  const deduplicatedNotifications = useMemo(() => {
    const seen = new Map<string, Notification>();
    
    for (const notification of notifications) {
      // Create a unique key based on actor, type, and post (if applicable)
      const key = `${notification.actor_id}-${notification.type}-${notification.post_id || 'no-post'}`;
      
      // Only keep the most recent notification for each key
      if (!seen.has(key)) {
        seen.set(key, notification);
      }
    }
    
    return Array.from(seen.values());
  }, [notifications]);

  const toggleSelectNotification = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllNotifications = () => {
    if (selectedIds.size === deduplicatedNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deduplicatedNotifications.map(n => n.id)));
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    setPendingDeleteId(notificationId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteNotification = async () => {
    if (!user || !pendingDeleteId) return;
    
    // Find the notification and all its duplicates (same actor, type, post)
    const targetNotification = notifications.find(n => n.id === pendingDeleteId);
    if (!targetNotification) {
      setPendingDeleteId(null);
      setShowDeleteConfirm(false);
      return;
    }
    
    // Get all notification IDs that match the same deduplication key
    const dedupeKey = `${targetNotification.actor_id}-${targetNotification.type}-${targetNotification.post_id || 'no-post'}`;
    const idsToDelete = notifications
      .filter(n => `${n.actor_id}-${n.type}-${n.post_id || 'no-post'}` === dedupeKey)
      .map(n => n.id);
    
    // Track all IDs as deleted to prevent reappearing
    idsToDelete.forEach(id => deletedIdsRef.current.add(id));
    
    setIsDeletingNotification(pendingDeleteId);
    setShowDeleteConfirm(false);
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => !idsToDelete.includes(n.id)));
      // Update cache to exclude deleted notifications
      const cached = sessionStorage.getItem('cachedNotifications');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          sessionStorage.setItem('cachedNotifications', JSON.stringify(
            parsed.filter((n: Notification) => !idsToDelete.includes(n.id))
          ));
        } catch (e) {}
      }
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Remove from tracked deleted IDs if delete failed
      idsToDelete.forEach(id => deletedIdsRef.current.delete(id));
      toast.error('Failed to delete notification');
    } finally {
      setIsDeletingNotification(null);
      setPendingDeleteId(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedIds.size === 0) return;
    
    // Find all notification IDs including duplicates for each selected notification
    const allIdsToDelete = new Set<string>();
    selectedIds.forEach(selectedId => {
      const targetNotification = notifications.find(n => n.id === selectedId);
      if (targetNotification) {
        const dedupeKey = `${targetNotification.actor_id}-${targetNotification.type}-${targetNotification.post_id || 'no-post'}`;
        notifications
          .filter(n => `${n.actor_id}-${n.type}-${n.post_id || 'no-post'}` === dedupeKey)
          .forEach(n => allIdsToDelete.add(n.id));
      }
    });
    
    // Track all IDs as deleted
    allIdsToDelete.forEach(id => deletedIdsRef.current.add(id));
    
    setIsClearingAll(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', Array.from(allIdsToDelete));

      if (error) throw error;

      setNotifications(prev => prev.filter(n => !allIdsToDelete.has(n.id)));
      // Update cache
      const cached = sessionStorage.getItem('cachedNotifications');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          sessionStorage.setItem('cachedNotifications', JSON.stringify(
            parsed.filter((n: Notification) => !allIdsToDelete.has(n.id))
          ));
        } catch (e) {}
      }
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      toast.success(`${selectedIds.size} notification(s) deleted`);
    } catch (error) {
      console.error('Error deleting selected notifications:', error);
      // Remove from tracked deleted IDs if delete failed
      allIdsToDelete.forEach(id => deletedIdsRef.current.delete(id));
      toast.error('Failed to delete notifications');
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleClearAllNotifications = () => {
    setShowClearAllConfirm(true);
  };

  const confirmClearAllNotifications = async () => {
    if (!user || notifications.length === 0) return;
    
    // Track all current notification IDs as deleted
    notifications.forEach(n => deletedIdsRef.current.add(n.id));
    
    setShowClearAllConfirm(false);
    setIsClearingAll(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications([]);
      sessionStorage.removeItem('cachedNotifications');
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      // Remove from tracked deleted IDs if delete failed
      notifications.forEach(n => deletedIdsRef.current.delete(n.id));
      toast.error('Failed to clear notifications');
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleFollowBack = async (actorId: string, handle: string) => {
    if (!user) return;
    
    setIsFollowingBack(actorId);
    try {
      // Check if target user is warned first
      const { data: warnedCheck } = await supabase
        .from('profiles')
        .select('is_warned')
        .eq('id', actorId)
        .single();

      if (warnedCheck?.is_warned) {
        toast.error('This account is not secure or trusted. AfuChat protects users from potentially fraudulent accounts.');
        setIsFollowingBack(null);
        return;
      }

      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', actorId)
        .single();

      if (existingFollow) {
        toast.info(`You're already following @${handle}`);
        setIsFollowingBack(null);
        return;
      }

      // Check if target user is private
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('is_private')
        .eq('id', actorId)
        .single();

      if (targetProfile?.is_private) {
        // Create follow request instead
        const { error } = await supabase
          .from('follow_requests')
          .insert({
            requester_id: user.id,
            target_id: actorId,
            status: 'pending'
          });

        if (error) throw error;
        toast.success(`Follow request sent to @${handle}`);
      } else {
        // Direct follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: actorId
          });

        if (error) throw error;
        toast.success(`You're now following @${handle}`);
        // Update local state
        setFollowingIds(prev => new Set([...prev, actorId]));
      }
    } catch (error) {
      console.error('Error following back:', error);
      toast.error('Failed to follow');
    } finally {
      setIsFollowingBack(null);
    }
  };

  const handleApproveRequest = async (requestId: string, requesterId: string) => {
    if (!user) return;
    
    setIsProcessingRequest(requestId);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('follow_requests')
        .update({ 
          status: 'approved',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Create the follow relationship
      const { error: followError } = await supabase
        .from('follows')
        .insert({
          follower_id: requesterId,
          following_id: user.id
        });

      if (followError) throw followError;

      // Remove from local state
      setFollowRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Follow request approved');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setIsProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setIsProcessingRequest(requestId);
    try {
      const { error } = await supabase
        .from('follow_requests')
        .update({ 
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Remove from local state
      setFollowRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Follow request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setIsProcessingRequest(null);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async (excludeDeleted = true) => {
      // Load cached notifications first
      const cachedNotifications = sessionStorage.getItem('cachedNotifications');
      if (cachedNotifications) {
        try {
          const cached = JSON.parse(cachedNotifications) as Notification[];
          // Filter out any previously deleted notifications
          const filtered = excludeDeleted 
            ? cached.filter(n => !deletedIdsRef.current.has(n.id))
            : cached;
          setNotifications(filtered);
        } catch (e) {
          console.error('Failed to parse cached notifications:', e);
        }
      }

      try {
        // Fetch notifications first
        const { data: rawNotifications, error: notifError } = await supabase
          .from('notifications')
          .select('id, created_at, type, is_read, post_id, actor_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        let processedNotifications: Notification[] = [];
        
        if (!notifError && rawNotifications && rawNotifications.length > 0) {
          // Get unique actor IDs and post IDs
          const actorIds = [...new Set(rawNotifications.map(n => n.actor_id).filter(Boolean))] as string[];
          const postIds = [...new Set(rawNotifications.map(n => n.post_id).filter(Boolean))] as string[];

          // Fetch actors and posts in parallel
          const [actorsResult, postsResult] = await Promise.all([
            actorIds.length > 0 
              ? supabase.from('profiles').select('id, display_name, handle, avatar_url, is_verified, is_organization_verified').in('id', actorIds)
              : Promise.resolve({ data: [], error: null }),
            postIds.length > 0
              ? supabase.from('posts').select('id, content').in('id', postIds)
              : Promise.resolve({ data: [], error: null })
          ]);

          const actorsMap = new Map((actorsResult.data || []).map(a => [a.id, a]));
          const postsMap = new Map((postsResult.data || []).map(p => [p.id, p]));

          // Combine the data
          processedNotifications = rawNotifications.map(n => ({
            ...n,
            actor: actorsMap.get(n.actor_id) || { display_name: 'Unknown', handle: 'unknown' },
            post: n.post_id ? postsMap.get(n.post_id) : undefined
          })) as Notification[];
        }

        // Fetch follow requests and following list in parallel
        const [followRequestsResult, followingResult] = await Promise.all([
          supabase
            .from('follow_requests')
            .select('id, requester_id, status, created_at')
            .eq('target_id', user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
          supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id)
        ]);

        // Process follow requests with requester profiles
        let processedFollowRequests: FollowRequest[] = [];
        if (!followRequestsResult.error && followRequestsResult.data && followRequestsResult.data.length > 0) {
          const requesterIds = [...new Set(followRequestsResult.data.map(r => r.requester_id))] as string[];
          const { data: requesters } = await supabase
            .from('profiles')
            .select('id, display_name, handle, avatar_url, is_verified, is_organization_verified')
            .in('id', requesterIds);
          
          const requestersMap = new Map((requesters || []).map(r => [r.id, r]));
          processedFollowRequests = followRequestsResult.data.map(r => ({
            ...r,
            requester: requestersMap.get(r.requester_id) || { display_name: 'Unknown', handle: 'unknown' }
          })) as FollowRequest[];
        }

        // Set the processed notifications
        const freshNotifications = excludeDeleted
          ? processedNotifications.filter(n => !deletedIdsRef.current.has(n.id))
          : processedNotifications;
        setNotifications(freshNotifications);
        sessionStorage.setItem('cachedNotifications', JSON.stringify(freshNotifications));

        // Set follow requests
        setFollowRequests(processedFollowRequests);

        // Set following IDs
        if (followingResult.error) {
          console.error('Error fetching following:', followingResult.error);
        } else if (followingResult.data) {
          const ids = new Set(followingResult.data.map(f => f.following_id).filter(Boolean) as string[]);
          setFollowingIds(ids);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscriptions - handle events granularly
    const notificationsChannel = supabase
      .channel('notifications-updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        // Only fetch new data for INSERT events (new notifications)
        // This won't bring back deleted ones
        fetchData();
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'notifications', 
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
        // For DELETE events, just ensure it's removed from local state
        const deletedId = (payload.old as { id?: string })?.id;
        if (deletedId) {
          deletedIdsRef.current.add(deletedId);
          setNotifications(prev => prev.filter(n => n.id !== deletedId));
        }
      })
      .subscribe();

    const followRequestsChannel = supabase
      .channel('follow-requests-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_requests', filter: `target_id=eq.${user.id}` }, () => {
        fetchData();
      })
      .subscribe();

    const timer = setTimeout(markAsRead, 1500); 
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(followRequestsChannel);
    };

  }, [user]);
  
  if (loading && notifications.length === 0 && followRequests.length === 0) {
    return <NotificationsSkeleton />;
  }

  const hasContent = deduplicatedNotifications.length > 0 || followRequests.length > 0;

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      <div className="p-3 sm:p-4 md:p-5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {isMobile && (
            <ProfileDrawer
              trigger={
                <button className="flex-shrink-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {userProfile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              }
            />
          )}
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>
        {deduplicatedNotifications.length > 0 && (
          <div className="flex items-center gap-2">
            {isSelectionMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={selectAllNotifications}
                >
                  {selectedIds.size === deduplicatedNotifications.length ? 'Deselect All' : 'Select All'}
                </Button>
                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={handleDeleteSelected}
                    disabled={isClearingAll}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete ({selectedIds.size})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setIsSelectionMode(true)}
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Select
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={handleClearAllNotifications}
                  disabled={isClearingAll}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isClearingAll ? 'Clearing...' : 'Clear All'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {!hasContent ? (
          <p className="text-center text-muted-foreground p-6 sm:p-8 text-xs sm:text-sm">No notifications yet.</p>
        ) : (
          <>
            {/* Follow Requests Section */}
            {followRequests.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-muted/50 border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Follow Requests ({followRequests.length})
                  </span>
                </div>
                {followRequests.map(request => (
                  <FollowRequestRow
                    key={request.id}
                    request={request}
                    onApprove={handleApproveRequest}
                    onReject={handleRejectRequest}
                    isProcessing={isProcessingRequest}
                  />
                ))}
              </div>
            )}

            {/* Notifications Section */}
            {deduplicatedNotifications.length > 0 && (
              <div>
                {followRequests.length > 0 && (
                  <div className="px-4 py-2 bg-muted/50 border-b border-border">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Activity
                    </span>
                  </div>
                )}
                {deduplicatedNotifications.map(n => (
                  <NotificationRow 
                    key={n.id} 
                    notification={n}
                    onFollowBack={handleFollowBack}
                    isFollowingBack={isFollowingBack}
                    followingIds={followingIds}
                    onDelete={handleDeleteNotification}
                    isDeleting={isDeletingNotification}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(n.id)}
                    onToggleSelect={toggleSelectNotification}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNotification} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {deduplicatedNotifications.length} notification(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAllNotifications} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notifications;
