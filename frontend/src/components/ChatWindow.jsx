import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import MessageBubble from './MessageBubble';
import GroupSettings from './GroupSettings';
import api from '../services/api';
import ThemePicker from './ThemePicker';
import { Send, Palette, Sparkles, Users, Info, Paperclip } from 'lucide-react';

export default function ChatWindow({ onOpenAiSummary }) {
  const { user } = useAuth();
  const { activeConversation, messages, loadingMessages, sendMessage, onlineUserIds, uploadFile, editMessage, deleteMessage } = useChat();
  const [inputText, setInputText] = useState('');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400 p-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-300">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-600">Chưa chọn cuộc trò chuyện</h3>
        <p className="text-xs text-slate-400 mt-1">Chọn một người bạn hoặc tạo nhóm để bắt đầu nhắn tin realtime!</p>
      </div>
    );
  }

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
  };

  const getHeaderTitle = () => {
    if (activeConversation.type === 'GROUP') return activeConversation.title;
    const other = activeConversation.members?.find((m) => m.id !== user?.id);
    return other?.fullName || 'Người dùng';
  };

  const isOnline = () => {
    if (activeConversation.type === 'GROUP') return false;
    const other = activeConversation.members?.find((m) => m.id !== user?.id);
    return other ? onlineUserIds.has(other.id) : false;
  };

  const themeColor = activeConversation.themeColor || '#0284c7';

  const doSearch = async (event) => {
    event.preventDefault();
    if (!search.trim()) return setSearchResults(null);
    try { setSearchResults((await api.get('/messages/search', { params: { conversationId: activeConversation.id, keyword: search } })).data); }
    catch (e) { setError(e.response?.data?.message || 'Không tìm được tin nhắn'); }
  };
  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { await uploadFile(file); setError(''); }
    catch (e) { setError(e.response?.data?.message || 'Tải tệp thất bại (tối đa 10 MB; PNG/JPEG/WebP/PDF/TXT)'); }
    event.target.value = '';
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
      {/* Chat Header */}
      <div className="h-16 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={
                activeConversation.type === 'GROUP'
                  ? `https://api.dicebear.com/7.x/identicon/svg?seed=${activeConversation.id}`
                  : activeConversation.members?.find((m) => m.id !== user?.id)?.avatarUrl ||
                    'https://api.dicebear.com/7.x/bottts/svg?seed=user'
              }
              alt=""
              className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 object-cover"
            />
            {activeConversation.type === 'DIRECT' && isOnline() && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">{getHeaderTitle()}</h2>
            <p className="text-[11px] text-slate-400">
              {activeConversation.type === 'GROUP'
                ? `${activeConversation.members?.length || 0} thành viên`
                : isOnline()
                ? '🟢 Đang hoạt động'
                : '⚪ Không trực tuyến'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Đổi Theme màu & Tóm tắt AI */}
        <div className="flex items-center space-x-2">
          {activeConversation.type === 'GROUP' && <button onClick={() => setShowGroupSettings(true)} className="text-xs bg-slate-100 rounded p-2">Quản lý nhóm</button>}
          <button
            onClick={() => onOpenAiSummary(activeConversation.id)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold transition shadow-sm"
            title="Dùng AI tóm tắt các ý chính trong cuộc trò chuyện này"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden md:inline">AI Tóm tắt</span>
          </button>

          <button
            onClick={() => setShowThemePicker(true)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
            title="Đổi màu nền/Theme đoạn chat"
          >
            <Palette className="w-4 h-4" style={{ color: themeColor }} />
          </button>
        </div>
      </div>

      <form onSubmit={doSearch} className="flex gap-2 px-4 py-1 bg-white"><input className="border rounded px-2 text-xs flex-1" placeholder="Tìm trong cuộc trò chuyện" value={search} onChange={e => setSearch(e.target.value)} /><button className="text-xs">Tìm</button><button type="button" onClick={() => { setSearch(''); setSearchResults(null); }}>Xóa lọc</button></form>
      {error && <p role="alert" className="text-xs text-red-600 px-4">{error}</p>}

      {/* Messages List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (searchResults || messages).length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-xs">Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên! 👋</p>
          </div>
        ) : (
          (searchResults || messages).map((msg) => (
            <MessageBubble
              key={msg.id || Math.random()}
              message={msg}
              isMine={msg.senderId === user?.id}
              themeColor={themeColor}
              onEdit={async content => { try { await editMessage(msg.id, content); } catch (e) { setError('Không sửa được tin nhắn'); } }}
              onDelete={async () => { try { await deleteMessage(msg.id); } catch (e) { setError('Không xóa được tin nhắn'); } }}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <input ref={fileRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" onChange={handleFile} />
          <button type="button" title="Gửi ảnh hoặc tệp" onClick={() => fileRef.current?.click()}><Paperclip className="w-4 h-4" /></button>
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-100 border-none rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{ backgroundColor: themeColor }}
            className="p-2.5 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Theme Picker Modal */}
      {showThemePicker && (
        <ThemePicker
          currentColor={themeColor}
          onClose={() => setShowThemePicker(false)}
        />
      )}
      {showGroupSettings && <GroupSettings onClose={() => setShowGroupSettings(false)} />}
    </main>
  );
}
