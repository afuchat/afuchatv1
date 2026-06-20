import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  SlidersHorizontal, 
  Image, 
  Video, 
  FileText, 
  Link2, 
  BarChart3,
  Sparkles,
  Calendar,
  Users,
  CheckCircle,
  X
} from 'lucide-react';
import { MediaType } from '@/lib/contentCategorization';
import { cn } from '@/lib/utils';

export interface SearchFilters {
  mediaTypes: MediaType[];
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  verified: boolean | null; // null = any, true = verified only, false = not verified
  hasEngagement: boolean;
  minLikes: number;
  sortBy: 'relevance' | 'recent' | 'popular';
}

const DEFAULT_FILTERS: SearchFilters = {
  mediaTypes: [],
  dateRange: 'all',
  verified: null,
  hasEngagement: false,
  minLikes: 0,
  sortBy: 'relevance',
};

interface AdvancedSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  resultCount?: number;
}

const MEDIA_TYPE_OPTIONS: { type: MediaType; label: string; icon: React.ReactNode }[] = [
  { type: 'image', label: 'Photos', icon: <Image className="h-4 w-4" /> },
  { type: 'video', label: 'Videos', icon: <Video className="h-4 w-4" /> },
  { type: 'text', label: 'Text', icon: <FileText className="h-4 w-4" /> },
  { type: 'link', label: 'Links', icon: <Link2 className="h-4 w-4" /> },
  { type: 'poll', label: 'Polls', icon: <BarChart3 className="h-4 w-4" /> },
  { type: 'gif', label: 'GIFs', icon: <Sparkles className="h-4 w-4" /> },
];

const DATE_RANGE_OPTIONS: { value: SearchFilters['dateRange']; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
];

const SORT_OPTIONS: { value: SearchFilters['sortBy']; label: string }[] = [
  { value: 'relevance', label: 'Most relevant' },
  { value: 'recent', label: 'Most recent' },
  { value: 'popular', label: 'Most popular' },
];

export const AdvancedSearchFilters = memo(function AdvancedSearchFilters({
  filters,
  onFiltersChange,
  resultCount,
}: AdvancedSearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const activeFilterCount = 
    filters.mediaTypes.length +
    (filters.dateRange !== 'all' ? 1 : 0) +
    (filters.verified !== null ? 1 : 0) +
    (filters.hasEngagement ? 1 : 0) +
    (filters.minLikes > 0 ? 1 : 0) +
    (filters.sortBy !== 'relevance' ? 1 : 0);

  const toggleMediaType = (type: MediaType) => {
    const newTypes = filters.mediaTypes.includes(type)
      ? filters.mediaTypes.filter(t => t !== type)
      : [...filters.mediaTypes, type];
    onFiltersChange({ ...filters, mediaTypes: newTypes });
  };

  const resetFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Quick filter chips */}
      <ScrollArea className="w-full">
        <div className="flex items-center gap-2 px-4 py-2">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex items-center gap-1.5 h-8 rounded-full",
                  activeFilterCount > 0 && "border-primary text-primary"
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
              <SheetHeader className="text-left pb-4">
                <div className="flex items-center justify-between">
                  <SheetTitle>Advanced Filters</SheetTitle>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      Reset all
                    </Button>
                  )}
                </div>
              </SheetHeader>
              
              <div className="space-y-6 overflow-y-auto pb-20">
                {/* Media Type */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Content Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {MEDIA_TYPE_OPTIONS.map(({ type, label, icon }) => (
                      <Button
                        key={type}
                        variant={filters.mediaTypes.includes(type) ? "default" : "outline"}
                        size="sm"
                        className="flex items-center gap-2 h-10"
                        onClick={() => toggleMediaType(type)}
                      >
                        {icon}
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Range
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {DATE_RANGE_OPTIONS.map(({ value, label }) => (
                      <Button
                        key={value}
                        variant={filters.dateRange === value ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        onClick={() => onFiltersChange({ ...filters, dateRange: value })}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Verification */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Verification
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant={filters.verified === null ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => onFiltersChange({ ...filters, verified: null })}
                    >
                      Anyone
                    </Button>
                    <Button
                      variant={filters.verified === true ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => onFiltersChange({ ...filters, verified: true })}
                    >
                      Verified only
                    </Button>
                  </div>
                </div>

                {/* Sort By */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Sort By</Label>
                  <div className="flex flex-wrap gap-2">
                    {SORT_OPTIONS.map(({ value, label }) => (
                      <Button
                        key={value}
                        variant={filters.sortBy === value ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        onClick={() => onFiltersChange({ ...filters, sortBy: value })}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Engagement Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Minimum Likes
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      {filters.minLikes > 0 ? `${filters.minLikes}+` : 'Any'}
                    </span>
                  </div>
                  <Slider
                    value={[filters.minLikes]}
                    onValueChange={([value]) => onFiltersChange({ ...filters, minLikes: value })}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Has Engagement Toggle */}
                <div className="flex items-center justify-between py-2">
                  <Label className="text-sm font-medium">Has replies or likes</Label>
                  <Switch
                    checked={filters.hasEngagement}
                    onCheckedChange={(checked) => onFiltersChange({ ...filters, hasEngagement: checked })}
                  />
                </div>
              </div>

              {/* Apply button */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
                <Button className="w-full" onClick={() => setIsOpen(false)}>
                  Show {resultCount !== undefined ? `${resultCount} results` : 'results'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Quick media type chips */}
          {MEDIA_TYPE_OPTIONS.slice(0, 4).map(({ type, label, icon }) => (
            <Button
              key={type}
              variant={filters.mediaTypes.includes(type) ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-1.5 h-8 rounded-full whitespace-nowrap"
              onClick={() => toggleMediaType(type)}
            >
              {icon}
              {label}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-1 flex-wrap">
          {filters.mediaTypes.map(type => (
            <Badge
              key={type}
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => toggleMediaType(type)}
            >
              {MEDIA_TYPE_OPTIONS.find(o => o.type === type)?.label}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {filters.dateRange !== 'all' && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => onFiltersChange({ ...filters, dateRange: 'all' })}
            >
              {DATE_RANGE_OPTIONS.find(o => o.value === filters.dateRange)?.label}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.verified === true && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => onFiltersChange({ ...filters, verified: null })}
            >
              Verified only
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filters.minLikes > 0 && (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 cursor-pointer"
              onClick={() => onFiltersChange({ ...filters, minLikes: 0 })}
            >
              {filters.minLikes}+ likes
              <X className="h-3 w-3" />
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground"
            onClick={resetFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
});

export { DEFAULT_FILTERS };
export default AdvancedSearchFilters;
