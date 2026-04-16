'use client';

import { useState } from 'react';
import ChatWindow from '@/components/ai-chat/ChatWindow';
import ConversationList from '@/components/ai-chat/ConversationList';

// ─── Page content ─────────────────────────────────────────────────────

export default function AiConsultantShell({
  connectionsSlot,
}: {
  connectionsSlot?: React.ReactNode;
} = {}) {
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNew = () => {
    setActiveConv(null);
    setMobileOpen(false);
  };

  const handleSelect = (id: string | null) => {
    setActiveConv(id);
    setMobileOpen(false);
  };

  const handleConversationCreated = (id: string) => {
    setActiveConv(id);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
          AI-консультант
        </h1>
        <p className="mt-2 text-gray-500 text-sm sm:text-base">
          Помощник по Яндекс.Директ, SEO и AEO — с доступом к реальным данным кабинетов
        </p>
      </header>

      {connectionsSlot}

      {/* Mobile: collapsible conversations dropdown */}
      <div className="lg:hidden mb-3">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 shadow-sm cursor-pointer"
        >
          <span className="font-medium">Диалоги</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className={`transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {mobileOpen && (
          <div className="mt-2 max-h-72">
            <ConversationList
              activeId={activeConv}
              onSelect={handleSelect}
              onNew={handleNew}
              refreshKey={refreshKey}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Desktop sidebar for conversations */}
        <div className="hidden lg:block lg:sticky lg:top-20 max-h-[calc(100vh-6rem)]">
          <ConversationList
            activeId={activeConv}
            onSelect={handleSelect}
            onNew={handleNew}
            refreshKey={refreshKey}
          />
        </div>

        <ChatWindow
          key={activeConv ?? 'new'}
          conversationId={activeConv}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
}
