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

        <!-- Augment toggle -->
        <button @click="$emit('toggle-augment')"
            :class="augmentEnabled ? 'text-amber-500 bg-amber-500/15' : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'"
            class="p-1.5 rounded-md transition-colors duration-200 cursor-pointer"
            :title="augmentEnabled ? 'Page augmentation enabled' : 'Enable page augmentation'">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        </button>

        <!-- Private mode toggle -->
        <button @click="$emit('toggle-private-mode')"
            :class="privateMode ? 'text-accent bg-accent/15' : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'"
            class="p-1.5 rounded-md transition-colors duration-200 cursor-pointer"
            :title="privateMode ? 'Private mode enabled' : 'Enable private mode'">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
        </button>

        <!-- Action buttons -->
        <div class="flex items-center gap-0.5">
            <button @click="$emit('extract')"
                class="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors duration-200 cursor-pointer"
                title="Extract page content">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </button>
            <button @click="$emit('ask')"
                class="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors duration-200 cursor-pointer"
                title="Ask about this page">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            </button>
            <button @click="$emit('add-bibliography')"
                class="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors duration-200 cursor-pointer"
                title="Add to bibliography">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    url: string;
    privateMode: boolean;
    augmentEnabled: boolean;
}>();

defineEmits<{
    'update:url': [value: string];
    navigate: [];
    extract: [];
    ask: [];
    'add-bibliography': [];
    back: [];
    forward: [];
    reload: [];
    'toggle-private-mode': [];
    'toggle-augment': [];
}>();
</script>
