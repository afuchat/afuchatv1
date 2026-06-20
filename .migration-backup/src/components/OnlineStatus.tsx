interface OnlineStatusProps {
  lastSeen?: string | null;
  showOnlineStatus?: boolean;
  className?: string;
}

export const OnlineStatus = ({ lastSeen, showOnlineStatus = true, className = '' }: OnlineStatusProps) => {
  if (!showOnlineStatus || !lastSeen) return null;

  const isOnline = () => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    return diffMinutes < 5; // Online if active within last 5 minutes
  };

  if (!isOnline()) return null;

  return (
    <div 
      className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full ${className}`}
      title="Online"
    />
  );
};
