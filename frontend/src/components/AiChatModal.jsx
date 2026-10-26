import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { Bot, Send, X, Sparkles, RotateCcw } from 'lucide-react';
import './AiChatStyles.css';

const welcome = 'Xin chào! Tôi là Trợ lý AI tích hợp trong Smart Messenger. Bạn muốn hỏi điều gì hôm nay?';

export default function AiChatModal({ onClose }) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([{ id: 0, sender: 'ai', text: welcome }]);
  const [loading, setLoading] = useState(false);
  const nextId = useRef(1);
  const busy = useRef(false);
  const request = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement;
    inputRef.current?.focus();
    const dialog = dialogRef.current;
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    dialog.addEventListener('keydown', onKey);
    return () => {
      request.current?.abort();
      dialog.removeEventListener('keydown', onKey);
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, loading]);

  const sendQuestion = async (text, retryId = null) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    const id = retryId ?? nextId.current++;
    // The user's bubble appears even when the backend/provider subsequently fails.
    setMessages(previous => retryId == null
      ? [...previous, { id, sender: 'user', text, status: 'pending' }]
      : previous.map(message => message.id === id ? { ...message, status: 'pending', error: '' } : message));
    const controller = new AbortController();
    request.current = controller;
    try {
      const { data } = await api.post('/ai/chat', { prompt: text }, { signal: controller.signal, timeout: 90000 });
      if (controller.signal.aborted) return;
      if (!data?.response?.trim()) throw new Error('AI trả về nội dung trống. Hãy thử lại.');
      const answerId = nextId.current++;
      setMessages(previous => [...previous.map(message => message.id === id ? { ...message, status: 'answered', error: '' } : message),
        { id: answerId, sender: 'ai', text: data.response }]);
    } catch (failure) {
      if (controller.signal.aborted) return;
      const detail = failure.response?.data?.message || failure.response?.data?.detail
        || (failure.code === 'ECONNABORTED' ? 'Backend chưa phản hồi trong 90 giây. Kiểm tra log backend rồi thử lại.'
          : failure.response ? `Dịch vụ AI trả lỗi HTTP ${failure.response.status}.`
          : failure.request ? 'Không nhận được phản hồi từ backend. Kiểm tra backend đang chạy.' : failure.message);
      setMessages(previous => previous.map(message => message.id === id
        ? { ...message, status: 'failed', error: detail } : message));
    } finally {
      if (!controller.signal.aborted) { busy.current = false; setLoading(false); }
    }
  };

  const handleSend = event => {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || busy.current) return;
    setPrompt('');
    sendQuestion(text);
  };

  return createPortal(
    <div className="ai-chat-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="ai-chat-dialog" role="dialog" aria-modal="true" aria-label="Trợ lý Thông minh AI">
        <header className="ai-chat-heading">
          <span className="ai-chat-logo"><Bot size={24} /></span>
          <div><h2>Trợ lý Thông minh AI <span>Gemini</span></h2><p>Hỏi đáp và hỗ trợ cùng Smart Messenger</p></div>
          <button type="button" className="ai-chat-close" onClick={onClose} aria-label="Đóng trợ lý AI"><X size={22} /></button>
        </header>
        <div className="ai-chat-messages" role="log" aria-label="Cuộc trò chuyện với AI" aria-live="polite" aria-relevant="additions text">
          {messages.map(message => <div key={message.id} className={`ai-chat-row ${message.sender === 'user' ? 'is-user' : 'is-ai'}`}>
            {message.sender === 'ai' && <span className="ai-chat-avatar" aria-hidden="true"><Bot size={17} /></span>}
            <div className="ai-chat-message-stack">
              <div className="ai-chat-bubble">{message.text}</div>
              {message.sender === 'user' && <span className="ai-chat-delivery">{message.status === 'pending' ? 'Đang chờ AI phản hồi' : message.status === 'failed' ? 'Chưa nhận được phản hồi' : 'Đã gửi'}</span>}
              {message.status === 'failed' && <div className="ai-chat-failure" role="alert"><p>{message.error}</p><button type="button" disabled={loading} onClick={() => sendQuestion(message.text, message.id)}><RotateCcw size={14} /> Thử lại câu hỏi này</button></div>}
            </div>
          </div>)}
          {loading && <div className="ai-chat-waiting" role="status"><Sparkles size={17} /><span>AI đang suy nghĩ...</span></div>}
          <div ref={endRef} />
        </div>
        <form onSubmit={handleSend} className="ai-chat-composer">
          <input ref={inputRef} type="text" aria-label="Câu hỏi cho AI" placeholder="Hỏi AI bất kỳ câu hỏi nào..." value={prompt} maxLength={4000} onChange={event => setPrompt(event.target.value)} />
          <button type="submit" disabled={!prompt.trim() || loading} aria-label="Gửi câu hỏi"><Send size={20} /></button>
        </form>
      </section>
    </div>, document.body,
  );
}
