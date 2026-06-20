import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const NotificationIcon = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // 1. Get the initial count of unread notifications on load
    const fetchInitialCount = async () => {
      const { count, error } = await supabase
        .from('notifications' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
      } else if (count) {
        setUnreadCount(count);
      }
    };
    
    fetchInitialCount();

    // 2. Listen for real-time changes
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Re-fetch the count to be 100% accurate
          const { count } = await supabase
            .from('notifications' as any)
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
          
          if (count !== null) {
            setUnreadCount(count);
            toast.info("You have a new notification!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isActive = location.pathname === '/notifications';

  return (
    <Link 
      to="/notifications" 
      className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-full transition-colors text-xl font-semibold relative",
        isActive
          ? "bg-primary/10 text-primary"
          : "hover:bg-muted text-foreground"
      )}
    >
      <div className="relative">
        <Bell className="h-7 w-7" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      <span>Notifications</span>
    </Link>
  );
};

export default NotificationIcon;
