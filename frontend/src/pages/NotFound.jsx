import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Illustration from '../components/common/Illustration';

export default function NotFound() {
  return (
    <div className="page-shell grid min-h-[75vh] items-center gap-8 py-12 lg:grid-cols-2">
      <div className="order-2 text-center lg:order-1 lg:text-left">
        <span className="section-kicker">404 · Location unknown</span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">Looks like you&apos;re off the map.</h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 lg:mx-0">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link to="/" className="btn-primary mt-7"><ArrowLeft className="h-4 w-4" /> Return to Dashboard</Link>
      </div>
      <Illustration name="not-found" alt="Person looking at a map with a misplaced location pin" eager className="order-1 mx-auto w-full max-w-xl lg:order-2" />
    </div>
  );
}
