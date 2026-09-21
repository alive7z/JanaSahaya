import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import * as issueApi from '../../services/issues';
import { useToast } from '../common/Toast';

export default function ResolutionVerification({ issueId, myConfirmation, onVerified }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(null);

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-slate-500">
        <a href="/auth?mode=login" className="font-medium text-brand-600">
          Log in
        </a>{' '}
        to confirm whether this issue was really resolved.
      </p>
    );
  }

  if (myConfirmation != null) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        {myConfirmation ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> You confirmed it was resolved.
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-rose-700">
            <XCircle className="h-4 w-4" /> You reported it is still unresolved.
          </span>
        )}
      </div>
    );
  }

  const submit = async (confirmed) => {
    setBusy(confirmed);
    try {
      const res = await issueApi.verifyResolution(issueId, confirmed);
      toast.success(res.reopened ? 'Issue reopened — reopen requested by citizens' : 'Verification recorded');
      onVerified?.(res);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-slate-700">Was this issue actually resolved?</span>
      <Button variant="secondary" onClick={() => submit(true)} disabled={busy !== null}>
        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Yes
      </Button>
      <Button variant="secondary" onClick={() => submit(false)} disabled={busy !== null}>
        <XCircle className="h-4 w-4 text-rose-600" /> No
      </Button>
      {toast.node}
    </div>
  );
}