import { Suspense, lazy, useEffect } from "react";
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
import { CustomLoader } from '@/components/ui/CustomLoader';
import { LoadingBar } from '@/components/LoadingBar';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollToTop } from './components/ScrollToTop';
import Layout from "./components/Layout";

import { APP_CONFIG } from '@/config/app';
import Maintenance from '@/pages/Maintenance';

import { useDailyLogin } from "./hooks/useDailyLogin";
import { useLanguageSync } from "./hooks/useLanguageSync";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { preloadAllGiftImages } from "./hooks/useGiftImageCache";

// Eager load critical pages
import Home from "./pages/Home";
import Welcome from "./pages/auth/Welcome";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import NotFound from "./pages/NotFound";
import Banned from "./pages/Banned";
import Profile from "./pages/Profile";

// Lazy load everything else
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const SearchPage = lazy(() => import("./pages/Search"));
const ShopPage = lazy(() => import("./pages/Shop"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AfuAI = lazy(() => import("./pages/AfuAI"));
const Support = lazy(() => import("./pages/Support"));
const QRCode = lazy(() => import("./pages/QRCode"));
const Settings = lazy(() => import("./pages/Settings"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const AffiliateDashboard = lazy(() => import("./pages/AffiliateDashboard"));
const Moments = lazy(() => import("./pages/Moments"));
const MiniPrograms = lazy(() => import("./pages/MiniPrograms"));
const Transfer = lazy(() => import("./pages/Transfer"));
const VerificationRequest = lazy(() => import("./pages/VerificationRequest"));
const Followers = lazy(() => import("./pages/Followers"));
const Following = lazy(() => import("./pages/Following"));
const FinancialHub = lazy(() => import("./pages/FinancialHub"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const Gifts = lazy(() => import("./pages/Gifts"));
const GiftDetail = lazy(() => import("./pages/GiftDetail"));
const Premium = lazy(() => import("./pages/Premium"));
const CreatorEarnings = lazy(() => import("./pages/CreatorEarnings"));
const Events = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const MusicShorts = lazy(() => import("./pages/MusicShorts"));
const DesktopChats = lazy(() => import("./pages/Chats"));
const ShopCart = lazy(() => import("./pages/ShopCart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const MerchantShop = lazy(() => import("./pages/MerchantShop"));
const PostDetail2 = PostDetail;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

const ProfileRedirect = () => {
  const { userId } = useParams();
  return <Navigate to={`/@${userId}`} replace />;
};

const UsernameOrReferral = () => {
  const { username } = useParams();
  const location = useLocation();

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
  return <ReferralHandler username={username} />;
};

const ReferralHandler = ({ username }: { username?: string }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!username) { navigate('/page-not-found', { replace: true }); return; }

    const reservedRoutes = [
      'auth', 'home', 'feed', 'search', 'shop', 'chats', 'chat',
      'notifications', 'admin', 'settings', 'support', 'terms', 'privacy',
      'wallet', 'gifts', 'premium', 'profile', 'complete-profile', 'welcome',
      'banned', 'page-not-found', 'afuai', 'moments', 'mini-programs',
      'leaderboard', 'transfer', 'verification-request', 'creator-earnings',
      'qr-code', 'security', 'marketplace', 'events', 'orders', 'order',
      'product', 'merchant', 'affiliate-dashboard', 'shorts', 'trending',
    ];
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

const Loader = () => (
  <motion.div
    className="flex items-center justify-center h-full min-h-[50vh]"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <CustomLoader size="lg" text="Loading..." />
  </motion.div>
);

const AppRoutes = () => {
  useDailyLogin();
  useLanguageSync();
  useScrollRestoration();

  useEffect(() => {
    preloadAllGiftImages();
  }, []);

  return (
    <>
      <ScrollToTop />
      <LoadingBar />
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* ── Root ── */}
          <Route path="/" element={<CombinedRouteGuard><Layout><Home /></Layout></CombinedRouteGuard>} />
          <Route path="/home" element={<CombinedRouteGuard><Layout><Home /></Layout></CombinedRouteGuard>} />
          <Route path="/feed" element={<CombinedRouteGuard><Layout><Home /></Layout></CombinedRouteGuard>} />

          {/* ── Auth ── */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/auth/welcome" element={<Welcome />} />
          <Route path="/auth" element={<Welcome />} />
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/auth/signup" element={<SignUp />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/afumail/callback" element={<Navigate to="/" replace />} />
          <Route path="/banned" element={<Banned />} />
          <Route path="/complete-profile" element={<CombinedRouteGuard requireAuth><Layout><Settings /></Layout></CombinedRouteGuard>} />
          <Route path="/onboarding" element={<Navigate to="/search" replace />} />

          {/* ── Core Social ── */}
          <Route path="/search" element={<CombinedRouteGuard><Layout><SearchPage /></Layout></CombinedRouteGuard>} />
          <Route path="/notifications" element={<CombinedRouteGuard><Layout><Notifications /></Layout></CombinedRouteGuard>} />
          <Route path="/post/:postId" element={<CombinedRouteGuard><Layout><PostDetail /></Layout></CombinedRouteGuard>} />
          <Route path="/moments" element={<CombinedRouteGuard requireAuth><Layout><Moments /></Layout></CombinedRouteGuard>} />
          <Route path="/shorts" element={<Layout><MusicShorts /></Layout>} />

          {/* ── Chats ── */}
          <Route path="/chats" element={<CombinedRouteGuard requireAuth><Layout><DesktopChats /></Layout></CombinedRouteGuard>} />
          <Route path="/chat/:chatId" element={<CombinedRouteGuard requireAuth><Layout><DesktopChats /></Layout></CombinedRouteGuard>} />

          {/* ── Gifts ── */}
          <Route path="/gifts" element={<Layout><Gifts /></Layout>} />
          <Route path="/gifts/:id" element={<Layout><GiftDetail /></Layout>} />

          {/* ── Finance ── */}
          <Route path="/wallet" element={<CombinedRouteGuard><Layout><FinancialHub /></Layout></CombinedRouteGuard>} />
          <Route path="/transfer" element={<CombinedRouteGuard><Layout><Transfer /></Layout></CombinedRouteGuard>} />

          {/* ── Shopping ── */}
          <Route path="/shop" element={<Layout><ShopPage /></Layout>} />
          <Route path="/marketplace" element={<CombinedRouteGuard><Layout><Marketplace /></Layout></CombinedRouteGuard>} />
          <Route path="/shop/:merchantId" element={<MerchantShop />} />
          <Route path="/shop/:merchantId/cart" element={<ShopCart />} />
          <Route path="/shop/:merchantId/checkout" element={<Checkout />} />
          <Route path="/product/:productId" element={<ProductDetail />} />
          <Route path="/orders" element={<MyOrders />} />
          <Route path="/orders/:orderNumber" element={<OrderDetail />} />
          <Route path="/order/:orderNumber" element={<OrderDetail />} />

          {/* ── Mini Programs ── */}
          <Route path="/mini-programs" element={<Layout><MiniPrograms /></Layout>} />

          {/* ── Events ── */}
          <Route path="/events" element={<Layout><Events /></Layout>} />
          <Route path="/events/:id" element={<Layout><EventDetail /></Layout>} />

          {/* ── Creator / Affiliate ── */}
          <Route path="/creator-earnings" element={<CombinedRouteGuard><Layout><CreatorEarnings /></Layout></CombinedRouteGuard>} />
          <Route path="/affiliate-dashboard" element={<CombinedRouteGuard><Layout><AffiliateDashboard /></Layout></CombinedRouteGuard>} />
          <Route path="/premium" element={<CombinedRouteGuard><Layout><Premium /></Layout></CombinedRouteGuard>} />

          {/* ── AI ── */}
          <Route path="/afuai" element={<CombinedRouteGuard><AfuAI /></CombinedRouteGuard>} />

          {/* ── Admin ── */}
          <Route path="/admin" element={<CombinedRouteGuard><Layout><AdminDashboard /></Layout></CombinedRouteGuard>} />

          {/* ── Settings / Profile ── */}
          <Route path="/settings" element={<CombinedRouteGuard requireAuth><Layout><Settings /></Layout></CombinedRouteGuard>} />
          <Route path="/security" element={<CombinedRouteGuard><Layout><SecurityDashboard /></Layout></CombinedRouteGuard>} />
          <Route path="/qr-code" element={<CombinedRouteGuard><Layout><QRCode /></Layout></CombinedRouteGuard>} />
          <Route path="/verification-request" element={<CombinedRouteGuard><Layout><VerificationRequest /></Layout></CombinedRouteGuard>} />

          {/* ── Legal / Support ── */}
          <Route path="/support" element={<Layout><Support /></Layout>} />
          <Route path="/terms" element={<Layout><TermsOfUse /></Layout>} />
          <Route path="/privacy" element={<Layout><PrivacyPolicy /></Layout>} />

          {/* ── Redirects for removed pages ── */}
          <Route path="/christmas-gifts" element={<Navigate to="/gifts" replace />} />
          <Route path="/games" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/game" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/memory-game" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/puzzle-game" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/social" element={<Navigate to="/" replace />} />
          <Route path="/whats-new" element={<Navigate to="/" replace />} />
          <Route path="/developer-sdk" element={<Navigate to="/settings" replace />} />
          <Route path="/ads" element={<Navigate to="/admin" replace />} />
          <Route path="/red-envelope" element={<Navigate to="/wallet" replace />} />
          <Route path="/business/dashboard" element={<Navigate to="/settings" replace />} />
          <Route path="/affiliate-request" element={<Navigate to="/affiliate-dashboard" replace />} />
          <Route path="/change-password" element={<Navigate to="/security" replace />} />
          <Route path="/food-delivery" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/food-delivery/:id" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/bookings" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/bookings/:id" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/rides" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/travel" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/travel/*" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/afumail" element={<Navigate to="/" replace />} />
          <Route path="/leaderboard" element={<Navigate to="/search" replace />} />
          <Route path="/trending" element={<Navigate to="/search" replace />} />
          <Route path="/admin/affiliate-requests" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/creator-withdrawals" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/verification-requests" element={<Navigate to="/admin" replace />} />
          <Route path="/merchant/orders" element={<Navigate to="/orders" replace />} />
          <Route path="/merchant/orders/:id" element={<Navigate to="/orders" replace />} />
          <Route path="/mini-program-orders" element={<Navigate to="/mini-programs" replace />} />
          <Route path="/mini-program-orders/:id" element={<Navigate to="/mini-programs" replace />} />

          {/* ── Profile catch-all ── */}
          <Route path="/profile/:userId" element={<ProfileRedirect />} />
          <Route path="/:username/*" element={<UsernameOrReferral />} />
          <Route path="/:username" element={<UsernameOrReferral />} />

          {/* ── Not Found ── */}
          <Route path="/user-not-found" element={<NotFound />} />
          <Route path="/page-not-found" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
};

const AppWithMaintenance = () => {
  if (APP_CONFIG.MAINTENANCE_MODE) return <Maintenance />;
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
                          <AppWithMaintenance />
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
