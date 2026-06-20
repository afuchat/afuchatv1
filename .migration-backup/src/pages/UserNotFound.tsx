import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { UserX, ArrowLeft, Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const UserNotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const username = (location.state as { username?: string })?.username || location.pathname.replace('/user-not-found', '').slice(1) || 'unknown';

  useEffect(() => {
    console.error("User not found:", username);
  }, [username]);

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
        <span className="font-semibold text-lg">Profile</span>
      </header>

      {/* Profile-like layout */}
      <div className="flex-1 flex flex-col">
        {/* Banner placeholder */}
        <div className="h-32 bg-muted/50 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-br from-muted/30 to-muted/60" />
          </div>
        </div>

        {/* Avatar and info */}
        <div className="px-4 -mt-16 relative z-10">
          <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
            <AvatarFallback className="bg-muted text-muted-foreground text-4xl">
              <UserX className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* User info section */}
        <div className="px-4 mt-4 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Not Found</h1>
            <p className="text-muted-foreground">@{username}</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
            <p className="text-center text-muted-foreground">
              This account doesn't exist or has been removed. The username may have been changed or the account may have been deleted.
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
                Search Users
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotFound;
