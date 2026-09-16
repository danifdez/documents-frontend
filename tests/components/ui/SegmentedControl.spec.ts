import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';

const options = [
  { value: 'graph', label: 'Graph' },
  { value: 'table', label: 'Table' },
];

describe('SegmentedControl.vue', () => {
  it('shows the selected option', () => {
    const wrapper = mount(SegmentedControl, {
      props: { modelValue: 'graph', options },
    });

    expect(wrapper.get('button').classes()).toContain('bg-surface-elevated');
  });

  it('emits the selected value', async () => {
    const wrapper = mount(SegmentedControl, {
      props: { modelValue: 'graph', options },
    });

    await wrapper.findAll('button')[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([['table']]);
  });
});
