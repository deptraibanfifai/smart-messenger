import React, { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import api from '../services/api';
import { getChatTheme } from '../utils/chatTheme';

export default function MessageBubble({ message, isMine, themeColor, onEdit, onDelete }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileError, setFileError] = useState(false);
  useEffect(() => {
    setFileUrl(null);
    setFileError(false);
    if (message.deleted || !['IMAGE', 'FILE'].includes(message.messageType)) return;
    let url;
    let cancelled = false;
    api.get(message.content.replace(/^\/api/, ''), { responseType: 'blob' }).then(({ data }) => {
      url = URL.createObjectURL(data);
      if (cancelled) URL.revokeObjectURL(url);
      else setFileUrl(url);
    }).catch(() => { if (!cancelled) setFileError(true); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [message.content, message.deleted, message.messageType]);
  const isAi = message.messageType === 'AI';
  const isSystem = message.messageType === 'SYSTEM';
  const chatTheme = getChatTheme(themeColor);

  if (isSystem) {
    return (
      <div className="flex justify-center my-1">
        <span className="text-[10px] bg-slate-200/60 text-slate-600 px-3 py-1 rounded-full">
          {message.deleted ? 'Tin nhắn đã bị xóa' : message.messageType === 'IMAGE'
            ? (fileUrl ? <a href={fileUrl} download="image"><img className="max-w-64 rounded" src={fileUrl} alt="Ảnh đính kèm" /></a> : 'Đang tải ảnh...')
            : message.messageType === 'FILE'
              ? (fileUrl ? <a href={fileUrl} download="attachment" className="underline">Tải tệp đính kèm</a> : 'Đang tải tệp...')
              : message.content}
        </span>
      </div>
    );
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex items-end space-x-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {!isMine && (
        <img
          src={message.senderAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
          alt=""
          className="w-7 h-7 rounded-full bg-slate-200 mb-1 object-cover shrink-0"
        />
      )}

      <div className={`max-w-[70%] space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && (
          <p className="text-[10px] text-slate-400 font-medium px-1 flex items-center gap-1">
            {isAi && <Bot className="w-3 h-3 text-purple-600" />}
            {message.senderName}
          </p>
        )}

        <div
          style={{
            background: isMine ? chatTheme.background : '#ffffff',
            color: isMine ? chatTheme.text : '#1e293b',
          }}
          className={`px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
            isMine ? 'rounded-br-sm' : 'rounded-bl-sm border border-slate-100'
          }`}
        >
          {message.deleted ? 'Tin nhắn đã bị xóa' : message.messageType === 'IMAGE'
            ? (fileUrl ? <a href={fileUrl} download="image"><img src={fileUrl} alt="Ảnh đính kèm" className="max-w-full max-h-80 rounded-lg" /></a>
              : fileError ? 'Không tải được ảnh đính kèm' : 'Đang tải ảnh...')
            : message.messageType === 'FILE'
              ? (fileUrl ? <a href={fileUrl} download="attachment" className="underline">Tải tệp đính kèm</a>
                : fileError ? 'Không tải được tệp đính kèm' : 'Đang tải tệp...')
              : message.content}
        </div>

        <p className={`text-[9px] text-slate-400 px-1 ${isMine ? 'text-right' : 'text-left'}`}>
          {formatTime(message.createdAt)} {message.editedAt ? '· đã sửa' : ''} {isMine ? (message.readAt ? '· đã đọc' : '· đã gửi') : ''}
        </p>
        {isMine && !message.deleted && <div className="flex gap-2 text-[10px] text-slate-500 justify-end">
          {message.messageType === 'TEXT' && <button onClick={() => { const text = window.prompt('Sửa tin nhắn', message.content); if (text?.trim()) onEdit(text); }}>Sửa</button>}
          <button onClick={() => onDelete()}>Xóa</button>
        </div>}
      </div>
    </div>
  );
}
