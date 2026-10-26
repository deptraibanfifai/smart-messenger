import React, { useEffect, useRef, useState } from 'react';
import { Camera, LockKeyhole, UserRound } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ModalDialog from './ModalDialog';

export default function ProfileModal({ onClose }) {
  const { user, applyProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickAvatar = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    if (!['image/png', 'image/jpeg'].includes(selected.type) || selected.size > 20 * 1024 * 1024) {
      setError('Chọn ảnh PNG hoặc JPEG, tối đa 20 MB.'); return;
    }
    setFile(selected); setError(''); setFeedback('');
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setFeedback(''); setError('');
    let avatarSaved = false;
    try {
      if (file) {
        const form = new FormData(); form.append('file', file);
        const { data } = await api.post('/users/me/avatar', form, { headers: { 'Content-Type': undefined } });
        applyProfile(data); setFile(null); avatarSaved = true;
      }
      const { data } = await api.put('/users/me', { fullName: fullName.trim() });
      applyProfile(data); setFeedback('Đã cập nhật hồ sơ.');
    } catch (failure) {
      setError((avatarSaved ? 'Ảnh đã lưu. ' : '') + (failure.response?.data?.message || 'Không lưu được hồ sơ. Vui lòng thử lại.'));
    } finally { setBusy(false); }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setFeedback(''); setError('');
    try {
      await api.put('/users/me/password', { oldPassword, newPassword });
      setOldPassword(''); setNewPassword(''); setFeedback('Đã đổi mật khẩu.');
    } catch (failure) { setError(failure.response?.data?.message || 'Không đổi được mật khẩu.'); }
    finally { setBusy(false); }
  };

  return <ModalDialog title="Hồ sơ của tôi" onClose={() => { if (!busy) onClose(); }}>
    <div className="profile-intro"><div className="profile-avatar-preview">
      {preview || user?.avatarUrl ? <img src={preview || user.avatarUrl} alt="Ảnh đại diện của bạn" /> : <UserRound size={44} />}
      <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} aria-label="Chọn ảnh đại diện từ máy"><Camera size={18} /></button>
    </div><div><h3>{user?.fullName}</h3><p>@{user?.username}</p><button type="button" className="profile-text-button" disabled={busy} onClick={() => fileRef.current?.click()}>Chọn ảnh từ máy</button></div></div>
    <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={pickAvatar} />
    <p className="profile-hint">PNG/JPEG · tối đa 20 MB. Ảnh được cắt vuông ở giữa.</p>
    {file && <p className="profile-hint">Đã chọn: {file.name}. Nhấn Lưu hồ sơ để cập nhật.</p>}
    {error && <p className="profile-feedback is-error" role="alert">{error}</p>}
    {feedback && <p className="profile-feedback" role="status">{feedback}</p>}
    <form onSubmit={save} className="profile-form">
      <label>Tên hiển thị<input value={fullName} maxLength={100} required disabled={busy} onChange={event => setFullName(event.target.value)} /></label>
      <button type="submit" className="profile-primary" disabled={busy || !fullName.trim()}>{busy ? 'Đang xử lý...' : 'Lưu hồ sơ'}</button>
    </form>
    <form onSubmit={changePassword} className="profile-form profile-password-form">
      <h3><LockKeyhole size={18} /> Đổi mật khẩu</h3>
      <label>Mật khẩu hiện tại<input type="password" autoComplete="current-password" value={oldPassword} required disabled={busy} onChange={event => setOldPassword(event.target.value)} /></label>
      <label>Mật khẩu mới<input type="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="Từ 8 đến 72 ký tự" value={newPassword} required disabled={busy} onChange={event => setNewPassword(event.target.value)} /></label>
      <button type="submit" className="profile-secondary" disabled={busy || !oldPassword || newPassword.length < 8}>Đổi mật khẩu</button>
    </form>
  </ModalDialog>;
}
