import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal({ onClose }) {
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFeedback('');
    try {
      await api.put('/users/me', { fullName, avatarUrl });
      await refreshProfile();
      if (oldPassword || newPassword) {
        await api.put('/users/me/password', { oldPassword, newPassword });
        setOldPassword('');
        setNewPassword('');
      }
      setFeedback('Đã lưu hồ sơ.');
    } catch (error) {
      setFeedback(error.response?.data?.message || error.response?.data?.detail || 'Không lưu được hồ sơ.');
    } finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
    <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-3">
      <h2 className="font-bold text-lg">Hồ sơ của tôi</h2>
      <p className="text-xs">@{user?.username}</p>
      <label className="block text-sm">Tên hiển thị<input className="w-full border rounded-lg p-2" value={fullName} maxLength={100} required onChange={e => setFullName(e.target.value)} /></label>
      <label className="block text-sm">URL ảnh đại diện (HTTPS)<input className="w-full border rounded-lg p-2" value={avatarUrl} maxLength={500} onChange={e => setAvatarUrl(e.target.value)} /></label>
      <label className="block text-sm">Mật khẩu hiện tại<input type="password" className="w-full border rounded-lg p-2" value={oldPassword} onChange={e => setOldPassword(e.target.value)} /></label>
      <label className="block text-sm">Mật khẩu mới (8–72 ký tự)<input type="password" className="w-full border rounded-lg p-2" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>
      {feedback && <p role="status" className="text-sm text-sky-700">{feedback}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose}>Đóng</button><button disabled={busy} className="bg-sky-600 text-white px-4 py-2 rounded-lg">Lưu</button></div>
    </form>
  </div>;
}
