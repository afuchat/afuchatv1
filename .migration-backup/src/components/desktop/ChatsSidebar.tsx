import { useState } from 'react';
import { MessageSquarePlus, Users, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import NewChatDialog from '@/components/ui/NewChatDialog';
import { CreateGroupDialog } from '@/components/chat/CreateGroupDialog';
import { CreateChannelDialog } from '@/components/chat/CreateChannelDialog';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ChatsSidebarProps {
  className?: string;
}

export const ChatsSidebar = ({ className }: ChatsSidebarProps) => {
  const { t } = useTranslation();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [isChannelOpen, setIsChannelOpen] = useState(false);

  const actions = [
    {
      icon: MessageSquarePlus,
      label: t('chat.newChat'),
      description: 'Start a private conversation',
      onClick: () => setIsNewChatOpen(true),
    },
    {
      icon: Users,
      label: t('chat.createGroup'),
      description: 'Chat with multiple people',
      onClick: () => setIsGroupOpen(true),
    },
    {
      icon: Radio,
      label: t('chat.createChannel'),
      description: 'Broadcast to followers',
      onClick: () => setIsChannelOpen(true),
    },
  ];

  return (
    <aside className={cn('w-80 flex-shrink-0 space-y-4 p-4', className)}>
      <Card className="bg-card border-border/50 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4 text-primary" />
            Start Chatting
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3 px-3 hover:bg-muted/50"
              onClick={action.onClick}
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      <NewChatDialog isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} />
      <CreateGroupDialog isOpen={isGroupOpen} onClose={() => setIsGroupOpen(false)} onGroupCreated={() => setIsGroupOpen(false)} />
      <CreateChannelDialog isOpen={isChannelOpen} onClose={() => setIsChannelOpen(false)} onChannelCreated={() => setIsChannelOpen(false)} />
    </aside>
  );
};
