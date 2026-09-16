<template>
    <router-link :to="to"
        class="group block overflow-hidden rounded-xl border border-border bg-surface-elevated transition-all duration-150 hover:border-text-muted/60 hover:shadow-sm">
        <div class="p-4">
            <div class="mb-3 flex items-start justify-between">
                <div
                    class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150"
                    :class="iconBgClasses">
                    <slot name="icon">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="1.75">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </slot>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5 text-text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                </svg>
            </div>

            <h4 v-if="title" class="mb-1 truncate text-sm font-semibold tracking-tight text-text-primary">
                {{ title }}
            </h4>

            <p v-if="description" class="line-clamp-2 text-xs leading-relaxed text-text-secondary">
                {{ description }}
            </p>
            <p v-else class="text-xs italic text-text-muted">
                No description
            </p>

            <slot></slot>
        </div>
    </router-link>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    title: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    to: {
        type: String,
        default: ''
    },
    variant: {
        type: String,
        default: 'default',
        validator: (v) => ['default', 'document', 'canvas', 'thread', 'timeline'].includes(v),
    },
});

const iconBgClasses = computed(() => {
    switch (props.variant) {
        case 'thread':
            return 'bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white';
        case 'document':
            return 'bg-accent-subtle text-accent group-hover:bg-accent group-hover:text-white';
        case 'canvas':
            return 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white';
        case 'timeline':
            return 'bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white';
        default:
            return 'bg-accent-subtle text-accent group-hover:bg-accent group-hover:text-white';
    }
});
</script>
