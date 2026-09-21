import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Spinner } from '../components/common/Button';
import { useToast } from '../components/common/Toast';
import { apiErrorMessage } from '../services/api';

export default function Auth() {
  const [params] = useSearchParams();
  const mode = params.get('mode') || 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();
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
      navigate('/');
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (Array.isArray(serverErrors) && serverErrors.length) {
        for (const e of serverErrors) {
          if (typeof e?.field === 'string') setError(e.field, { message: e.message });
          else toast.error(err, e.message);
        }
        return;
      }
      const msg = apiErrorMessage(err);
      toast.error(err, msg);
    }
  };

  const switchMode = (next) => {
    reset();
    navigate(`/auth?mode=${next}`, { replace: true });
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-slate-900">
            <MapPin className="h-7 w-7 text-brand-600" /> Civic<span className="text-brand-600">Issues</span>
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">
            {mode === 'register' ? 'Create your account' : 'Log in'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'register'
              ? 'Join your community and report civic problems.'
              : 'Report, support and track civic issues.'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-6">
          {mode === 'register' && (
            <>
              <div>
                <label className="label" htmlFor="fullName">Full name</label>
                <input id="fullName" className="input" placeholder="e.g. Rohan Sharma"
                  {...field('fullName', { required: 'Full name is required' })} />
                {errors.fullName && <p className="mt-1 text-xs text-rose-600">{errors.fullName.message}</p>}
              </div>
              <div>
                <label className="label" htmlFor="phone">Phone <span className="text-slate-400">(optional)</span></label>
                <input id="phone" className="input" placeholder="+91 98765 43210"
                  {...field('phone')} />
              </div>
              <div>
                <label className="label" htmlFor="city">City</label>
                <input id="city" className="input" placeholder="Dehradun"
                  {...field('city')} />
              </div>
              <div>
                <label className="label" htmlFor="ward">Ward / Area</label>
                <input id="ward" className="input" placeholder="Raipur"
                  {...field('ward')} />
              </div>
            </>
          )}

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" placeholder="you@example.com"
              {...field('email', { required: 'Email is required' })} />
            {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" placeholder="••••••••"
              {...field('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
            {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>}
          </div>

          {mode === 'register' && (
            <div>
              <label className="label" htmlFor="confirmPassword">Confirm password</label>
              <input id="confirmPassword" type="password" className="input" placeholder="••••••••"
                {...field('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (v) => v === watch('password') || 'Passwords do not match',
                })} />
              {errors.confirmPassword && <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword.message}</p>}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Spinner label="" className="py-0" /> : mode === 'register' ? 'Create account' : 'Log in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          {mode === 'register' ? 'Already have an account?' : 'New to CivicIssues?'}{' '}
          <button
            className="font-medium text-brand-600 hover:underline"
            onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
          >
            {mode === 'register' ? 'Log in' : 'Create an account'}
          </button>
        </p>
        {toast.node}
      </div>
    </div>
  );
}