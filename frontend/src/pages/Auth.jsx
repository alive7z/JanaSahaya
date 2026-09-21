import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight, MapPin, ShieldCheck } from 'lucide-react';
import Illustration from '../components/common/Illustration';
import { useAuth } from '../context/AuthContext';
import { Button, Spinner } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { apiErrorMessage } from '../services/api';
import { DEMO_ACCOUNTS } from '../constants';

export default function Auth() {
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'register' ? 'register' : 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { register: field, handleSubmit, formState: { errors, isSubmitting }, watch, reset, setError } = useForm();

  const onSubmit = async (values) => {
    try {
      if (mode === 'register') {
        await register(values);
        toast.success('Account created — welcome!');
      } else {
        await login({ email: values.email, password: values.password });
        toast.success('Welcome back!');
      }
      navigate('/location', { state: { from: location.state?.from } });
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length) {
        for (const e of serverErrors) {
          if (typeof e?.field === 'string') setError(e.field, { message: e.message });
          else toast.error(err, e.message);
        }
        return;
      }
      toast.error(err, apiErrorMessage(err));
    }
  };

  const switchMode = (next) => {
    reset();
    navigate(`/auth?mode=${next}`, { replace: true });
  };

  const demoLogin = async (email, password) => {
    try {
      await login({ email, password });
      toast.success('Signed in to the demo account');
      navigate('/location');
    } catch (err) {
      toast.error(err, 'Could not sign in to the demo account');
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] overflow-hidden bg-gradient-to-br from-white via-brand-50/60 to-white">
      <div className="absolute -right-20 top-8 h-72 w-72 rounded-full bg-brand-100/50 blur-3xl" />
      <div className="page-shell grid min-h-[calc(100vh-4.5rem)] items-center gap-10 py-10 lg:grid-cols-2 lg:py-14">
        <div className="order-1 mx-auto w-full max-w-lg lg:order-2">
          <div className="mb-7">
            <Link to="/" className="inline-flex items-center gap-2 font-extrabold text-slate-900">
              <img src="/janasahaya-mark.svg" alt="" width="36" height="36" className="h-9 w-9" />
              <span>Jana<span className="text-brand-600">Sahaya</span></span>
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {mode === 'register' ? 'Create your JanaSahaya account' : 'Log in to JanaSahaya'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {mode === 'register' ? 'Join neighbours helping build a cleaner, safer and more responsive city.' : 'Continue reporting, supporting and tracking issues in your community.'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6 sm:p-7">
            {mode === 'register' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" error={errors.fullName?.message}><input id="fullName" className="input" placeholder="Rohan Sharma" {...field('fullName', { required: 'Full name is required' })} /></Field>
                <Field label="Phone (optional)"><input id="phone" className="input" placeholder="+91 98765 43210" {...field('phone')} /></Field>
                <Field label="City"><input id="city" className="input" placeholder="Dehradun" {...field('city')} /></Field>
                <Field label="Ward / Area"><input id="ward" className="input" placeholder="Raipur" {...field('ward')} /></Field>
              </div>
            )}
            <Field label="Email" error={errors.email?.message}>
              <input id="email" type="email" className="input" placeholder="you@example.com" {...field('email', { required: 'Email is required' })} />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <input id="password" type="password" className="input" placeholder="••••••••" {...field('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
            </Field>
            {mode === 'register' && (
              <Field label="Confirm password" error={errors.confirmPassword?.message}>
                <input id="confirmPassword" type="password" className="input" placeholder="••••••••" {...field('confirmPassword', { required: 'Please confirm your password', validate: (v) => v === watch('password') || 'Passwords do not match' })} />
              </Field>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Spinner label="" className="py-0" /> : <>{mode === 'register' ? 'Create account' : 'Log in'} <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <p className="text-center text-sm text-slate-600">
              {mode === 'register' ? 'Already have an account?' : 'New to JanaSahaya?'}{' '}
              <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}>
                {mode === 'register' ? 'Log in' : 'Create an account'}
              </button>
            </p>
          </form>

          {mode === 'login' && DEMO_ACCOUNTS.enabled && (
            <section className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/70 p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"> Demo access</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Explore pre-seeded civic data without creating an account.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button variant="secondary" disabled={isSubmitting} onClick={() => demoLogin(DEMO_ACCOUNTS.citizenEmail, DEMO_ACCOUNTS.password)}><MapPin className="h-4 w-4" /> Explore as Citizen</Button>
                <Button variant="secondary" disabled={isSubmitting} onClick={() => demoLogin(DEMO_ACCOUNTS.adminEmail, DEMO_ACCOUNTS.password)}><ShieldCheck className="h-4 w-4" /> Explore as Admin</Button>
              </div>
              <p className="mt-3 text-[11px] text-slate-500">Citizen: {DEMO_ACCOUNTS.citizenEmail} · Admin: {DEMO_ACCOUNTS.adminEmail}</p>
            </section>
          )}
        </div>

        <div className="order-2 hidden lg:order-1 lg:block">
          <div className="relative mx-auto max-w-xl">
            <div className="absolute inset-12 rounded-full bg-brand-100/70 blur-3xl" />
            <Illustration name={mode === 'register' ? 'signup' : 'login'} alt={mode === 'register' ? 'Citizen joining the JanaSahaya community' : 'Citizen accessing digital civic services'} eager className="illustration-float relative w-full" />
          </div>
          <div className="mx-auto -mt-5 max-w-md rounded-2xl bg-white/80 p-5 text-center shadow-soft backdrop-blur">
            <p className="font-bold text-slate-900">Civic action, made approachable.</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">One trusted place to report local problems and see what happens next.</p>
          </div>
        </div>
      </div>
      {toast.node}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="label" htmlFor={children.props.id}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}
