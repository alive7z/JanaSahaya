import { useState } from 'react';
import { CheckCircle2, Play, Camera } from 'lucide-react';
import { Button } from '../common/Button';
import * as issueApi from '../../services/issues';
import { useToast } from '../common/Toast';

export default function OfficerActions({ issue, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null); // 'accept' | 'resolve'
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState([]);

  const take = async (fn) => {
    setBusy(true);
    try {
      const res = await fn();
      setMode(null);
      toast.success('Done');
      onChanged?.(res);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  };

  const validWorkflow =
    issue.status === 'ASSIGNED' || issue.status === 'SUBMITTED' || issue.status === 'UNDER_REVIEW' || issue.status === 'REOPENED';

  const resolve = () => take(() => issueApi.resolveIssue(issue.id, { note, evidence }));

  return (
    <div className="card space-y-3 p-4">
      <h3 className="font-semibold text-slate-800">Officer actions</h3>

      {mode === null && (
        <div className="flex flex-wrap gap-2">
          {issue.status === 'ASSIGNED' && (
            <Button onClick={() => take(() => issueApi.acceptIssue(issue.id))} disabled={busy}>
              <Play className="h-4 w-4" /> Accept & start work
            </Button>
          )}
          {validWorkflow && issue.status !== 'ASSIGNED' && (
            <Button variant="secondary" onClick={() => setMode('resolve')}>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Mark resolved
            </Button>
          )}
          {!validWorkflow && <p className="text-sm text-slate-500">No actions available in this state.</p>}
        </div>
      )}

      {mode === 'resolve' && (
        <div className="space-y-3">
          <textarea
            className="input min-h-[90px]"
            placeholder="Resolution note — what was done to fix it?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <label className="block">
            <span className="label">Completion evidence (JPEG/PNG/WebP, required)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setEvidence([...e.target.files])}
              className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700"
            />
          </label>
          {evidence.length > 0 && (
            <p className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Camera className="h-3 w-3" /> {evidence.length} image(s) attached
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={resolve} disabled={busy || !note.trim() || evidence.length === 0}>
              Confirm resolution
            </Button>
            <Button variant="secondary" onClick={() => setMode(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {toast.node}
    </div>
  );
}