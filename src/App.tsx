import { Suspense, lazy, useEffect, useState } from "react";
import '@/types/telegram.d.ts';
import { supabase } from '@/integrations/supabase/client';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AccountModeProvider } from "./contexts/AccountModeContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { TelegramProvider } from "./contexts/TelegramContext";
import { AfuAIProvider } from "./contexts/AfuAIContext";
import AfuAIModal from "./components/afuai/AfuAIModal";
import { SettingsSheet } from "./components/SettingsSheet";
import { CombinedRouteGuard } from "./components/CombinedRouteGuard";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useIsMobile } from "./hooks/use-mobile";

import { useDailyLogin } from "./hooks/useDailyLogin";
import { useLanguageSync } from "./hooks/useLanguageSync";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { preloadAllGiftImages } from "./hooks/useGiftImageCache";
import { CustomLoader } from '@/components/ui/CustomLoader';
import { LoadingBar } from '@/components/LoadingBar';
import { motion, AnimatePresence } from 'framer-motion';


// Eager load critical pages
import Home from "./pages/Home";
import Index from "./pages/Index";
import Welcome from "./pages/auth/Welcome";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";

import AfuMailCallback from "./pages/auth/AfuMailCallback";
import UserNotFound from "./pages/UserNotFound";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Banned from "./pages/Banned";


// Lazy load other pages
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const DesktopChats = lazy(() => import("./pages/DesktopChats"));

const SearchPage = lazy(() => import("./pages/Search"));
const ShopPage = lazy(() => import("./pages/Shop"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
import Profile from "./pages/Profile";
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AfuAI = lazy(() => import("./pages/AfuAI"));
const Support = lazy(() => import("./pages/Support"));

const UnifiedLeaderboard = lazy(() => import("./pages/UnifiedLeaderboard"));
const QRCode = lazy(() => import("./pages/QRCode"));
const Settings = lazy(() => import("./pages/Settings"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

const AdminAffiliateRequests = lazy(() => import("./pages/AdminAffiliateRequests"));
const AdminVerificationRequests = lazy(() => import("./pages/AdminVerificationRequests"));
const AffiliateRequest = lazy(() => import("./pages/AffiliateRequest"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const Moments = lazy(() => import("./pages/Moments"));
const MiniPrograms = lazy(() => import("./pages/MiniPrograms"));
const Transfer = lazy(() => import("./pages/Transfer"));
const RedEnvelope = lazy(() => import("./pages/RedEnvelope"));
const DeveloperSDK = lazy(() => import("./pages/DeveloperSDK"));
const VerificationRequest = lazy(() => import("./pages/VerificationRequest"));
const Followers = lazy(() => import("./pages/Followers"));
const Following = lazy(() => import("./pages/Following"));
const SimpleGame = lazy(() => import("./pages/SimpleGame"));
const MemoryGame = lazy(() => import("./pages/MemoryGame"));
const PuzzleGame = lazy(() => import("./pages/PuzzleGame"));
const Games = lazy(() => import("./pages/Games"));
const FinancialHub = lazy(() => import("./pages/FinancialHub"));
const SocialHub = lazy(() => import("./pages/SocialHub"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const Gifts = lazy(() => import("./pages/Gifts"));
const ChristmasGifts = lazy(() => import("./pages/ChristmasGifts"));
const GiftDetail = lazy(() => import("./pages/GiftDetail"));
const Premium = lazy(() => import("./pages/Premium"));
const CreatorEarnings = lazy(() => import("./pages/CreatorEarnings"));
const AdminCreatorWithdrawals = lazy(() => import("./pages/AdminCreatorWithdrawals"));
const AdManager = lazy(() => import("./pages/AdManager"));
const AfuMail = lazy(() => import("./pages/AfuMail"));
const WhatsNew = lazy(() => import("./pages/WhatsNew"));

const FoodDelivery = lazy(() => import("./pages/FoodDelivery"));
const Bookings = lazy(() => import("./pages/Bookings"));
const Rides = lazy(() => import("./pages/Rides"));
const Travel = lazy(() => import("./pages/Travel"));
const Events = lazy(() => import("./pages/Events"));
const RestaurantDetail = lazy(() => import("./pages/RestaurantDetail"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const FlightDetail = lazy(() => import("./pages/FlightDetail"));
const HotelDetail = lazy(() => import("./pages/HotelDetail"));
const MerchantShop = lazy(() => import("./pages/MerchantShop"));
const ShopCart = lazy(() => import("./pages/ShopCart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const MerchantOrders = lazy(() => import("./pages/MerchantOrders"));
const MerchantOrderDetail = lazy(() => import("./pages/MerchantOrderDetail"));
const MiniProgramOrders = lazy(() => import("./pages/MiniProgramOrders"));
const MiniProgramOrderDetail = lazy(() => import("./pages/MiniProgramOrderDetail"));
import Layout from "./components/Layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnMount: false, // Don't refetch on every mount
    },
  },
});

const ProfileRedirect = () => {
  const { userId } = useParams();
  return <Navigate to={`/@${userId}`} replace />;
};

// Smart catch-all: renders Profile for @handle, or does referral redirect for bare usernames
// Also handles sub-routes like /@handle/edit, /@handle/followers, /@handle/following
const UsernameOrReferral = () => {
  const { username } = useParams();
  const location = useLocation();

  // If path starts with @, it's a profile route
  if (username?.startsWith('@')) {
    const subPath = location.pathname.split('/').slice(2).join('/');
    
    if (subPath === 'edit') {
      return (
        <CombinedRouteGuard>
          <Layout><EditProfile /></Layout>
        </CombinedRouteGuard>
      );
    }
    
    const handle = username.slice(1);
    
    if (subPath === 'followers') {
      return <Layout><Followers handleOverride={handle} /></Layout>;
    }
    
    if (subPath === 'following') {
      return <Layout><Following handleOverride={handle} /></Layout>;
    }

    return (
      <Layout>
        <Profile mustExist={true} />
      </Layout>
    );
  }

  // Otherwise, handle as referral
  return <ReferralHandler username={username} />;
};

const ReferralHandler = ({ username }: { username?: string }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!username) {
      navigate('/page-not-found', { replace: true });
      return;
    }

    // Skip known app routes
    const reservedRoutes = ['auth', 'home', 'feed', 'search', 'shop', 'chats', 'chat', 'notifications', 'admin', 'settings', 'support', 'terms', 'privacy', 'wallet', 'gifts', 'premium', 'profile', 'onboarding', 'complete-profile', 'welcome', 'banned', 'page-not-found', 'user-not-found', 'afuai', 'afumail', 'moments', 'mini-programs', 'games', 'leaderboard', 'social', 'transfer', 'red-envelope', 'developer-sdk', 'verification-request', 'creator-earnings', 'qr-code', 'security', 'change-password', 'whats-new', 'marketplace', 'food-delivery', 'bookings', 'rides', 'travel', 'events', 'orders', 'order', 'product', 'merchant', 'ads', 'affiliate-request', 'affiliate-dashboard', 'business', 'christmas-gifts', 'game', 'memory-game', 'puzzle-game', 'mini-program-orders', 'trending'];
    if (reservedRoutes.includes(username.toLowerCase())) {
      navigate('/page-not-found', { replace: true });
      return;
    }

    const resolveReferral = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('handle', username)
        .maybeSingle();
      
      if (data) {
        const refCode = data.id.replace(/-/g, '').substring(0, 12).toUpperCase();
        window.location.href = `/auth/signup?ref=${refCode}`;
      } else {
        navigate('/page-not-found', { replace: true });
      }
    };
    resolveReferral();
  }, [username, navigate]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Redirecting...</div>
    </div>
  );
};

const AppRoutes = () => {
  // Check daily login streak automatically
  useDailyLogin();
  // Sync language preference from database
  useLanguageSync();
  // Restore scroll positions on navigation
  useScrollRestoration();
  
  // Preload gift images in background on app start
  useEffect(() => {
    preloadAllGiftImages();
  }, []);

  return (
    <>
      <ScrollToTop />
      <LoadingBar />
      <Suspense fallback={
        <motion.div 
          className="flex items-center justify-center h-full min-h-[50vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <CustomLoader size="lg" text="Loading..." />
        </motion.div>
      }>
        <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/auth/welcome" element={<Welcome />} />
      <Route path="/banned" element={<Banned />} />
      <Route path="/complete-profile" element={<Onboarding />} />
      <Route path="/feed" element={<CombinedRouteGuard><Layout><Home /></Layout></CombinedRouteGuard>} />
      <Route path="/home" element={<CombinedRouteGuard><Layout><Home /></Layout></CombinedRouteGuard>} />
      <Route path="/auth" element={<Welcome />} />
      <Route path="/auth/signin" element={<SignIn />} />
      <Route path="/auth/signup" element={<SignUp />} />
      <Route path="/auth/afumail/callback" element={<AfuMailCallback />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/chats" element={<CombinedRouteGuard requireAuth><Layout><DesktopChats /></Layout></CombinedRouteGuard>} />
      <Route path="/chat/:chatId" element={<CombinedRouteGuard requireAuth><Layout><DesktopChats /></Layout></CombinedRouteGuard>} />
      <Route path="/search" element={<CombinedRouteGuard><Layout><SearchPage /></Layout></CombinedRouteGuard>} />
      <Route path="/shop" element={<Layout><ShopPage /></Layout>} />
      <Route path="/marketplace" element={<CombinedRouteGuard><Layout><Marketplace /></Layout></CombinedRouteGuard>} />
      <Route path="/notifications" element={<CombinedRouteGuard><Layout><Notifications /></Layout></CombinedRouteGuard>} />
      <Route path="/post/:postId" element={<CombinedRouteGuard><Layout><PostDetail /></Layout></CombinedRouteGuard>} />
      <Route path="/admin" element={<CombinedRouteGuard><Layout><AdminDashboard /></Layout></CombinedRouteGuard>} />
      <Route path="/afuai" element={<CombinedRouteGuard><AfuAI /></CombinedRouteGuard>} />
      
      <Route path="/onboarding" element={<Onboarding />} />
      
      <Route path="/support" element={<Layout><Support /></Layout>} />
      <Route path="/leaderboard" element={<Layout><UnifiedLeaderboard /></Layout>} />
      <Route path="/wallet" element={<CombinedRouteGuard><Layout><FinancialHub /></Layout></CombinedRouteGuard>} />
      <Route path="/social" element={<CombinedRouteGuard><Layout><SocialHub /></Layout></CombinedRouteGuard>} />
      <Route path="/gifts" element={<Layout><Gifts /></Layout>} />
      <Route path="/christmas-gifts" element={<Layout><ChristmasGifts /></Layout>} />
      <Route path="/gifts/:id" element={<Layout><GiftDetail /></Layout>} />
      <Route path="/premium" element={<CombinedRouteGuard><Layout><Premium /></Layout></CombinedRouteGuard>} />
      <Route path="/creator-earnings" element={<CombinedRouteGuard><Layout><CreatorEarnings /></Layout></CombinedRouteGuard>} />
      <Route path="/qr-code" element={<CombinedRouteGuard><Layout><QRCode /></Layout></CombinedRouteGuard>} />
      <Route path="/settings" element={<CombinedRouteGuard requireAuth><Layout><Settings /></Layout></CombinedRouteGuard>} />
      <Route path="/security" element={<CombinedRouteGuard><Layout><SecurityDashboard /></Layout></CombinedRouteGuard>} />
      <Route path="/change-password" element={<CombinedRouteGuard><Layout><ChangePassword /></Layout></CombinedRouteGuard>} />
      <Route path="/terms" element={<Layout><TermsOfUse /></Layout>} />
      <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />
      <Route path="/whats-new" element={<Layout><WhatsNew /></Layout>} />
      <Route path="/trending" element={<Navigate to="/search" replace />} />
      <Route path="/admin/affiliate-requests" element={<CombinedRouteGuard><Layout><AdminAffiliateRequests /></Layout></CombinedRouteGuard>} />
      <Route path="/admin/creator-withdrawals" element={<CombinedRouteGuard><Layout><AdminCreatorWithdrawals /></Layout></CombinedRouteGuard>} />
      <Route path="/admin/verification-requests" element={<CombinedRouteGuard><Layout><AdminVerificationRequests /></Layout></CombinedRouteGuard>} />
      <Route path="/affiliate-request" element={<CombinedRouteGuard><Layout><AffiliateRequest /></Layout></CombinedRouteGuard>} />
      <Route path="/affiliate-dashboard" element={<CombinedRouteGuard><Layout><AffiliateDashboard /></Layout></CombinedRouteGuard>} />
      <Route path="/business/dashboard" element={<CombinedRouteGuard><Layout><BusinessDashboard /></Layout></CombinedRouteGuard>} />
      <Route path="/ads" element={<CombinedRouteGuard><Layout><AdManager /></Layout></CombinedRouteGuard>} />
      <Route path="/afumail" element={<CombinedRouteGuard><AfuMail /></CombinedRouteGuard>} />
      <Route path="/moments" element={<CombinedRouteGuard requireAuth><Layout><Moments /></Layout></CombinedRouteGuard>} />
      <Route path="/mini-programs" element={<CombinedRouteGuard><Layout><MiniPrograms /></Layout></CombinedRouteGuard>} />
      <Route path="/transfer" element={<CombinedRouteGuard><Layout><Transfer /></Layout></CombinedRouteGuard>} />
      <Route path="/red-envelope" element={<CombinedRouteGuard><Layout><RedEnvelope /></Layout></CombinedRouteGuard>} />
      <Route path="/developer-sdk" element={<CombinedRouteGuard><Layout><DeveloperSDK /></Layout></CombinedRouteGuard>} />
      <Route path="/verification-request" element={<CombinedRouteGuard><Layout><VerificationRequest /></Layout></CombinedRouteGuard>} />
      <Route path="/games" element={<Layout><Games /></Layout>} />
      <Route path="/game" element={<Layout><SimpleGame /></Layout>} />
      <Route path="/memory-game" element={<Layout><MemoryGame /></Layout>} />
      <Route path="/puzzle-game" element={<Layout><PuzzleGame /></Layout>} />
      
      {/* New Super App Services */}
      <Route path="/food-delivery" element={<Layout><FoodDelivery /></Layout>} />
      <Route path="/food-delivery/:id" element={<Layout><RestaurantDetail /></Layout>} />
      <Route path="/bookings" element={<Layout><Bookings /></Layout>} />
      <Route path="/bookings/:id" element={<Layout><ServiceDetail /></Layout>} />
      <Route path="/rides" element={<Layout><Rides /></Layout>} />
      <Route path="/travel" element={<Layout><Travel /></Layout>} />
      <Route path="/travel/flight/:id" element={<Layout><FlightDetail /></Layout>} />
      <Route path="/travel/hotel/:id" element={<Layout><HotelDetail /></Layout>} />
      <Route path="/events" element={<Layout><Events /></Layout>} />
      <Route path="/events/:id" element={<Layout><EventDetail /></Layout>} />
      
      {/* Mini Program Orders */}
      <Route path="/mini-program-orders" element={<CombinedRouteGuard><Layout><MiniProgramOrders /></Layout></CombinedRouteGuard>} />
      <Route path="/mini-program-orders/:id" element={<CombinedRouteGuard><Layout><MiniProgramOrderDetail /></Layout></CombinedRouteGuard>} />
      
      {/* Merchant Shop Routes */}
      <Route path="/shop/:merchantId" element={<MerchantShop />} />
      <Route path="/shop/:merchantId/cart" element={<ShopCart />} />
      <Route path="/shop/:merchantId/checkout" element={<Checkout />} />
      <Route path="/product/:productId" element={<ProductDetail />} />
      <Route path="/orders" element={<MyOrders />} />
      <Route path="/orders/:orderNumber" element={<OrderDetail />} />
      <Route path="/order/:orderNumber" element={<OrderDetail />} />
      
      {/* Merchant Order Management Routes */}
      <Route path="/merchant/orders" element={<MerchantOrders />} />
      <Route path="/merchant/orders/:orderNumber" element={<MerchantOrderDetail />} />

      <Route path="/profile/:userId" element={<ProfileRedirect />} />

      {/* Catch-all: /@handle, /@handle/edit, /@handle/followers, /@handle/following, or /username for referrals */}
      <Route path="/:username/*" element={<UsernameOrReferral />} />
      <Route path="/:username" element={<UsernameOrReferral />} />

      <Route path="/user-not-found" element={<UserNotFound />} />
      <Route path="/page-not-found" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
      </Suspense>
    </>
  );
};

const AppWithDesktopCheck = () => {
  // Desktop is now fully supported - no blocking
  return <AppRoutes />;
};

const App = () => (
  <div className="select-none">
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AccountModeProvider>
              <SettingsProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <TelegramProvider>
                      <AfuAIProvider>
                        <AnimatePresence mode="wait">
                          <AppWithDesktopCheck />
                        </AnimatePresence>
                        <AfuAIModal />
                        <SettingsSheet />
                      </AfuAIProvider>
                    </TelegramProvider>
                  </BrowserRouter>
                </TooltipProvider>
              </SettingsProvider>
            </AccountModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </div>
);

export default App;
