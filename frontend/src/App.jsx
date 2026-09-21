import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import RootLayout from './layouts/RootLayout';
import { Spinner } from './components/common/Button';
import Home from './pages/Home';
import Issues from './pages/Issues';
import IssueDetails from './pages/IssueDetails';
import ReportIssue from './pages/ReportIssue';
import Map from './pages/Map';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import NotFound from './pages/NotFound';

function AuthGuard({ children }) {
  const { isAuthenticated, booting } = useAuth();
  const location = useLocation();
  if (booting) return <Spinner label="Loading session…" />;
  if (!isAuthenticated) return <Navigate to="/auth?mode=login" state={{ from: location }} replace />;
  return children;
}

function RoleGuard({ roles, children }) {
  const { hasRole, booting } = useAuth();
  if (booting) return <Spinner label="Loading session…" />;
  if (!hasRole(...roles)) return <Navigate to="/" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { isAuthenticated, booting } = useAuth();
  if (booting) return <Spinner label="Loading session…" />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route element={<RootLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/issues" element={<Issues />} />
              <Route path="/issue/:id" element={<IssueDetails />} />
              <Route path="/map" element={<Map />} />
              <Route path="/auth" element={<GuestOnly><Auth /></GuestOnly>} />
              <Route path="/report" element={<AuthGuard><ReportIssue /></AuthGuard>} />
              <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
              <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
              <Route path="/officer" element={<RoleGuard roles={['OFFICER', 'ADMIN']}><OfficerDashboard /></RoleGuard>} />
              <Route path="/admin" element={<RoleGuard roles={['ADMIN']}><AdminDashboard /></RoleGuard>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}