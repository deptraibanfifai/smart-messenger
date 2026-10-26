import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Bot, LogOut, MessageCircle, Shield, UserRound } from 'lucide-react';
import ProfileModal from './ProfileModal';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onOpenAiChat }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [permission, setPermission] = useState(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const enableNotifications = async () => {
    if (!('Notification' in window) || !window.isSecureContext) {
      setPermission('unsupported');
      return;
    }
    try { setPermission(await Notification.requestPermission()); }
    catch { setPermission('denied'); }
  };

  return (
    <nav className="chat-navbar" aria-label="Điều hướng Smart Messenger">
      <Link to="/" className="chat-rail-logo" aria-label="Smart Messenger" title="Smart Messenger"><MessageCircle size={27} strokeWidth={2.2} /></Link>
      <div className="chat-rail-main">
        <Link to="/" className="chat-rail-action is-current" aria-label="Tin nhắn" title="Tin nhắn"><MessageCircle size={25} /></Link>
        <button type="button" className="chat-rail-action" onClick={enableNotifications} aria-label="Bật thông báo" title={permission === 'granted' ? 'Thông báo đã bật' : permission === 'denied' ? 'Thông báo bị chặn trong cài đặt trình duyệt' : 'Bật thông báo'}><Bell size={25} />{permission === 'granted' && <span className="chat-rail-indicator" />}</button>
        <button type="button" className="chat-rail-action" onClick={onOpenAiChat} aria-label="Trợ lý AI" title="Trợ lý AI"><Bot size={26} /></button>
        {isAdmin && <Link to="/admin" className="chat-rail-action" aria-label="Trang quản trị" title="Trang quản trị"><Shield size={25} /></Link>}
      </div>
      <div className="chat-rail-bottom">
        <button type="button" className="chat-rail-action" onClick={() => setProfileOpen(true)} aria-label="Hồ sơ của tôi" title="Hồ sơ của tôi">{user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <UserRound size={24} />}</button>
        <button type="button" className="chat-rail-action" onClick={() => { logout(); navigate('/login'); }} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={23} /></button>
      </div>
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </nav>
  );
}
