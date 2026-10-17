import React, { useState } from 'react';
import ProfileModal from './ProfileModal';
import { useAuth } from '../context/AuthContext';
import { Bot, Shield, LogOut, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ onOpenAiChat }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 text-lg leading-tight flex items-center gap-2">
            Smart Messenger
            <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Realtime &amp; AI
            </span>
          </h1>
          <p className="text-xs text-slate-400">Đồ án Cơ sở 4 • TCP/IP &amp; REST &amp; AI</p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Nút mở AI Assistant */}
        <button
          onClick={onOpenAiChat}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-medium hover:opacity-90 transition shadow-sm shadow-purple-500/20"
        >
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline">Hỏi Trợ lý AI</span>
        </button>

        {/* Nút Admin nếu có quyền */}
        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-medium border border-amber-200 transition"
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Quản trị Admin</span>
          </Link>
        )}

        {/* Thông tin user hiện tại */}
        <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-200">
          <button onClick={() => setProfileOpen(true)} title="Hồ sơ của tôi"><img
            src={user?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
            alt="Avatar"
            className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 object-cover"
          /></button>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-700 leading-none">{user?.fullName}</p>
            <p className="text-[11px] text-slate-400 leading-none mt-1">@{user?.username}</p>
          </div>

          <button
            onClick={handleLogout}
            title="Đăng xuất"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </header>
  );
}
