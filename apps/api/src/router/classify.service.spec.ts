import { ClassifyService } from './classify.service';

describe('ClassifyService', () => {
  const service = new ClassifyService();

  describe('sensitivity', () => {
    it('flags an email address', () => {
      const result = service.sensitivity(
        'Contact john.doe@example.com about the invoice',
      );
      expect(result.sensitive).toBe(true);
      expect(result.categories).toContain('email address');
    });

    it('flags credential keywords', () => {
      const result = service.sensitivity('my api_key is not working');
      expect(result.sensitive).toBe(true);
      expect(result.categories).toContain('credential keyword');
    });

    it('flags card-like digit runs', () => {
      const result = service.sensitivity('charge 4111 1111 1111 1111 please');
      expect(result.sensitive).toBe(true);
    });

    it('reports category names, never the matched text', () => {
      const result = service.sensitivity('mail me at secret.person@corp.com');
      expect(JSON.stringify(result)).not.toContain('secret.person');
    });

    it('passes an ordinary prompt', () => {
      const result = service.sensitivity('Explain how DNS resolution works');
      expect(result.sensitive).toBe(false);
      expect(result.categories).toEqual([]);
    });
  });

  describe('complexity', () => {
    it('scores a short factual prompt low', () => {
      const result = service.complexity('What is the capital of France?');
      expect(result.score).toBeLessThan(0.45);
    });

    it('scores a reasoning-heavy architecture prompt high', () => {
      const result = service.complexity(
        'Design a multi-region architecture for a payments system and walk through the trade-offs step by step. Why would you choose eventual consistency? How would you handle partial failure?',
      );
      expect(result.score).toBeGreaterThanOrEqual(0.6);
      expect(result.signals.join(' ')).toContain('reasoning');
    });

    it('counts code as a complexity signal', () => {
      const result = service.complexity(
        'Fix this: ```function f(){return 1}```',
      );
      expect(result.signals).toContain('contains code');
    });

    it('never exceeds 1', () => {
      const longPrompt =
        'why how prove derive step by step compare and contrast optimize refactor debug ? ? ? ```code``` ' +
        'word '.repeat(200);
      expect(service.complexity(longPrompt).score).toBeLessThanOrEqual(1);
    });
  });
});
