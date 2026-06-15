import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import CookieConsent from './components/CookieConsent';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/home/HomePage';
import LoginPage from './pages/login/LoginPage';
import RegisterPage from './pages/register/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ProfilePage from './pages/profile/ProfilePage';
import TournamentsPage from './pages/tournaments/TournamentsPage';
import TournamentDetailPage from './pages/tournament-detail/TournamentDetailPage';
import LiveDrawPage from './pages/live-draw/LiveDrawPage';
import PlayerDashboard from './pages/player-dashboard/PlayerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateTournament from './pages/admin/CreateTournament';
import SponsorManagement from './pages/admin/SponsorManagement';
import PricingManagement from './pages/admin/PricingManagement';
import ClubManagement from './pages/admin/ClubManagement';
import SettingsPage from './pages/admin/SettingsPage';
import UserManagement from './pages/admin/UserManagement';
import EditTournament from './pages/admin/EditTournament';
import ClubPortal from './pages/club-portal/ClubPortal';
import ClubPublicPage from './pages/club-public/ClubPublicPage';
import MarketplacePage from './pages/marketplace/MarketplacePage';
import LeaderboardPage from './pages/leaderboard/LeaderboardPage';
import MembershipPage from './pages/membership/MembershipPage';
import ClubSubscriptionPage from './pages/subscriptions/ClubSubscriptionPage';
import ScorecardPage from './pages/scorecard/ScorecardPage';
import LeagueTablePage from './pages/league-table/LeagueTablePage';
import LiveMatchPage from './pages/live-match/LiveMatchPage';
import PlayerStatsPage from './pages/player-stats/PlayerStatsPage';
import HeadToHeadPage from './pages/head-to-head/HeadToHeadPage';
import SocialFeedPage from './pages/feed/SocialFeedPage';
import MatchChatPage from './pages/match-chat/MatchChatPage';
import QRCheckInPage from './pages/checkin/QRCheckInPage';
import ReferralPage from './pages/referral/ReferralPage';
import CourseGalleryPage from './pages/gallery/CourseGalleryPage';
import TournamentProgrammePage from './pages/programme/TournamentProgrammePage';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import NotFoundPage from './pages/errors/NotFoundPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <PlayerDashboard />;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 dark:text-gray-100 transition-colors">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
            <Route path="/draws/:tournamentId/live" element={<LiveDrawPage />} />
            <Route path="/rankings" element={<LeaderboardPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/clubs/:slug" element={<ClubPublicPage />} />
            <Route path="/clubs/:slug/scorecard" element={<ScorecardPage />} />
            <Route path="/league/:tournamentId" element={<LeagueTablePage />} />
            <Route path="/match/:matchId/live" element={<LiveMatchPage />} />
            <Route path="/players/:playerId/stats" element={<PlayerStatsPage />} />
            <Route path="/players/:playerId/head-to-head/:opponentId" element={<HeadToHeadPage />} />
            <Route path="/my-stats" element={
              <ProtectedRoute>
                <PlayerStatsPage />
              </ProtectedRoute>
            } />
            <Route path="/feed" element={<SocialFeedPage />} />
            <Route path="/match/:matchId/chat" element={
              <ProtectedRoute>
                <MatchChatPage />
              </ProtectedRoute>
            } />
            <Route path="/match/:matchId/checkin" element={
              <ProtectedRoute>
                <QRCheckInPage />
              </ProtectedRoute>
            } />
            <Route path="/referral" element={
              <ProtectedRoute>
                <ReferralPage />
              </ProtectedRoute>
            } />
            <Route path="/clubs/:clubId/gallery" element={<CourseGalleryPage />} />
            <Route path="/tournaments/:tournamentId/programme" element={<TournamentProgrammePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/membership" element={<MembershipPage />} />
            <Route path="/subscriptions" element={<ClubSubscriptionPage />} />

            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            } />

            <Route path="/club-portal" element={
              <ProtectedRoute roles={['ADMIN', 'CLUB_MANAGER']}>
                <ClubPortal />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/tournaments/new" element={
              <ProtectedRoute roles={['ADMIN']}>
                <CreateTournament />
              </ProtectedRoute>
            } />
            <Route path="/admin/sponsors" element={
              <ProtectedRoute roles={['ADMIN']}>
                <SponsorManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/pricing" element={
              <ProtectedRoute roles={['ADMIN']}>
                <PricingManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/clubs" element={
              <ProtectedRoute roles={['ADMIN']}>
                <ClubManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute roles={['ADMIN']}>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute roles={['ADMIN']}>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/tournaments/:id/edit" element={
              <ProtectedRoute roles={['ADMIN']}>
                <EditTournament />
              </ProtectedRoute>
            } />
            <Route path="/admin/audit-log" element={
              <ProtectedRoute roles={['ADMIN']}>
                <AuditLogPage />
              </ProtectedRoute>
            } />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <Footer />
      <CookieConsent />
      <PWAInstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
