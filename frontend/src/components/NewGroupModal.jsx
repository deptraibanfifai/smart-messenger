import React, { useState, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { X, Users, Check } from 'lucide-react';

export default function NewGroupModal({ onClose }) {
  const { user } = useAuth();
  const { createGroup } = useChat();
  const [title, setTitle] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/search')
      .then((res) => {
        setAvailableUsers(res.data.filter((u) => u.id !== user?.id));
      })
      .catch((err) => console.error(err));
  }, [user]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tên nhóm');
      return;
    }
    if (selectedIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 thành viên');
      return;
    }

    setLoading(true);
    setError('');
    const res = await createGroup(title.trim(), selectedIds);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-100 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-800">Tạo nhóm trò chuyện mới</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 mt-3 space-y-3">
          {error && (
            <div className="p-2.5 bg-rose-50 text-rose-600 text-xs rounded-xl border border-rose-100 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tên nhóm</label>
            <input
              type="text"
              placeholder="VD: Nhóm Đồ Án Cơ Sở 4..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Chọn thành viên ({selectedIds.length})
            </label>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {availableUsers.map((u) => {
                const isChecked = selectedIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleSelect(u.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                      isChecked ? 'bg-sky-50 text-sky-900 border border-sky-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-slate-200 object-cover" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{u.fullName}</p>
                        <p className="text-[10px] text-slate-400">@{u.username}</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isChecked ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : 'Tạo nhóm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
