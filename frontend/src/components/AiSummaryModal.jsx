import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Sparkles, X, Copy, Check } from 'lucide-react';

export default function AiSummaryModal({ conversationId, onClose }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!conversationId) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setSummary('');
    api.post('/ai/summary', { conversationId }, { signal: controller.signal, timeout: 100000 })
      .then((res) => {
        setSummary(res.data.response);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setSummary('');
        setError(err.response?.data?.message || (err.code === 'ECONNABORTED'
          ? 'AI tóm tắt chưa phản hồi kịp. Thử lại sau.'
          : 'Không thể tạo bản tóm tắt lúc này.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [conversationId, retry]);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tóm tắt cuộc trò chuyện bằng AI</h3>
              <p className="text-[11px] text-slate-400">Gemini AI tự động trích xuất ý chính và quyết định quan trọng</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto my-4 p-4 bg-slate-50 rounded-xl border border-slate-100 min-h-[150px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-purple-600 space-y-2">
              <Sparkles className="w-6 h-6 animate-spin" />
              <p className="text-xs font-medium">AI đang đọc lịch sử tin nhắn và tổng hợp...</p>
            </div>
          ) : error ? (
            <div role="alert" className="text-sm text-rose-700">
              <p>{error}</p>
              <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 rounded-lg bg-rose-100 px-3 py-1.5 font-semibold hover:bg-rose-200">Thử lại</button>
            </div>
          ) : (
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {summary}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleCopy}
            disabled={loading || !summary || !!error}
            className="flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-purple-600 transition disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép nội dung'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
