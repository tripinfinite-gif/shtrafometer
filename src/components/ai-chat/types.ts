export type ChatRole = 'user' | 'assistant';

export interface ToolCallDisplay {
  id: string;
  name: string;
  status: 'start' | 'done' | 'error';
  summary?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  model?: string; // e.g. 'openai-gpt-4o', 'claude-sonnet-4.5', 'yandexgpt-5-pro'
  createdAt: number;
  streaming?: boolean;
  /** Phase 3 — вызовы инструментов в рамках ассистентского ответа. */
  toolCalls?: ToolCallDisplay[];
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
}

// Maps raw model id from API (header or payload) to display badge.
export function modelBadge(modelId?: string): { icon: string; label: string } | null {
  if (!modelId) return null;
  const lower = modelId.toLowerCase();
  if (lower.includes('openai') || lower.includes('gpt')) {
    return { icon: '⚡', label: 'OpenAI GPT-4o' };
  }
  if (lower.includes('claude') || lower.includes('anthropic') || lower.includes('sonnet')) {
    return { icon: '🧠', label: 'Claude Sonnet 4.5' };
  }
  if (lower.includes('yandex')) {
    return { icon: '🇷🇺', label: 'YandexGPT' };
  }
  return { icon: '✨', label: modelId };
}
