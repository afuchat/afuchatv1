import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationsSkeleton } from '@/components/skeletons';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart, MessageSquare, UserPlus, Gift, Eye, UserCheck, UserX,
  Trash2, CheckSquare, Square, Bell, BellOff, AtSign, Filter,
  MoreHorizontal, CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Badges ──────────────────────────────────────────────
const TwitterVerifiedBadge = ({ size = 'w-3.5 h-3.5' }: { size?: string }) => (
  <svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" className={`${size} ml-0.5 inline-block`}>
    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#00C2CB" />
  </svg>
);
const GoldVerifiedBadge = ({ size = 'w-3.5 h-3.5' }: { size?: string }) => (
  <svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" className={`${size} ml-0.5 inline-block`}>
    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFD43B" />
  </svg>
);
const VerifiedBadge = ({ isVerified, isOrgVerified }: { isVerified?: boolean; isOrgVerified?: boolean }) => {
  if (isOrgVerified) return <GoldVerifiedBadge />;
  if (isVerified) return <TwitterVerifiedBadge />;
  return null;
};

// ─── Types ───────────────────────────────────────────────
export interface Notification {
  id: string;
  created_at: string;
  type: 'new_follower' | 'new_like' | 'new_reply' | 'new_mention' | 'gift' | 'follow_request';
  is_read: boolean;
  post_id: string | null;
  actor_id: string | null;
  actor: { display_name: string; handle: string; avatar_url?: string; is_verified?: boolean; is_organization_verified?: boolean };
  post?: { content: string };
}

interface FollowRequest {
  id: string;
  requester_id: string;
  status: string;
  created_at: string;
  requester: { display_name: string; handle: string; avatar_url?: string; is_verified?: boolean; is_organization_verified?: boolean };
}

// ─── Helpers ─────────────────────────────────────────────
type FilterTab = 'all' | 'likes' | 'replies' | 'follows' | 'gifts';

const FILTER_TABS: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Bell className="h-3.5 w-3.5" /> },
  { key: 'likes', label: 'Likes', icon: <Heart className="h-3.5 w-3.5" /> },
  { key: 'replies', label: 'Replies', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { key: 'follows', label: 'Follows', icon: <UserPlus className="h-3.5 w-3.5" /> },
  { key: 'gifts', label: 'Gifts', icon: <Gift className="h-3.5 w-3.5" /> },
];

const filterTypeMap: Record<FilterTab, string[]> = {
  all: [],
  likes: ['new_like'],
  replies: ['new_reply', 'new_mention'],
  follows: ['new_follower'],
  gifts: ['gift'],
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = Math.max(0, now - d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(items: Notification[]): { label: string; items: Notification[] }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, Notification[]> = { Today: [], Yesterday: [], 'This Week': [], Earlier: [] };
  items.forEach(n => {
    const d = new Date(n.created_at); d.setHours(0, 0, 0, 0);
    if (d >= today) groups['Today'].push(n);
    else if (d >= yesterday) groups['Yesterday'].push(n);
    else if (d >= weekAgo) groups['This Week'].push(n);
    else groups['Earlier'].push(n);
  });
  return Object.entries(groups).filter(([, v]) => v.length > 0).map(([label, items]) => ({ label, items }));
}

const ICON_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  new_like: { icon: <Heart className="h-4 w-4 fill-current" />, bg: 'bg-red-500/10', color: 'text-red-500' },
  new_reply: { icon: <MessageSquare className="h-4 w-4" />, bg: 'bg-blue-500/10', color: 'text-blue-500' },
  new_mention: { icon: <AtSign className="h-4 w-4" />, bg: 'bg-violet-500/10', color: 'text-violet-500' },
  new_follower: { icon: <UserPlus className="h-4 w-4" />, bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
  gift: { icon: <Gift className="h-4 w-4" />, bg: 'bg-amber-500/10', color: 'text-amber-500' },
};

const MESSAGE_MAP: Record<string, string> = {
  new_like: 'liked your post',
  new_reply: 'replied to your post',
  new_mention: 'mentioned you',
  new_follower: 'started following you',
  gift: 'sent you a gift',
};

// ─── NotificationCard ────────────────────────────────────
interface NotificationCardProps {
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

const NotificationCard = ({
  notification, onFollowBack, isFollowingBack, followingIds,
  onDelete, isDeleting, isSelectionMode, isSelected, onToggleSelect,
}: NotificationCardProps) => {
  const navigate = useNavigate();
  const { actor, post, type, created_at, post_id, actor_id } = notification;
  const isAlreadyFollowing = actor_id ? followingIds.has(actor_id) : false;
  const iconCfg = ICON_CONFIG[type] || ICON_CONFIG['new_like'];

  const handleNavigate = () => {
    if (isSelectionMode) { onToggleSelect(notification.id); return; }
    if (type === 'new_follower' || type === 'gift') navigate(`/@${actor.handle}`);
    else if (post_id) navigate(`/post/${post_id}`);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors group relative",
        !notification.is_read && "bg-primary/[0.04]",
        isSelected && "bg-primary/10",
        "hover:bg-muted/60 active:bg-muted/80"
      )}
      onClick={handleNavigate}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <button
          className="flex-shrink-0 mt-1"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(notification.id); }}
        >
          {isSelected
            ? <CheckSquare className="h-5 w-5 text-primary" />
            : <Square className="h-5 w-5 text-muted-foreground/40" />
          }
        </button>
      )}

      {/* Avatar with type indicator */}
      <div className="relative flex-shrink-0">
        <Link to={`/@${actor.handle}`} onClick={e => { if (isSelectionMode) { e.preventDefault(); onToggleSelect(notification.id); } else e.stopPropagation(); }}>
          <Avatar className="h-11 w-11 ring-2 ring-background">
            <AvatarImage src={actor.avatar_url} alt={actor.display_name} />
            <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm">
              {actor.display_name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className={cn("absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-background", iconCfg.bg, iconCfg.color)}>
          {iconCfg.icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-snug text-foreground">
          <span className="font-bold">{actor.display_name}</span>
          <VerifiedBadge isVerified={actor.is_verified} isOrgVerified={actor.is_organization_verified} />
          <span className="text-muted-foreground"> {MESSAGE_MAP[type] || 'interacted with you'}</span>
        </p>

        {post?.content && (
          <p className="text-[12px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed pl-0.5 border-l-2 border-muted ml-0.5 pl-2">
            {post.content}
          </p>
        )}

        {/* Inline actions */}
        {!isSelectionMode && (
          <div className="flex items-center gap-2 mt-2">
            {type === 'new_follower' && !isAlreadyFollowing && (
              <Button
                size="sm"
                className="h-7 text-[11px] rounded-full px-3 font-semibold"
                disabled={isFollowingBack === actor_id}
                onClick={(e) => { e.stopPropagation(); if (actor_id) onFollowBack(actor_id, actor.handle); }}
              >
                {isFollowingBack === actor_id ? 'Following...' : 'Follow back'}
              </Button>
            )}
            {type === 'gift' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] rounded-full px-3"
                onClick={(e) => { e.stopPropagation(); navigate('/gifts'); }}
              >
                <Gift className="h-3 w-3 mr-1" /> View Gift
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Time + unread indicator */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
        <span className="text-[11px] text-muted-foreground font-medium">{relativeTime(created_at)}</span>
        {!notification.is_read && (
          <div className="h-2 w-2 rounded-full bg-primary" />
        )}
      </div>

      {/* Delete on hover */}
      {!isSelectionMode && (
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          disabled={isDeleting === notification.id}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </motion.div>
  );
};

// ─── FollowRequestCard ───────────────────────────────────
const FollowRequestCard = ({ request, onApprove, onReject, isProcessing }: {
  request: FollowRequest;
  onApprove: (requestId: string, requesterId: string) => void;
  onReject: (requestId: string) => void;
  isProcessing: string | null;
}) => {
  const { requester, created_at } = request;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -60 }}
      className="flex items-start gap-3 px-4 py-3.5"
    >
      <Link to={`/@${requester.handle}`} onClick={e => e.stopPropagation()}>
        <Avatar className="h-11 w-11 ring-2 ring-background">
          <AvatarImage src={requester.avatar_url} alt={requester.display_name} />
          <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm">
            {requester.display_name?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-snug text-foreground">
          <span className="font-bold">{requester.display_name}</span>
          <VerifiedBadge isVerified={requester.is_verified} isOrgVerified={requester.is_organization_verified} />
          <span className="text-muted-foreground"> wants to follow you</span>
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <Button
            size="sm"
            className="h-8 text-[12px] rounded-full px-4 font-semibold"
            disabled={isProcessing === request.id}
            onClick={() => onApprove(request.id, request.requester_id)}
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            {isProcessing === request.id ? 'Approving…' : 'Confirm'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-[12px] rounded-full px-4"
            disabled={isProcessing === request.id}
            onClick={() => onReject(request.id)}
          >
            <UserX className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground font-medium flex-shrink-0 pt-0.5">
        {relativeTime(created_at)}
      </span>
    </motion.div>
  );
};

// ─── EmptyState ──────────────────────────────────────────
const EmptyState = ({ filter }: { filter: FilterTab }) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
    <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
      <BellOff className="h-7 w-7 text-muted-foreground/50" />
    </div>
    <h3 className="text-base font-semibold text-foreground mb-1">
      {filter === 'all' ? 'No notifications yet' : `No ${filter} yet`}
    </h3>
    <p className="text-[13px] text-muted-foreground max-w-[240px]">
      {filter === 'all'
        ? "When someone interacts with you, you'll see it here."
        : `You don't have any ${filter} notifications right now.`}
    </p>
  </div>
);

// ─── Main Page ───────────────────────────────────────────
const Notifications = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followRequests, setFollowRequests] = useState<FollowRequest[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isFollowingBack, setIsFollowingBack] = useState<string | null>(null);
  const [isDeletingNotification, setIsDeletingNotification] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null; display_name: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const deletedIdsRef = useRef<Set<string>>(new Set());

  // ── Profile fetch ──
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('avatar_url, display_name').eq('id', user.id).single()
      .then(({ data }) => { if (data) setUserProfile(data); });
  }, [user]);

  // ── Mark as read ──
  const markAsRead = useCallback(async () => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc('mark_notifications_as_read');
      if (!error) setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) { console.error('Error marking as read:', e); }
  }, [user]);

  // ── Deduplicate ──
  const deduplicatedNotifications = useMemo(() => {
    const seen = new Map<string, Notification>();
    for (const n of notifications) {
      const key = `${n.actor_id}-${n.type}-${n.post_id || 'no-post'}`;
      if (!seen.has(key)) seen.set(key, n);
    }
    return Array.from(seen.values());
  }, [notifications]);

  // ── Filter ──
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return deduplicatedNotifications;
    const types = filterTypeMap[activeFilter];
    return deduplicatedNotifications.filter(n => types.includes(n.type));
  }, [deduplicatedNotifications, activeFilter]);

  // ── Group by date ──
  const groupedNotifications = useMemo(() => groupByDate(filteredNotifications), [filteredNotifications]);

  // ── Unread count per filter ──
  const unreadCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { all: 0, likes: 0, replies: 0, follows: 0, gifts: 0 };
    deduplicatedNotifications.forEach(n => {
      if (!n.is_read) {
        counts.all++;
        Object.entries(filterTypeMap).forEach(([key, types]) => {
          if (types.length > 0 && types.includes(n.type)) counts[key as FilterTab]++;
        });
      }
    });
    return counts;
  }, [deduplicatedNotifications]);

  // ── Selection ──
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };
  const selectAll = () => {
    setSelectedIds(prev =>
      prev.size === filteredNotifications.length ? new Set() : new Set(filteredNotifications.map(n => n.id))
    );
  };

  // ── Delete single ──
  const handleDeleteNotification = (id: string) => { setPendingDeleteId(id); setShowDeleteConfirm(true); };
  const confirmDeleteNotification = async () => {
    if (!user || !pendingDeleteId) return;
    const target = notifications.find(n => n.id === pendingDeleteId);
    if (!target) { setPendingDeleteId(null); setShowDeleteConfirm(false); return; }
    const key = `${target.actor_id}-${target.type}-${target.post_id || 'no-post'}`;
    const ids = notifications.filter(n => `${n.actor_id}-${n.type}-${n.post_id || 'no-post'}` === key).map(n => n.id);
    ids.forEach(id => deletedIdsRef.current.add(id));
    setIsDeletingNotification(pendingDeleteId);
    setShowDeleteConfirm(false);
    try {
      const { error } = await supabase.from('notifications').delete().in('id', ids);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      toast.success('Notification deleted');
    } catch { ids.forEach(id => deletedIdsRef.current.delete(id)); toast.error('Failed to delete'); }
    finally { setIsDeletingNotification(null); setPendingDeleteId(null); }
  };

  // ── Delete selected ──
  const handleDeleteSelected = async () => {
    if (!user || selectedIds.size === 0) return;
    const allIds = new Set<string>();
    selectedIds.forEach(sid => {
      const t = notifications.find(n => n.id === sid);
      if (t) {
        const k = `${t.actor_id}-${t.type}-${t.post_id || 'no-post'}`;
        notifications.filter(n => `${n.actor_id}-${n.type}-${n.post_id || 'no-post'}` === k).forEach(n => allIds.add(n.id));
      }
    });
    allIds.forEach(id => deletedIdsRef.current.add(id));
    setIsClearingAll(true);
    try {
      const { error } = await supabase.from('notifications').delete().in('id', Array.from(allIds));
      if (error) throw error;
      setNotifications(prev => prev.filter(n => !allIds.has(n.id)));
      setSelectedIds(new Set()); setIsSelectionMode(false);
      toast.success(`${selectedIds.size} deleted`);
    } catch { allIds.forEach(id => deletedIdsRef.current.delete(id)); toast.error('Failed to delete'); }
    finally { setIsClearingAll(false); }
  };

  // ── Clear all ──
  const confirmClearAll = async () => {
    if (!user || notifications.length === 0) return;
    notifications.forEach(n => deletedIdsRef.current.add(n.id));
    setShowClearAllConfirm(false); setIsClearingAll(true);
    try {
      const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
      if (error) throw error;
      setNotifications([]); sessionStorage.removeItem('cachedNotifications');
      toast.success('All notifications cleared');
    } catch { notifications.forEach(n => deletedIdsRef.current.delete(n.id)); toast.error('Failed to clear'); }
    finally { setIsClearingAll(false); }
  };

  // ── Follow back ──
  const handleFollowBack = async (actorId: string, handle: string) => {
    if (!user) return;
    setIsFollowingBack(actorId);
    try {
      const { data: warnedCheck } = await supabase.from('profiles').select('is_warned').eq('id', actorId).single();
      if (warnedCheck?.is_warned) { toast.error('This account is not trusted.'); return; }
      const { data: existing } = await supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', actorId).single();
      if (existing) { toast.info(`Already following @${handle}`); return; }
      const { data: target } = await supabase.from('profiles').select('is_private').eq('id', actorId).single();
      if (target?.is_private) {
        await supabase.from('follow_requests').insert({ requester_id: user.id, target_id: actorId, status: 'pending' });
        toast.success(`Request sent to @${handle}`);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: actorId });
        toast.success(`Following @${handle}`);
        setFollowingIds(prev => new Set([...prev, actorId]));
      }
    } catch { toast.error('Failed to follow'); }
    finally { setIsFollowingBack(null); }
  };

  // ── Approve / reject follow request ──
  const handleApproveRequest = async (requestId: string, requesterId: string) => {
    if (!user) return;
    setIsProcessingRequest(requestId);
    try {
      await supabase.from('follow_requests').update({ status: 'approved', responded_at: new Date().toISOString() }).eq('id', requestId);
      await supabase.from('follows').insert({ follower_id: requesterId, following_id: user.id });
      setFollowRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Approved');
    } catch { toast.error('Failed'); }
    finally { setIsProcessingRequest(null); }
  };
  const handleRejectRequest = async (requestId: string) => {
    setIsProcessingRequest(requestId);
    try {
      await supabase.from('follow_requests').update({ status: 'rejected', responded_at: new Date().toISOString() }).eq('id', requestId);
      setFollowRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Rejected');
    } catch { toast.error('Failed'); }
    finally { setIsProcessingRequest(null); }
  };

  // ── Data fetching ──
  useEffect(() => {
    if (!user) return;
    const fetchData = async (excludeDeleted = true) => {
      const cachedRaw = sessionStorage.getItem('cachedNotifications');
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as Notification[];
          setNotifications(excludeDeleted ? cached.filter(n => !deletedIdsRef.current.has(n.id)) : cached);
        } catch {}
      }
      try {
        const { data: raw, error } = await supabase
          .from('notifications').select('id, created_at, type, is_read, post_id, actor_id')
          .eq('user_id', user.id).order('created_at', { ascending: false });
        let processed: Notification[] = [];
        if (!error && raw?.length) {
          const actorIds = [...new Set(raw.map(n => n.actor_id).filter(Boolean))] as string[];
          const postIds = [...new Set(raw.map(n => n.post_id).filter(Boolean))] as string[];
          const [actors, posts] = await Promise.all([
            actorIds.length ? supabase.from('profiles').select('id, display_name, handle, avatar_url, is_verified, is_organization_verified').in('id', actorIds) : { data: [] },
            postIds.length ? supabase.from('posts').select('id, content').in('id', postIds) : { data: [] },
          ]);
          const am = new Map((actors.data || []).map(a => [a.id, a]));
          const pm = new Map((posts.data || []).map(p => [p.id, p]));
          processed = raw.map(n => ({ ...n, actor: am.get(n.actor_id) || { display_name: 'Unknown', handle: 'unknown' }, post: n.post_id ? pm.get(n.post_id) : undefined })) as Notification[];
        }
        const [frResult, fResult] = await Promise.all([
          supabase.from('follow_requests').select('id, requester_id, status, created_at').eq('target_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
          supabase.from('follows').select('following_id').eq('follower_id', user.id),
        ]);
        if (!frResult.error && frResult.data?.length) {
          const rIds = [...new Set(frResult.data.map(r => r.requester_id))];
          const { data: rProfiles } = await supabase.from('profiles').select('id, display_name, handle, avatar_url, is_verified, is_organization_verified').in('id', rIds);
          const rm = new Map((rProfiles || []).map(r => [r.id, r]));
          setFollowRequests(frResult.data.map(r => ({ ...r, requester: rm.get(r.requester_id) || { display_name: 'Unknown', handle: 'unknown' } })) as FollowRequest[]);
        }
        const fresh = excludeDeleted ? processed.filter(n => !deletedIdsRef.current.has(n.id)) : processed;
        setNotifications(fresh);
        sessionStorage.setItem('cachedNotifications', JSON.stringify(fresh));
        if (!fResult.error && fResult.data) setFollowingIds(new Set(fResult.data.map(f => f.following_id).filter(Boolean) as string[]));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();

    const ch1 = supabase.channel('notifications-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => fetchData())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (p) => {
        const id = (p.old as any)?.id; if (id) { deletedIdsRef.current.add(id); setNotifications(prev => prev.filter(n => n.id !== id)); }
      }).subscribe();
    const ch2 = supabase.channel('follow-requests-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_requests', filter: `target_id=eq.${user.id}` }, () => fetchData()).subscribe();

    const timer = setTimeout(markAsRead, 1500);
    return () => { clearTimeout(timer); supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [user, markAsRead]);

  if (loading && notifications.length === 0 && followRequests.length === 0) return <NotificationsSkeleton />;

  const hasContent = filteredNotifications.length > 0 || (activeFilter === 'all' && followRequests.length > 0);

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            {isMobile && (
              <ProfileDrawer
                trigger={
                  <button className="flex-shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {userProfile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                }
              />
            )}
            <h1 className="text-lg font-bold tracking-tight">Notifications</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={markAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" /> Mark all as read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds(new Set()); }}>
                <CheckSquare className="h-4 w-4 mr-2" /> {isSelectionMode ? 'Cancel selection' : 'Select notifications'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowClearAllConfirm(true)}
                disabled={deduplicatedNotifications.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Clear all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab.key;
            const count = unreadCounts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveFilter(tab.key); setIsSelectionMode(false); setSelectedIds(new Set()); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.icon}
                {tab.label}
                {count > 0 && (
                  <span className={cn(
                    "ml-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1",
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
                  )}>
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Selection bar ── */}
        <AnimatePresence>
          {isSelectionMode && selectedIds.size > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-2 flex items-center gap-2 overflow-hidden"
            >
              <Button variant="ghost" size="sm" className="text-[12px] h-7" onClick={selectAll}>
                {selectedIds.size === filteredNotifications.length ? 'Deselect all' : 'Select all'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-[12px] h-7 rounded-full"
                onClick={handleDeleteSelected}
                disabled={isClearingAll}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete ({selectedIds.size})
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {!hasContent ? (
          <EmptyState filter={activeFilter} />
        ) : (
          <>
            {/* Follow Requests */}
            {activeFilter === 'all' && followRequests.length > 0 && (
              <div>
                <div className="px-4 py-2.5 bg-muted/30">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Follow Requests · {followRequests.length}
                  </span>
                </div>
                <AnimatePresence>
                  {followRequests.map(r => (
                    <FollowRequestCard key={r.id} request={r} onApprove={handleApproveRequest} onReject={handleRejectRequest} isProcessing={isProcessingRequest} />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Grouped notifications */}
            {groupedNotifications.map(group => (
              <div key={group.label}>
                <div className="px-4 py-2.5 bg-muted/30 sticky top-0 z-10">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    {group.label}
                  </span>
                </div>
                <AnimatePresence>
                  {group.items.map(n => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onFollowBack={handleFollowBack}
                      isFollowingBack={isFollowingBack}
                      followingIds={followingIds}
                      onDelete={handleDeleteNotification}
                      isDeleting={isDeletingNotification}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.has(n.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteNotification} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Clear all confirmation ── */}
      <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Notifications</AlertDialogTitle>
            <AlertDialogDescription>Delete all {deduplicatedNotifications.length} notification(s)? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notifications;
