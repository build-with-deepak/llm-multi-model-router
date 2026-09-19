import { ServiceUnavailableException } from '@nestjs/common';
import { OllamaProvider } from './ollama.provider';
import type { ModelSpec } from '../catalog';

const SPEC: ModelSpec = {
  key: 'local-llama3',
  provider: 'ollama',
  model: 'llama3:8b',
  displayName: 'Llama 3 8B (self-hosted)',
  tier: 'local',
  inputPer1M: 0,
  outputPer1M: 0,
  capability: 2,
  latencyClass: 'slow',
};

const makeProvider = () =>
  new OllamaProvider({
    get: () => ({ ollama: { baseUrl: 'http://localhost:11434', model: '' } }),
  } as never);

/** An Ollama-shaped NDJSON stream body from a fixed list of chunks. */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i] + '\n'));
      i++;
    },
  });
}

/** A body that yields one chunk, then never resolves again — a stalled stream. */
function stalledStreamAfter(chunk: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let sent = false;
  return new ReadableStream({
    pull(controller) {
      if (!sent) {
        sent = true;
        controller.enqueue(encoder.encode(chunk + '\n'));
      }
      // Otherwise: never call close/enqueue/error — the read this backs
      // never settles, which is exactly what the idle-read timeout exists
      // to bound.
    },
  });
}

describe('OllamaProvider', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = realFetch;
  });

  it('returns the generated text on a normal, fast response', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(streamOf(['{"response":"4"}', '{"done":true,"eval_count":3,"prompt_eval_count":5}'])),
    );

    const result = await makeProvider().complete(SPEC, 'What is 2+2?');

    expect(result.text).toBe('4');
    expect(result.outputTokens).toBe(3);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // Ollama unloads an idle model and reloads it from disk on the next
  // request — routinely 10–20s for an 8B model. That is normal operation,
  // not a fault, and the whole point of the retry is that a visitor should
  // never see an error for it.
  it('retries once and succeeds when the first attempt times out connecting (cold start)', async () => {
    const hangingFetch = () =>
      new Promise((_, reject) => {
        // Real fetch rejects with an AbortError when its signal fires;
        // this mirrors that without needing a real network call.
      });
    global.fetch = jest
      .fn()
      .mockImplementationOnce(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }),
      )
      .mockResolvedValueOnce(new Response(streamOf(['{"response":"4"}', '{"done":true}'])));

    const promise = makeProvider().complete(SPEC, 'What is 2+2?');
    await jest.advanceTimersByTimeAsync(20_000); // fires the connect timeout on attempt 1

    const result = await promise;
    expect(result.text).toBe('4');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('fails with a clear, non-alarming message after both attempts time out', async () => {
    global.fetch = jest.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );

    const promise = makeProvider().complete(SPEC, 'What is 2+2?');
    // Attach the rejection handler before advancing time — the promise
    // rejects as soon as the second timer fires, and asserting on it only
    // afterwards leaves it briefly unhandled, which Node (rightly) flags.
    const assertion = expect(promise).rejects.toThrow(/loading after being idle/);

    // Let both attempts' connect timeouts fire in sequence.
    await jest.advanceTimersByTimeAsync(20_000);
    await jest.advanceTimersByTimeAsync(20_000);

    await assertion;
    await expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  // A stream that starts and then goes silent is a different failure than a
  // connection that never opens — a plain fetch/AbortController timeout on
  // the initial request does not cover it, because the request already
  // succeeded. This is what the per-read idle timeout is for.
  it('treats a stalled stream (data stops mid-response) as a failure and retries', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response(stalledStreamAfter('{"response":"Thinking"}')))
      .mockResolvedValueOnce(new Response(streamOf(['{"response":"4"}', '{"done":true}'])));

    const promise = makeProvider().complete(SPEC, 'What is 2+2?');
    await jest.advanceTimersByTimeAsync(45_000); // fires the idle-read timeout

    const result = await promise;
    expect(result.text).toBe('4');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('treats a non-OK HTTP response as a failure rather than returning empty text', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 503 }));

    await expect(makeProvider().complete(SPEC, 'x')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
