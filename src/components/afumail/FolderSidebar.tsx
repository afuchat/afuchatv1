import React from 'react';
import { Inbox, Send, FileText, Trash2, Star, Archive, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FolderSidebarProps {
  selectedFolder: string;
  unreadCount: number;
  onSelectFolder: (folder: string) => void;
  onCompose: () => void;
}

const FOLDERS = [
  { id: 'inbox', name: 'Inbox', icon: <Inbox className="h-4 w-4" /> },
  { id: 'starred', name: 'Starred', icon: <Star className="h-4 w-4" /> },
  { id: 'sent', name: 'Sent', icon: <Send className="h-4 w-4" /> },
  { id: 'drafts', name: 'Drafts', icon: <FileText className="h-4 w-4" /> },
  { id: 'archive', name: 'Archive', icon: <Archive className="h-4 w-4" /> },
  { id: 'trash', name: 'Trash', icon: <Trash2 className="h-4 w-4" /> },
];

export function FolderSidebar({ selectedFolder, unreadCount, onSelectFolder, onCompose }: FolderSidebarProps) {
  return (
    <div className="w-full md:w-56 shrink-0 border-r border-border bg-muted/30 p-4">
      <Button onClick={onCompose} className="w-full mb-4 gap-2">
        <Plus className="h-4 w-4" />
        Compose
      </Button>
      <nav className="space-y-1">
        {FOLDERS.map(folder => (
          <button
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              selectedFolder === folder.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {folder.icon}
            <span className="flex-1 text-left">{folder.name}</span>
            {folder.id === 'inbox' && unreadCount > 0 && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
