import React from 'react';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import { Star, Paperclip, Mail, MailOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailMessage } from '@/hooks/useAfuMail';
import { Skeleton } from '@/components/ui/skeleton';

interface EmailListProps {
  emails: EmailMessage[];
  selectedId?: string;
  onSelect: (email: EmailMessage) => void;
  onStar: (userEmailId: string, starred: boolean) => void;
  loading?: boolean;
}

function formatEmailDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  if (isThisYear(date)) return format(date, 'MMM d');
  return format(date, 'MM/dd/yy');
}

function extractSenderName(from: string): string {
  const match = from.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].trim() : from.split('@')[0];
}

export function EmailList({ emails, selectedId, onSelect, onStar, loading }: EmailListProps) {
  if (loading) {
    return (
      <div className="divide-y divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Mail className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No emails</p>
        <p className="text-sm">This folder is empty</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() => onSelect(email)}
          className={cn(
            "flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50",
            selectedId === email.id && "bg-primary/5 border-l-2 border-l-primary",
            !email.is_read && "bg-primary/5"
          )}
        >
          <div className="pt-1">
            {email.is_read ? (
              <MailOpen className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Mail className="h-5 w-5 text-primary" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={cn("font-medium truncate", !email.is_read && "font-semibold")}>
                {extractSenderName(email.sender_email)}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatEmailDate(email.sent_at || email.created_at)}
              </span>
            </div>
            <p className={cn("text-sm truncate mb-1", !email.is_read ? "font-medium text-foreground" : "text-foreground")}>
              {email.subject || '(No subject)'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {email.body_text.slice(0, 100)}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {email.has_attachments && <Paperclip className="h-4 w-4 text-muted-foreground" />}
            <button
              onClick={(e) => { e.stopPropagation(); onStar(email.user_email_id, email.is_starred); }}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <Star className={cn("h-4 w-4", email.is_starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground")} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
