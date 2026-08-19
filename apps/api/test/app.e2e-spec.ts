import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Router API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/health (GET) is public and reports ok', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as { status: string };
        expect(body.status).toBe('ok');
      });
  });

  it('/api/auth/demo (POST) issues a bearer token for a demo session', () => {
    return request(app.getHttpServer())
      .post('/api/auth/demo')
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          accessToken: string;
          tokenType: string;
          user: { id: string; kind: string };
        };
        expect(body.tokenType).toBe('Bearer');
        expect(body.accessToken.split('.')).toHaveLength(3);
        expect(body.user.id).toMatch(/^demo-/);
        expect(body.user.kind).toBe('demo');
      });
  });

  it('/api/auth/register (POST) answers 501 coming-soon, not a fake success', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .expect(501)
      .expect((res) => {
        const body = res.body as { message: string };
        expect(body.message).toMatch(/coming soon/i);
      });
  });

  it('/api/route/stream (POST) rejects an unauthenticated request', () => {
    return request(app.getHttpServer())
      .post('/api/route/stream')
      .send({ prompt: 'hello', latencyBudget: 'balanced' })
      .expect(401);
  });

  it('/api/dashboard (GET) rejects an unauthenticated request', () => {
    return request(app.getHttpServer()).get('/api/dashboard').expect(401);
  });

  it('a demo token opens the protected surface (validation error ≠ auth error)', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/demo')
      .expect(200);
    const token = (login.body as { accessToken: string }).accessToken;

    // Invalid body on purpose: a 400 proves the request got PAST the auth
    // guard and into validation, without this test needing a live Ollama.
    await request(app.getHttpServer())
      .post('/api/route/stream')
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: '', latencyBudget: 'warp-speed' })
      .expect(400);
  });
});
