import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileDrawer } from '@/components/ProfileDrawer';
import { Search, Star, Download, Gamepad2, ShoppingBag, Music, Zap, Calendar, Plane, UtensilsCrossed, Car, CalendarCheck, Wallet, Brain, Puzzle, Trophy, ChevronRight, Clock, Shield, Gift, Mail, Send, PlusCircle, Code, Heart, MoreVertical, ExternalLink, Edit, Play, History, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { SubmitAppDialog } from '@/components/mini-programs/SubmitAppDialog';
import { EmbeddedAppViewer } from '@/components/mini-programs/EmbeddedAppViewer';
import { AppPreviewDialog } from '@/components/mini-programs/AppPreviewDialog';
import { getRecentApps, addRecentApp, hasUsedApp, RecentApp } from '@/lib/recentApps';

// Import app logos
import nexaCollectorLogo from '@/assets/mini-apps/nexa-collector-logo.png';
import memoryGameLogo from '@/assets/mini-apps/memory-game-logo.png';
import puzzleGameLogo from '@/assets/mini-apps/puzzle-game-logo.png';
import eventsLogo from '@/assets/mini-apps/events-logo.png';
import travelLogo from '@/assets/mini-apps/travel-logo.png';
import foodDeliveryLogo from '@/assets/mini-apps/food-delivery-logo.png';
import ridesLogo from '@/assets/mini-apps/rides-logo.png';
import bookingsLogo from '@/assets/mini-apps/bookings-logo.png';
import financeLogo from '@/assets/mini-apps/finance-logo.png';
import shopshackLogo from '@/assets/mini-apps/shopshack-logo.png';
import giftsP2PLogo from '@/assets/mini-apps/gifts-p2p-logo.png';
import afumailLogo from '@/assets/mini-apps/afumail-logo.png';

interface MiniProgram {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  developer_id: string;
  developer_email?: string;
  category: string;
  url?: string | null;
  install_count: number;
  rating: number;
  screenshots?: string[];
  features?: string;
  created_at?: string;
  privacy_url?: string;
  terms_url?: string;
  target_countries?: string[] | null;
  app_type?: string;
  apk_url?: string | null;
  profiles: {
    display_name: string;
  };
}

interface BuiltInApp {
  id: string;
  name: string;
  description: string;
  icon: any;
  logo?: string;
  category: string;
  route: string;
  url?: string; // For embedded viewing
  color: string;
  gradient: string;
  isBuiltIn: boolean;
  featured?: boolean;
  downloads?: string;
  rating?: number;
  screenshots?: string[];
  features?: string;
}

const MiniPrograms = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [miniPrograms, setMiniPrograms] = useState<MiniProgram[]>([]);
  const [installedApps, setInstalledApps] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<{ avatar_url: string | null; display_name: string } | null>(null);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  
  // Embedded app viewer state
  const [embeddedApp, setEmbeddedApp] = useState<{
    name: string;
    url: string;
    icon?: string;
    appId?: string;
    developerEmail?: string;
    privacyUrl?: string;
    termsUrl?: string;
    isBuiltIn?: boolean;
  } | null>(null);

  // Preview dialog state
  const [previewApp, setPreviewApp] = useState<MiniProgram | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // Built-in app preview state
  const [builtInPreviewApp, setBuiltInPreviewApp] = useState<BuiltInApp | null>(null);
  const [builtInPreviewOpen, setBuiltInPreviewOpen] = useState(false);

  // Recent apps state
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);

  // Load recent apps on mount
  useEffect(() => {
    setRecentApps(getRecentApps());
  }, []);

  // Fetch user country from profile
  useEffect(() => {
    const fetchUserCountry = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('country')
          .eq('id', user.id)
          .single();
        if (data?.country) {
          setUserCountry(data.country);
        }
      }
    };
    fetchUserCountry();
  }, [user]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_admin, avatar_url, display_name')
        .eq('id', user.id)
        .single();
      if (data) {
        setIsAdmin(data.is_admin || false);
        setUserProfile({ avatar_url: data.avatar_url, display_name: data.display_name });
      }
    };
    fetchUserData();
  }, [user]);

  // Check if app is available in user's country
  const isAppAvailableInCountry = (app: MiniProgram): boolean => {
    // If no target countries specified, app is available worldwide
    if (!app.target_countries || app.target_countries.length === 0) {
      return true;
    }
    // If user is not logged in or has no country, block access to restricted apps
    if (!userCountry) {
      return false;
    }
    // Check if user's country is in the target countries
    return app.target_countries.includes(userCountry);
  };

  // Base categories - always shown
  const baseCategories = [
    { id: 'all', name: 'For you', icon: Zap },
    { id: 'games', name: 'Games', icon: Gamepad2 },
    { id: 'services', name: 'Services', icon: Star },
    { id: 'shopping', name: 'Shopping', icon: ShoppingBag },
    { id: 'finance', name: 'Finance', icon: Wallet },
    { id: 'entertainment', name: 'Entertainment', icon: Music },
  ];

  // Dynamically add categories from approved apps that aren't in base categories
  const dynamicCategories = useMemo(() => {
    const baseCategoryIds = new Set(baseCategories.map(c => c.id));
    const appCategories = new Set(miniPrograms.map(app => app.category.toLowerCase()));
    
    const newCategories: { id: string; name: string; icon: any }[] = [];
    appCategories.forEach(cat => {
      if (!baseCategoryIds.has(cat)) {
        newCategories.push({
          id: cat,
          name: cat.charAt(0).toUpperCase() + cat.slice(1),
          icon: Star, // Default icon for dynamic categories
        });
      }
    });
    
    return newCategories;
  }, [miniPrograms]);

  const categories = [...baseCategories, ...dynamicCategories];

  // Built-in games - all system apps that can be edited by admin
  const builtInGames: BuiltInApp[] = [
    { 
      id: 'nexa-collector',
      name: 'Nexa Collector',
      description: 'Collect Nexa and level up',
      icon: Zap,
      logo: nexaCollectorLogo,
      category: 'games',
      route: '/game',
      url: '/game',
      color: 'bg-orange-500',
      gradient: 'from-orange-500 to-red-500',
      isBuiltIn: true,
      downloads: '50K+',
      rating: 4.6,
      features: 'Collect Nexa points\nLevel up your profile\nCompete with friends'
    },
    { 
      id: 'memory-match',
      name: 'Memory Match',
      description: 'Test your memory skills',
      icon: Brain,
      logo: memoryGameLogo,
      category: 'games',
      route: '/memory-game',
      url: '/memory-game',
      color: 'bg-purple-500',
      gradient: 'from-purple-500 to-pink-500',
      isBuiltIn: true,
      downloads: '25K+',
      rating: 4.5,
      features: 'Multiple difficulty levels\nTrack your best times\nEarn rewards'
    },
    { 
      id: '15-puzzle',
      name: '15 Puzzle',
      description: 'Classic sliding puzzle',
      icon: Puzzle,
      logo: puzzleGameLogo,
      category: 'games',
      route: '/puzzle-game',
      url: '/puzzle-game',
      color: 'bg-blue-600',
      gradient: 'from-blue-600 to-cyan-500',
      isBuiltIn: true,
      downloads: '15K+',
      rating: 4.4,
      features: 'Classic puzzle gameplay\nTrack your moves\nCompete on leaderboards'
    },
  ];

  // Built-in services - system apps
  const builtInServices: BuiltInApp[] = [
    { 
      id: 'shop',
      name: 'Shop',
      description: 'Shop quality products',
      icon: ShoppingBag,
      logo: shopshackLogo,
      category: 'shopping',
      route: '/shop/3e75ceb8-e9c1-4399-93c0-5b8620f40fda',
      url: '/shop/3e75ceb8-e9c1-4399-93c0-5b8620f40fda',
      color: 'bg-primary',
      gradient: 'from-primary to-primary/60',
      isBuiltIn: true,
      featured: true,
      downloads: '100K+',
      rating: 4.9,
      features: 'Browse quality products\nSecure checkout\nFast delivery'
    },
    { 
      id: 'events',
      name: 'Events',
      description: 'Discover events near you',
      icon: Calendar,
      logo: eventsLogo,
      category: 'services',
      route: '/events',
      url: '/events',
      color: 'bg-blue-500',
      gradient: 'from-blue-500 to-cyan-500',
      isBuiltIn: true,
      downloads: '30K+',
      rating: 4.3,
      features: 'Find local events\nBook tickets\nGet reminders'
    },
    { 
      id: 'travel',
      name: 'Travel',
      description: 'Book flights and hotels',
      icon: Plane,
      logo: travelLogo,
      category: 'services',
      route: '/travel',
      url: '/travel',
      color: 'bg-sky-500',
      gradient: 'from-sky-500 to-blue-500',
      isBuiltIn: true,
      downloads: '45K+',
      rating: 4.5,
      features: 'Search flights\nBook hotels\nManage bookings'
    },
    { 
      id: 'food-delivery',
      name: 'Food Delivery',
      description: 'Order from restaurants',
      icon: UtensilsCrossed,
      logo: foodDeliveryLogo,
      category: 'services',
      route: '/food-delivery',
      url: '/food-delivery',
      color: 'bg-orange-500',
      gradient: 'from-orange-500 to-red-500',
      isBuiltIn: true,
      downloads: '80K+',
      rating: 4.6,
      features: 'Order from local restaurants\nTrack your delivery\nSave favorites'
    },
    { 
      id: 'rides',
      name: 'Rides',
      description: 'Book transportation',
      icon: Car,
      logo: ridesLogo,
      category: 'services',
      route: '/rides',
      url: '/rides',
      color: 'bg-green-500',
      gradient: 'from-green-500 to-emerald-500',
      isBuiltIn: true,
      downloads: '60K+',
      rating: 4.4,
      features: 'Book rides instantly\nTrack your driver\nCashless payments'
    },
    { 
      id: 'bookings',
      name: 'Bookings',
      description: 'Manage reservations',
      icon: CalendarCheck,
      logo: bookingsLogo,
      category: 'services',
      route: '/bookings',
      url: '/bookings',
      color: 'bg-purple-500',
      gradient: 'from-purple-500 to-pink-500',
      isBuiltIn: true,
      downloads: '35K+',
      rating: 4.2,
      features: 'Manage reservations\nSet reminders\nSync with calendar'
    },
    { 
      id: 'finance',
      name: 'Financial Hub',
      description: 'Manage your wallet',
      icon: Wallet,
      logo: financeLogo,
      category: 'finance',
      route: '/wallet',
      url: '/wallet',
      color: 'bg-emerald-500',
      gradient: 'from-emerald-500 to-teal-500',
      isBuiltIn: true,
      downloads: '70K+',
      rating: 4.7,
      features: 'Track spending\nManage wallet\nSend money'
    },
    {
      id: 'gifts-p2p',
      name: 'Gifts P2P',
      description: 'Trade rare gifts with others',
      icon: Gift,
      logo: giftsP2PLogo,
      category: 'shopping',
      route: '/shop',
      url: '/shop',
      color: 'bg-teal-500',
      gradient: 'from-teal-500 to-cyan-500',
      isBuiltIn: true,
      downloads: '15K+',
      rating: 4.6,
      features: 'Trade rare gifts\nMarketplace listings\nSecure transactions'
    },
    {
      id: 'afumail',
      name: 'AfuMail',
      description: 'Full email service',
      icon: Mail,
      logo: afumailLogo,
      category: 'services',
      route: '/afumail',
      url: '/afumail',
      color: 'bg-primary',
      gradient: 'from-primary to-cyan-500',
      isBuiltIn: true,
      featured: true,
      downloads: '5K+',
      rating: 4.9,
      features: 'Full email service\nSend and receive emails\nOrganize with folders'
    },
  ];

  useEffect(() => {
    fetchMiniPrograms();
    fetchInstalledApps();
  }, []);

  const fetchMiniPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('mini_programs')
        .select(`*, profiles (display_name)`)
        .eq('status', 'approved')
        .order('install_count', { ascending: false });

      if (error) throw error;
      setMiniPrograms(data || []);
    } catch (error) {
      console.error('Error fetching mini programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstalledApps = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_mini_programs')
        .select('mini_program_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setInstalledApps(new Set(data.map(d => d.mini_program_id)));
    } catch (error) {
      console.error('Error fetching installed apps:', error);
    }
  };

  // Check if app is available - games, shopping, and finance are open, other services coming soon
  const isAppAvailable = (app: BuiltInApp) => {
    if (isAdmin) return true;
    
    // Games are all available
    if (app.category === 'games') return true;
    
    // Shopping apps available
    if (app.category === 'shopping') return true;
    
    // Specific services available
    const openServices = ['finance'];
    if (openServices.includes(app.id)) return true;
    
    // Other services coming soon (including afumail)
    return false;
  };

  // Handle built-in app click - skip preview if used before
  const handleBuiltInAppClick = (app: BuiltInApp) => {
    if (!isAppAvailable(app)) {
      toast.info('Coming soon!');
      return;
    }
    
    // If used before, open directly
    if (hasUsedApp(app.id)) {
      openBuiltInApp(app);
    } else {
      // First time - show preview
      setBuiltInPreviewApp(app);
      setBuiltInPreviewOpen(true);
    }
  };

  // Open built-in app in embedded viewer directly
  const openBuiltInApp = (app: BuiltInApp) => {
    if (!isAppAvailable(app)) {
      toast.info('Coming soon!');
      return;
    }
    
    // Track in recent apps
    addRecentApp({
      id: app.id,
      name: app.name,
      icon: app.logo,
      isBuiltIn: true,
      route: app.route,
    });
    setRecentApps(getRecentApps());
    
    setEmbeddedApp({
      name: app.name,
      url: app.route,
      icon: app.logo,
      isBuiltIn: true,
    });
  };

  // Handler for third-party apps - skip preview if used before
  const handleThirdPartyAppClick = (app: MiniProgram) => {
    if (!isAppAvailableInCountry(app)) {
      toast.error('This app is not available in your country');
      return;
    }
    
    // If used before, open directly
    if (hasUsedApp(app.id)) {
      openThirdPartyApp(app);
    } else {
      // First time - show preview
      setPreviewApp(app);
      setPreviewDialogOpen(true);
    }
  };

  // Open third-party app in embedded viewer
  const openThirdPartyApp = (app: MiniProgram) => {
    // Track in recent apps
    addRecentApp({
      id: app.id,
      name: app.name,
      icon: app.icon_url || undefined,
      isBuiltIn: false,
      url: app.url,
    });
    setRecentApps(getRecentApps());
    
    setEmbeddedApp({
      name: app.name,
      url: app.url,
      icon: app.icon_url || undefined,
      appId: app.id,
      developerEmail: app.developer_email,
      privacyUrl: app.privacy_url,
      termsUrl: app.terms_url,
      isBuiltIn: false,
    });
  };

  // Show about for an app (from embedded viewer)
  const handleShowAbout = () => {
    if (embeddedApp) {
      // Find the app and show its preview
      if (embeddedApp.isBuiltIn) {
        const app = allBuiltInApps.find(a => a.id === embeddedApp.appId || a.route === embeddedApp.url);
        if (app) {
          setBuiltInPreviewApp(app);
          setBuiltInPreviewOpen(true);
        }
      } else {
        const app = miniPrograms.find(a => a.id === embeddedApp.appId);
        if (app) {
          setPreviewApp(app);
          setPreviewDialogOpen(true);
        }
      }
    }
  };

  const allBuiltInApps = [...builtInGames, ...builtInServices];
  
  const filteredBuiltInApps = allBuiltInApps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || app.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Filter third-party mini programs (case-insensitive category matching)
  const filteredMiniPrograms = miniPrograms.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (app.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === 'all' || app.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const featuredApps = [...builtInGames.filter(g => g.featured), ...builtInServices.filter(s => s.featured)];

  // Chunk apps into groups of 4 for grid display
  const chunkApps = <T,>(apps: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < apps.length; i += size) {
      chunks.push(apps.slice(i, i + size));
    }
    return chunks;
  };

  // Third-party app card component
  const ThirdPartyAppCard = ({ app }: { app: MiniProgram }) => {
    const isRestricted = !isAppAvailableInCountry(app);
    
    return (
      <motion.div
        whileTap={isRestricted ? undefined : { scale: 0.98 }}
        className={`w-[72px] flex-shrink-0 relative group ${isRestricted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div 
          onClick={() => handleThirdPartyAppClick(app)}
          className={`relative h-[72px] w-[72px] rounded-[18px] shadow-lg overflow-hidden bg-muted mx-auto ${isRestricted ? 'opacity-50' : ''}`}
        >
          {app.icon_url ? (
            <img 
              src={app.icon_url} 
              alt={app.name} 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-primary flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
          )}
          {isRestricted && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          {!isRestricted && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
        <p className="text-[11px] font-medium truncate text-center mt-1.5">{app.name}</p>
        <div className="flex items-center justify-center gap-1">
          {isRestricted ? (
            <span className="text-[10px] text-muted-foreground">Restricted</span>
          ) : (
            <>
              <Star className="h-2.5 w-2.5 fill-muted-foreground text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{app.rating || 4.5}</span>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  // Built-in app card component - consistent with third-party apps
  const BuiltInAppCard = ({ app }: { app: BuiltInApp }) => {
    const Icon = app.icon;
    const isDisabled = !isAppAvailable(app);
    
    return (
      <motion.div
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        onClick={() => handleBuiltInAppClick(app)}
        className={`w-[72px] flex-shrink-0 ${isDisabled && !isAdmin ? 'cursor-not-allowed' : 'cursor-pointer'} relative group`}
      >
        <div className={`relative h-[72px] w-[72px] rounded-[18px] shadow-lg overflow-hidden mx-auto ${isDisabled && !isAdmin ? 'opacity-60' : ''}`}>
          {app.logo ? (
            <img 
              src={app.logo} 
              alt={app.name} 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className={`h-full w-full ${app.color} flex items-center justify-center`}>
              <Icon className="h-8 w-8 text-white" />
            </div>
          )}
          {isDisabled && !isAdmin && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          {/* Preview overlay on hover for available apps */}
          {(!isDisabled || isAdmin) && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
        <p className="text-[11px] font-medium truncate text-center mt-1.5">{app.name}</p>
        <div className="flex items-center justify-center gap-1">
          {isDisabled && !isAdmin ? (
            <span className="text-[10px] text-muted-foreground">Soon</span>
          ) : (
            <>
              <Star className="h-2.5 w-2.5 fill-muted-foreground text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{app.rating || 4.5}</span>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  // Combined app grid with 4 apps per row, horizontal scrolling
  const AppGrid = ({ apps, thirdPartyApps = [] }: { apps: BuiltInApp[]; thirdPartyApps?: MiniProgram[] }) => {
    // Combine both built-in and third-party apps
    const allApps = [
      ...apps.map(app => ({ type: 'builtin' as const, app })),
      ...thirdPartyApps.map(app => ({ type: 'thirdparty' as const, app })),
    ];
    
    // Chunk into groups of 4
    const chunks = chunkApps(allApps, 4);
    
    return (
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {chunks.map((chunk, chunkIndex) => (
            <div key={chunkIndex} className="flex-shrink-0 grid grid-cols-4 gap-3">
              {chunk.map((item, index) => (
                item.type === 'builtin' ? (
                  <BuiltInAppCard key={`builtin-${item.app.id}`} app={item.app as BuiltInApp} />
                ) : (
                  <ThirdPartyAppCard key={`thirdparty-${(item.app as MiniProgram).id}`} app={item.app as MiniProgram} />
                )
              ))}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    );
  };

  // Built-in App Preview Dialog
  const BuiltInAppPreviewDialog = () => {
    if (!builtInPreviewApp) return null;
    
    const Icon = builtInPreviewApp.icon;
    const isDisabled = !isAppAvailable(builtInPreviewApp);
    const featuresList = builtInPreviewApp.features?.split('\n').filter(f => f.trim()) || [];
    
    return (
      <Dialog open={builtInPreviewOpen} onOpenChange={setBuiltInPreviewOpen}>
        <DialogContent className="max-w-md mx-4 max-h-[90vh] p-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-4">
              <DialogHeader className="pb-4">
                <div className="flex items-start gap-4">
                  {/* App Icon */}
                  <div className="h-20 w-20 rounded-2xl shadow-lg overflow-hidden flex-shrink-0">
                    {builtInPreviewApp.logo ? (
                      <img 
                        src={builtInPreviewApp.logo} 
                        alt={builtInPreviewApp.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className={`h-full w-full ${builtInPreviewApp.color} flex items-center justify-center`}>
                        <Icon className="h-10 w-10 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* App Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <DialogTitle className="text-xl font-bold mb-1">{builtInPreviewApp.name}</DialogTitle>
                      {/* More menu for admin */}
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toast.info('Edit feature coming soon')}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit App Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(builtInPreviewApp.route, '_blank')}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open External
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs capitalize mb-2">
                      {builtInPreviewApp.category}
                    </Badge>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">{builtInPreviewApp.rating?.toFixed(1) || '4.5'}</span>
                      </div>
                      <span className="text-muted-foreground">•</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Download className="h-3.5 w-3.5" />
                        <span className="text-xs">{builtInPreviewApp.downloads || '10K+'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Preview Screenshots placeholder */}
              {builtInPreviewApp.screenshots && builtInPreviewApp.screenshots.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Screenshots</h3>
                  <ScrollArea className="w-full">
                    <div className="flex gap-2 pb-2">
                      {builtInPreviewApp.screenshots.map((screenshot, index) => (
                        <div key={index} className="flex-shrink-0 rounded-lg overflow-hidden border border-border">
                          <img 
                            src={screenshot} 
                            alt={`Screenshot ${index + 1}`}
                            className="h-32 w-auto object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="invisible" />
                  </ScrollArea>
                </div>
              )}

              {/* Description */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {builtInPreviewApp.description}
                </p>
              </div>

              {/* Features */}
              {featuresList.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Features</h3>
                  <ul className="space-y-1.5">
                    {featuresList.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* System App Badge */}
              <div className="mb-4 p-3 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">System App</p>
                    <p>This is a built-in AfuChat app. Your data is protected by our security policies.</p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button 
                className="w-full"
                disabled={isDisabled && !isAdmin}
                onClick={() => {
                  setBuiltInPreviewOpen(false);
                  openBuiltInApp(builtInPreviewApp);
                }}
              >
                {isDisabled && !isAdmin ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Coming Soon
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Open App
                  </>
                )}
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  // Detect if in iframe or on desktop (to hide duplicate header)
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const showMobileHeader = isMobile && !isInIframe;

  return (
    <>
      <div className="min-h-screen bg-background pb-safe">
        {/* Header - Only show on mobile */}
        {showMobileHeader && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border">
            <div className="px-4 py-3">
              <div className="flex items-center gap-3 mb-3">
                {user ? (
                  <ProfileDrawer
                    trigger={
                      <button className="flex-shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={userProfile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {userProfile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    }
                  />
                ) : null}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search apps and games"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 rounded-full bg-muted/50 border-0"
                  />
                </div>
              </div>
              
              {/* Category tabs */}
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                          isActive 
                            ? 'bg-primary/10 text-primary border-2 border-primary' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Desktop category tabs (no profile/search, just categories) */}
        {!showMobileHeader && (
          <div className="border-b border-border">
            <div className="px-4 py-3">
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-xl font-bold">Mini Programs</h1>
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search apps and games"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 rounded-full bg-muted/50 border-0"
                  />
                </div>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {categories.map((cat) => {
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                          isActive 
                            ? 'bg-primary/10 text-primary border-2 border-primary' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
              </ScrollArea>
            </div>
          </div>
        )}

        <div className="px-4 py-4 space-y-6">
          {/* Recent Apps Section */}
          {selectedCategory === 'all' && !searchQuery && recentApps.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-muted-foreground">Recent</h2>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-2">
                  {recentApps.slice(0, 8).map((app) => (
                    <motion.div
                      key={app.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (app.isBuiltIn) {
                          const builtIn = allBuiltInApps.find(a => a.id === app.id);
                          if (builtIn) openBuiltInApp(builtIn);
                        } else {
                          const thirdParty = miniPrograms.find(a => a.id === app.id);
                          if (thirdParty) openThirdPartyApp(thirdParty);
                        }
                      }}
                      className="w-[60px] flex-shrink-0 cursor-pointer"
                    >
                      <div className="h-[60px] w-[60px] rounded-2xl shadow-md overflow-hidden bg-muted mx-auto">
                        {app.icon ? (
                          <img src={app.icon} alt={app.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-primary flex items-center justify-center">
                            <span className="text-xl">📱</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] font-medium truncate text-center mt-1">{app.name}</p>
                    </motion.div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
              </ScrollArea>
            </section>
          )}

          {/* Featured Banner */}
          {selectedCategory === 'all' && !searchQuery && featuredApps.length > 0 && (
            <section>
              <ScrollArea className="w-full">
                <div className="flex gap-3 pb-4">
                  {featuredApps.map((app) => {
                    const Icon = app.icon;
                    return (
                      <motion.div
                        key={app.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleBuiltInAppClick(app)}
                        className="w-[280px] flex-shrink-0 cursor-pointer"
                      >
                        <div className={`relative h-36 rounded-2xl bg-gradient-to-br ${app.gradient} p-4 shadow-lg overflow-hidden`}>
                          {app.logo && (
                            <div className="absolute -right-4 -bottom-4 opacity-30">
                              <img src={app.logo} alt="" className="h-32 w-32 object-cover" />
                            </div>
                          )}
                          <div className="relative z-10 h-full flex flex-col justify-between">
                            <div className="flex items-center gap-2">
                              {app.logo && (
                                <img src={app.logo} alt={app.name} className="h-10 w-10 rounded-xl shadow-md" />
                              )}
                              <Badge className="bg-white/20 text-white border-0 text-[10px]">
                                Featured
                              </Badge>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white">{app.name}</h3>
                              <p className="text-white/80 text-xs">{app.description}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" className="invisible" />
              </ScrollArea>
            </section>
          )}

          {/* Shopping Section */}
          {(selectedCategory === 'all' || selectedCategory === 'shopping') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Shopping</h2>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <AppGrid
                apps={builtInServices.filter(
                  (s) =>
                    s.category === 'shopping' &&
                    (!searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                )}
                thirdPartyApps={filteredMiniPrograms.filter(
                  (app) => app.category?.toLowerCase().trim() === 'shopping'
                )}
              />
            </section>
          )}

          {/* Games Section */}
          {(selectedCategory === 'all' || selectedCategory === 'games') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold">Games</h2>
                  <p className="text-xs text-muted-foreground">Play & earn Nexa</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8 px-3 rounded-full"
                  onClick={() => toast.info('Leaderboard coming soon')}
                >
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-semibold">Leaderboard</span>
                </Button>
              </div>
              <AppGrid
                apps={builtInGames.filter(
                  (g) => !searchQuery || g.name.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                thirdPartyApps={filteredMiniPrograms.filter(
                  (app) => app.category?.toLowerCase().trim() === 'games'
                )}
              />
            </section>
          )}

          {/* Finance Section */}
          {(selectedCategory === 'all' || selectedCategory === 'finance') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Finance</h2>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <AppGrid
                apps={builtInServices.filter(
                  (s) =>
                    s.category === 'finance' &&
                    (!searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                )}
                thirdPartyApps={filteredMiniPrograms.filter(
                  (app) => app.category?.toLowerCase().trim() === 'finance'
                )}
              />
            </section>
          )}

          {/* Services Section */}
          {(selectedCategory === 'all' || selectedCategory === 'services') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Services</h2>
                {!isAdmin && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Clock className="h-3 w-3" />
                    Coming Soon
                  </Badge>
                )}
              </div>
              <AppGrid
                apps={builtInServices.filter(
                  (s) =>
                    s.category === 'services' &&
                    (!searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                )}
                thirdPartyApps={filteredMiniPrograms.filter(
                  (app) => app.category?.toLowerCase().trim() === 'services'
                )}
              />
            </section>
          )}

          {/* Entertainment Section */}
          {(selectedCategory === 'all' || selectedCategory === 'entertainment') &&
            filteredMiniPrograms.filter((app) => app.category?.toLowerCase().trim() === 'entertainment').length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">Entertainment</h2>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <AppGrid
                  apps={[]}
                  thirdPartyApps={filteredMiniPrograms.filter(
                    (app) => app.category?.toLowerCase().trim() === 'entertainment'
                  )}
                />
              </section>
            )}

          {/* Dynamic Categories (approved apps) */}
          {selectedCategory !== 'all' &&
            !['shopping', 'games', 'services', 'entertainment', 'finance'].includes(selectedCategory) && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold capitalize">{selectedCategory}</h2>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <AppGrid
                  apps={[]}
                  thirdPartyApps={filteredMiniPrograms.filter(
                    (app) => app.category?.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
                  )}
                />
              </section>
            )}

          {/* Empty state */}
          {searchQuery && filteredBuiltInApps.length === 0 && filteredMiniPrograms.length === 0 && (
            <div className="text-center py-16">
              <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No results found</h3>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          )}
        </div>

        {/* Developer Navigation Footer */}
        <div className="border-t border-border bg-card/50 py-6 px-4 mt-8 mb-4">
          <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 sm:gap-4 max-w-lg mx-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary hover:bg-primary/10 gap-1.5 h-9 px-3"
              onClick={() => toast.info('Coming soon!')}
            >
              <Send className="h-4 w-4" />
              <span className="text-sm font-medium">Join Channel</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary hover:bg-primary/10 gap-1.5 h-9 px-3"
              onClick={() => user ? setSubmitDialogOpen(true) : toast.error('Please sign in to submit an app')}
            >
              <PlusCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Submit Your App</span>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 sm:gap-4 max-w-lg mx-auto mt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary hover:bg-primary/10 gap-1.5 h-9 px-3"
              onClick={() => toast.info('Developer SDK coming soon')}
            >
              <Code className="h-4 w-4" />
              <span className="text-sm font-medium">For Developers</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary hover:bg-primary/10 gap-1.5 h-9 px-3"
              onClick={() => toast.info('Support coming soon')}
            >
              <Heart className="h-4 w-4" />
              <span className="text-sm font-medium">Support</span>
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            © {new Date().getFullYear()} AfuChat Mini Programs
          </p>
        </div>
      </div>

      {/* Submit App Dialog */}
      <SubmitAppDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen} />

      {/* Third-party App Preview Dialog */}
      <AppPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        app={previewApp}
        onOpen={() => {
          if (previewApp) {
            openThirdPartyApp(previewApp);
          }
        }}
      />

      {/* Built-in App Preview Dialog */}
      <BuiltInAppPreviewDialog />

      {/* Embedded App Viewer */}
      {embeddedApp && (
        <EmbeddedAppViewer
          appName={embeddedApp.name}
          appUrl={embeddedApp.url}
          appIcon={embeddedApp.icon}
          appId={embeddedApp.appId}
          developerEmail={embeddedApp.developerEmail}
          privacyUrl={embeddedApp.privacyUrl}
          termsUrl={embeddedApp.termsUrl}
          isBuiltIn={embeddedApp.isBuiltIn}
          onClose={() => setEmbeddedApp(null)}
          onShowAbout={handleShowAbout}
        />
      )}
    </>
  );
};

export default MiniPrograms;
