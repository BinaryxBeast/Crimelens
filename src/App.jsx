import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import NetworkPage from './pages/NetworkPage';
import PredictivePage from './pages/PredictivePage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';


function ProtectedLayout() {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)', flexDirection: 'column', gap: 20,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="material-icons" style={{ fontSize: 28, color: '#080808' }}>shield</span>
        </div>
        <div className="spinner" />
        <span style={{ color: 'var(--text-muted)', fontSize: 12, letterSpacing: 0.5 }}>Initializing CrimeLens…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <TopBar currentPath={location.pathname} />
        <Routes>
          <Route path="/"           element={<DashboardPage />} />
          <Route path="/map"        element={<MapPage />} />
          <Route path="/network"    element={<NetworkPage />} />
          <Route path="/predictive" element={<PredictivePage />} />
          <Route path="/reports"    element={<ReportsPage />} />
          <Route path="/profile"    element={<ProfilePage />} />

          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function AppInit() {
  const { init } = useAuthStore();
  useEffect(() => { init(); }, [init]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*"     element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
