import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { cn } from '@/lib/utils';
import { imgAvatar, imgPost } from '@/lib/cdn';

interface QuotedPost {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  image_url?: string | null;
  post_images?: Array<{ image_url: string; display_order: number; alt_text?: string }>;
  is_developer?: boolean;
  profiles: {
    display_name: string;
    handle: string;
    is_verified: boolean;
    is_organization_verified: boolean;
    avatar_url?: string | null;
  };
}

interface QuotedPostCardProps {
  quotedPost: QuotedPost;
  className?: string;
}

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 24) return `${hours}h`;
  if (days < 7) return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const QuotedPostCard: React.FC<QuotedPostCardProps> = ({ quotedPost, className }) => {
  const navigate = useNavigate();

  const handleViewProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/@${quotedPost.author_id}`);
  };

  const images = quotedPost.post_images?.sort((a, b) => a.display_order - b.display_order) || 
    (quotedPost.image_url ? [{ image_url: quotedPost.image_url, display_order: 0 }] : []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // No navigation - quoted posts are displayed inline
  };

  return (
    <div
      className={cn(
        "block border border-border rounded-2xl p-3 mt-3 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer",
        className
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar 
          className="h-5 w-5 cursor-pointer" 
          onClick={handleViewProfile}
        >
          <AvatarImage src={imgAvatar(quotedPost.profiles.avatar_url)} alt={quotedPost.profiles.display_name} />
          <AvatarFallback className="text-[8px]">
            {quotedPost.profiles.display_name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <span 
          className="font-semibold text-xs text-foreground cursor-pointer hover:underline"
          onClick={handleViewProfile}
        >
          {quotedPost.profiles.display_name}
        </span>
        
        <VerifiedBadge 
          isVerified={quotedPost.profiles.is_verified || quotedPost.is_developer}
          isOrgVerified={quotedPost.profiles.is_organization_verified}
          isDeveloper={quotedPost.is_developer}
          size="sm"
        />
        
        <span 
          className="text-muted-foreground text-[10px] cursor-pointer hover:underline"
          onClick={handleViewProfile}
        >
          @{quotedPost.profiles.handle}
        </span>
        
        <span className="text-muted-foreground text-[10px]">·</span>
        <span className="text-muted-foreground text-[10px]">
          {formatTime(quotedPost.created_at)}
        </span>
      </div>

      {/* Content */}
      <p className="text-foreground text-sm line-clamp-3 whitespace-pre-wrap break-words">
        {quotedPost.content}
      </p>

      {/* Image preview (single image, small) */}
      {images.length > 0 && (
        <div className="mt-2 rounded-xl overflow-hidden max-h-32 relative">
          <img 
            src={imgPost(images[0].image_url)} 
            alt={images[0].alt_text || 'Quoted post image'}
            className="w-full h-full object-cover max-h-32"
          />
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              +{images.length - 1}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
