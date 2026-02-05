import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesktopChatLayoutProps {
  chatList: React.ReactNode;
  chatRoom: React.ReactNode | null;
}

const DesktopChatLayout = ({ chatList, chatRoom }: DesktopChatLayoutProps) => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [defaultSizes, setDefaultSizes] = useState([35, 65]);

  // Load saved panel sizes
  useEffect(() => {
    const saved = localStorage.getItem('chat-panel-sizes');
    if (saved) {
      try {
        setDefaultSizes(JSON.parse(saved));
      } catch (e) {
        // Use defaults
      }
    }
  }, []);

  const handlePanelResize = (sizes: number[]) => {
    localStorage.setItem('chat-panel-sizes', JSON.stringify(sizes));
  };

  // On mobile, render children directly (mobile routing handles this)
  if (isMobile) {
    return <>{chatId ? chatRoom : chatList}</>;
  }

  // Desktop: Split pane layout
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background overflow-hidden desktop-scrollbar">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={handlePanelResize}
        className="flex-1"
      >
        {/* Chat List Panel */}
        {!isExpanded && (
          <>
            <ResizablePanel
              defaultSize={defaultSizes[0]}
              minSize={25}
              maxSize={45}
            >
              <div className="h-full border-r border-border overflow-hidden">
                {chatList}
              </div>
            </ResizablePanel>

            {/* Resize Handle */}
            <ResizableHandle 
              withHandle 
              className="bg-border/50 hover:bg-primary/20 transition-colors"
            />
          </>
        )}

        {/* Chat Room Panel */}
        <ResizablePanel
          defaultSize={isExpanded ? 100 : defaultSizes[1]}
          minSize={55}
          className="relative"
        >
          {chatRoom ? (
            <div className="h-full relative">
              {/* Expand/Collapse Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute top-4 right-16 z-50 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-muted"
                title={isExpanded ? "Show chat list" : "Expand chat"}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
              {chatRoom}
            </div>
          ) : (
            // No chat selected - show placeholder
            <div className="h-full flex flex-col items-center justify-center bg-muted/20">
              <div className="text-center space-y-4">
                <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <MessageSquare className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">Select a conversation</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Choose from your existing conversations or start a new chat
                  </p>
                </div>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default DesktopChatLayout;
