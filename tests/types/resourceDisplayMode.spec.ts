import { describe, expect, it } from 'vitest';
import {
  toResourceContentMode,
  type ResourceContentMode,
  type ResourceDisplayMode,
} from '../../src/types/ResourceDisplayMode';

describe('toResourceContentMode', () => {
  it.each<[ResourceDisplayMode, ResourceContentMode]>([
    ['extracted', 'extracted'],
    ['raw', 'raw'],
    ['translated', 'translated'],
    ['overview', 'summary'],
    ['workspace', 'extracted'],
    ['relationships', 'extracted'],
  ])('maps %s to %s', (displayMode, expected) => {
    expect(toResourceContentMode(displayMode)).toBe(expected);
  });
});
