import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Button from '@/components/ui/Button.vue';

describe('Button.vue', () => {
    it('renders correctly with default props', () => {
        const wrapper = mount(Button);
        expect(wrapper.exists()).toBe(true);
        expect(wrapper.attributes('disabled')).toBeUndefined();
    });

    it('renders with custom class name', () => {
        const customClass = 'custom-button-class';
        const wrapper = mount(Button, {
            props: {
                className: customClass
            }
        });
        expect(wrapper.classes()).toContain(customClass);
    });

    it('is disabled when disabled prop is true', () => {
        const wrapper = mount(Button, {
            props: {
                disabled: true
            }
        });
        expect(wrapper.attributes('disabled')).toBeDefined();
    });

    it('emits click event when clicked', async () => {
        const wrapper = mount(Button);
        await wrapper.trigger('click');
        expect(wrapper.emitted('click')).toBeTruthy();
        expect(wrapper.emitted('click')?.length).toBe(1);
    });

    it('does not emit click event when disabled', async () => {
        const wrapper = mount(Button, {
            props: {
                disabled: true
            }
        });
        await wrapper.trigger('click');
        expect(wrapper.emitted('click')).toBeFalsy();
    });
});
