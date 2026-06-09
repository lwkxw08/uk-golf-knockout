import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/home/HomePage';
import LoginPage from './pages/login/LoginPage';
import RegisterPage from './pages/register/RegisterPage';
import TournamentsPage from './pages/tournaments/TournamentsPage';
import TournamentDetailPage from './pages/tournament-detail/TournamentDetailPage';
import LiveDrawPage from './pages/live-draw/LiveDrawPage';
import PlayerDashboard from './pages/player-dashboard/PlayerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateTournament from './pages/admin/CreateTournament';
import SponsorManagement from './pages/admin/SponsorManagement';
import PricingManagement from './pages/admin/PricingManagement';
import ClubManagement from './pages/admin/ClubManagement';
import ClubPortal from './pages/club-portal/ClubPortal';
import ClubPublicPage from './pages/club-public/ClubPublicPage';
import MarketplacePage from './pages/marketplace/MarketplacePage';
import LeaderboardPage from './pages/leaderboard/LeaderboardPage';
import MembershipPage from './pages/membership/MembershipPage';
import ClubSubscriptionPage from './pages/subscriptions/ClubSubscriptionPage';
import ScorecardPage from './pages/scorecard/ScorecardPage';
import LeagueTablePage from './pages/league-table/LeagueTablePage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
          <Route path="/draws/:tournamentId/live" element={<LiveDrawPage />} />
          <Route path="/rankings" element={<LeaderboardPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/clubs/:slug" element={<ClubPublicPage />} />
          <Route path="/clubs/:slug/scorecard" element={<ScorecardPage />} />
          <Route path="/league/:tournamentId" element={<LeagueTablePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/subscriptions" element={<ClubSubscriptionPage />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <PlayerDashboard />
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
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
