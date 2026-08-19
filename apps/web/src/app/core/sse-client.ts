/**
 * Fetch-based SSE consumption over POST.
 *
 * EventSource — the built-in SSE API — only speaks GET and cannot set an
 * Authorization header, which would force the prompt into a query string
 * and the token into a URL. fetch + ReadableStream has neither limit; the
 * cost is parsing the `event:`/`data:` framing ourselves, which is this
 * one small function.
 */
export interface SseEvent {
  type: string;
  data: unknown;
}

export async function* streamSse(
  url: string,
  body: unknown,
  token: string,
  signal?: AbortSignal,
): AsyncGenerator<SseEvent> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status}).`;
    try {
      const parsed = (await res.json()) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) message = parsed.message.join(' ');
      else if (parsed.message) message = parsed.message;
    } catch {
      // non-JSON error body — keep the status-based message
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex: number;
      while ((separatorIndex = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        let type = 'message';
        const dataLines: string[] = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event: ')) type = line.slice(7).trim();
          else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
        }
        if (dataLines.length > 0) {
          yield { type, data: JSON.parse(dataLines.join('\n')) };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
