<template>
    <router-link v-if="to" :to="to" :target="newTab ? '_blank' : '_self'"
        :rel="newTab ? 'noopener noreferrer' : undefined" @click="handleClick" :class="[
            'px-4 py-2 rounded-md transition-colors duration-200 ease-in-out',
            'text-gray-600 bg-transparent border border-gray-300',
            'hover:text-white hover:bg-gray-400 hover:border-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50',
            'inline-block text-center',
            className
        ]">
        <slot></slot>
    </router-link>
    <a v-else :href="href" :target="newTab ? '_blank' : '_self'" :rel="newTab ? 'noopener noreferrer' : undefined"
        @click="handleClick" :class="[
            'px-4 py-2 rounded-md transition-colors duration-200 ease-in-out',
            'text-gray-600 bg-transparent border border-gray-300',
            'hover:text-white hover:bg-gray-400 hover:border-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50',
            'inline-block text-center',
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