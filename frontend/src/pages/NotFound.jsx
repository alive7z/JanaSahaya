import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        The page you are looking for doesn’t exist or may have moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-primary">Go home</Link>
        <Link to="/issues" className="btn-secondary">Browse issues</Link>
      </div>
    </div>
  );
}