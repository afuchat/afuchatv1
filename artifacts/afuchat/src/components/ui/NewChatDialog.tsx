import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/components/avatar/UserAvatar';

interface UserProfile {
  id: string;
  display_name: string;
  handle: string;
  bio?: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  is_organization_verified?: boolean;
}

interface NewChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewChatDialog = ({ isOpen, onClose }: NewChatDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchFollowedUsers();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else if (user) {
      fetchFollowedUsers();
    }
  }, [searchQuery]);

  const fetchFollowedUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followData && followData.length > 0) {
        const followingIds = followData.map(f => f.following_id);
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name, handle, bio, avatar_url, is_verified, is_organization_verified')
          .in('id', followingIds)
          .order('display_name');

        setUsers(profilesData || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching followed users:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, handle, bio, avatar_url, is_verified, is_organization_verified')
        .neq('id', user.id)
        .or(`display_name.ilike.%${searchQuery}%,handle.ilike.%${searchQuery}%`)
        .limit(20);

      setUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (targetUserId: string) => {
    setCreating(true);
    try {
      const { data: chatId, error } = await supabase
        .rpc('get_or_create_chat' as any, {
          other_user_id: targetUserId
        })
        .single();

      if (error) throw error;

      if (!chatId) throw new Error('No chat ID returned from server');

      onClose();
      navigate(`/chat/${chatId}`);

    } catch (error) {
      console.error('Chat error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        targetUserId  // For debugging
      });
      toast.error(error.message || t('chatRoom.errorSending'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('chat.newChat')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('chat.searchUsers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? t('search.noResults') : t('chat.searchUsers')}
              </div>
            ) : (
              users.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleStartChat(profile.id)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-white">
                        {profile.display_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1">
                      <h3 className="font-semibold text-foreground truncate max-w-[180px]">
                        {profile.display_name}
                      </h3>
                      {profile.is_organization_verified && (
                        <svg viewBox="0 0 22 22" className="w-4 h-4 flex-shrink-0" fill="#FFD43B">
                          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/>
                        </svg>
                      )}
                      {profile.is_verified && !profile.is_organization_verified && (
                        <svg viewBox="0 0 22 22" className="w-4 h-4 flex-shrink-0" fill="#00C2CB">
                          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/>
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">@{profile.handle}</p>
                    {profile.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 break-words">{profile.bio}</p>
                    )}
                  </div>
                  {creating && <User className="h-4 w-4" />}
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;
