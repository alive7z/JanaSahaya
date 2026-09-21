import { clsx } from '../../utils/formatters';

const illustrations = {
  hero: '/illustrations/hero.svg',
  login: '/illustrations/login.svg',
  signup: '/illustrations/signup.svg',
  location: '/illustrations/location.svg',
  'citizen-dashboard': '/illustrations/citizen-dashboard.svg',
  'report-issue': '/illustrations/report-issue.svg',
  'report-success': '/illustrations/report-success.svg',
  'reports-empty': '/illustrations/reports-empty.svg',
  'map-empty': '/illustrations/map-empty.svg',
  'admin-dashboard': '/illustrations/admin-dashboard.svg',
  'admin-command-center': '/illustrations/admin-command-center.svg',
  'admin-map-empty': '/illustrations/admin-map-empty.svg',
  audit: '/illustrations/audit.svg',
  analytics: '/illustrations/analytics.svg',
  'location-error': '/illustrations/location-error.svg',
  'network-error': '/illustrations/network-error.svg',
  'no-results': '/illustrations/no-results.svg',
  'not-found': '/illustrations/not-found.svg',
};

export default function Illustration({
  name,
  alt = '',
  className,
  eager = false,
  decorative = false,
}) {
  const src = illustrations[name];
  if (!src) return null;

  return (
    <img
      src={src}
      alt={decorative ? '' : alt}
      aria-hidden={decorative || undefined}
      width="640"
      height="480"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={clsx('block h-auto max-w-full select-none', className)}
    />
  );
}

export { illustrations };
