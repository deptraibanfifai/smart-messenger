import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { wsService } from '../services/websocket';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Tải danh sách conversations của user
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/conversations');
      setConversations(res.data);
      // Nếu chưa chọn conversation nào, chọn cái đầu tiên
      if (!activeConversation && res.data.length > 0) {
        setActiveConversation(res.data[0]);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách cuộc trò chuyện:', err);
    }
  }, [user, activeConversation]);

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

    let active = true;
    const offConnection = wsService.onConnectionChange((connected) => {
      if (!connected) { setOnlineUserIds(new Set()); return; }
      api.get('/users/online').then(({ data }) => {
        if (active) setOnlineUserIds(new Set(data));
      }).catch((error) => console.error('Không tải được trạng thái trực tuyến:', error));
    });

    return () => {
      active = false;
      offConnection();
      if (sub) sub.unsubscribe();
    };
  }, [user, fetchConversations]);

  // Tải lịch sử tin nhắn khi đổi activeConversation & Subscribe WebSocket topic
  useEffect(() => {
    if (!activeConversation || !user) return;

    let isMounted = true;
    setLoadingMessages(true);

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
      if (newMsg.senderId !== user.id && !newMsg.readAt && !newMsg.deleted) {
        api.put(`/messages/read/${activeConversation.id}`).catch(console.error);
      }
      setMessages((prev) => prev.some(m => m.id === newMsg.id)
        ? prev.map(m => m.id === newMsg.id ? newMsg : m) : [...prev, newMsg]);
      // Cập nhật lastMessage cho conversation list
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, lastMessage: newMsg } : c))
      );
    });

    api.put(`/messages/read/${activeConversation.id}`).catch(console.error);

    return () => {
      isMounted = false;
      if (sub) sub.unsubscribe();
    };
  }, [activeConversation, user]);

  // Gửi tin nhắn
  const sendMessage = (content, type = 'TEXT') => {
    if (!activeConversation || !user || !content.trim()) return;

    wsService.sendMessage(activeConversation.id, user.id, content.trim(), type);
  };

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
