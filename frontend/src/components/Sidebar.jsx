import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StatusNotes from './StatusNotes';
import { Search, Users, MessageCircle, SquarePen } from 'lucide-react';

export default function Sidebar({ onOpenNewGroup }) {
  const { user } = useAuth();
  const { conversations, activeConversation, setActiveConversation, startDirectChat, onlineUserIds } = useChat();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    const val = e.target.value;
    setSearchKeyword(val);
    if (!val.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.get(`/users/search?keyword=${encodeURIComponent(val)}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const getConversationTitle = (conv) => {
    if (conv.type === 'GROUP') return conv.title || 'Nhóm không tên';
    const otherMember = conv.members?.find((m) => m.id !== user?.id);
    return otherMember?.fullName || 'Người dùng';
  };

  const getConversationAvatar = (conv) => {
    if (conv.type === 'GROUP') {
      return `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.id}`;
    }
    const otherMember = conv.members?.find((m) => m.id !== user?.id);
    return otherMember?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=avatar';
  };

  const isConversationOnline = (conv) => {
    if (conv.type === 'GROUP') return false;
    const otherMember = conv.members?.find((m) => m.id !== user?.id);
    return otherMember ? onlineUserIds.has(otherMember.id) : false;
  };


  return (
    <aside className="chat-sidebar w-80 flex flex-col h-full shrink-0">
      <div className="chat-sidebar-header">
        <div className="chat-inbox-account">
          <h2 title={user?.fullName}>{user?.username || 'Smart Messenger'}</h2>
          <button type="button" onClick={onOpenNewGroup} aria-label="Tạo nhóm mới" title="Tạo nhóm mới"><SquarePen size={23} /></button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm kiếm người dùng..."
            value={searchKeyword}
            onChange={handleSearch}
            className="chat-sidebar-search w-full pl-9 pr-3 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 transition outline-none"
          />
        </div>
        <StatusNotes />
        <div className="chat-inbox-heading"><h3>Tin nhắn</h3><button type="button" onClick={onOpenNewGroup}>Tạo nhóm</button></div>
      </div>

      {/* Danh sách kết quả tìm kiếm hoặc danh sách Conversation */}
      <div className="chat-conversation-list flex-1 overflow-y-auto">
        {isSearching ? (
          <div>
            <p className="text-[11px] font-semibold text-slate-400 px-3 py-1.5 uppercase">
              Kết quả tìm kiếm ({searchResults.length})
            </p>
            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Không tìm thấy người dùng nào</p>
            ) : (
              searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    startDirectChat(u.id);
                    setIsSearching(false);
                    setSearchKeyword('');
                  }}
                  className="w-full flex items-center space-x-3 p-2.5 rounded-xl hover:bg-slate-100 transition text-left"
                >
                  <div className="relative">
                    <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
                    {onlineUserIds.has(u.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{u.fullName}</p>
                    <p className="text-[11px] text-slate-400 truncate">@{u.username}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Chưa có cuộc trò chuyện nào</p>
            <p className="text-[11px] text-slate-400 mt-1">Tìm kiếm bạn bè ở trên hoặc tạo nhóm để bắt đầu chat!</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isSelected = activeConversation?.id === conv.id;
            const isOnline = isConversationOnline(conv);

            return (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`chat-conversation w-full flex items-center space-x-3 p-3 rounded-2xl transition text-left ${
                  isSelected ? 'bg-sky-50 text-sky-900' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={getConversationAvatar(conv)}
                    alt=""
                    className="w-11 h-11 rounded-full bg-slate-200 object-cover"
                  />
                  {conv.type === 'DIRECT' && isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                  {conv.type === 'GROUP' && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-sky-600 text-white rounded-full flex items-center justify-center text-[9px] border-2 border-white">
                      <Users className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold truncate ${isSelected ? 'text-sky-950 font-bold' : 'text-slate-800'}`}>
                      {getConversationTitle(conv)}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {conv.lastMessage ? conv.lastMessage.content : 'Bắt đầu cuộc trò chuyện...'}
                  </p>
                </div>
                {conv.unreadCount > 0 && <span className="chat-unread-badge" aria-label={`${conv.unreadCount} tin nhắn chưa đọc`}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
