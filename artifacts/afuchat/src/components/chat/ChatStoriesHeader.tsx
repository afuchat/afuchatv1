import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Menu, Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChatMenuDrawer } from './ChatMenuDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { imgAvatar } from '@/lib/cdn';

interface StoryUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  handle: string;
  story_count: number;
}

interface ChatStoriesHeaderProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSearch?: (query: string) => void;
}

export const ChatStoriesHeader = ({ isExpanded, onToggleExpand, onSearch }: ChatStoriesHeaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    avatar_url: string | null;
    display_name: string;
  } | null>(null);
  const [currentUserHasStory, setCurrentUserHasStory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      await Promise.all([fetchActiveStories(), fetchCurrentUserProfile()]);
    };

    fetchData();

    const channel = supabase
      .channel('chat-stories-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
        },
        () => {
          fetchActiveStories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchCurrentUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setCurrentUserProfile(data);
    } catch (error) {
      console.error('Error fetching current user profile:', error);
    }
  };

  const fetchActiveStories = async () => {
    try {
      const { data: stories, error } = await supabase
        .from('stories')
        .select(
          `
          user_id,
          profiles (display_name, avatar_url, handle)
        `
        )
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userMap = new Map<string, StoryUser>();
      let hasCurrentUserStory = false;

      stories?.forEach((story: any) => {
        if (!story.profiles) return;

        const userId = story.user_id;
        
        // Check if current user has a story
        if (userId === user?.id) {
          hasCurrentUserStory = true;
        }

        if (userMap.has(userId)) {
          const existing = userMap.get(userId)!;
          userMap.set(userId, { ...existing, story_count: existing.story_count + 1 });
        } else {
          userMap.set(userId, {
            user_id: userId,
            display_name: story.profiles.display_name,
            avatar_url: story.profiles.avatar_url,
            handle: story.profiles.handle,
            story_count: 1,
          });
        }
      });

      // Filter out current user from the list (they'll be shown separately as "My Story")
      const otherUsers = Array.from(userMap.values()).filter(u => u.user_id !== user?.id);
      
      setCurrentUserHasStory(hasCurrentUserStory);
      setStoryUsers(otherUsers);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/moments?user=${userId}`);
  };

  const handleCreateStory = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/moments');
  };

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      setSearchQuery('');
      onSearch?.('');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  // Only count current user if they have a story
  const totalStories = storyUsers.length + (currentUserHasStory ? 1 : 0);
  const displayUsers = storyUsers.slice(0, currentUserHasStory ? 2 : 3); // Show max 3 total avatars

  return (
    <div className="flex-shrink-0 bg-background border-b border-border z-50">
      <ChatMenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14">
          {isSearchOpen ? (
            <div className="flex items-center gap-3 flex-1 animate-fade-in">
              <div className="flex items-center gap-2 flex-1 bg-muted/30 rounded-full px-4 py-2 border border-border/50 focus-within:border-primary/50 transition-colors">
                <Search className="h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70 h-8 px-0"
                  autoFocus
                />
                {searchQuery && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      onSearch?.('');
                    }}
                    className="p-1 hover:bg-muted/50 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <button 
                onClick={handleSearchToggle}
                className="p-2 hover:bg-muted/20 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-foreground" />
              </button>
            </div>
          ) : (
            <>
              {isMobile && (
                <button 
                  onClick={() => setIsMenuOpen(true)}
                  className="flex-shrink-0"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={imgAvatar(currentUserProfile?.avatar_url)} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {currentUserProfile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              )}

              {/* Collapsed stories preview - only show when NOT expanded and has stories */}
              {!isExpanded && totalStories > 0 ? (
                <div 
                  onClick={onToggleExpand}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 px-3 py-1.5 rounded-full transition-colors"
                >
                  {/* Overlapping avatars */}
                  <div className="flex items-center -space-x-2">
                    {/* My Story avatar - only show if user has posted a story */}
                    {currentUserHasStory && (
                      <div className="relative z-30">
                        <div className="p-[1.5px] rounded-full bg-gradient-to-br from-primary via-teal-400 to-green-500">
                          {currentUserProfile?.avatar_url ? (
                            <img
                              src={imgAvatar(currentUserProfile.avatar_url)}
                              alt="My Story"
                              className="h-7 w-7 rounded-full object-cover border-[1.5px] border-background"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border-[1.5px] border-background">
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {currentUserProfile?.display_name?.charAt(0).toUpperCase() || 'M'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Other story avatars */}
                    {displayUsers.map((storyUser, index) => (
                      <div 
                        key={storyUser.user_id} 
                        className="relative"
                        style={{ zIndex: 20 - index }}
                      >
                        <div className="p-[1.5px] rounded-full bg-gradient-to-br from-primary via-teal-400 to-green-500">
                          {storyUser.avatar_url ? (
                            <img
                              src={imgAvatar(storyUser.avatar_url)}
                              alt={storyUser.display_name}
                              className="h-7 w-7 rounded-full object-cover border-[1.5px] border-background"
                            />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center border-[1.5px] border-background">
                              <span className="text-[10px] font-semibold text-primary-foreground">
                                {storyUser.display_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <span className="text-lg font-bold text-foreground">
                    {totalStories} {totalStories === 1 ? 'Story' : 'Stories'}
                  </span>
                  
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : null}

              <button 
                onClick={handleSearchToggle}
                className="p-2 hover:bg-muted/20 rounded-full transition-all active:scale-95"
              >
                <Search className="h-6 w-6 text-foreground" />
              </button>
            </>
          )}
        </div>

        {/* Expanded stories section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="overflow-x-auto scrollbar-hide px-4 pb-3">
                <div className="flex gap-4">
                  {/* My Story */}
                  <div
                    onClick={handleCreateStory}
                    className="flex-shrink-0 cursor-pointer flex flex-col items-center gap-1"
                  >
                    <div className="relative">
                      <div className={currentUserHasStory ? "p-[2px] rounded-full bg-gradient-to-br from-primary via-teal-400 to-green-500" : ""}>
                        {currentUserProfile?.avatar_url ? (
                          <img
                            src={imgAvatar(currentUserProfile.avatar_url)}
                            alt="My Story"
                            className={`h-14 w-14 rounded-full object-cover ${currentUserHasStory ? 'border-2 border-background' : 'border-2 border-border'}`}
                          />
                        ) : (
                          <div className={`h-14 w-14 rounded-full bg-muted flex items-center justify-center ${currentUserHasStory ? 'border-2 border-background' : 'border-2 border-border'}`}>
                            <span className="text-base font-semibold text-muted-foreground">
                              {currentUserProfile?.display_name?.charAt(0).toUpperCase() || 'M'}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Only show + icon if user doesn't have a story */}
                      {!currentUserHasStory && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                          <Plus className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-center font-medium text-foreground w-14 truncate">
                      {currentUserHasStory ? 'My Story' : 'Add Story'}
                    </p>
                  </div>

                  {/* Other stories */}
                  {storyUsers.map((storyUser) => (
                    <div
                      key={storyUser.user_id}
                      onClick={(e) => handleStoryClick(storyUser.user_id, e)}
                      className="flex-shrink-0 cursor-pointer flex flex-col items-center gap-1"
                    >
                      <div className="p-[2px] rounded-full bg-gradient-to-br from-primary via-teal-400 to-green-500">
                        {storyUser.avatar_url ? (
                          <img
                            src={imgAvatar(storyUser.avatar_url)}
                            alt={storyUser.display_name}
                            className="h-14 w-14 rounded-full object-cover border-2 border-background"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                            <span className="text-base font-semibold text-primary-foreground">
                              {storyUser.display_name?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-center font-medium text-foreground w-14 truncate">
                        {storyUser.display_name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};
