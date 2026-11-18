// src/pages/Profile.jsx
// Only fields listed in profile.editableFields (from the backend) can be
// edited. The official email and account identity are always read-only.
import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Loader2, Camera, Mail, Phone, Building2, BadgeCheck, Lock } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { profileService } from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/errors';
import PageHeader from '../components/common/PageHeader';
import Card, { CardHeader } from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import FormField from '../components/common/FormField';
import { Alert, ErrorState } from '../components/common/States';
import Avatar from '../components/profile/Avatar';

const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

// Field definitions for display. Editing is allowed only if the backend says so.
const FIELDS = [
  { key: 'fullName', label: 'Full name', icon: BadgeCheck, type: 'text', autoComplete: 'name' },
  { key: 'email', label: 'Official college email', icon: Mail, type: 'email', neverEditable: true },
  { key: 'phone', label: 'Contact number', icon: Phone, type: 'tel', autoComplete: 'tel', inputMode: 'tel' },
  { key: 'department', label: 'Department', icon: Building2, type: 'text' },
  { key: 'designation', label: 'Designation', icon: BadgeCheck, type: 'text' },
];

function validate(values, editable) {
  const errors = {};
  if (editable.includes('fullName') && !String(values.fullName || '').trim()) errors.fullName = 'Name cannot be empty.';
  if (editable.includes('phone')) {
    const phone = String(values.phone || '').trim();
    if (phone && !PHONE_RE.test(phone)) errors.phone = 'Enter a valid phone number (digits, spaces, + or -).';
  }
  return errors;
}

export default function Profile() {
  const profile = useApi(() => profileService.getProfile(), []);
  const { updateUser } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const fileRef = useRef(null);

  const p = profile.data;
  const editable = (p?.editableFields || []).filter((k) => !FIELDS.find((f) => f.key === k)?.neverEditable);
  const editableFormFields = FIELDS.filter((f) => editable.includes(f.key));
  const canEditAvatar = (p?.editableFields || []).includes('avatar');

  useEffect(() => {
    if (p) setValues(Object.fromEntries(FIELDS.map((f) => [f.key, p[f.key] ?? ''])));
  }, [p]);

  const startEdit = () => {
    setErrors({});
    setSaveError('');
    setEditing(true);
  };

  const cancel = () => {
    setValues(Object.fromEntries(FIELDS.map((f) => [f.key, p[f.key] ?? ''])));
    setErrors({});
    setSaveError('');
    setEditing(false);
  };

  const save = async (e) => {
    e.preventDefault();
    if (saving) return;
    const nextErrors = validate(values, editable);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    // Send only fields that are editable AND changed.
    const changes = {};
    editableFormFields.forEach((f) => {
      const v = String(values[f.key] ?? '').trim();
      if (v !== String(p[f.key] ?? '')) changes[f.key] = v;
    });
    if (!Object.keys(changes).length) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const updated = await profileService.updateProfile(changes);
      profile.setData(updated);
      updateUser({ fullName: updated.fullName, name: updated.fullName, phone: updated.phone, avatarUrl: updated.avatarUrl });
      setEditing(false);
      toast.success('Profile updated.');
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Your changes were not saved. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const onAvatarChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const updated = await profileService.uploadAvatar(file, { onProgress: setAvatarProgress });
      profile.setData(updated);
      updateUser({ avatarUrl: updated.avatarUrl });
      toast.success('Profile picture updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update your picture.'));
    } finally {
      setAvatarUploading(false);
    }
  };

  if (profile.loading && !p) return <LoadingSpinner label="Loading your profile…" />;
  if (profile.error && !p) {
    return (
      <Card>
        <ErrorState error={profile.error} title="Couldn't load your profile" onRetry={profile.reload} />
      </Card>
    );
  }
  if (!p) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile" description="Your account details." />

      <Card className="mb-5">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="relative">
            <Avatar name={p.fullName} src={p.avatarUrl} size="lg" />
            {avatarUploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-semibold text-white" role="status">
                {avatarProgress}%
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{p.fullName}</p>
            <p className="text-sm muted">
              {[p.designation, p.department].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-0.5 truncate text-sm muted">{p.email}</p>
          </div>
          {canEditAvatar && (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={onAvatarChosen} />
              <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={avatarUploading}>
                {avatarUploading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
                Change picture
              </button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Details"
          description={editable.length ? undefined : 'Your details are managed by the college administrator.'}
          action={
            editable.length > 0 &&
            !editing && (
              <button type="button" className="btn-secondary btn-sm" onClick={startEdit}>
                <Pencil size={14} aria-hidden="true" /> Edit
              </button>
            )
          }
        />

        {saveError && (
          <Alert type="error" className="mb-4">
            {saveError}
          </Alert>
        )}

        <form onSubmit={save} noValidate>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {FIELDS.map((f) => {
              const isEditable = editing && editable.includes(f.key);
              const Icon = f.icon;
              if (isEditable) {
                return (
                  <FormField key={f.key} id={`profile-${f.key}`} label={f.label} error={errors[f.key]}>
                    {(aria) => (
                      <input
                        id={`profile-${f.key}`}
                        type={f.type}
                        autoComplete={f.autoComplete}
                        inputMode={f.inputMode}
                        value={values[f.key] ?? ''}
                        onChange={(e) => {
                          setValues((v) => ({ ...v, [f.key]: e.target.value }));
                          if (errors[f.key]) setErrors((x) => ({ ...x, [f.key]: undefined }));
                        }}
                        disabled={saving}
                        className={`input ${errors[f.key] ? 'input-error' : ''}`}
                        {...aria}
                      />
                    )}
                  </FormField>
                );
              }
              return (
                <dl key={f.key}>
                  <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide muted">
                    <Icon size={13} aria-hidden="true" /> {f.label}
                    {editing && (
                      <span className="inline-flex items-center gap-0.5 normal-case tracking-normal" title="This field can't be changed here">
                        <Lock size={11} aria-hidden="true" />
                        <span className="sr-only">(read-only)</span>
                      </span>
                    )}
                  </dt>
                  <dd className="mt-1 break-words text-sm text-gray-900 dark:text-gray-100">{p[f.key] || '—'}</dd>
                </dl>
              );
            })}
          </div>

          {editing && (
            <>
              <p className="mt-5 text-xs muted">
                <Lock size={11} className="mb-0.5 inline" aria-hidden="true" /> Your email and other locked fields are managed by the college. Contact
                the administrator to change them.
              </p>
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-secondary" onClick={cancel} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}
