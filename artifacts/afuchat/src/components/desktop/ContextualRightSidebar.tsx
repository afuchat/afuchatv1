import { useLocation } from 'react-router-dom';
import { DesktopRightSidebar } from './DesktopRightSidebar';
import { ChatsSidebar } from './ChatsSidebar';

interface ContextualRightSidebarProps {
  className?: string;
}

export const ContextualRightSidebar = ({ className }: ContextualRightSidebarProps) => {
  const location = useLocation();
  const path = location.pathname;

  // Chat list page → show chat actions sidebar
  if (path === '/chats') {
    return <ChatsSidebar className={className} />;
  }

  // Feed / Home → show full sidebar (trending + who to follow)
  if (path === '/' || path === '/home' || path === '/feed') {
    return <DesktopRightSidebar className={className} variant="full" />;
  }

  // Search / other pages → show who to follow only
  if (path === '/search' || path.startsWith('/gifts') || path.startsWith('/shop') || path.startsWith('/moments')) {
    return <DesktopRightSidebar className={className} variant="suggestions" />;
  }

  // Default: show suggestions only
  return <DesktopRightSidebar className={className} variant="suggestions" />;
};
