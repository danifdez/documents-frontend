<template>
    <button :class="[
        'inline-flex items-center justify-center',
        'font-medium rounded-lg transition-all duration-200 ease-in-out cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-opacity-50',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        'active:scale-[0.98]',
        active ? activeClasses : variantClasses,
        sizeClasses,
        className
    ]" :disabled="disabled" :type="type" @click="$emit('click', $event)">
        <slot></slot>
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
    disabled: {
        type: Boolean,
        default: false
    },
    type: {
        type: String as () => 'button' | 'submit' | 'reset',
        default: 'button'
    },
    variant: {
        type: String as () => 'primary' | 'secondary' | 'danger' | 'warning' | 'info',
        default: 'primary'
    },
    size: {
        type: String as () => 'small' | 'regular' | 'large',
        default: 'regular'
    },
    className: {
        type: String,
        default: ''
    },
    active: {
        type: Boolean,
        default: false
    },
    borderless: {
        type: Boolean,
        default: false
    }
});

const activeClasses = computed(() => {
    // Active state for switch bar style (used within ButtonGroup)
    // Always show white background with blue text when active
    const borderClass = props.borderless ? 'border-0' : 'border border-transparent';
    return `text-blue-600 bg-white ${borderClass} shadow-sm hover:shadow-md focus:ring-blue-500`;
});

const variantClasses = computed(() => {
    if (props.borderless) {
        const variants = {
            primary: 'text-gray-900 bg-white border-0 hover:bg-gray-50 hover:shadow-md focus:ring-gray-400',
            secondary: 'text-gray-700 bg-transparent border-0 hover:bg-white/50 hover:text-gray-900 focus:ring-gray-400',
            danger: 'text-white bg-red-600 border-0 hover:bg-red-700 hover:shadow-md focus:ring-red-500',
            warning: 'text-white bg-amber-600 border-0 hover:bg-amber-700 hover:shadow-md focus:ring-amber-500',
            info: 'text-white bg-teal-600 border-0 hover:bg-teal-700 hover:shadow-md focus:ring-teal-500'
        };
        return variants[props.variant] || variants.primary;
    }

    const variants = {
        primary: 'text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:shadow-md focus:ring-gray-400',
        secondary: 'text-gray-700 bg-transparent border border-transparent hover:bg-white/50 hover:text-gray-900 focus:ring-gray-400',
        danger: 'text-white bg-red-600 border border-red-600 hover:bg-red-700 hover:border-red-700 hover:shadow-md focus:ring-red-500',
        warning: 'text-white bg-amber-600 border border-amber-600 hover:bg-amber-700 hover:border-amber-700 hover:shadow-md focus:ring-amber-500',
        info: 'text-white bg-teal-600 border border-teal-600 hover:bg-teal-700 hover:border-teal-700 hover:shadow-md focus:ring-teal-500'
    };

    return variants[props.variant] || variants.primary;
});

const sizeClasses = computed(() => {
    const sizes = {
        small: 'px-3 py-1.5 text-xs gap-1.5',
        regular: 'px-4 py-2 text-sm gap-2',
        large: 'px-6 py-3 text-base gap-2.5'
    };

    return sizes[props.size] || sizes.regular;
});

defineEmits(['click']);
</script>