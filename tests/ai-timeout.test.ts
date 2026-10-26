import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateText } from '../lib/ai';

/** Every model call has a deadline of its own, and a stalled body keeps it. */
let keyIndex = 0;
beforeEach(() => {
  vi.stubEnv('OPENROUTER_API_KEY', `timeout-test-key-${++keyIndex}`);
  vi.stubEnv('OPENROUTER_MODEL', '');
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('bounded model generation timeouts', () => {
  it('uses a two-minute default deadline', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'A bounded response.' } }] })));
    expect((await generateText('System', 'User')).text).toBe('A bounded response.');
    expect(timeout.mock.calls.map(call => call[0])).toEqual([120_000]);
  });
  it.each([
    [240_000, 240_000], [500_000, 240_000], [1_000, 10_000], [-1, 10_000],
    [90_000.8, 90_000], [Number.NaN, 120_000], [Number.POSITIVE_INFINITY, 120_000],
  ])('bounds explicit timeout %s to %s milliseconds', async (override, expected) => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'ok' } }] })));
    await generateText('System', 'User', { timeoutMs: override });
    expect(timeout.mock.calls.map(call => call[0])).toEqual([expected]);
  });
  it('keeps the deadline on a stalled body after the headers arrive, and cancels the stream', async () => {
    const deadline = new AbortController(), realTimeout = AbortSignal.timeout.bind(AbortSignal), cancel = vi.fn();
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => ms === 10_000 ? deadline.signal : realTimeout(ms));
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')); }, cancel })));
    vi.stubGlobal('fetch', fetcher);
    const partial = vi.fn();
    const pending = generateText('System', 'User', { timeoutMs: 10000, onPartial: partial });
    await vi.waitFor(() => expect(partial).toHaveBeenCalledWith('partial'));
    deadline.abort(new DOMException('Deadline', 'TimeoutError'));
    await expect(pending).rejects.toMatchObject({ code: 'timeout' });
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
