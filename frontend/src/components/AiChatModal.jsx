import React, { useState } from 'react';
import api from '../services/api';
import { Bot, Send, X, Sparkles } from 'lucide-react';

export default function AiChatModal({ onClose }) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI tích hợp trong hệ thống Smart Messenger. Tôi có thể hỗ trợ giải đáp thắc mắc, viết code hoặc tóm tắt kiến thức cho bạn.',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userText = prompt.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { prompt: userText });
      setMessages((prev) => [...prev, { sender: 'ai', text: res.data.response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: err.response?.data?.message || 'Không kết nối được dịch vụ AI.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 flex flex-col h-[600px] max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                Trợ lý Thông minh AI
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  Gemini
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Tích hợp dịch vụ AI qua REST API</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 my-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm whitespace-pre-wrap'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center space-x-2 text-xs text-purple-600 bg-purple-50 p-2.5 rounded-xl w-fit">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>AI đang suy nghĩ câu trả lời...</span>
            </div>
          )}
        </div>

        {/* Input prompt */}
        <form onSubmit={handleSend} className="pt-2 border-t border-slate-100 flex items-center space-x-2">
          <input
            type="text"
            placeholder="Hỏi AI bất kỳ câu hỏi nào..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="flex-1 px-3.5 py-2 bg-slate-100 border-none rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="p-2 text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-xl transition shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
