import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Plus, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx } from '../utils/formatters';
import { demoAvatar } from '../constants';

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
      {isAuthenticated && (
        <NavLink to="/dashboard" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
          Dashboard
        </NavLink>
      )}
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
  const { isAuthenticated, user, logout } = useAuth();
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

  return (
    <div className="flex items-center gap-2">
      <Link to="/notifications" aria-label="Notifications" className="btn-secondary p-2">
        <Bell className="h-4 w-4" />
      </Link>
      <Link
        to="/profile"
        className="btn-secondary p-2"
        aria-label="Profile"
      >
        {demoAvatar(user?.email) ? (
          <img src={demoAvatar(user?.email)} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
        ) : (
          <User className="h-4 w-4" />
        )}
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
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="page-shell flex h-[4.5rem] items-center justify-between">
          <Link to="/" className="group flex items-center gap-2.5 font-extrabold tracking-tight text-slate-900">
            <img src="/janasahaya-mark.svg" alt="" width="40" height="40" className="h-10 w-10 shadow-lg shadow-brand-600/20 transition group-hover:-rotate-3" />
            <span className="text-lg text-brand-600">JanaSahaya</span>
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

      <footer className="border-t border-slate-200/80 bg-white">
        <div className="page-shell flex flex-col justify-between gap-6 py-9 sm:flex-row sm:items-center">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 font-bold text-slate-900">
              <img src="/janasahaya-mark.svg" alt="" width="28" height="28" className="h-7 w-7" /> JanaSahaya
            </Link>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              A citizen-first bridge between communities and civic administration.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-slate-500">
            <Link to="/issues" className="hover:text-brand-600">Explore issues</Link>
            <Link to="/map" className="hover:text-brand-600">City map</Link>
            <Link to="/report" className="hover:text-brand-600">Report an issue</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
