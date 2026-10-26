import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { wsService } from '../services/websocket';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user, applyProfile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [notes, setNotes] = useState([]);
  const activeIdRef = React.useRef(null);
  const conversationsRef = React.useRef([]);
  activeIdRef.current = activeConversation?.id;
  conversationsRef.current = conversations;

  // Tải danh sách conversations của user
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/conversations');
      setConversations(res.data);
      setActiveConversation(previous => previous
        ? res.data.find(conversation => conversation.id === previous.id) || previous
        : res.data[0] || null);
    } catch (err) {
      console.error('Lỗi khi tải danh sách cuộc trò chuyện:', err);
    }
  }, [user?.id]);

  // Lắng nghe sự kiện Online/Offline
  useEffect(() => {
    if (!user) return;

    fetchConversations();

    const sub = wsService.subscribeToPresence((event) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (event.online) {
          next.add(event.userId);
        } else {
          next.delete(event.userId);
        }
        return next;
      });
    });

    const messageEvents = wsService.subscribe('/user/queue/chat-events', (message) => {
      if (message.senderId === user.id) return;
      const conversationId = message.conversationId;
      const visibleChat = activeIdRef.current === conversationId && document.visibilityState === 'visible';
      setConversations((prev) => prev.map((conv) => conv.id === conversationId
        ? { ...conv, lastMessage: message, unreadCount: visibleChat ? 0 : (conv.unreadCount || 0) + 1 }
        : conv));
      if (!conversationsRef.current.some((conv) => conv.id === conversationId)) fetchConversations();
      if (!visibleChat && 'Notification' in window && Notification.permission === 'granted') {
        const conv = conversationsRef.current.find((c) => c.id === conversationId);
        const other = conv?.members?.find((m) => m.id !== user.id);
        try {
          new Notification(conv?.type === 'GROUP' ? conv.title : other?.fullName || message.senderName || 'Tin nhắn mới', {
            body: message.messageType === 'TEXT' ? message.content.slice(0, 120) : 'Có ảnh hoặc tệp mới',
          });
        } catch (error) { console.debug('Trình duyệt không hiển thị được thông báo', error); }
      }
    });
    const readEvents = wsService.subscribe('/user/queue/read', ({ conversationId }) => {
      setConversations((prev) => prev.map((conv) => conv.id === conversationId
        ? { ...conv, unreadCount: 0 } : conv));
    });

    const profileEvents = wsService.subscribe('/topic/profiles', (profile) => {
      applyProfile(profile);
      const updateMembers = conv => conv ? { ...conv, members: conv.members?.map(member => member.id === profile.id ? { ...member, ...profile } : member) } : conv;
      setConversations(previous => previous.map(updateMembers));
      setActiveConversation(updateMembers);
      setMessages(previous => previous.map(message => message.senderId === profile.id
        ? { ...message, senderName: profile.fullName, senderAvatar: profile.avatarUrl } : message));
      setNotes(previous => [...previous.filter(note => note.id !== profile.id), ...(profile.statusText ? [profile] : [])]);
    });
    let active = true;
    const loadNotes = () => api.get('/users/notes').then(({ data }) => { if (active) setNotes(data); })
      .catch(error => console.error('Không tải được ghi chú:', error));
    loadNotes();
    const noteExpiry = window.setInterval(loadNotes, 60000);
    const offConnection = wsService.onConnectionChange((connected) => {
      if (!connected) { setOnlineUserIds(new Set()); setTypingUsers({}); return; }
      fetchConversations();
      loadNotes();
      api.get('/users/online').then(({ data }) => {
        if (active) setOnlineUserIds(new Set(data));
      }).catch((error) => console.error('Không tải được trạng thái trực tuyến:', error));
    });

    return () => {
      active = false;
      offConnection();
      if (sub) sub.unsubscribe();
      messageEvents.unsubscribe();
      readEvents.unsubscribe();
      profileEvents.unsubscribe();
      window.clearInterval(noteExpiry);
    };
  }, [user?.id, fetchConversations, applyProfile]);

  const markActiveRead = useCallback(() => {
    if (!activeIdRef.current || document.visibilityState !== 'visible') return;
    api.put(`/messages/read/${activeIdRef.current}`).then(() => {
      setConversations((prev) => prev.map((conv) => conv.id === activeIdRef.current
        ? { ...conv, unreadCount: 0 } : conv));
    }).catch(console.error);
  }, []);

  useEffect(() => {
    document.addEventListener('visibilitychange', markActiveRead);
    return () => document.removeEventListener('visibilitychange', markActiveRead);
  }, [markActiveRead]);

  // Tải lịch sử tin nhắn khi đổi activeConversation & Subscribe WebSocket topic
  useEffect(() => {
    if (!activeConversation || !user) return;

    let isMounted = true;
    setLoadingMessages(true);
    setTypingUsers({});

    api.get(`/messages?conversationId=${activeConversation.id}&page=0&size=50`)
      .then((res) => {
        if (isMounted) {
          // Tin nhắn trả về giảm dần theo thời gian, đảo lại để hiển thị từ cũ -> mới
          setMessages(res.data.reverse());
        }
      })
      .catch((err) => console.error('Lỗi khi tải tin nhắn:', err))
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
      });

    // Lắng nghe tin nhắn realtime đến phòng này
    const sub = wsService.subscribeToConversation(activeConversation.id, (newMsg) => {
      if (newMsg.senderId !== user.id && !newMsg.readAt && !newMsg.deleted) markActiveRead();
      setTypingUsers(previous => {
        const next = { ...previous }; delete next[newMsg.senderId]; return next;
      });
      setMessages((prev) => prev.some(m => m.id === newMsg.id)
        ? prev.map(m => m.id === newMsg.id ? newMsg : m) : [...prev, newMsg]);
      // Cập nhật lastMessage cho conversation list
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, lastMessage: newMsg } : c))
      );
    });

    const typingSub = wsService.subscribe(`/topic/typing/${activeConversation.id}`, (event) => {
      if (String(event.userId) === String(user.id)) return;
      if (event.conversationId != null && String(event.conversationId) !== String(activeConversation.id)) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (event.typing) next[event.userId] = { name: event.name || 'Người dùng', expires: Date.now() + 4500 };
        else delete next[event.userId];
        return next;
      });
    });

    const typingExpiry = window.setInterval(() => {
      setTypingUsers((prev) => Object.fromEntries(Object.entries(prev).filter(([, value]) => value.expires > Date.now())));
    }, 1000);

    markActiveRead();

    return () => {
      isMounted = false;
      if (sub) sub.unsubscribe();
      typingSub.unsubscribe();
      window.clearInterval(typingExpiry);
    };
  }, [activeConversation?.id, user?.id, markActiveRead]);

  // Gửi tin nhắn
  const sendMessage = (content, type = 'TEXT', replyToId = null) => {
    if (!activeConversation || !user || !content.trim()) return false;

    return wsService.sendMessage(activeConversation.id, user.id, content.trim(), type, replyToId);
  };

  const sendTyping = useCallback((typing, conversationId = activeIdRef.current) =>
    wsService.sendTyping(conversationId, typing), []);

  const saveNote = async (text) => {
    const { data } = text.trim() ? await api.put('/users/me/note', { text }) : await api.delete('/users/me/note');
    applyProfile(data);
    setNotes(previous => [...previous.filter(note => note.id !== data.id), ...(data.statusText ? [data] : [])]);
  };
  const reactMessage = async (id, emoji) => emoji
    ? api.put(`/messages/${id}/reaction`, { emoji })
    : api.delete(`/messages/${id}/reaction`);

  const uploadFile = async (file) => {
    if (!activeConversation) return;
    const form = new FormData();
    form.append('file', file);
    return api.post(`/files/${activeConversation.id}`, form, { headers: { 'Content-Type': undefined } });
  };

  const editMessage = (id, content) => api.put(`/messages/${id}`, { content });
  const deleteMessage = (id) => api.delete(`/messages/${id}`);

  const manageGroup = async (action, value) => {
    if (!activeConversation || activeConversation.type !== 'GROUP') return;
    const id = activeConversation.id;
    const paths = {
      title: () => api.put(`/conversations/${id}/title`, { title: value }),
      add: () => api.post(`/conversations/${id}/members/${value}`),
      remove: () => api.delete(`/conversations/${id}/members/${value}`),
      owner: () => api.put(`/conversations/${id}/owner/${value}`),
    };
    const { data } = await paths[action]();
    setActiveConversation(data);
    setConversations(prev => prev.map(conv => conv.id === id ? data : conv));
  };

  // Đổi màu theme
  const updateTheme = async (newColor) => {
    if (!activeConversation) return;
    try {
      await api.put(`/conversations/${activeConversation.id}/theme`, { themeColor: newColor });
      setActiveConversation((prev) => ({ ...prev, themeColor: newColor }));
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, themeColor: newColor } : c))
      );
    } catch (err) {
      console.error('Lỗi khi đổi màu theme:', err);
      throw err;
    }
  };

  // Mở hoặc tạo đoạn chat 1-1 với user khác
  const startDirectChat = async (targetUserId) => {
    try {
      const res = await api.post(`/conversations/direct/${targetUserId}`);
      const conv = res.data;
      setConversations((prev) => {
        if (!prev.find((c) => c.id === conv.id)) {
          return [conv, ...prev];
        }
        return prev;
      });
      setActiveConversation(conv);
    } catch (err) {
      console.error('Lỗi khi mở đoạn chat:', err);
    }
  };

  // Tạo nhóm mới
  const createGroup = async (title, memberIds) => {
    try {
      const res = await api.post('/conversations/group', { title, memberIds });
      const newGroup = res.data;
      setConversations((prev) => [newGroup, ...prev]);
      setActiveConversation(newGroup);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Tạo nhóm thất bại' };
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        setActiveConversation,
        messages,
        loadingMessages,
        sendMessage,
        sendTyping,
        typingUsers,
        notes,
        saveNote,
        reactMessage,
        uploadFile,
        editMessage,
        deleteMessage,
        manageGroup,
        updateTheme,
        startDirectChat,
        createGroup,
        onlineUserIds,
        fetchConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
