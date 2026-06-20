import { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import DesktopChatLayout from '@/components/chat/DesktopChatLayout';
import { CustomLoader } from '@/components/ui/CustomLoader';
import ChatsPage from './Chats';
import ChatRoom from './ChatRoom';

const DesktopChats = () => {
  const { chatId } = useParams();
  const isMobile = useIsMobile();

  // On mobile, just render the appropriate page
  if (isMobile) {
    return chatId ? <ChatRoom /> : <ChatsPage />;
  }

  // Desktop: Split pane layout
  return (
    <DesktopChatLayout
      chatList={<ChatsPage isEmbedded />}
      chatRoom={chatId ? <ChatRoom isEmbedded /> : null}
    />
  );
};

export default DesktopChats;
