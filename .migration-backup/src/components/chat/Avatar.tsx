import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AvatarProps {
  name: string;
  userId: string;
  size?: number;
  avatarUrl?: string | null;
}

export const Avatar = ({ name, userId, size = 32, avatarUrl }: AvatarProps) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <UIAvatar style={{ width: size, height: size }} className="flex-shrink-0">
      <AvatarImage src={avatarUrl || undefined} alt={name} />
      <AvatarFallback>{initials}</AvatarFallback>
    </UIAvatar>
  );
};