import { useEffect, useState } from 'react';
import { Camera, KeyRound, LogOut, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/auth';
import { useToast } from '../components/common/Toast';
import { Button, Spinner } from '../components/common/Button';

const MAX_BIO = 500;

export default function Profile() {
  const toast = useToast();
  const { user, logout } = useAuth();

  const [localUser, setLocalUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [othersSaving, setOthersSaving] = useState(false);

  const [form, setForm] = useState({ full_name: '', bio: '' });
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm_password: '' });

  useEffect(() => {
    if (user) {
      setLocalUser(user);
      setForm({ full_name: user.full_name || '', bio: user.bio || '' });
    }
  }, [user]);

  if (!localUser) return <Spinner label="Loading profile…" />;

  const canSave = form.full_name.trim() && (form.full_name !== localUser.full_name || (form.bio || '') !== (localUser.bio || ''));

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        fullName: form.full_name.trim(),
        bio: form.bio.trim() || null,
      });
      setLocalUser((u) => ({ ...u, full_name: form.full_name.trim(), bio: form.bio.trim() || null, ...updated }));
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e, 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pw.new_password !== pw.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await authService.changePassword({
        oldPassword: pw.current_password,
        newPassword: pw.new_password,
      });
      setPw({ current_password: '', new_password: '', confirm_password: '' });
      toast.success('Password changed');
    } catch (e) {
      toast.error(e, 'Could not change password');
    } finally {
      setPwSaving(false);
    }
  };

  const logoutOthers = async () => {
    setOthersSaving(true);
    try {
      await authService.logoutOthers();
      toast.success('Other sessions signed out');
    } catch (e) {
      toast.error(e, 'Could not sign out other sessions');
    } finally {
      setOthersSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
        <UserRound className="h-6 w-6 text-brand-600" /> Your profile
      </h1>

      <section className="mt-6">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <Camera className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">{localUser.full_name}</p>
              <p className="text-sm text-slate-500">{localUser.email}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="label">Full name</span>
              <input
                className="input"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                maxLength={120}
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between">
                <span className="label">Bio</span>
                <span className="text-xs text-slate-400">{form.bio.length}/{MAX_BIO}</span>
              </div>
              <textarea
                className="input min-h-[96px]"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                maxLength={MAX_BIO}
                placeholder="Short bio shown on your public report profile…"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <Button onClick={saveProfile} disabled={!canSave || saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-slate-400" /> Security
        </h2>
        <div className="card mt-3 p-6">
          <div className="grid gap-4">
            <label className="block">
              <span className="label">Current password</span>
              <input type="password" className="input" value={pw.current_password}
                onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">New password</span>
                <input type="password" className="input" value={pw.new_password}
                  onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} />
              </label>
              <label className="block">
                <span className="label">Confirm new password</span>
                <input type="password" className="input" value={pw.confirm_password}
                  onChange={(e) => setPw((p) => ({ ...p, confirm_password: e.target.value }))} />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={changePassword} disabled={pwSaving || !pw.current_password || !pw.new_password}>
                <KeyRound className="h-4 w-4" /> {pwSaving ? 'Changing…' : 'Change password'}
              </Button>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-sm text-slate-600">Keep your account secure from other open devices.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={logoutOthers} disabled={othersSaving}>
                <Users className="h-4 w-4" /> {othersSaving ? 'Signing out…' : 'Log out other sessions'}
              </Button>
              <Button variant="danger-soft" onClick={logout}>
                <LogOut className="h-4 w-4" /> Log out everywhere
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
