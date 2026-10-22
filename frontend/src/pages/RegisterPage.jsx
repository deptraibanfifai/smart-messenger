import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Lock, User, UserCheck, AlertCircle, ArrowRight } from 'lucide-react';
import GoogleSignIn from '../components/GoogleSignIn';
import './AuthGlass.css';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('details');
  const [error, setError] = useState('');
  const { register, verifyEmail, googleLogin, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !fullName || !email) {
      setError('Vui lòng điền đầy đủ các trường thông tin');
      return;
    }

    setError('');
    const res = await register(username, password, fullName, email);
    if (res.success) {
      setStep('verify');
    } else {
      setError(res.message);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    const res = await verifyEmail(email, code);
    if (res.success) navigate('/', { replace: true });
    else setError(res.message);
  };

  const handleGoogle = async (credential) => {
    setError('');
    const res = await googleLogin(credential);
    if (res.success) navigate(res.user?.role === 'ROLE_ADMIN' ? '/admin' : '/', { replace: true });
    else setError(res.message);
  };

  return (
    <div className="auth-scene">
      <div className="auth-glass">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-sky-500/30">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Tạo tài khoản mới</h1>
          <p className="text-xs text-slate-500 mt-1">Gia nhập mạng lưới giao tiếp Smart Messenger</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Register Form */}
        {step === 'details' ? <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Họ và tên hiển thị</label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
            <input type="email" required maxLength={254} autoComplete="email"
              placeholder="ban@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-sky-500 outline-none transition" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Tên đăng nhập (Username)</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="VD: nguyenvana..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold rounded-xl hover:opacity-95 transition shadow-md shadow-sky-500/25 flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form> : <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-slate-700">Nhập mã 6 chữ số đã gửi tới <strong>{email}</strong>. Mã có hiệu lực 10 phút.</p>
          <input type="text" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
            autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="Mã xác minh" className="w-full px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500" />
          <button disabled={loading} className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold rounded-xl disabled:opacity-50">
            {loading ? 'Đang xác minh...' : 'Xác minh và tạo tài khoản'}
          </button>
          <button type="button" onClick={() => { setStep('details'); setCode(''); }} className="text-xs text-sky-700 hover:underline">Sửa thông tin hoặc gửi lại mã</button>
        </form>}

        <div className="mt-5 text-center text-xs text-slate-500">Hoặc tiếp tục với Google</div>
        <div className="mt-3"><GoogleSignIn onCredential={handleGoogle} disabled={loading} /></div>

        {/* Link to Login */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-sky-600 font-bold hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
