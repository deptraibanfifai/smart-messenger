import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import NewGroupModal from '../components/NewGroupModal';
import AiChatModal from '../components/AiChatModal';
import AiSummaryModal from '../components/AiSummaryModal';

export default function ChatPage() {
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [summaryConversationId, setSummaryConversationId] = useState(null);

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <Navbar onOpenAiChat={() => setShowAiChat(true)} />

      {/* Main Body: Sidebar + Chat Window */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
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
