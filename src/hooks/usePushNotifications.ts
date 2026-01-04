import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      const currentPermission = Notification.permission;
      setPermission(currentPermission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      console.log('Push notification permission:', result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions & { data?: { url?: string } }) => {
    // Check directly from browser API
    const currentPermission = 'Notification' in window ? Notification.permission : 'denied';
    
    if (!('Notification' in window) || currentPermission !== 'granted') {
      console.log('Cannot show notification - permission:', currentPermission);
      return null;
    }

    try {
      console.log('Showing notification:', title, options?.body);
      
      // Use regular Notification API
      const notification = new Notification(title, {
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: options?.tag || 'afuchat-notification',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, []);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;
    
    // Check permission directly from browser
    const currentPermission = 'Notification' in window ? Notification.permission : 'denied';
    if (currentPermission !== 'granted') {
      console.log('Push notifications not enabled, skipping subscription');
      return;
    }

    console.log('Setting up push notification subscriptions for user:', user.id);

    const channel = supabase
      .channel('push-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log('New notification received:', payload);
          const notification = payload.new as any;
          
          // Don't show if triggered by current user
          if (notification.actor_id === user.id) return;
          
          // Fetch actor details
          let actorName = 'Someone';
          let actorAvatar = '/favicon.png';
          
          if (notification.actor_id) {
            const { data: actor } = await supabase
              .from('profiles')
              .select('display_name, handle, avatar_url')
              .eq('id', notification.actor_id)
              .single();
            
            if (actor) {
              actorName = actor.display_name || `@${actor.handle}` || 'Someone';
              actorAvatar = actor.avatar_url || '/favicon.png';
            }
          }
          
          const notificationType = notification.type?.toLowerCase() || '';
          let title = '';
          let body = '';
          let url = '/notifications';

          // Match notification types with rich content
          if (notificationType === 'new_like' || notificationType === 'like') {
            title = '❤️ New Like';
            body = `${actorName} liked your post`;
            url = notification.post_id ? `/post/${notification.post_id}` : '/notifications';
          } else if (notificationType === 'new_follower' || notificationType === 'follow') {
            title = '👤 New Follower';
            body = `${actorName} started following you`;
            url = `/${notification.actor_id}`;
          } else if (notificationType === 'new_reply' || notificationType === 'reply' || notificationType === 'comment') {
            title = '💬 New Reply';
            body = `${actorName} replied to your post`;
            url = notification.post_id ? `/post/${notification.post_id}` : '/notifications';
          } else if (notificationType === 'new_mention' || notificationType === 'mention') {
            title = '📢 You were mentioned';
            body = `${actorName} mentioned you in a post`;
            url = notification.post_id ? `/post/${notification.post_id}` : '/notifications';
          } else if (notificationType === 'gift' || notificationType === 'new_gift') {
            title = '🎁 New Gift!';
            body = `${actorName} sent you a gift`;
            url = '/gifts';
          } else if (notificationType === 'follow_request' || notificationType === 'new_follow_request') {
            title = '🔔 Follow Request';
            body = `${actorName} wants to follow you`;
            url = '/notifications';
          } else if (notificationType === 'tip' || notificationType === 'new_tip') {
            title = '💰 New Tip!';
            body = `${actorName} tipped you`;
            url = '/wallet';
          } else {
            title = '🔔 AfuChat';
            body = `${actorName} interacted with you`;
            console.log('Unknown notification type:', notification.type);
          }

          console.log('Sending notification:', title, body);
          
          showNotification(title, {
            body,
            icon: actorAvatar,
            tag: `notification-${notification.id}`,
            data: { url },
          });
        }
      )
      .subscribe((status) => {
        console.log('Notification subscription status:', status);
      });

    // Also subscribe to new messages
    const messageChannel = supabase
      .channel('push-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          console.log('New message received for push:', payload);
          const message = payload.new as any;
          
          // Don't notify for own messages
          if (message.sender_id === user.id) return;
          
          // Check if user is part of this chat
          const { data: membership } = await supabase
            .from('chat_members')
            .select('id')
            .eq('chat_id', message.chat_id)
            .eq('user_id', user.id)
            .single();
          
          if (!membership) return;
          
          // Fetch sender details
          const { data: sender } = await supabase
            .from('profiles')
            .select('display_name, handle, avatar_url')
            .eq('id', message.sender_id)
            .single();

          const senderName = sender?.display_name || `@${sender?.handle}` || 'Someone';
          const senderAvatar = sender?.avatar_url || '/favicon.png';
          
          // Get message preview
          const messagePreview = message.encrypted_content?.length > 50 
            ? `${message.encrypted_content.substring(0, 50)}...` 
            : message.encrypted_content || 'Sent you a message';
          
          const title = `💬 ${senderName}`;
          const body = message.attachment_url 
            ? '📎 Sent an attachment' 
            : message.audio_url 
              ? '🎤 Sent a voice message'
              : messagePreview;
          
          console.log('Sending message notification:', title, body);
          
          showNotification(title, {
            body,
            icon: senderAvatar,
            tag: `message-${message.id}`,
            data: { url: `/chat/${message.chat_id}` },
          });
        }
      )
      .subscribe((status) => {
        console.log('Message subscription status:', status);
      });

    return () => {
      console.log('Cleaning up push notification subscriptions');
      supabase.removeChannel(channel);
      supabase.removeChannel(messageChannel);
    };
  }, [user, showNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
  };
};
