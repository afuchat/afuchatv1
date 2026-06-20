import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MailboxInfo {
  email_address: string;
}

export interface EmailMessage {
  id: string;
  sender_email: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  has_attachments: boolean;
  is_draft: boolean;
  sent_at: string | null;
  created_at: string;
  is_read: boolean;
  is_starred: boolean;
  folder: string;
  user_email_id: string;
  recipients?: { recipient_email: string; recipient_type: string }[];
}

export interface ComposeEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text: string;
  body_html?: string;
  from_alias?: string;
}

export function useAfuMail() {
  const { user } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(false);
  const [mailboxEmail, setMailboxEmail] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [unreadCount, setUnreadCount] = useState(0);
  const currentFolderRef = useRef(currentFolder);
  currentFolderRef.current = currentFolder;

  // Initialize mailbox
  useEffect(() => {
    if (!userId) return;
    const init = async () => {
      try {
        const { data, error } = await supabase.rpc('get_or_create_mailbox', { p_user_id: userId });
        if (!error && data) setMailboxEmail(data);
      } catch (err) {
        console.error('Mailbox init error:', err);
      }
    };
    init();
  }, [userId]);

  // Fetch emails for a folder
  const fetchEmails = useCallback(async (folder: string = 'inbox') => {
    if (!userId) return;
    setLoading(true);
    setCurrentFolder(folder);
    try {
      const { data: userEmails, error } = await supabase
        .from('afumail_user_emails')
        .select('id, email_id, folder, is_read, is_starred, is_trashed')
        .eq('user_id', userId)
        .eq('folder', folder)
        .eq('is_trashed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!userEmails || userEmails.length === 0) {
        setEmails([]);
        return;
      }

      const emailIds = userEmails.map(ue => ue.email_id);

      const [emailResult, recipientResult] = await Promise.all([
        supabase
          .from('afumail_emails')
          .select('id, sender_email, subject, body_text, body_html, has_attachments, is_draft, sent_at, created_at')
          .in('id', emailIds),
        supabase
          .from('afumail_recipients')
          .select('email_id, recipient_email, recipient_type')
          .in('email_id', emailIds),
      ]);

      if (emailResult.error) throw emailResult.error;

      const combined: EmailMessage[] = userEmails.map(ue => {
        const email = emailResult.data?.find(e => e.id === ue.email_id);
        const emailRecipients = recipientResult.data?.filter(r => r.email_id === ue.email_id) || [];
        return {
          id: email?.id || ue.email_id,
          sender_email: email?.sender_email || '',
          subject: email?.subject || '',
          body_text: email?.body_text || '',
          body_html: email?.body_html || null,
          has_attachments: email?.has_attachments || false,
          is_draft: email?.is_draft || false,
          sent_at: email?.sent_at || null,
          created_at: email?.created_at || '',
          is_read: ue.is_read,
          is_starred: ue.is_starred,
          folder: ue.folder,
          user_email_id: ue.id,
          recipients: emailRecipients.map(r => ({
            recipient_email: r.recipient_email,
            recipient_type: r.recipient_type,
          })),
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEmails(combined);
    } catch (err) {
      console.error('Fetch emails error:', err);
      toast.error('Failed to load emails');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    const { count } = await supabase
      .from('afumail_user_emails')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('folder', 'inbox')
      .eq('is_read', false)
      .eq('is_trashed', false);
    setUnreadCount(count || 0);
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (!userId) return;
    fetchEmails('inbox');
    fetchUnreadCount();
  }, [userId, fetchEmails, fetchUnreadCount]);

  // Send email
  const sendEmail = useCallback(async (emailData: ComposeEmailData) => {
    if (!userId) return false;
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/afumail-send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Send failed');

      toast.success('Email sent!');
      await fetchEmails(currentFolderRef.current);
      await fetchUnreadCount();
      return true;
    } catch (err: any) {
      console.error('Send email error:', err);
      toast.error(err.message || 'Failed to send email');
      return false;
    }
  }, [userId, fetchEmails, fetchUnreadCount]);

  // Mark as read
  const markAsRead = useCallback(async (userEmailId: string) => {
    await supabase
      .from('afumail_user_emails')
      .update({ is_read: true })
      .eq('id', userEmailId);
    setEmails(prev => prev.map(e => e.user_email_id === userEmailId ? { ...e, is_read: true } : e));
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Toggle star
  const toggleStar = useCallback(async (userEmailId: string, starred: boolean) => {
    await supabase
      .from('afumail_user_emails')
      .update({ is_starred: !starred })
      .eq('id', userEmailId);
    setEmails(prev => prev.map(e => e.user_email_id === userEmailId ? { ...e, is_starred: !starred } : e));
  }, []);

  // Move to trash
  const moveToTrash = useCallback(async (userEmailId: string) => {
    await supabase
      .from('afumail_user_emails')
      .update({ is_trashed: true })
      .eq('id', userEmailId);
    setEmails(prev => prev.filter(e => e.user_email_id !== userEmailId));
    toast.success('Moved to trash');
  }, []);

  // Delete permanently
  const deletePermanently = useCallback(async (userEmailId: string) => {
    await supabase
      .from('afumail_user_emails')
      .delete()
      .eq('id', userEmailId);
    setEmails(prev => prev.filter(e => e.user_email_id !== userEmailId));
    toast.success('Deleted permanently');
  }, []);

  return {
    loading,
    mailboxEmail,
    emails,
    currentFolder,
    unreadCount,
    fetchEmails,
    sendEmail,
    markAsRead,
    toggleStar,
    moveToTrash,
    deletePermanently,
    fetchUnreadCount,
  };
}
