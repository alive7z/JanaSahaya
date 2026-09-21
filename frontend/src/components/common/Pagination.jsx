import { clsx } from '../../utils/formatters';

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const range = [];
  for (let p = 1; p <= pages; p += 1) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) range.push(p);
    else if (range[range.length - 1] !== '…') range.push('…');
  }
  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="Pagination">
      <button
        className="btn-secondary px-3 py-1 text-xs"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Prev
      </button>
      {range.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={clsx(
              'h-8 w-8 rounded-lg text-sm font-medium',
              p === page
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="btn-secondary px-3 py-1 text-xs"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}