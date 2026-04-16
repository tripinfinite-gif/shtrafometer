// Client helper for streaming chat responses from /api/admin/ai/chat.
//
// Contract (Phase 2A + Phase 3 tool events):
//   Content-Type: application/x-ndjson
//   Each line is a JSON object with shape:
//     { type: 'meta',  conversationId, provider, model }
//     { type: 'delta', text }
//     { type: 'tool',  id, name, status: 'start'|'done'|'error', summary?, error? }
//     { type: 'done',  usage: { input, output, cacheRead }, finishReason }
//     { type: 'error', message }

export interface SendMessageResult {
  model?: string;
  provider?: string;
  conversationId?: string;
  usage?: { input: number; output: number; cacheRead?: number };
}

export interface ToolEvent {
  id: string;
  name: string;
  status: 'start' | 'done' | 'error';
  summary?: string;
  error?: string;
}

type StreamEvent =
  | { type: 'meta'; conversationId?: string; provider?: string; model?: string }
  | { type: 'delta'; text: string }
  | {
      type: 'tool';
      id: string;
      name: string;
      status: 'start' | 'done' | 'error';
      summary?: string;
      error?: string;
    }
  | { type: 'done'; usage?: { input: number; output: number; cacheRead?: number }; finishReason?: string }
  | { type: 'error'; message: string };

export async function sendMessage(
  message: string,
  conversationId: string | undefined,
  onChunk: (delta: string) => void,
  onToolOrSignal?: ((evt: ToolEvent) => void) | AbortSignal,
  maybeSignal?: AbortSignal,
): Promise<SendMessageResult> {
  // Back-compat overload: 4-й аргумент мог быть AbortSignal в старом API.
  let onTool: ((evt: ToolEvent) => void) | undefined;
  let signal: AbortSignal | undefined;
  if (onToolOrSignal instanceof AbortSignal) {
    signal = onToolOrSignal;
  } else {
    onTool = onToolOrSignal;
    signal = maybeSignal;
  }

  const res = await fetch('/api/admin/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationId }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Chat API error ${res.status}: ${text || res.statusText}`);
  }

  if (!res.body) {
    throw new Error('Пустой ответ от сервера (нет body)');
  }

  const result: SendMessageResult = { conversationId };
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let evt: StreamEvent;
    try {
      evt = JSON.parse(trimmed) as StreamEvent;
    } catch {
      // tolerate stray non-JSON text (fallback)
      onChunk(trimmed);
      return;
    }
    switch (evt.type) {
      case 'meta':
        if (evt.conversationId) result.conversationId = evt.conversationId;
        if (evt.model) result.model = evt.model;
        if (evt.provider) result.provider = evt.provider;
        break;
      case 'delta':
        if (evt.text) onChunk(evt.text);
        break;
      case 'tool':
        if (onTool) {
          onTool({
            id: evt.id,
            name: evt.name,
            status: evt.status,
            summary: evt.summary,
            error: evt.error,
          });
        }
        break;
      case 'done':
        if (evt.usage) result.usage = evt.usage;
        break;
      case 'error':
        throw new Error(evt.message || 'Stream error');
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      processLine(line);
    }
  }
  const tail = (buffer + decoder.decode()).trim();
  if (tail) processLine(tail);

  return result;
}
