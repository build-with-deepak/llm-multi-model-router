import { streamSse } from './sse-client';

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('streamSse', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the prompt as a POST body with a real Authorization header', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(sseResponse([]));

    const events = [];
    for await (const event of streamSse('/api/route/stream', { prompt: 'hi' }, 'tok-123')) {
      events.push(event);
    }

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/route/stream');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-123');
    expect(JSON.parse(init?.body as string)).toEqual({ prompt: 'hi' });
    expect(events).toEqual([]);
  });

  it('parses named events, including one split across network chunks', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      sseResponse([
        'event: decision\ndata: {"chosen":"local"}\n\n',
        'event: tok', // event split mid-frame across two reads
        'en\ndata: {"text":"Hel',
        'lo"}\n\nevent: done\ndata: {}\n\n',
      ]),
    );

    const events = [];
    for await (const event of streamSse('/x', {}, 't')) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'decision', data: { chosen: 'local' } },
      { type: 'token', data: { text: 'Hello' } },
      { type: 'done', data: {} },
    ]);
  });

  it('surfaces the API error message from a non-OK response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Prompt is too long' }), { status: 400 }),
    );

    const iterate = async () => {
      for await (const event of streamSse('/x', {}, 't')) void event;
    };
    await expect(iterate()).rejects.toThrow('Prompt is too long');
  });
});
