import React, { useState } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import ModalDialog from './ModalDialog';

export default function StatusNotes() {
  const { user } = useAuth();
  const { notes, saveNote, conversations, onlineUserIds, startDirectChat } = useChat();
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const liveNotes = notes.filter(note => note.statusText && Date.parse(note.statusExpiresAt) > Date.now());
  const mine = liveNotes.find(note => note.id === user?.id);
  const people = new Map();
  liveNotes.filter(note => note.id !== user?.id).forEach(note => people.set(note.id, note));
  conversations.filter(conv => conv.type === 'DIRECT').forEach(conv => {
    const member = conv.members?.find(item => item.id !== user?.id);
    if (member && !people.has(member.id)) people.set(member.id, member);
  });
  const close = () => { if (!busy) setSelected(null); };
  const open = member => { setSelected(member); setText(member.id === user?.id ? mine?.statusText || '' : ''); setError(''); };
  const save = async value => {
    if (busy) return;
    setBusy(true); setError('');
    try { await saveNote(value); setSelected(null); }
    catch (failure) { setError(failure.response?.data?.message || 'Không lưu được trạng thái.'); }
    finally { setBusy(false); }
  };
  const avatar = member => member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <UserRound size={30} />;
  return <>
    <div className="chat-notes-strip" aria-label="Trạng thái và liên hệ">
      <button type="button" className="chat-note-person is-self" onClick={() => open(user)} aria-label="Đăng trạng thái của bạn">
        <span className="chat-note-bubble">{mine?.statusText || 'Bạn đang nghĩ gì?'}</span>
        <span className="chat-note-avatar">{avatar(user)}<i className="chat-note-add"><Plus size={12} /></i></span><span>Ghi chú của bạn</span>
      </button>
      {[...people.values()].slice(0, 12).map(member => {
        const note = liveNotes.find(item => item.id === member.id);
        return <button type="button" key={member.id} className="chat-note-person" onClick={() => note ? open(note) : startDirectChat(member.id)} title={member.fullName}>
          {note && <span className="chat-note-bubble">{note.statusText}</span>}
          <span className="chat-note-avatar">{avatar(member)}{onlineUserIds.has(member.id) && <i className="chat-note-online" />}</span><span>{member.fullName}</span>
        </button>;
      })}
    </div>
    {selected && <ModalDialog title={selected.id === user?.id ? 'Chia sẻ trạng thái' : 'Ghi chú của ' + selected.fullName} onClose={close}>
      {selected.id === user?.id ? <>
        <p className="profile-hint">Ghi chú hiển thị với người dùng trong ứng dụng và tự hết hạn sau 24 giờ.</p>
        <form onSubmit={event => { event.preventDefault(); save(text); }}>
          <textarea className="profile-note-editor" aria-label="Nội dung trạng thái" maxLength={80} value={text} disabled={busy} placeholder="Hôm nay bạn thế nào?" onChange={event => setText(event.target.value)} />
          <div className="profile-note-footer"><span className="profile-hint">{text.length}/80</span><div>{mine && <button type="button" disabled={busy} onClick={() => save('')}>Xóa ghi chú</button>}<button className="profile-primary" type="submit" disabled={busy || !text.trim()}>{busy ? 'Đang lưu...' : 'Chia sẻ'}</button></div></div>
        </form>
      </> : <div className="contact-profile"><div className="profile-avatar-preview">{avatar(selected)}</div><blockquote>{liveNotes.find(note => note.id === selected.id)?.statusText || 'Ghi chú đã hết hạn hoặc được xóa.'}</blockquote><button className="profile-primary" type="button" onClick={() => { startDirectChat(selected.id); close(); }}>Nhắn tin</button></div>}
      {error && <p className="profile-feedback is-error" role="alert">{error}</p>}
    </ModalDialog>}
  </>;
}
