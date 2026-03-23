<template>
    <router-link :to="to"
        class="group block bg-surface-elevated rounded-xl border border-border hover:border-accent/30 transition-all duration-300 ease-out overflow-hidden hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5">
        <div class="p-3">
            <div class="flex items-start justify-between mb-2">
                <div
                    class="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-300"
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
                    class="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-0.5"
                    viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                </svg>
            </div>

            <h4 v-if="title" class="font-semibold text-xs text-text-primary mb-1 truncate tracking-tight">
                {{ title }}
            </h4>

            <p v-if="description" class="text-text-secondary text-[11px] leading-snug line-clamp-2">
                {{ description }}
            </p>
            <p v-else class="text-text-muted text-[11px] italic">
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
        validator: (v) => ['default', 'document', 'canvas', 'thread'].includes(v),
    },
});

const iconBgClasses = computed(() => {
    switch (props.variant) {
        case 'canvas':
            return 'bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white';
        case 'document':
            return 'bg-accent-subtle text-accent group-hover:bg-accent group-hover:text-white';
        case 'thread':
            return 'bg-accent-subtle text-accent group-hover:bg-accent group-hover:text-white';
        default:
            return 'bg-accent-subtle text-accent group-hover:bg-accent group-hover:text-white';
    }
});
</script>
