import React from 'react';
import { useChat } from '../context/ChatContext';
import { X, Check } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Sky Blue (Mặc định)', hex: '#0284c7' },
  { name: 'Indigo Purple', hex: '#6366f1' },
  { name: 'Emerald Green', hex: '#059669' },
  { name: 'Rose Pink', hex: '#e11d48' },
  { name: 'Amber Orange', hex: '#d97706' },
  { name: 'Violet Neon', hex: '#8b5cf6' },
  { name: 'Teal Ocean', hex: '#0d9488' },
  { name: 'Slate Dark', hex: '#334155' },
];

export default function ThemePicker({ currentColor, onClose }) {
  const { updateTheme } = useChat();

  const handleSelect = (hex) => {
    updateTheme(hex);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Đổi màu chủ đề đoạn chat</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 my-3">
          Chọn màu yêu thích cho bong bóng tin nhắn và các nút bấm trong cuộc trò chuyện này.
        </p>

        <div className="grid grid-cols-4 gap-3 my-4">
          {PRESET_COLORS.map((col) => {
            const isSelected = currentColor?.toLowerCase() === col.hex.toLowerCase();
            return (
              <button
                key={col.hex}
                onClick={() => handleSelect(col.hex)}
                style={{ backgroundColor: col.hex }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md hover:scale-105 transition transform"
                title={col.name}
              >
                {isSelected && <Check className="w-6 h-6 drop-shadow" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
