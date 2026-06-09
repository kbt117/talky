export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  ctx: string;
}

export const DEFAULT_API_KEY = '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';

export const MODELS: Model[] = [
  { id: 'poolside/laguna-m.1:free', name: 'Laguna M.1', provider: 'Poolside', ctx: '131K' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1', provider: 'DeepSeek', ctx: '64K' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3', provider: 'DeepSeek', ctx: '64K' },
  { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B', provider: 'Alibaba', ctx: '128K' },
  { id: 'qwen/qwen3-30b-a3b:free', name: 'Qwen3 30B', provider: 'Alibaba', ctx: '128K' },
  { id: 'meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick', provider: 'Meta', ctx: '1M' },
  { id: 'meta-llama/llama-4-scout:free', name: 'Llama 4 Scout', provider: 'Meta', ctx: '128K' },
  { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', provider: 'Google', ctx: '128K' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1', provider: 'Mistral', ctx: '128K' },
  { id: 'x-ai/grok-3-mini-beta:free', name: 'Grok 3 Mini', provider: 'xAI', ctx: '131K' },
];

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function* streamChat(
  apiKey: string,
  messages: Message[],
  model: string,
  signal?: AbortSignal
): AsyncGenerator<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Lite AI Chat',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip malformed JSON chunks
      }
    }
  }
}

export function getStoredKey(): string {
  return localStorage.getItem('liteai_api_key') || DEFAULT_API_KEY;
}

export function storeKey(key: string) {
  localStorage.setItem('liteai_api_key', key);
}

export function getStoredModel(): string {
  return localStorage.getItem('liteai_model') || MODELS[0].id;
}

export function storeModel(model: string) {
  localStorage.setItem('liteai_model', model);
}
