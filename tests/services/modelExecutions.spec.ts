import { beforeEach, describe, expect, it, vi } from 'vitest';

const { post, getLanguage } = vi.hoisted(() => ({
  post: vi.fn(),
  getLanguage: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({
  default: { post },
}));

vi.mock('../../src/composables/useElectronApi', () => ({
  useElectronApi: () => ({ getLanguage }),
}));

import { useModelExecutions } from '../../src/services/model/useModelExecutions';

describe('useModelExecutions', () => {
  const executionId = '018f1d8a-54d7-7d63-a1ee-5e9a6adca701';

  beforeEach(() => {
    post.mockReset().mockResolvedValue({ data: { executionId } });
    getLanguage.mockReset().mockResolvedValue('en');
  });

  it.each([
    ['summarizeResource', '/model/summarize'],
    ['translateResource', '/model/translate'],
    ['extractKeyPoints', '/model/key-points'],
    ['extractKeywords', '/model/keywords'],
    ['extractEntities', '/model/extract-entities'],
  ] as const)('returns the UUID from %s', async (method, endpoint) => {
    const executions = useModelExecutions();

    await expect(executions[method](7)).resolves.toEqual({ executionId });
    expect(post).toHaveBeenCalledWith(endpoint, expect.any(Object));
  });
});
