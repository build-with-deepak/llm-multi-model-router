import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SseWriter } from '../common/sse';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { RouteRequestDto } from './dto/route.dto';
import { RouteService } from './route.service';

@Controller('api/route')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  /** POST + manual SSE — see the note on SseWriter for why not @Sse. */
  @Post('stream')
  async stream(
    @Body() dto: RouteRequestDto,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const writer = new SseWriter(res);
    try {
      await this.routeService.run(
        req.user.sub,
        dto.prompt,
        dto.latencyBudget,
        (type, data) => writer.send(type, data),
      );
    } catch (err) {
      // run() is designed not to throw; this is the backstop that keeps a
      // surprise from leaving the response open forever.
      writer.send('error', {
        message: (err as Error).message || 'Something went wrong.',
      });
    } finally {
      writer.end();
    }
  }
}
