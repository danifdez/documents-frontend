import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import Card from '../../../src/components/ui/Card.vue';

describe('Card.vue', () => {
    // Create a mock router instance for testing
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/test', component: { template: '<div>Test Route</div>' } },
        ]
    });

    it('renders correctly with provided props', () => {
        const wrapper = mount(Card, {
            global: {
                plugins: [router]
            },
            props: {
                title: 'Test Card',
                description: 'This is a test description',
                to: '/test'
            }
        });
        expect(wrapper.text()).toContain('Test Card');
        expect(wrapper.text()).toContain('This is a test description');
        expect(wrapper.html()).toContain('/test');
    });

    it('shows "No description" when no description is provided', () => {
        const wrapper = mount(Card, {
            global: {
                plugins: [router]
            },
            props: {
                title: 'Test Card',
                to: '/test'
            }
        });

        expect(wrapper.text()).toContain('No description');
    });

    it('renders slot content', () => {
        const wrapper = mount(Card, {
            global: {
                plugins: [router]
            },
            props: {
                title: 'Test Card',
                to: '/test'
            },
            slots: {
                default: '<div class="slot-content">Custom content</div>'
            }
        });

        expect(wrapper.find('.slot-content').exists()).toBe(true);
        expect(wrapper.text()).toContain('Custom content');
    });
});
