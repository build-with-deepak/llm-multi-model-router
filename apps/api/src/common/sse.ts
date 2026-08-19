import type { Response } from 'express';

/**
 * Manual SSE over a POST response, instead of Nest's @Sse decorator.
 *
 * @Sse only mounts GET handlers, and GET means the prompt rides in the
 * query string — length-capped and logged by every proxy on the path. A
 * POST body has neither problem, and fetch-based streaming on the client
 * can send a real Authorization header, which EventSource cannot. The cost
 * is writing the event framing ourselves; it is four lines.
 */
export class SseWriter {
  private closed = false;

  constructor(private readonly res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.on('close', () => {
      this.closed = true;
    });
  }

  get isClosed(): boolean {
    return this.closed;
  }

  send(type: string, data: unknown): void {
    if (this.closed) return;
    this.res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  end(): void {
    if (this.closed) return;
    this.closed = true;
    this.res.end();
  }
}
