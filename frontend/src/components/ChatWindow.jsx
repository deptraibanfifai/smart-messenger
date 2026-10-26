import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import MessageBubble from './MessageBubble';
import GroupSettings from './GroupSettings';
import ContactProfileModal from './ContactProfileModal';
import { createTypingNotifier } from '../utils/typingNotifier';
import api from '../services/api';
import ThemePicker from './ThemePicker';
import { getChatTheme } from '../utils/chatTheme';
import { readWallpaper, saveWallpaper, clearWallpaper } from '../utils/chatWallpaper';
import { Send, Palette, Sparkles, Users, Info, Paperclip, Search, X, ChevronDown, ChevronRight, Image as ImageIcon, FileText, Pencil } from 'lucide-react';

export default function ChatWindow({ onOpenAiSummary }) {
  const { user } = useAuth();
  const { activeConversation, messages, loadingMessages, sendMessage, sendTyping, typingUsers, reactMessage, onlineUserIds, uploadFile, editMessage, deleteMessage, updateNickname } = useChat();
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const typingNotifier = useMemo(() => createTypingNotifier(typing => sendTyping(typing, activeConversation?.id)), [activeConversation?.id, sendTyping]);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({ settings: true, media: true });
  const [error, setError] = useState('');
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nicknameMemberId, setNicknameMemberId] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [wallpaperUrl, setWallpaperUrl] = useState(null);
  const fileRef = useRef(null);
  const wallpaperRef = useRef(null);
  const wallpaperUrlRef = useRef(null);
  const searchRef = useRef(null);
  const searchRequestRef = useRef(0);
  const messagesScrollRef = useRef(null);
  const stickToBottomRef = useRef(true);

  // Run after the loaded messages are rendered, including when switching conversations.
  useLayoutEffect(() => {
    if (loadingMessages || searchOpen || !stickToBottomRef.current) return;
    const element = messagesScrollRef.current;
    if (!element) return;
    const toBottom = () => { element.scrollTop = element.scrollHeight; };
    toBottom();
    const frame = requestAnimationFrame(toBottom);
    return () => cancelAnimationFrame(frame);
  }, [activeConversation?.id, loadingMessages, messages.length, searchOpen]);

  useEffect(() => {
    stickToBottomRef.current = true;
    searchRequestRef.current += 1;
    setSearch('');
    setSearchResults(null);
    setSearchOpen(false);
    setInfoOpen(false);
    setError('');
    setContactOpen(false);
    setReplyTo(null);
    setInputText('');
    setNicknameOpen(false);
    setNicknameMemberId('');
    setNicknameDraft('');
  }, [activeConversation?.id]);

  useEffect(() => {
    const onHidden = () => { if (document.visibilityState !== 'visible') typingNotifier.stop(); };
    document.addEventListener('visibilitychange', onHidden);
    return () => { typingNotifier.stop(); document.removeEventListener('visibilitychange', onHidden); };
  }, [typingNotifier]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    let disposed = false;
    if (wallpaperUrlRef.current) URL.revokeObjectURL(wallpaperUrlRef.current);
    wallpaperUrlRef.current = null;
    setWallpaperUrl(null);
    if (activeConversation?.id) {
      readWallpaper(activeConversation.id).then((blob) => {
        if (!disposed && blob) {
          const url = URL.createObjectURL(blob);
          wallpaperUrlRef.current = url;
          setWallpaperUrl(url);
        }
      }).catch(() => { if (!disposed) setError('Không tải được ảnh nền trên trình duyệt này.'); });
    }
    return () => {
      disposed = true;
      if (wallpaperUrlRef.current) URL.revokeObjectURL(wallpaperUrlRef.current);
      wallpaperUrlRef.current = null;
    };
  }, [activeConversation?.id]);

  if (!activeConversation) {
    return (
      <div className="chat-empty flex-1 flex flex-col items-center justify-center text-slate-500 p-6">
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
    if (sendMessage(inputText, 'TEXT', replyTo?.id)) {
      setInputText('');
      setReplyTo(null);
      typingNotifier.stop();
    } else setError('Chưa kết nối máy chủ. Vui lòng thử lại.');
  };

  const handleTextChange = (event) => {
    setInputText(event.target.value);
    typingNotifier.change(event.target.value);
  };

  const getHeaderTitle = () => {
    if (activeConversation.type === 'GROUP') return activeConversation.title;
    const other = activeConversation.members?.find((m) => m.id !== user?.id);
    return other?.nickname || other?.fullName || 'Người dùng';
  };

  const memberName = (id, fallback) => activeConversation.members?.find(member => String(member.id) === String(id))?.nickname || fallback;
  const editNickname = member => {
    setNicknameMemberId(String(member.id));
    setNicknameDraft(member.nickname || '');
    setNicknameOpen(true);
    setError('');
  };
  const saveNickname = async event => {
    event.preventDefault();
    setNicknameSaving(true);
    try {
      await updateNickname(Number(nicknameMemberId), nicknameDraft.trim());
      setNicknameOpen(false);
      setError('');
    } catch (failure) {
      setError(failure.response?.data?.message || 'Không đổi được biệt danh.');
    } finally { setNicknameSaving(false); }
  };

  const isOnline = () => {
    if (activeConversation.type === 'GROUP') return false;
    const other = activeConversation.members?.find((m) => m.id !== user?.id);
    return other ? onlineUserIds.has(other.id) : false;
  };

  const themeColor = activeConversation.themeColor || '#0284c7';
  const chatTheme = getChatTheme(themeColor);
  const otherMember = activeConversation.members?.find((m) => m.id !== user?.id);
  const avatar = activeConversation.type === 'GROUP'
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${activeConversation.id}`
    : otherMember?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user';
  const media = messages.filter((m) => !m.deleted && ['IMAGE', 'FILE'].includes(m.messageType));

  const closeSearch = () => {
    searchRequestRef.current += 1;
    setSearchOpen(false);
    setSearch('');
    setSearchResults(null);
  };
  const openSearch = () => {
    setInfoOpen(false);
    setSearchOpen(true);
  };

  const doSearch = async (event) => {
    event.preventDefault();
    if (!search.trim()) return setSearchResults(null);
    const conversationId = activeConversation.id;
    const requestId = ++searchRequestRef.current;
    try {
      const { data } = await api.get('/messages/search', { params: { conversationId, keyword: search.trim() } });
      if (requestId === searchRequestRef.current) { setSearchResults(data); setError(''); }
    } catch (e) { if (requestId === searchRequestRef.current) setError(e.response?.data?.message || 'Không tìm được tin nhắn'); }
  };
  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError('Tệp vượt quá giới hạn 20 MB');
      event.target.value = '';
      return;
    }
    try { await uploadFile(file); setError(''); }
    catch (e) { setError(e.response?.data?.message || `Tải tệp thất bại${e.response?.status ? ` (HTTP ${e.response.status})` : ''}. Chỉ nhận PNG/JPEG/WebP/PDF/TXT, tối đa 20 MB.`); }
    event.target.value = '';
  };

  const handleWallpaper = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      setError('Ảnh nền phải là PNG, JPEG hoặc WebP, tối đa 20 MB.');
      return;
    }
    try {
      await saveWallpaper(activeConversation.id, file);
      if (wallpaperUrlRef.current) URL.revokeObjectURL(wallpaperUrlRef.current);
      const url = URL.createObjectURL(file);
      wallpaperUrlRef.current = url;
      setWallpaperUrl(url);
      setError('');
    } catch { setError('Không lưu được ảnh nền trên trình duyệt này.'); }
  };

  const removeWallpaper = async () => {
    try {
      await clearWallpaper(activeConversation.id);
      if (wallpaperUrlRef.current) URL.revokeObjectURL(wallpaperUrlRef.current);
      wallpaperUrlRef.current = null;
      setWallpaperUrl(null);
      setError('');
    } catch { setError('Không xóa được ảnh nền trên trình duyệt này.'); }
  };

  return (
    <main className="chat-main flex-1 flex h-full overflow-hidden relative min-w-0" style={{ '--chat-accent': chatTheme.accent, '--chat-accent-text': chatTheme.text }}>
      <div className="chat-center flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Chat Header */}
      <div className="chat-header px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <button type="button" className="relative chat-contact-avatar" onClick={() => activeConversation.type === 'DIRECT' ? setContactOpen(true) : setInfoOpen(true)} aria-label="Xem thông tin người đang trò chuyện">
            <img
              src={avatar}
              alt=""
              className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 object-cover"
            />
            {activeConversation.type === 'DIRECT' && isOnline() && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            )}
          </button>
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

        {/* Mở bảng thông tin để tìm tin nhắn và đổi màu */}
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
            type="button"
            onClick={() => setInfoOpen((open) => !open)}
            className={`chat-icon-button ${infoOpen ? 'is-active' : ''}`}
            aria-label="Thông tin đoạn chat"
            aria-expanded={infoOpen}
            title="Thông tin đoạn chat"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {searchOpen && <form onSubmit={doSearch} className="chat-search flex gap-2 items-center px-4 py-3">
        <Search className="w-4 h-4 text-slate-500 shrink-0" />
        <input ref={searchRef} className="chat-search-input min-w-0 flex-1" aria-label="Từ khóa tìm kiếm trong cuộc trò chuyện" placeholder="Tìm tin nhắn trong cuộc trò chuyện..." value={search} onChange={e => { searchRequestRef.current += 1; setSearch(e.target.value); setSearchResults(null); }} />
        <button type="submit" className="chat-search-submit">Tìm</button>
        <button type="button" onClick={closeSearch} className="chat-icon-button" aria-label="Đóng tìm kiếm"><X className="w-4 h-4" /></button>
      </form>}
      {error && <p role="alert" className="text-xs text-red-600 px-4 py-2">{error}</p>}

      {/* Messages List Area */}
      <div ref={messagesScrollRef} className="chat-messages flex-1 overflow-y-auto p-4 space-y-3"
        onScroll={event => { if (!loadingMessages) { const el = event.currentTarget; stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; } }}
        onLoadCapture={() => { const el = messagesScrollRef.current; if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight; }}
        style={wallpaperUrl ? { backgroundImage: `linear-gradient(#ffffff77, #ffffff77), url("${wallpaperUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        {searchResults && <p className="chat-results-count" role="status">{searchResults.length} tin nhắn phù hợp</p>}
        {loadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (searchResults || messages).length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-xs">{searchResults ? 'Không tìm thấy tin nhắn phù hợp.' : 'Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên! 👋'}</p>
          </div>
        ) : (
          (searchResults || messages).map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === user?.id}
              showSender={activeConversation.type === 'GROUP'}
              themeColor={themeColor}
              currentUserId={user?.id}
              senderDisplayName={memberName(msg.senderId, msg.senderName)}
              onReply={() => { setReplyTo(msg); setSearchOpen(false); }}
              onReact={async (emoji) => { try { await reactMessage(msg.id, emoji); } catch { setError('Không thể thả cảm xúc.'); } }}
              onEdit={async content => { try { await editMessage(msg.id, content); } catch (e) { setError('Không sửa được tin nhắn'); } }}
              onDelete={async () => { try { await deleteMessage(msg.id); } catch (e) { setError('Không xóa được tin nhắn'); } }}
            />
          ))
        )}
      </div>

      {/* Message Input Box */}
      <div className="chat-composer p-3 shrink-0">
        <div className="chat-typing-slot" aria-live="polite" aria-atomic="true">{Object.keys(typingUsers).length > 0 && <div className="chat-typing"><span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span><span>{Object.values(typingUsers).map(entry => entry.name).join(', ')} đang nhập...</span></div>}</div>
        {replyTo && <div className="chat-reply-draft"><span>Trả lời {replyTo.senderName}: {replyTo.deleted ? 'Tin nhắn đã xóa' : replyTo.messageType === 'TEXT' ? replyTo.content : 'Ảnh hoặc tệp'}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Bỏ trả lời"><X size={15} /></button></div>}
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <input ref={fileRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain" onChange={handleFile} />
          <button type="button" className="chat-icon-button chat-attach-button" title="Gửi ảnh hoặc tệp" aria-label="Gửi ảnh hoặc tệp" onClick={() => fileRef.current?.click()}><Paperclip className="w-5 h-5" /></button>
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            value={inputText}
            onChange={handleTextChange}
            onBlur={() => typingNotifier.stop()}
            className="chat-message-input flex-1 min-w-0 px-4 py-2.5 rounded-xl text-sm outline-none transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{ background: themeColor === '#0284c7' ? '#514cff' : chatTheme.background, color: themeColor === '#0284c7' ? '#fff' : chatTheme.text }}
            className="p-2.5 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      </div>
      {infoOpen && <>
        <button className="chat-info-backdrop" type="button" aria-label="Đóng thông tin đoạn chat" onClick={() => setInfoOpen(false)} />
        <aside className="chat-info" aria-label="Thông tin cuộc trò chuyện">
          <div className="chat-info-top">
            <h3>Thông tin đoạn chat</h3>
            <button type="button" className="chat-icon-button" aria-label="Đóng thông tin" onClick={() => setInfoOpen(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="chat-info-profile">
            <img src={avatar} alt="" />
            <h3>{getHeaderTitle()}</h3>
            <p>{activeConversation.type === 'GROUP' ? `${activeConversation.members?.length || 0} thành viên` : isOnline() ? 'Đang hoạt động' : 'Không trực tuyến'}</p>
            <button type="button" className="chat-info-quick" onClick={openSearch}><Search className="w-5 h-5" /><span>Tìm kiếm</span></button>
          </div>
          <div className="chat-info-section">
            <button type="button" className="chat-info-heading" aria-expanded={sectionOpen.settings} onClick={() => setSectionOpen((v) => ({ ...v, settings: !v.settings }))}>
              Tùy chỉnh đoạn chat {sectionOpen.settings ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {sectionOpen.settings && <div className="chat-info-options">
              <button type="button" onClick={() => editNickname(activeConversation.type === 'DIRECT' ? otherMember : activeConversation.members?.find(member => member.id !== user?.id) || activeConversation.members?.[0])}><Pencil size={18} /> Đổi biệt danh</button>
              {nicknameOpen && <form className="chat-nickname-form" onSubmit={saveNickname}>
                {activeConversation.type === 'GROUP' && <select value={nicknameMemberId} onChange={event => {
                  setNicknameMemberId(event.target.value);
                  setNicknameDraft(activeConversation.members?.find(member => String(member.id) === event.target.value)?.nickname || '');
                }} aria-label="Chọn thành viên đổi biệt danh">
                  {activeConversation.members?.map(member => <option key={member.id} value={member.id}>{member.nickname || member.fullName}</option>)}
                </select>}
                <input aria-label="Biệt danh trong đoạn chat" maxLength={60} value={nicknameDraft} onChange={event => setNicknameDraft(event.target.value)} placeholder="Để trống để dùng tên thật" />
                <div><button type="submit" disabled={nicknameSaving}>{nicknameSaving ? 'Đang lưu...' : 'Lưu biệt danh'}</button><button type="button" onClick={() => setNicknameOpen(false)}>Hủy</button></div>
              </form>}
              <button type="button" onClick={() => setShowThemePicker(true)}><span className="chat-color-swatch" style={{ background: chatTheme.background, color: chatTheme.text }}><Palette size={17} /></span> Đổi màu đoạn chat</button>
              <input ref={wallpaperRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleWallpaper} aria-label="Chọn ảnh nền cuộc trò chuyện" />
              <button type="button" onClick={() => wallpaperRef.current?.click()}><ImageIcon size={18} /> Đổi ảnh nền từ máy</button>
              {wallpaperUrl && <button type="button" onClick={removeWallpaper}><X size={18} /> Bỏ ảnh nền</button>}
              {activeConversation.type === 'GROUP' && <button type="button" onClick={() => setShowGroupSettings(true)}><Users size={18} /> Quản lý nhóm</button>}
            </div>}
          </div>
          <div className="chat-info-section">
            <button type="button" className="chat-info-heading" aria-expanded={sectionOpen.media} onClick={() => setSectionOpen((v) => ({ ...v, media: !v.media }))}>
              Ảnh và tệp {sectionOpen.media ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {sectionOpen.media && <div className="chat-info-media">
              {media.length ? media.map((m) => <div key={m.id} className="chat-media-item">{m.messageType === 'IMAGE' ? <ImageIcon size={17} /> : <FileText size={17} />}<span>{m.messageType === 'IMAGE' ? 'Ảnh' : 'Tệp'} · {m.senderName || 'Thành viên'}</span></div>) : <p>Chưa có ảnh hoặc tệp nào.</p>}
            </div>}
          </div>
        </aside>
      </>}
      {contactOpen && otherMember && <ContactProfileModal member={otherMember} online={isOnline()} onClose={() => setContactOpen(false)} />}
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
