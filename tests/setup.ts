import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/vue';

beforeAll(() => {
  global.window = global.window || {};
});

afterEach(() => {
  cleanup();
});