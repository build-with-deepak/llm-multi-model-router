import { ClassifyService } from './classify.service';
import { DecisionService } from './decision.service';

const ALL_AVAILABLE = {
  ollama: true,
  openai: true,
  anthropic: true,
  gemini: true,
};
const LOCAL_ONLY = {
  ollama: true,
  openai: false,
  anthropic: false,
  gemini: false,
};

describe('DecisionService', () => {
  const service = new DecisionService(new ClassifyService());

  it('routes a sensitive prompt local even when every cloud provider is available', () => {
    const decision = service.decide(
      'Summarize this: my password is hunter2 and my email is a@b.com',
      'quality',
      ALL_AVAILABLE,
    );
    expect(decision.chosen.tier).toBe('local');
    expect(decision.sensitivity.sensitive).toBe(true);
    expect(decision.fallbackChain).toEqual([]); // sensitive traffic never falls back to cloud
  });

  it('routes a simple prompt local because free wins when capability suffices', () => {
    const decision = service.decide(
      'What is the capital of France?',
      'balanced',
      ALL_AVAILABLE,
    );
    expect(decision.chosen.tier).toBe('local');
  });

  it('routes a moderately complex prompt to the CHEAPEST adequate cloud model, not the best one', () => {
    const decision = service.decide(
      'Design a multi-region payments architecture and analyze the trade-offs step by step. Why eventual consistency? How do you handle partial failure? Compare and contrast the options.',
      'balanced',
      ALL_AVAILABLE,
    );
    // ~0.6 complexity → capability 3 floor → the cheapest capability-3
    // model wins. Paying premium prices for capability the prompt doesn't
    // need is exactly what the router exists to stop.
    expect(decision.chosen.tier).toBe('cloud');
    expect(decision.chosen.key).toBe('gemini-flash');
  });

  it('routes the hardest prompts to the premium model, since only it clears the capability floor', () => {
    const longContext =
      'Consider a payments platform processing card, wallet and bank transfers across regions with distinct regulators and settlement windows, uneven traffic, and strict audit requirements. '.repeat(
        7,
      );
    const decision = service.decide(
      `${longContext} Design the multi-region architecture and analyze the trade-offs step by step. Why eventual consistency? How do you handle partial failure? Compare and contrast the options.`,
      'quality',
      ALL_AVAILABLE,
    );
    expect(decision.complexity.score).toBeGreaterThanOrEqual(0.75);
    expect(decision.chosen.key).toBe('claude-sonnet');
  });

  it('excludes slow models under a fast latency budget', () => {
    const decision = service.decide(
      'Translate "hello" to French',
      'fast',
      ALL_AVAILABLE,
    );
    expect(decision.chosen.latencyClass).not.toBe('slow');
    expect(decision.chosen.tier).toBe('cloud');
  });

  it('falls back to local when no cloud provider is configured, and says so', () => {
    const decision = service.decide(
      'Design a distributed system and explain the trade-offs step by step, why and how',
      'quality',
      LOCAL_ONLY,
    );
    expect(decision.chosen.tier).toBe('local');
    expect(decision.reasons.join(' ')).toMatch(/falling back to local/i);
  });

  it('marks unconfigured providers as such in the candidate views', () => {
    const decision = service.decide('hello there', 'balanced', LOCAL_ONLY);
    const cloudCandidates = decision.candidates.filter(
      (c) => c.tier === 'cloud',
    );
    expect(cloudCandidates.length).toBeGreaterThan(0);
    for (const candidate of cloudCandidates) {
      expect(candidate.available).toBe(false);
      expect(candidate.note).toContain('not configured');
    }
  });

  it('always terminates a cloud fallback chain at local inference', () => {
    const decision = service.decide(
      'Compare and contrast two database architectures step by step, why and how?',
      'balanced',
      ALL_AVAILABLE,
    );
    if (decision.chosen.tier === 'cloud') {
      const last = decision.fallbackChain[decision.fallbackChain.length - 1];
      expect(last.tier).toBe('local');
    }
  });
});
