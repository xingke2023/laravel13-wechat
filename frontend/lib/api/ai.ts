import { apiClient } from './client';

export type AiChatRole = 'system' | 'user' | 'assistant';

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

export interface AiChatRequest {
  messages: AiChatMessage[];
  system?: string;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface AiChatResponse {
  reply: string;
  model: string;
}

export const aiApi = {
  chat: (body: AiChatRequest, token: string) =>
    apiClient.post<AiChatResponse>('/ai/chat', body, token),
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export type AiStreamCallbacks = {
  onDelta?: (text: string) => void;
  onReasoning?: (text: string) => void;
  onError?: (message: string) => void;
};

/**
 * Stream chat reply from /api/ai/chat-stream via SSE.
 * Resolves when the server emits `data: [DONE]` or the body closes.
 * Throws on HTTP error (e.g. 401) before any chunks arrive.
 */
export async function aiChatStream(
  body: AiChatRequest,
  token: string,
  cb: AiStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/ai/chat-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    let detail = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(txt);
      detail = j.message || j.detail || detail;
    } catch {
      if (txt) detail = txt.slice(0, 200);
    }
    throw new Error(detail);
  }
  if (!res.body) throw new Error('Response body is not streamable');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIdx: number;
    while ((sepIdx = buffer.indexOf('\n\n')) >= 0) {
      const eventBlock = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      for (const line of eventBlock.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === '[DONE]') return;
        let parsed: { delta?: string; reasoning?: string; error?: string };
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }
        if (typeof parsed.delta === 'string' && parsed.delta && cb.onDelta) {
          cb.onDelta(parsed.delta);
        }
        if (typeof parsed.reasoning === 'string' && parsed.reasoning && cb.onReasoning) {
          cb.onReasoning(parsed.reasoning);
        }
        if (typeof parsed.error === 'string' && cb.onError) {
          cb.onError(parsed.error);
        }
      }
    }
  }
}
