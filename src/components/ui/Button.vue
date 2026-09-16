<template>
    <button :class="[
        'inline-flex items-center justify-center',
        'font-medium rounded-lg transition-colors duration-150 cursor-pointer',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-accent/50',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
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
    const borderClass = props.borderless ? 'border-0' : 'border border-transparent';
    return `text-accent-dark bg-accent-subtle ${borderClass}`;
});

const variantClasses = computed(() => {
    if (props.borderless) {
        const variants = {
            primary: 'text-text-secondary bg-transparent border-0 hover:bg-surface-hover hover:text-text-primary',
            secondary: 'text-text-muted bg-transparent border-0 hover:bg-surface-hover hover:text-text-secondary',
            danger: 'text-red-500 bg-transparent border-0 hover:bg-red-500/10',
            warning: 'text-amber-600 bg-transparent border-0 hover:bg-amber-500/10',
            info: 'text-accent bg-transparent border-0 hover:bg-accent-subtle'
        };
        return variants[props.variant] || variants.primary;
    }

    const variants = {
        primary: 'text-white bg-accent border border-accent hover:bg-accent-dark hover:border-accent-dark shadow-sm',
        secondary: 'text-text-muted bg-transparent border border-transparent hover:bg-surface-hover hover:text-text-secondary',
        danger: 'text-white bg-red-500 border border-red-500 hover:bg-red-600 hover:border-red-600 shadow-sm',
        warning: 'text-white bg-amber-500 border border-amber-500 hover:bg-amber-600 hover:border-amber-600 shadow-sm',
        info: 'text-white bg-accent border border-accent hover:bg-accent-dark hover:border-accent-dark shadow-sm'
    };

    return variants[props.variant] || variants.primary;
});

const sizeClasses = computed(() => {
    const sizes = {
        small: 'min-h-8 px-2.5 py-1.5 text-xs gap-1.5',
        regular: 'min-h-9 px-3.5 py-2 text-sm gap-2',
        large: 'min-h-11 px-5 py-2.5 text-sm gap-2.5'
    };

    return sizes[props.size] || sizes.regular;
});

defineEmits(['click']);
</script>
