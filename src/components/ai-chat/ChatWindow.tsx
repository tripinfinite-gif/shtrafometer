'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { modelBadge, type ChatMessage, type ToolCallDisplay } from './types';
import { sendMessage, type ToolEvent } from './sendMessage';

function ToolCallsList({ items }: { items: ToolCallDisplay[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1 text-xs">
      {items.map((t) => {
        const color =
          t.status === 'error'
            ? 'text-red-600 border-red-200 bg-red-50'
            : t.status === 'done'
              ? 'text-gray-600 border-gray-200 bg-gray-50'
              : 'text-primary border-primary/20 bg-primary-lighter/30';
        const icon = t.status === 'error' ? '⚠️' : t.status === 'done' ? '✅' : '🔧';
        return (
          <div
            key={t.id}
            className={`inline-flex items-start gap-1.5 rounded-md border px-2 py-1 font-mono ${color}`}
            title={t.error ?? t.summary ?? ''}
          >
            <span aria-hidden>{icon}</span>
            <span className="font-semibold">{t.name}</span>
            {t.summary && <span className="text-gray-500">— {t.summary}</span>}
            {t.error && <span className="text-red-600">— {t.error}</span>}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatWindow({ conversationId, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset messages on conversation switch
  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [conversationId]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Textarea auto-grow
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  const streaming = useMemo(() => messages.some((m) => m.streaming), [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };
    const assistantId = genId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const result = await sendMessage(
        text,
        conversationId ?? undefined,
        (delta) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m
            )
          );
        },
        (evt: ToolEvent) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== assistantId) return m;
              const existing = m.toolCalls ?? [];
              const idx = existing.findIndex((t) => t.id === evt.id);
              const next: ToolCallDisplay[] =
                idx >= 0
                  ? existing.map((t, i) => (i === idx ? { ...t, ...evt } : t))
                  : [...existing, { ...evt }];
              return { ...m, toolCalls: next };
            })
          );
        }
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false, model: result.model } : m
        )
      );
      if (result.conversationId && result.conversationId !== conversationId) {
        onConversationCreated?.(result.conversationId);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка отправки';
      setError(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, streaming: false, content: m.content || '_Ошибка: ' + msg + '_' }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, onConversationCreated]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full min-h-[520px]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && !streaming && (
          <EmptyState />
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {error && (
          <div
            className="text-xs text-red border rounded-lg px-3 py-2"
            style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-gray-100 p-3 sm:p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={sending}
            placeholder="Спросите про Директ, РСЯ, SEO, Метрику… (Enter — отправить, Shift+Enter — новая строка)"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary-lighter outline-none px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 disabled:opacity-60 transition-colors"
            style={{ maxHeight: 200 }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {sending ? (
              <>
                <Spinner /> <span className="hidden sm:inline">Отправка</span>
              </>
            ) : (
              <>
                <SendIcon /> <span className="hidden sm:inline">Отправить</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center py-8">
      <div className="w-12 h-12 rounded-full bg-primary-lighter flex items-center justify-center mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 12a8 8 0 0 1-11.7 7.1L4 20l1-4.7A8 8 0 1 1 21 12Z"
            stroke="#6C5CE7"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-base font-medium text-gray-800">Чат готов к работе</p>
      <p className="mt-1 text-sm text-gray-500 max-w-md">
        Задайте вопрос про Яндекс.Директ, SEO или AEO. Маршрутизатор подберёт оптимальную модель.
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const badge = modelBadge(message.model);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%] bg-primary text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[95%] sm:max-w-[85%] flex flex-col gap-1.5">
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallsList items={message.toolCalls} />
        )}
        <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-4 py-3 text-sm shadow-sm">
          {message.content ? (
            <div className="chat-md leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <TypingDots />
          )}
          {message.streaming && message.content && (
            <span className="inline-block w-1.5 h-3 bg-gray-400 ml-0.5 align-middle animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-3 px-1 text-xs text-gray-500">
          {badge && (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>{badge.icon}</span>
              {badge.label}
            </span>
          )}
          {!message.streaming && message.content && (
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
            >
              <CopyIcon />
              {copied ? 'Скопировано' : 'Копировать'}
            </button>
          )}
          {/* TODO (2A coordination): if /api/admin/ai/chat does not return X-AI-Model header,
              badge will be absent — coordinate header name with agent 2A. */}
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12l16-8-6 16-2-7-8-1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
