import { useState } from 'react';
import { apiErrorMessage } from '../../services/api';

export function Toast({ message, kind = 'error', onClose }) {
  const colors = {
    error: 'bg-rose-50 text-rose-800 ring-rose-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    info: 'bg-sky-50 text-sky-800 ring-sky-200',
  };
  return (
    <div className={`pointer-events-auto fixed right-4 top-4 z-[1000] max-w-sm rounded-lg px-4 py-3 text-sm ring-1 ${colors[kind]}`} role="alert">
      <div className="flex items-start justify-between gap-3">
        <p>{message}</p>
        <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100" aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const push = (message, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    window.setTimeout(() => dismiss(id), 4200);
  };

  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const wrap = {
    error: (err, fallback) => push(apiErrorMessage(err, fallback), 'error'),
    success: (m) => push(m, 'success'),
    info: (m) => push(m, 'info'),
  };

  const node = (
    <div className="fixed right-4 top-4 z-[1000] space-y-2">
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} kind={t.kind} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  );

  return { ...wrap, push, node };
}