import { clsx } from '../../utils/formatters';

export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: '',
    lg: 'px-6 py-3 text-base',
  };
  return <button className={clsx(variants[variant], sizes[size], className)} {...props} />;
}

export function Spinner({ label = 'Loading…', className }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-2 py-12 text-slate-500', className)}>
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', body, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <span className="text-3xl">📭</span>
      <p className="font-medium text-slate-700">{title}</p>
      {body && <p className="max-w-sm text-sm text-slate-500">{body}</p>}
      {action}
    </div>
  );
}

export function Avatar({ name, size = 'md' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };
  const palette = ['bg-brand-100 text-brand-800', 'bg-emerald-100 text-emerald-800', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-800', 'bg-violet-100 text-violet-800'];
  const color = palette[(name?.length || 0) % palette.length];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${color}`}
    >
      {initials || '?'}
    </span>
  );
}