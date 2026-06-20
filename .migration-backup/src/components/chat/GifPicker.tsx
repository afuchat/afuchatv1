import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, X } from 'lucide-react';

interface GifPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (gifUrl: string) => void;
}

interface TenorGif {
  id: string;
  media_formats: {
    gif: {
      url: string;
    };
    tinygif: {
      url: string;
    };
  };
}

// Using Tenor's free API (no key required for basic usage)
const TENOR_API_URL = 'https://tenor.googleapis.com/v2';
const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ'; // Public Tenor API key

export const GifPicker = ({ open, onOpenChange, onSelect }: GifPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  // Load trending GIFs on open
  useEffect(() => {
    if (open && !trendingLoaded) {
      fetchTrendingGifs();
    }
  }, [open, trendingLoaded]);

  const fetchTrendingGifs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${TENOR_API_URL}/featured?key=${TENOR_API_KEY}&limit=30&media_filter=gif,tinygif`
      );
      const data = await response.json();
      if (data.results) {
        setGifs(data.results);
        setTrendingLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching trending GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      fetchTrendingGifs();
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(
        `${TENOR_API_URL}/search?key=${TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=30&media_filter=gif,tinygif`
      );
      const data = await response.json();
      if (data.results) {
        setGifs(data.results);
      }
    } catch (error) {
      console.error('Error searching GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGifs(searchQuery);
  };

  const handleSelectGif = (gif: TenorGif) => {
    // Use the smaller tinygif format for sending
    const gifUrl = gif.media_formats.tinygif?.url || gif.media_formats.gif?.url;
    if (gifUrl) {
      onSelect(gifUrl);
      onOpenChange(false);
      setSearchQuery('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 max-h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Choose a GIF</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search GIFs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => {
                    setSearchQuery('');
                    fetchTrendingGifs();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button type="submit" size="icon" className="h-10 w-10">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <ScrollArea className="h-[50vh] p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <p className="text-sm">No GIFs found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleSelectGif(gif)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img
                    src={gif.media_formats.tinygif?.url || gif.media_formats.gif?.url}
                    alt="GIF"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t text-center">
          <span className="text-xs text-muted-foreground">Powered by Tenor</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
