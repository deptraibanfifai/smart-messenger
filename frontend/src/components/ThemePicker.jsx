import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { getChatTheme } from '../utils/chatTheme';
import { X, Check } from 'lucide-react';

const PRESETS = [
  { name: 'Xanh mặc định', value: '#0284c7' },
  { name: 'Tím Direct', value: '#514cff' },
  { name: 'Tím chàm', value: '#6366f1' },
  { name: 'Xanh lục', value: '#059669' },
  { name: 'Hồng đậm', value: '#e11d48' },
  { name: 'Hồng đào', value: '#ff9a9e,#fad0c4' },
  { name: 'Tím hồng', value: '#a18cd1,#fbc2eb' },
  { name: 'Cam hồng', value: '#fad0c4,#ffd1ff' },
  { name: 'Xanh lá', value: '#d4fc79,#96e6a1' },
  { name: 'Xanh biển', value: '#84fab0,#8fd3f4' },
  { name: 'Xanh hồng', value: '#a8edea,#fed6e3' },
  { name: 'Tím nhạt', value: '#cd9cf2,#f6f3ff' },
];

export default function ThemePicker({ currentColor, onClose }) {
  const { updateTheme } = useChat();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = async (value) => {
    setSaving(true);
    setError('');
    try {
      await updateTheme(value);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu màu đoạn chat. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Đổi màu đoạn chat">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-sm w-full p-5 shadow-xl border border-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Màu đoạn chat</h3>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-500 hover:text-slate-700 p-1 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-slate-500 my-3">Chọn màu đơn hoặc gradient cho tin nhắn của bạn.</p>
        <div className="grid grid-cols-4 gap-3 my-4">
          {PRESETS.map(({ name, value }) => {
            const selected = currentColor?.toLowerCase() === value.toLowerCase();
            const theme = getChatTheme(value);
            return (
              <button
                key={value}
                type="button"
                disabled={saving}
                onClick={() => handleSelect(value)}
                style={{ background: theme.background, color: theme.text }}
                className="aspect-square rounded-2xl flex items-center justify-center shadow-md hover:scale-105 transition transform disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700"
                title={name}
                aria-label={name}
                aria-pressed={selected}
              >
                {selected && <Check className="w-6 h-6 drop-shadow" />}
              </button>
            );
          })}
        </div>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
