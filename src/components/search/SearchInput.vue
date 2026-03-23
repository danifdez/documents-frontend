<template>
    <Teleport to="body">
        <Transition name="search-overlay">
            <div v-if="show" class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm"
                @mousedown.self="close">
                <Transition name="search-input" appear>
                    <div v-if="show" class="mt-[15vh] w-full max-w-xl px-4">
                        <div
                            class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border overflow-hidden">
                            <div class="flex items-center px-5 gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-text-muted shrink-0"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input ref="inputRef" type="text" v-model="searchValue" :placeholder="placeholder"
                                    class="flex-1 py-4 text-base bg-transparent border-0 outline-none text-text-primary placeholder:text-text-muted"
                                    @keyup.enter.prevent="onEnter" @keyup.esc.prevent="onEscape" />
                            </div>
                            <div class="border-t border-border-light px-5 py-2.5 flex items-center justify-end gap-3">
                                <span class="text-xs text-text-muted">Press
                                    <kbd
                                        class="px-1.5 py-0.5 bg-surface rounded text-[11px] font-medium border border-border">Enter</kbd>
                                    to search
                                </span>
                                <span class="text-xs text-text-muted">
                                    <kbd
                                        class="px-1.5 py-0.5 bg-surface rounded text-[11px] font-medium border border-border">Esc</kbd>
                                    to close
                                </span>
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    placeholder: {
        type: String,
        default: 'Search...'
    },
    value: {
        type: String,
        default: ''
    }
});
const emit = defineEmits(['search', 'close']);

const searchValue = ref('');
let openValue: string | null = null;
const inputRef = ref<HTMLInputElement | null>(null);


let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 300;

function close() {
    emit('close');
}

function onEnter() {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        debounceTimeout = null;
    }

    emit('search', searchValue.value);
    close();
}

function onEscape() {
    close();
}

watch(searchValue, () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        emit('search', searchValue.value);
    }, DEBOUNCE_DELAY);
});

watch(
    () => props.show,
    (val) => {
        if (val) {
            searchValue.value = props.value ?? '';
            openValue = props.value ?? '';
            setTimeout(() => {
                inputRef.value?.focus();
            }, 0);
        } else {
            openValue = null;
        }
    }
);

watch(
    () => props.value,
    (val) => {
        searchValue.value = val ?? '';
    }
);

function globalKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        onEscape();
    }
}

watch(
    () => props.show,
    (val) => {
        if (val) {
            window.addEventListener('keydown', globalKeyDown);
        } else {
            window.removeEventListener('keydown', globalKeyDown);
        }
    }
);

onBeforeUnmount(() => {
    window.removeEventListener('keydown', globalKeyDown);
});
</script>

<style scoped>
.search-overlay-enter-active,
.search-overlay-leave-active {
    transition: opacity 0.2s ease;
}

.search-overlay-enter-from,
.search-overlay-leave-to {
    opacity: 0;
}

.search-input-enter-active {
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.search-input-leave-active {
    transition: all 0.15s ease-in;
}

.search-input-enter-from {
    opacity: 0;
    transform: translateY(-12px) scale(0.97);
}

.search-input-leave-to {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
}
</style>
