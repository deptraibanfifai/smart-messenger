import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ProfileModal from '../components/ProfileModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Users,
  MessageSquare,
  Activity,
  UserX,
  UserCheck,
  Search,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function AdminPage() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }

    fetchAdminData();
  }, [isAdmin, navigate]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu quản trị:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'BANNED' : 'ACTIVE';
    const actionText = nextStatus === 'BANNED' ? 'Khóa' : 'Mở khóa';

    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản @${targetUser.username}?`)) {
      return;
    }

    try {
      await api.put(`/admin/users/${targetUser.id}/status`, { status: nextStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
      );
      // Refresh stats
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data);
    } catch (err) {
      alert('Không thể cập nhật trạng thái người dùng');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(filterKeyword.toLowerCase()) ||
      u.username.toLowerCase().includes(filterKeyword.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex gap-2"><button onClick={() => setProfileOpen(true)}>Hồ sơ</button><button onClick={() => { logout(); navigate('/login'); }}>Đăng xuất</button></div>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-base leading-tight">Admin Portal - Quản trị Hệ thống</h1>
            <p className="text-[11px] text-slate-400">Smart Messenger Dashboard &amp; User Control</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span>Đăng nhập với tư cách:</span>
          <span className="font-semibold text-slate-800">{user?.fullName}</span>
          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold text-[10px]">
            ADMIN
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 overflow-y-auto">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Tổng người dùng</p>
              <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats?.totalUsers || 0}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">User đang Online</p>
              <h3 className="text-xl font-bold text-emerald-600 mt-0.5">{stats?.onlineUsers || 0}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Tổng cuộc trò chuyện</p>
              <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats?.totalConversations || 0}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Tổng tin nhắn đã gửi</p>
              <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats?.totalMessages || 0}</h3>
            </div>
          </div>
        </div>

        {/* Users Management Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Quản lý Tài khoản Người dùng</h2>
              <p className="text-xs text-slate-400 mt-0.5">Khóa, mở khóa và theo dõi trạng thái hoạt động</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm kiếm user..."
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Người dùng</th>
                  <th className="py-3.5 px-5">Vai trò</th>
                  <th className="py-3.5 px-5">Trạng thái Realtime</th>
                  <th className="py-3.5 px-5">Tài khoản</th>
                  <th className="py-3.5 px-5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-5">
                      <div className="flex items-center space-x-3">
                        <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full bg-slate-100 object-cover" />
                        <div>
                          <p className="font-semibold text-slate-800">{u.fullName}</p>
                          <p className="text-[11px] text-slate-400">@{u.username}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.role === 'ROLE_ADMIN'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'ROLE_ADMIN' ? 'ADMIN' : 'USER'}
                      </span>
                    </td>

                    <td className="py-3 px-5">
                      {u.online ? (
                        <span className="flex items-center space-x-1.5 text-emerald-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Online</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">Offline</span>
                      )}
                    </td>

                    <td className="py-3 px-5">
                      {u.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                          <CheckCircle className="w-3 h-3" />
                          <span>Hoạt động</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Bị khóa</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-5 text-right">
                      {u.id !== user?.id && u.role !== 'ROLE_ADMIN' && (
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-3 py-1.5 rounded-xl font-medium transition text-xs inline-flex items-center space-x-1 ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Khóa tài khoản</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Mở khóa</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
