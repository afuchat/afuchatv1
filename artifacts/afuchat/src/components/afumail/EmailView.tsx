import React, { useMemo } from 'react';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { ArrowLeft, Star, Reply, Forward, Trash2, Archive, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { EmailMessage } from '@/hooks/useAfuMail';

interface EmailViewProps {
  email: EmailMessage | null;
  loading?: boolean;
  onBack: () => void;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
  onStar: () => void;
  onArchive: () => void;
}

function extractSenderInfo(from: string) {
  const match = from.match(/^(.+?)\s*<(.+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: from.split('@')[0], email: from };
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function SafeEmailBody({ htmlContent, textContent }: { htmlContent?: string | null; textContent?: string }) {
  const sanitizedHtml = useMemo(() => {
    const content = htmlContent || textContent || '';
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'div', 'span', 'h1', 'h2', 'h3', 'pre', 'code', 'img', 'table', 'tr', 'td', 'th'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style', 'src', 'alt', 'width', 'height'],
    });
  }, [htmlContent, textContent]);

  return <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}

export function EmailView({ email, loading, onBack, onReply, onForward, onDelete, onStar, onArchive }: EmailViewProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Loading...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Select an email to read</p>
      </div>
    );
  }

  const sender = extractSenderInfo(email.sender_email);
  const toRecipients = email.recipients?.filter(r => r.recipient_type === 'to').map(r => r.recipient_email) || [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border p-4 flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onStar}>
            <Star className={cn("h-5 w-5", email.is_starred ? "fill-yellow-400 text-yellow-400" : "")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onArchive}><Archive className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-5 w-5" /></Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onForward}>Forward</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-xl font-semibold mb-4">{email.subject || '(No subject)'}</h1>
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">{getInitials(sender.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{sender.name}</span>
                <span className="text-sm text-muted-foreground">&lt;{sender.email}&gt;</span>
              </div>
              {toRecipients.length > 0 && (
                <div className="text-sm text-muted-foreground">to {toRecipients.join(', ')}</div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(email.sent_at || email.created_at), 'PPpp')}
              </div>
            </div>
          </div>
          <SafeEmailBody htmlContent={email.body_html} textContent={email.body_text} />
        </div>
      </div>

      <div className="border-t border-border p-4 flex gap-2 shrink-0">
        <Button onClick={onReply} className="flex-1"><Reply className="h-4 w-4 mr-2" />Reply</Button>
        <Button variant="outline" onClick={onForward}><Forward className="h-4 w-4 mr-2" />Forward</Button>
      </div>
    </div>
  );
}
