<template>
    <div class="flex items-center gap-2 px-3 py-2.5 bg-surface-elevated border-b border-border shrink-0"
        style="background: linear-gradient(180deg, var(--color-sidebar-from) 0%, var(--color-sidebar-to) 100%);">

        <!-- Navigation buttons -->
        <div class="flex items-center gap-0.5">
            <button @click="$emit('back')"
                class="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors duration-200 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <button @click="$emit('forward')"
                class="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors duration-200 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>
            <button @click="$emit('reload')"
                class="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors duration-200 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
        </div>

        <!-- URL bar -->
        <div class="flex-1 flex items-center min-w-0">
            <div
                class="flex items-center w-full bg-surface border border-border rounded-lg px-3 py-1.5 gap-2 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10 transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-text-muted shrink-0" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <input type="text"
                    class="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none min-w-0"
                    placeholder="Enter URL..." :value="url" @input="$emit('update:url', ($event.target as HTMLInputElement).value)"
                    @keyup.enter="$emit('navigate')" />
            </div>
        </div>

        <!-- Action buttons -->
        <div class="flex items-center gap-1.5">
            <Button size="small" @click="$emit('navigate')">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Go
            </Button>
            <Button size="small" variant="info" @click="$emit('extract')">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Extract
            </Button>
        </div>
    </div>
</template>

<script setup lang="ts">
import Button from '../ui/Button.vue';

defineProps<{
    url: string;
}>();

defineEmits<{
    'update:url': [value: string];
    navigate: [];
    extract: [];
    back: [];
    forward: [];
    reload: [];
}>();
</script>
