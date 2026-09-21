import Illustration from './Illustration';
import { clsx } from '../../utils/formatters';

const stateIllustrations = {
  empty: 'reports-empty',
  network: 'network-error',
  location: 'location-error',
  results: 'no-results',
  map: 'map-empty',
  permission: 'location-error',
  success: 'report-success',
};

export default function VisualState({
  type = 'empty',
  illustration,
  title,
  body,
  action,
  compact = false,
  className,
}) {
  const image = illustration || stateIllustrations[type] || 'reports-empty';
  return (
    <div
      className={clsx(
        'visual-state flex flex-col items-center justify-center rounded-3xl border border-brand-100 bg-white text-center shadow-soft',
        compact ? 'gap-2 p-6' : 'gap-3 p-8 sm:p-10',
        className,
      )}
    >
      <Illustration
        name={image}
        alt=""
        decorative
        className={compact ? 'w-36' : 'w-56 sm:w-64'}
      />
      <p className={clsx('font-bold text-slate-900', compact ? 'text-base' : 'text-xl')}>{title}</p>
      {body && <p className="max-w-md text-sm leading-6 text-slate-500">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
