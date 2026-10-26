import React, { useEffect, useState } from 'react';
import { Bot, CornerUpLeft, SmilePlus, MoreHorizontal, Pencil, Trash2, FileDown } from 'lucide-react';
import api from '../services/api';
import { getChatTheme } from '../utils/chatTheme';

export default function MessageBubble({ message, isMine, showSender, senderDisplayName, themeColor, currentUserId, onReply, onReact, onEdit, onDelete }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileError, setFileError] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMore, setShowMore] = useState(false);
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
      <div className="chat-system-message">
        <span>{message.deleted ? 'Tin nhắn đã bị xóa' : message.content}</span>
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
    <div className={`chat-message-row ${isMine ? 'is-mine' : 'is-theirs'}`}>
      {!isMine && (
        <img
          src={message.senderAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
          alt=""
          className="chat-message-avatar"
        />
      )}

      <div className="chat-message-stack">
        {!isMine && showSender && (
          <p className="chat-message-sender">
            {isAi && <Bot size={14} />}
            {senderDisplayName || message.senderName}
          </p>
        )}

        <div
          style={isMine ? { background: themeColor === '#0284c7' ? '#514cff' : chatTheme.background, color: themeColor === '#0284c7' ? '#fff' : chatTheme.text } : undefined}
          className={`chat-message-bubble ${message.messageType === 'IMAGE' ? 'has-image' : ''}`}
        >
          {message.replyToId && <div className="chat-quoted-message"><strong>{message.replySenderName || 'Tin nhắn'}</strong><span>{message.replyPreview || 'Tin nhắn đã xóa'}</span></div>}
          {message.deleted ? 'Tin nhắn đã bị xóa' : message.messageType === 'IMAGE'
            ? (fileUrl ? <a href={fileUrl} download="image"><img src={fileUrl} alt="Ảnh đính kèm" className="chat-message-image" /></a>
              : fileError ? 'Không tải được ảnh đính kèm' : 'Đang tải ảnh...')
            : message.messageType === 'FILE'
              ? (fileUrl ? <a href={fileUrl} download="attachment" className="chat-file-link"><FileDown size={19} /> Tải tệp đính kèm</a>
                : fileError ? 'Không tải được tệp đính kèm' : 'Đang tải tệp...')
              : message.content}
        </div>

        {Object.entries(message.reactions || {}).length > 0 && <div className="chat-reaction-list">
          {Object.entries(message.reactions).map(([emoji, ids]) => <button type="button" key={emoji} onClick={() => onReact(ids.includes(currentUserId) ? null : emoji)} aria-label={`${emoji}: ${ids.length} người`} aria-pressed={ids.includes(currentUserId)}>{emoji} {ids.length}</button>)}
        </div>}

        <p className="chat-message-meta">
          {formatTime(message.createdAt)} {message.editedAt ? '· đã sửa' : ''} {isMine ? (message.readAt ? '· đã đọc' : '· đã gửi') : ''}
        </p>
        {!message.deleted && !isAi && <div className="chat-message-toolbar">
          <button type="button" onClick={onReply} aria-label="Trả lời tin nhắn" title="Trả lời"><CornerUpLeft size={17} /><span className="chat-action-label">Trả lời</span></button>
          <button type="button" aria-label="Thả cảm xúc" title="Thả cảm xúc" aria-expanded={showReactions} onClick={() => { setShowReactions((open) => !open); setShowMore(false); }}><SmilePlus size={17} /><span className="chat-action-label">Cảm xúc</span></button>
          {isMine && <button type="button" aria-label="Thêm thao tác" aria-expanded={showMore} onClick={() => { setShowMore((open) => !open); setShowReactions(false); }}><MoreHorizontal size={18} /></button>}
          {showReactions && <div className="chat-emoji-picker" aria-label="Chọn cảm xúc">
            {['👍', '❤️', '😂', '😮', '😢'].map((emoji) => <button type="button" key={emoji} title={`Thả cảm xúc ${emoji}`} onClick={() => { onReact(message.reactions?.[emoji]?.includes(currentUserId) ? null : emoji); setShowReactions(false); }}>{emoji}</button>)}
          </div>}
          {showMore && <div className="chat-message-menu">
            {message.messageType === 'TEXT' && <button type="button" onClick={() => { setShowMore(false); const text = window.prompt('Sửa tin nhắn', message.content); if (text?.trim()) onEdit(text); }}><Pencil size={15} /> Sửa tin nhắn</button>}
            <button type="button" onClick={() => { setShowMore(false); onDelete(); }}><Trash2 size={15} /> Xóa tin nhắn</button>
          </div>}
        </div>}
      </div>
    </div>
  );
}
