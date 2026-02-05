import { Suspense, lazy, useEffect } from "react";
import '@/types/telegram.d.ts';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AccountModeProvider } from "./contexts/AccountModeContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { TelegramProvider } from "./contexts/TelegramContext";
import { SettingsSheet } from "./components/SettingsSheet";
import { RequireCountry } from "./components/RequireCountry";
import { RequireDateOfBirth } from "./components/RequireDateOfBirth";
import { RequireBanCheck } from "./components/RequireBanCheck";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DesktopBlocker } from "./components/DesktopBlocker";
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


import AfuMailCallback from "./pages/auth/AfuMailCallback";
import UserNotFound from "./pages/UserNotFound";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import Banned from "./pages/Banned";


// Lazy load other pages
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const DesktopChats = lazy(() => import("./pages/DesktopChats"));
const Shorts = lazy(() => import("./pages/Shorts"));
const SearchPage = lazy(() => import("./pages/Search"));
const ShopPage = lazy(() => import("./pages/Shop"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Profile = lazy(() => import("./pages/Profile"));
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
const TrendingHashtags = lazy(() => import("./pages/TrendingHashtags"));
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
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));

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
  return <Navigate to={`/${userId}`} replace />;
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
      <LoadingBar />
      <Suspense fallback={
        <motion.div 
          className="flex items-center justify-center min-h-screen"
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
      <Route path="/banned" element={<Banned />} />
      <Route path="/complete-profile" element={<Onboarding />} />
      <Route path="/feed" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><Home /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/home" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><Home /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/auth" element={<Welcome />} />
      <Route path="/auth/signin" element={<Navigate to="/onboarding?signin=true" replace />} />
      <Route path="/auth/signup" element={<Navigate to="/onboarding" replace />} />
      <Route path="/auth/afumail/callback" element={<AfuMailCallback />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/chats" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><DesktopChats /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/chat/:chatId" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><DesktopChats /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/search" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><SearchPage /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/shorts" element={<Layout><Shorts /></Layout>} />
      <Route path="/shop" element={<Layout><ShopPage /></Layout>} />
      <Route path="/marketplace" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><Marketplace /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/notifications" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><Notifications /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/post/:postId" element={<Layout><PostDetail /></Layout>} />
      <Route path="/admin" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><AdminDashboard /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/afuai" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><AfuAI /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      
      <Route path="/onboarding" element={<Onboarding />} />
      
      <Route path="/support" element={<Support />} />
      <Route path="/leaderboard" element={<Layout><UnifiedLeaderboard /></Layout>} />
      <Route path="/wallet" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><FinancialHub /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/social" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><SocialHub /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/gifts" element={<Layout><Gifts /></Layout>} />
      <Route path="/christmas-gifts" element={<Layout><ChristmasGifts /></Layout>} />
      <Route path="/gifts/:id" element={<Layout><GiftDetail /></Layout>} />
      <Route path="/premium" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><Premium /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/creator-earnings" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><CreatorEarnings /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/qr-code" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><QRCode /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/settings" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><Settings /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/security" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><SecurityDashboard /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/change-password" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><ChangePassword /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/terms" element={<TermsOfUse />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/whats-new" element={<WhatsNew />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogArticle />} />
      <Route path="/admin/blog" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><AdminBlog /></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/trending" element={<Layout><TrendingHashtags /></Layout>} />
      <Route path="/admin/affiliate-requests" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><AdminAffiliateRequests /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/admin/creator-withdrawals" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><AdminCreatorWithdrawals /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/admin/verification-requests" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><AdminVerificationRequests /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/affiliate-request" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><AffiliateRequest /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/affiliate-dashboard" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><AffiliateDashboard /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/business/dashboard" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><BusinessDashboard /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/ads" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><AdManager /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/afumail" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><AfuMail /></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/moments" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><Moments /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/mini-programs" element={<Layout><MiniPrograms /></Layout>} />
      <Route path="/transfer" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><Transfer /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/red-envelope" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><RedEnvelope /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/developer-sdk" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><DeveloperSDK /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/verification-request" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><VerificationRequest /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
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
      <Route path="/mini-program-orders" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><MiniProgramOrders /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/mini-program-orders/:id" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><MiniProgramOrderDetail /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      
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

      {/* Profile routes with @ prefix - these will show user not found if user doesn't exist */}
      <Route path="/@:userId" element={<Layout><Profile mustExist={true} /></Layout>} />
      <Route path="/@:userId/edit" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><EditProfile /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/@:userId/followers" element={<Layout><Followers /></Layout>} />
      <Route path="/@:userId/following" element={<Layout><Following /></Layout>} />

      {/* Profile routes without @ prefix - will fall through to 404 if not found */}
      <Route path="/:userId" element={<Layout><Profile mustExist={false} /></Layout>} />
      <Route path="/:userId/edit" element={<RequireBanCheck><RequireCountry><RequireDateOfBirth><Layout><EditProfile /></Layout></RequireDateOfBirth></RequireCountry></RequireBanCheck>} />
      <Route path="/:userId/followers" element={<Layout><Followers /></Layout>} />
      <Route path="/:userId/following" element={<Layout><Following /></Layout>} />

      <Route path="/user-not-found" element={<UserNotFound />} />
      <Route path="/page-not-found" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
      </Suspense>
    </>
  );
};

const AppWithDesktopCheck = () => {
  const isMobile = useIsMobile();

  // Lovable preview is often rendered in a desktop-sized iframe;
  // allow it so you can see the bottom navigation in Preview.
  const isLovablePreview =
    typeof window !== 'undefined' && /lovable(app|project)\.com$/i.test(window.location.hostname);

  // Check if running in Telegram Mini App
  const isTelegramMiniApp =
    typeof window !== 'undefined' && 
    window.Telegram && 
    window.Telegram.WebApp && 
    window.Telegram.WebApp.initData;

  // Block desktop users (except Lovable preview and Telegram Mini App)
  if (!isMobile && !isLovablePreview && !isTelegramMiniApp) {
    return <DesktopBlocker />;
  }

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
                      <AnimatePresence mode="wait">
                        <AppWithDesktopCheck />
                      </AnimatePresence>
                      <SettingsSheet />
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
