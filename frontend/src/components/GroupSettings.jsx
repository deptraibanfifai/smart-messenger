import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

export default function GroupSettings({ onClose }) {
  const { user } = useAuth();
  const { activeConversation: conv, manageGroup } = useChat();
  const [title, setTitle] = useState(conv?.title || '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const owner = conv?.ownerId === user?.id;

  const run = async (action, value) => {
    try { await manageGroup(action, value); setError(''); }
    catch (e) { setError(e.response?.data?.message || 'Không thể cập nhật nhóm'); }
  };
  const search = async (value) => {
    setQuery(value);
    if (!value.trim()) return setResults([]);
    try { setResults((await api.get('/users/search', { params: { keyword: value } })).data); }
    catch { setResults([]); }
  };
  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
    <section onClick={e => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-md w-full space-y-3 max-h-[80vh] overflow-auto">
      <h2 className="font-bold">Quản lý nhóm</h2>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      {owner && <div className="flex gap-2"><input className="border p-2 rounded flex-1" value={title} maxLength={100} onChange={e => setTitle(e.target.value)} /><button onClick={() => run('title', title)}>Đổi tên</button></div>}
      <p className="text-sm">Thành viên</p>
      {conv.members?.map(member => <div key={member.id} className="flex justify-between text-sm border-b py-1"><span>{member.fullName} (@{member.username})</span>
        {owner && member.id !== user.id && <span className="flex gap-2"><button onClick={() => run('owner', member.id)}>Trao quyền</button><button onClick={() => run('remove', member.id)}>Xóa</button></span>}</div>)}
      {owner && <><input placeholder="Tìm người dùng để thêm" className="border p-2 rounded w-full" value={query} onChange={e => search(e.target.value)} />
        {results.filter(member => !conv.members?.some(m => m.id === member.id)).map(member => <button className="block text-sm" key={member.id} onClick={() => run('add', member.id)}>+ {member.fullName} (@{member.username})</button>)}</>}
      <button onClick={onClose} className="bg-slate-100 p-2 rounded">Đóng</button>
    </section>
  </div>;
}
