import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Menu, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useAfuMail, EmailMessage } from '@/hooks/useAfuMail';
import { FolderSidebar } from '@/components/afumail/FolderSidebar';
import { EmailList } from '@/components/afumail/EmailList';
import { EmailView } from '@/components/afumail/EmailView';
import { ComposeEmail } from '@/components/afumail/ComposeEmail';
import { AliasManager } from '@/components/afumail/AliasManager';
import { useIsTelegram } from '@/hooks/useIsTelegram';
import afumailLogo from '@/assets/mini-apps/afumail-logo.png';

export default function AfuMail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTelegram = useIsTelegram();
  const {
    loading, mailboxEmail, emails, currentFolder, unreadCount,
    fetchEmails, sendEmail, markAsRead, toggleStar, moveToTrash, fetchUnreadCount,
  } = useAfuMail();

  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [composing, setComposing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showAliases, setShowAliases] = useState(false);
  const [replyTo, setReplyTo] = useState<{ from: string; subject: string; body: string } | undefined>();
  const [forwardFrom, setForwardFrom] = useState<{ subject: string; body: string } | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isInIframe = window.self !== window.top;

  useEffect(() => { fetchEmails('inbox'); }, [fetchEmails]);

  const handleFolderSelect = useCallback((folder: string) => {
    setSelectedEmail(null);
    setComposing(false);
    setShowAliases(false);
    fetchEmails(folder);
    setSidebarOpen(false);
  }, [fetchEmails]);

  const handleEmailSelect = useCallback((email: EmailMessage) => {
    setSelectedEmail(email);
    setComposing(false);
    setShowAliases(false);
    if (!email.is_read) markAsRead(email.user_email_id);
  }, [markAsRead]);

  const handleCompose = useCallback(() => {
    setSelectedEmail(null);
    setReplyTo(undefined);
    setForwardFrom(undefined);
    setShowAliases(false);
    setComposing(true);
    setSidebarOpen(false);
  }, []);

  const handleReply = useCallback(() => {
    if (!selectedEmail) return;
    setReplyTo({ from: selectedEmail.sender_email, subject: selectedEmail.subject, body: selectedEmail.body_text });
    setComposing(true);
  }, [selectedEmail]);

  const handleForward = useCallback(() => {
    if (!selectedEmail) return;
    setForwardFrom({ subject: selectedEmail.subject, body: selectedEmail.body_text });
    setComposing(true);
  }, [selectedEmail]);

  const handleDelete = useCallback(() => {
    if (!selectedEmail) return;
    moveToTrash(selectedEmail.user_email_id);
    setSelectedEmail(null);
  }, [selectedEmail, moveToTrash]);

  const handleStar = useCallback(() => {
    if (!selectedEmail) return;
    toggleStar(selectedEmail.user_email_id, selectedEmail.is_starred);
    setSelectedEmail(prev => prev ? { ...prev, is_starred: !prev.is_starred } : null);
  }, [selectedEmail, toggleStar]);

  const userEmail = user?.email || '';
  const isAfuChatUser = userEmail.endsWith('@afuchat.com');

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Please sign in to access AfuMail</p>
      </div>
    );
  }

  if (!isAfuChatUser) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background px-6 text-center gap-4">
        <img src={afumailLogo} alt="AfuMail" className="h-16 w-16 rounded-2xl" />
        <h2 className="text-xl font-bold">AfuMail is Exclusive</h2>
        <p className="text-muted-foreground max-w-sm">
          AfuMail is only available to users registered with an <strong>@afuchat.com</strong> email address. Your current email (<strong>{userEmail}</strong>) is not eligible.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      {!isInIframe && (
        <header className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
          {!isTelegram && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <img src={afumailLogo} alt="AfuMail" className="h-7 w-7 rounded-lg" />
          <div className="flex-1">
            <h1 className="text-lg font-bold text-primary">AfuMail</h1>
            {mailboxEmail && <p className="text-xs text-muted-foreground">{mailboxEmail}</p>}
          </div>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <FolderSidebar
                selectedFolder={currentFolder}
                unreadCount={unreadCount}
                onSelectFolder={handleFolderSelect}
                onCompose={handleCompose}
                onManageAliases={() => { setShowAliases(true); setSidebarOpen(false); }}
              />
            </SheetContent>
          </Sheet>
        </header>
      )}

      {/* Main layout */}
      <div className="flex-1 flex min-h-0">
        <div className="hidden md:block">
          <FolderSidebar
            selectedFolder={currentFolder}
            unreadCount={unreadCount}
            onSelectFolder={handleFolderSelect}
            onCompose={handleCompose}
            onManageAliases={() => setShowAliases(true)}
          />
        </div>

        <div className="flex-1 flex min-h-0">
          {showAliases ? (
            <AliasManager
              mailboxEmail={mailboxEmail}
              onClose={() => setShowAliases(false)}
            />
          ) : composing ? (
            <ComposeEmail
              initialTo={replyTo ? [replyTo.from] : []}
              replyTo={replyTo}
              forwardFrom={forwardFrom}
              onSend={async (data) => {
                setSendingEmail(true);
                const result = await sendEmail(data);
                setSendingEmail(false);
                return result;
              }}
              onDiscard={() => { setComposing(false); setReplyTo(undefined); setForwardFrom(undefined); }}
              sending={sendingEmail}
              senderEmail={mailboxEmail || undefined}
            />
          ) : selectedEmail ? (
            <EmailView
              email={selectedEmail}
              onBack={() => setSelectedEmail(null)}
              onReply={handleReply}
              onForward={handleForward}
              onDelete={handleDelete}
              onStar={handleStar}
              onArchive={() => {}}
            />
          ) : (
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div className="flex-1 overflow-y-auto">
                <EmailList
                  emails={emails}
                  selectedId={selectedEmail ? (selectedEmail as EmailMessage).id : undefined}
                  onSelect={handleEmailSelect}
                  onStar={toggleStar}
                  loading={loading}
                />
              </div>
              <button
                onClick={handleCompose}
                className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all md:bottom-8 md:right-8"
              >
                <PenLine className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
