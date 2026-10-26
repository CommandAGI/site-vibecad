import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateText } from '../lib/ai';

/**
 * The model adapter's boundaries: one OpenRouter chat-completions call, its streaming frames, its usage and its
 * failures. Nothing here contacts a provider; a fake `fetch` stands at that edge.
 */
let keyIndex = 0;
beforeEach(() => { vi.stubEnv('OPENROUTER_API_KEY', `test-only-key-${++keyIndex}`); vi.stubEnv('OPENROUTER_MODEL', ''); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const completed = (text: string, usage: Record<string, unknown> = { prompt_tokens: 20000, completion_tokens: 9000, cost: 0.0136 }) => Response.json({ choices: [{ index: 0, finish_reason: 'stop', message: { content: text } }], usage });
function sse(frames: unknown[]) {
  const bytes = new TextEncoder().encode(frames.map(frame => `data: ${JSON.stringify(frame)}\r\n\r\n`).join('') + 'data: [DONE]\r\n\r\n');
  return new Response(new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); } }), { headers: { 'content-type': 'text/event-stream' } });
}
const delta = (content: string) => ({ choices: [{ index: 0, delta: { content } }] });

describe('one chat-completions call', () => {
  it('sends the system and user messages, asks for usage, and returns the answer', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(completed('{"ready":true}'));
    vi.stubGlobal('fetch', fetcher);
    const result = await generateText('Keep the checks.', 'Create an object.', { json: true, maxTokens: 4000 });
    expect(fetcher.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/chat/completions');
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body).toMatchObject({ model: 'deepseek/deepseek-chat-v3.1', temperature: 0.2, max_tokens: 4000, usage: { include: true }, response_format: { type: 'json_object' } });
    expect(body.messages).toEqual([{ role: 'system', content: 'Keep the checks.' }, { role: 'user', content: 'Create an object.' }]);
    expect(fetcher.mock.calls[0][1].headers.authorization).toBe('Bearer test-only-key-1');
    expect(result.text).toBe('{"ready":true}');
    expect(JSON.stringify(result)).not.toContain('test-only-key');
  });

  it('carries image and PDF evidence as content parts', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(completed('seen'));
    vi.stubGlobal('fetch', fetcher);
    await generateText('System', 'User', { attachments: [{ mimeType: 'application/pdf', data: 'JVBERi0=' }, { mimeType: 'image/jpeg', data: '/9j/' }] });
    const content = JSON.parse(fetcher.mock.calls[0][1].body).messages[1].content;
    expect(content[0]).toEqual({ type: 'text', text: 'User' });
    expect(content[1].file.file_data).toBe('data:application/pdf;base64,JVBERi0=');
    expect(content[2].image_url.url).toBe('data:image/jpeg;base64,/9j/');
  });

  it('reports the provider usage and its cost', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(completed('done', { prompt_tokens: 20000, completion_tokens: 9000, cached_tokens: 100, cost: 0.0123 })));
    const report = vi.fn();
    const result = await generateText('System', 'User', { onPerformance: report });
    expect(result.performance).toMatchObject({ transport: 'chat', inputTokens: 20000, outputTokens: 9000, cachedTokens: 100, estimatedCostUsd: 0.0123 });
    expect(report).toHaveBeenCalledOnce();
  });

  it('decodes split UTF-8 SSE frames and publishes each partial answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(sse([delta('{"name":"Café'), delta('"}')])));
    const partial = vi.fn();
    const result = await generateText('System', 'User', { onPartial: partial });
    expect(result.text).toBe('{"name":"Café"}');
    expect(partial.mock.calls.at(-1)?.[0]).toBe('{"name":"Café"}');
    expect(result.performance?.firstTokenMs).toEqual(expect.any(Number));
  });

  it('takes usage from the last streamed frame', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(sse([delta('ok'), { choices: [], usage: { prompt_tokens: 10, completion_tokens: 2, cost: 0.0001 } }])));
    const result = await generateText('System', 'User', { onPartial: () => { } });
    expect(result.performance).toMatchObject({ inputTokens: 10, outputTokens: 2, estimatedCostUsd: 0.0001 });
  });
});

describe('the model adapter refuses what it cannot trust', () => {
  it('reports a provider limit as its own error, without the response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret=NEVER-RETURN', { status: 429 })));
    await expect(generateText('System', 'User')).rejects.toMatchObject({ code: 'quota' });
  });

  it('moves to the next configured model when one is unavailable', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 404 })).mockResolvedValueOnce(completed('second model answered'));
    vi.stubGlobal('fetch', fetcher);
    const result = await generateText('System', 'User');
    expect(result.model).toBe('moonshotai/kimi-k2.5');
    expect(result.text).toBe('second model answered');
  });

  it('does not move to another model when the deploy named one', async () => {
    vi.stubEnv('OPENROUTER_MODEL', 'qwen/qwen3.8-max-0902');
    const fetcher = vi.fn().mockResolvedValueOnce(new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(generateText('System', 'User')).rejects.toMatchObject({ code: 'model_unavailable' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rejects a malformed stream instead of returning partial JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('data: {bad-json}\n\n', { headers: { 'content-type': 'text/event-stream' } })));
    await expect(generateText('System', 'User', { onPartial: () => { } })).rejects.toMatchObject({ code: 'invalid_output' });
  });

  it('rejects an answer that exceeds the output limit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(completed('x'.repeat(240_001))));
    await expect(generateText('System', 'User')).rejects.toMatchObject({ code: 'invalid_output' });
  });

  it('stops a stalled stream when the caller cancels, and cancels the body', async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(delta('partial'))}\n\n`)); }, cancel });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(stream)));
    const abort = new AbortController();
    const pending = generateText('System', 'User', { onPartial: () => abort.abort(), signal: abort.signal });
    await expect(pending).rejects.toMatchObject({ code: 'aborted' });
    expect(cancel).toHaveBeenCalled();
  });
});
