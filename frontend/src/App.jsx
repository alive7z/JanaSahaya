import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import RootLayout from './layouts/RootLayout';
import { EmptyState, Spinner } from './components/common/Button';
const Home = lazy(() => import('./pages/Home'));
const Issues = lazy(() => import('./pages/Issues'));
const IssueDetails = lazy(() => import('./pages/IssueDetails'));
const ReportIssue = lazy(() => import('./pages/ReportIssue'));
const Map = lazy(() => import('./pages/Map'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const OfficerDashboard = lazy(() => import('./pages/OfficerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Notifications = lazy(() => import('./pages/Notifications'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Location = lazy(() => import('./pages/Location'));
const Profile = lazy(() => import('./pages/Profile'));
const ReportSuccess = lazy(() => import('./pages/ReportSuccess'));

function AuthGuard({ children }) {
  const { isAuthenticated, booting } = useAuth();
  const location = useLocation();
  if (booting) return <Spinner label="Loading session…" />;
  if (!isAuthenticated) return <Navigate to="/auth?mode=login" state={{ from: location }} replace />;
  return children;
}

function RoleGuard({ roles, children }) {
  const { hasRole, isAuthenticated, booting } = useAuth();
  const location = useLocation();
  if (booting) return <Spinner label="Loading session…" />;
  if (!isAuthenticated) return <Navigate to="/auth?mode=login" state={{ from: location }} replace />;
  if (!hasRole(...roles)) return <div className="page-shell py-16"><EmptyState type="permission" title="You don’t have access to this workspace" body="This page is limited to an authorized JanaSahaya role." action={<Link className="btn-primary" to="/dashboard">Go to your dashboard</Link>} /></div>;
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
          <Suspense fallback={<Spinner label="Loading page…" />}>
            <Routes>
              <Route element={<RootLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/issues" element={<Issues />} />
                <Route path="/issue/:id" element={<IssueDetails />} />
                <Route path="/map" element={<Map />} />
                <Route path="/auth" element={<GuestOnly><Auth /></GuestOnly>} />
                <Route path="/report" element={<AuthGuard><ReportIssue /></AuthGuard>} />
                <Route path="/report-success" element={<AuthGuard><ReportSuccess /></AuthGuard>} />
                <Route path="/location" element={<AuthGuard><Location /></AuthGuard>} />
                <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
                <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
                <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
                <Route path="/officer" element={<RoleGuard roles={['OFFICER', 'ADMIN']}><OfficerDashboard /></RoleGuard>} />
                <Route path="/admin" element={<RoleGuard roles={['ADMIN']}><AdminDashboard /></RoleGuard>} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
