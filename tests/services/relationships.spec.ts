import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../../src/services/api', () => ({ default: api }));
vi.mock('../../src/services/notifications/executionPublication', () => ({
  subscribeExecutionPublication: vi.fn(),
}));

import { useRelationships } from '../../src/services/relationships/useRelationships';

describe('useRelationships', () => {
  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockReset());
  });

  it('reads graph data directly from the REST response', async () => {
    const graph = {
      entities: [{ id: 1, name: 'Ada', type: 'PERSON' }],
      relationships: [],
    };
    api.get.mockResolvedValue({ data: graph });

    const relationships = useRelationships();

    await expect(relationships.fetchByResource(7)).resolves.toEqual(graph);
    expect(api.get).toHaveBeenCalledWith('/relationships/resource/7');
    expect(relationships.data.value).toEqual(graph);
    expect(relationships.isLoading.value).toBe(false);
  });

  it('mutates a relationship without socket correlation fields', async () => {
    api.post.mockResolvedValue({ data: { success: true } });
    const dto = {
      subjectId: 1,
      predicate: 'created',
      objectId: 2,
      resourceId: 7,
    };

    const relationships = useRelationships();

    await relationships.createRelationship(dto);
    expect(api.post).toHaveBeenCalledWith('/relationships', dto);
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('requestId');
  });
});
