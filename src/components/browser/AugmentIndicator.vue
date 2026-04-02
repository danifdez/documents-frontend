<template>
    <Transition name="augment-indicator">
        <div v-if="visible"
            class="absolute bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border rounded-xl shadow-lg text-xs select-none">

            <!-- Progress spinner or done icon -->
            <div v-if="isAnalyzing" class="relative h-4 w-4 shrink-0">
                <svg class="animate-spin h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
                    <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                </svg>
            </div>
            <div v-else class="h-4 w-4 shrink-0 text-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            </div>

            <!-- Stats -->
            <div class="flex items-center gap-1.5 text-text-secondary">
                <span v-if="entityCount > 0" class="flex items-center gap-1">
                    <span class="font-medium text-text-primary">{{ entityCount }}</span>
                    <span class="text-text-muted">{{ entityCount === 1 ? 'entity' : 'entities' }}</span>
                </span>

                <span v-if="entityCount > 0 && blockConnectionCount > 0" class="text-border">|</span>

                <span v-if="blockConnectionCount > 0" class="flex items-center gap-1">
                    <span class="font-medium text-text-primary">{{ blockConnectionCount }}</span>
                    <span class="text-text-muted">{{ blockConnectionCount === 1 ? 'connection' : 'connections' }}</span>
                </span>

                <span v-if="isAnalyzing && entityCount === 0 && blockConnectionCount === 0"
                    class="text-text-muted">
                    Analyzing page...
                </span>

                <span v-if="!isAnalyzing && entityCount === 0 && blockConnectionCount === 0"
                    class="text-text-muted">
                    No matches found
                </span>
            </div>

            <!-- Close button -->
            <button @click="$emit('dismiss')"
                class="ml-1 p-0.5 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
                <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    isAnalyzing: boolean;
    entityCount: number;
    blockConnectionCount: number;
    enabled: boolean;
}>();

defineEmits<{
    dismiss: [];
}>();

const visible = computed(() => {
    return props.enabled && (props.isAnalyzing || props.entityCount > 0 || props.blockConnectionCount > 0);
});
</script>

<style scoped>
.augment-indicator-enter-active {
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.augment-indicator-leave-active {
    transition: all 0.2s ease-in;
}
.augment-indicator-enter-from {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
}
.augment-indicator-leave-to {
    opacity: 0;
    transform: translateY(4px) scale(0.98);
}
</style>
