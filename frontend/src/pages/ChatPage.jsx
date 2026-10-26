import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import NewGroupModal from '../components/NewGroupModal';
import AiChatModal from '../components/AiChatModal';
import AiSummaryModal from '../components/AiSummaryModal';
import './ChatGlass.css';
import './DirectLayout.css';

export default function ChatPage() {
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [summaryConversationId, setSummaryConversationId] = useState(null);

  return (
    <div className="messenger-glass flex h-screen overflow-hidden">
      {/* Top Navbar */}
      <Navbar onOpenAiChat={() => setShowAiChat(true)} />

      {/* Main Body: Sidebar + Chat Window */}
      <div className="messenger-layout flex flex-1 min-w-0 min-h-0 overflow-hidden">
        <Sidebar onOpenNewGroup={() => setShowNewGroup(true)} />
        <ChatWindow onOpenAiSummary={(convId) => setSummaryConversationId(convId)} />
      </div>

      {/* Modals */}
      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} />}
      {showAiChat && <AiChatModal onClose={() => setShowAiChat(false)} />}
      {summaryConversationId && (
        <AiSummaryModal
          conversationId={summaryConversationId}
          onClose={() => setSummaryConversationId(null)}
        />
      )}
    </div>
  );
}
