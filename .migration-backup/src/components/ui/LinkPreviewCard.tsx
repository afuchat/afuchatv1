import { ExternalLink } from 'lucide-react';
import { Card } from './card';
import { extractText } from '@/lib/textUtils';

interface LinkPreviewCardProps {
  url: string;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  site_name?: string | null;
}

export const LinkPreviewCard = ({
  url,
  title,
  description,
  image_url,
  site_name,
}: LinkPreviewCardProps) => {
  // Safely extract text from potentially nested objects
  const safeTitle = extractText(title);
  const safeDescription = extractText(description);
  const safeSiteName = extractText(site_name);
  const safeImageUrl = extractText(image_url);

  // Ensure URL has proper protocol
  const normalizedUrl = url.startsWith('http://') || url.startsWith('https://') 
    ? url 
    : `https://${url}`;

  return (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline"
      onClick={(e) => e.stopPropagation()}
    >
      <Card className="overflow-hidden hover:bg-accent/50 transition-colors cursor-pointer border border-border/50">
        <div className="flex gap-3">
          {safeImageUrl && (
            <div className="w-32 h-32 flex-shrink-0">
              <img
                src={safeImageUrl}
                alt={safeTitle || 'Link preview'}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 p-3 min-w-0">
            {safeSiteName && (
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                {safeSiteName}
              </p>
            )}
            {safeTitle && (
              <h4 className="text-sm font-semibold line-clamp-2 mb-1">
                {safeTitle}
              </h4>
            )}
            {safeDescription && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {safeDescription}
              </p>
            )}
          </div>
        </div>
      </Card>
    </a>
  );
};
