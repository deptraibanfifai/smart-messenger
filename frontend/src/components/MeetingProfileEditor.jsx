import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Save } from 'lucide-react';
import api from '../services/api';

export default function MeetingProfileEditor({ user, onSaved }) {
  const [profile, setProfile] = useState({ bio: '', interests: '', openingQuestion: '', visible: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/meeting/me').then(({ data }) => { if (active) setProfile(data); })
      .catch(() => { if (active) setMessage('Không tải được hồ sơ gặp gỡ.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const change = (key, value) => setProfile(previous => ({ ...previous, [key]: value }));
  const save = async event => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { data } = await api.put('/meeting/me', {
        bio: profile.bio, interests: profile.interests,
        openingQuestion: profile.openingQuestion, visible: profile.visible,
      });
      setProfile(data);
      setMessage(data.visible ? 'Đã lưu. Hồ sơ của bạn đang hiển thị trong Khám phá.' : 'Đã lưu. Hồ sơ của bạn đang ẩn.');
      onSaved?.();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không lưu được hồ sơ. Hãy thử lại.');
    } finally { setSaving(false); }
  };

  return <section className="community-panel meeting-editor" id="meeting-profile">
    <div className="community-panel-label">HỒ SƠ GẶP GỠ CỦA BẠN</div>
    <div className="meeting-editor-head"><img src={user?.avatarUrl} alt="" /><div><h2>{user?.fullName || user?.username}</h2><p>Chia sẻ điều bạn muốn người khác biết về mình.</p></div></div>
    {loading ? <p>Đang tải hồ sơ...</p> : <form onSubmit={save}>
      <label>Giới thiệu ngắn<textarea maxLength={300} rows={3} value={profile.bio || ''} onChange={event => change('bio', event.target.value)} placeholder="Bạn thích làm gì vào cuối tuần?" /></label>
      <label>Sở thích <small>(phân cách bằng dấu phẩy)</small><input maxLength={300} value={profile.interests || ''} onChange={event => change('interests', event.target.value)} placeholder="Âm nhạc, cà phê, du lịch" /></label>
      <label>Câu hỏi mở đầu<input maxLength={160} value={profile.openingQuestion || ''} onChange={event => change('openingQuestion', event.target.value)} placeholder="Bộ phim bạn xem gần đây là gì?" /></label>
      <label className="meeting-visibility"><input type="checkbox" checked={!!profile.visible} onChange={event => change('visible', event.target.checked)} />{profile.visible ? <Eye size={17} /> : <EyeOff size={17} />} Hiển thị hồ sơ trong Khám phá</label>
      <p className="meeting-helper">Chỉ khi bật công khai, người khác mới thấy hồ sơ này. Email và số điện thoại không xuất hiện ở đây.</p>
      <button className="community-action" disabled={saving} type="submit"><Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}</button>
      {message && <p role="status" className="meeting-message">{message}</p>}
    </form>}
  </section>;
}
