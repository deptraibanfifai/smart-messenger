import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { wsService } from '../services/websocket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('smart_messenger_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('smart_messenger_token') || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && token && user.role !== 'ROLE_ADMIN') {
      wsService.connect(user);
    }
    return () => {
      if (user && user.role !== 'ROLE_ADMIN') {
        wsService.disconnect(user);
      }
    };
  }, [user, token]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      const data = response.data;
      setToken(data.token);
      setUser(data);
      localStorage.setItem('smart_messenger_token', data.token);
      localStorage.setItem('smart_messenger_user', JSON.stringify(data));
      return { success: true, user: data };
        } catch (error) {
      let errorMsg = 'Đăng nhập thất bại. Kiểm tra lại thông tin.';
      if (typeof error.response?.data === 'string') {
        errorMsg = error.response.data;
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMsg = error.response.data.error;
      }
      return {
        success: false,
        message: errorMsg,
      };
    }finally {
      setLoading(false);
    }
  };

  const register = async (username, password, fullName) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { username, password, fullName });
      const data = response.data;
      setToken(data.token);
      setUser(data);
      localStorage.setItem('smart_messenger_token', data.token);
      localStorage.setItem('smart_messenger_user', JSON.stringify(data));
      return { success: true, user: data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Đăng ký thất bại. Tên đăng nhập có thể đã tồn tại.',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (user) {
      wsService.disconnect(user);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('smart_messenger_token');
    localStorage.removeItem('smart_messenger_user');
  };

  const isAdmin = user?.role === 'ROLE_ADMIN';

  const refreshProfile = async () => {
    const { data } = await api.get('/users/me');
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem('smart_messenger_user', JSON.stringify(updated));
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
