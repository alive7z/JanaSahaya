import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, LogOut, MapPin, Menu, Plus, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from '../utils/formatters';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/issues', label: 'Explore Issues' },
  { to: '/map', label: 'Map' },
];

function NavItems({ onClick = () => {} }) {
  const { isAuthenticated, hasRole } = useAuth();
  return (
    <>
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          onClick={onClick}
          className={({ isActive }) =>
            clsx(
              'rounded-lg px-3 py-2 text-sm font-medium transition',
              isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900',
            )
          }
        >
          {l.label}
        </NavLink>
      ))}
      {isAuthenticated && hasRole('OFFICER') && (
        <NavLink to="/officer" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          Officer Desk
        </NavLink>
      )}
      {isAuthenticated && hasRole('ADMIN') && (
        <NavLink to="/admin" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          Admin
        </NavLink>
      )}
    </>
  );
}

function AuthArea({ onClick = () => {} }) {
  const { isAuthenticated, user, roles, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/auth?mode=login" onClick={onClick} className="btn-secondary">
          Log in
        </Link>
        <Link to="/auth?mode=register" onClick={onClick} className="btn-primary">
          Sign up
        </Link>
      </div>
    );
  }

  const isOfficer = roles.some((r) => r.name === 'OFFICER');
  const isAdmin = roles.some((r) => r.name === 'ADMIN');

  return (
    <div className="flex items-center gap-2">
      <Link to="/notifications" aria-label="Notifications" className="btn-secondary p-2">
        <Bell className="h-4 w-4" />
      </Link>
      <Link
        to={isAdmin ? '/admin' : isOfficer ? '/officer' : '/dashboard'}
        className="btn-secondary p-2"
        aria-label="Dashboard"
      >
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">{user?.full_name?.split(' ')[0]}</span>
      </Link>
      <button
        onClick={async () => {
          await logout();
          navigate('/');
        }}
        className="btn-secondary p-2"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function RootLayout() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-slate-900">
            <MapPin className="h-6 w-6 text-brand-600" />
            Civic<span className="text-brand-600">Issues</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            <NavItems />
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <Link to="/report" className="btn-primary">
                <Plus className="h-4 w-4" /> Report issue
              </Link>
            ) : null}
            <AuthArea />
          </div>

          <button
            className="rounded-lg p-2 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-slate-200 px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              <NavItems onClick={() => setOpen(false)} />
              {isAuthenticated && (
                <Link to="/report" onClick={() => setOpen(false)} className="mt-1">
                  <span className="btn-primary w-full">Report issue</span>
                </Link>
              )}
              <div className="mt-2">
                <AuthArea onClick={() => setOpen(false)} />
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row">
          <p>
            <span className="font-semibold text-slate-700">CivicIssues</span> — a crowdsourced civic
            issue management platform.
          </p>
          <p>Report. Support. Track. Resolve.</p>
        </div>
      </footer>
    </div>
  );
}