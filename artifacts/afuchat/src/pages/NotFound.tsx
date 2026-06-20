import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { FileQuestion, ArrowLeft, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    
    // Update meta tags to indicate 404 for crawlers
    document.title = "Page Not Found - AfuChat";
    
    // Add noindex meta tag for 404 pages
    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', 'noindex, nofollow');

    // Cleanup on unmount
    return () => {
      document.title = "AfuChat — Post. Chat. Shop. AI. All in One.";
      if (metaRobots) {
        metaRobots.setAttribute('content', 'index, follow');
      }
    };
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-9 w-9 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-lg">Page Not Found</span>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-20">
        <div className="text-center max-w-md space-y-6">
          {/* Icon with gradient background */}
          <div className="mx-auto w-32 h-32 rounded-full bg-muted/50 flex items-center justify-center">
            <FileQuestion className="h-16 w-16 text-muted-foreground" />
          </div>

          {/* Error info */}
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-primary">404</h1>
            <p className="text-xl font-medium text-foreground">
              Page Not Found
            </p>
            <p className="text-sm text-muted-foreground">
              The page at <span className="font-mono font-semibold text-foreground bg-muted px-2 py-0.5 rounded">{location.pathname}</span> could not be found.
            </p>
          </div>

          {/* Suggestion box */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-sm text-muted-foreground">
              The page may have been moved, deleted, or never existed. Please check the URL or navigate back to safety.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button asChild variant="default" className="flex-1 h-11 rounded-xl">
              <Link to="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 h-11 rounded-xl">
              <Link to="/search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
