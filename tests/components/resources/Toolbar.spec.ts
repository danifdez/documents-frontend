import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Toolbar from '../../../src/components/resources/Toolbar.vue';

describe('Resource Toolbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it.each([
    ['Overview', 'overview', { hasSummary: true }],
    ['Relationships', 'relationships', { hasRelationships: true }],
  ] as const)('emits the canonical mode for %s', async (label, mode, extraProps) => {
    const wrapper = mount(Toolbar, {
      props: {
        displayMode: 'extracted',
        ...extraProps,
      },
    });
    const button = wrapper.findAll('button').find((candidate) => candidate.text() === label);

    expect(button).toBeDefined();
    await button?.trigger('click');

    expect(wrapper.emitted('changeDisplayMode')?.[0]).toEqual([mode]);
  });
});
