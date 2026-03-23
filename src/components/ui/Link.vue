<template>
    <router-link v-if="to" :to="to" :target="newTab ? '_blank' : '_self'"
        :rel="newTab ? 'noopener noreferrer' : undefined" @click="handleClick" :class="[
            'px-3 py-1.5 rounded-md transition-colors duration-200 ease-out',
            'text-text-secondary bg-transparent border border-transparent',
            'hover:text-accent-dark hover:bg-accent-subtle',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
            'inline-block text-center text-sm',
            className
        ]">
        <slot></slot>
    </router-link>
    <a v-else :href="href" :target="newTab ? '_blank' : '_self'" :rel="newTab ? 'noopener noreferrer' : undefined"
        @click="handleClick" :class="[
            'px-3 py-1.5 rounded-md transition-colors duration-200 ease-out',
            'text-text-secondary bg-transparent border border-transparent',
            'hover:text-accent-dark hover:bg-accent-subtle',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
            'inline-block text-center text-sm',
            className
        ]">
        <slot></slot>
    </a>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
const props = defineProps({
    href: {
        type: String,
        default: '#'
    },
    to: {
        type: [String, Object],
        default: null
    },
    newTab: {
        type: Boolean,
        default: false
    },
    className: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['click']);

const handleClick = (event: MouseEvent) => {
    emit('click', event);

    if (props.href && props.href.startsWith('/') && !props.newTab && !props.to) {
        event.preventDefault();
        router.push(props.href);
    }
};
</script>
