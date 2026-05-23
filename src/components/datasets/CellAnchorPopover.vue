<template>
    <Teleport to="body">
        <Transition name="popover">
            <div v-if="isOpen" ref="popoverRef"
                class="fixed z-50 bg-surface-elevated rounded-xl shadow-2xl border border-border w-80 max-w-[90vw] overflow-hidden"
                :style="floatingStyle">
                <div class="px-4 py-3 border-b border-border-light flex items-start justify-between gap-2">
                    <div class="min-w-0">
                        <div class="text-[10px] uppercase tracking-wider text-text-muted">{{ fieldName }}</div>
                        <div class="text-sm font-medium text-text-primary break-words">{{ displayValue }}</div>
                    </div>
                    <button type="button" @click="emit('close')"
                        class="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs text-text-muted">Source</span>
                        <span class="text-xs text-text-primary truncate">{{ sourceTitle || 'Source unavailable (deleted)' }}</span>
                    </div>
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs text-text-muted">Page</span>
                        <span class="text-xs text-text-primary">{{ anchor.page ?? '—' }}</span>
                    </div>
                    <div class="pt-2 border-t border-border-light">
                        <div class="text-[10px] uppercase tracking-wider text-text-muted mb-1">Quote</div>
                        <p class="text-xs text-text-secondary italic leading-snug">"{{ anchor.quote || '(empty)' }}"</p>
                    </div>
                    <div class="pt-2 border-t border-border-light text-[10px] text-text-muted space-y-0.5">
                        <div>Extracted by <span class="text-text-secondary">{{ anchor.model }}</span></div>
                        <div>On {{ formattedDate }}</div>
                        <div>Prompt: <span class="font-mono">{{ anchor.promptVersion }}</span></div>
                        <div v-if="anchor.editedByUser" class="text-amber-700">Manually edited after extraction</div>
                    </div>
                </div>
                <div class="px-4 py-2.5 border-t border-border-light bg-surface flex items-center justify-between gap-2">
                    <button type="button" @click="openSource" :disabled="!sourceTitle"
                        class="px-2.5 py-1 text-xs font-medium border border-border rounded-lg text-text-secondary hover:bg-surface-hover cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                        Open source ↗
                    </button>
                    <button type="button" @click="emit('re-extract')"
                        class="px-2.5 py-1 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-dark cursor-pointer">
                        Re-extract this cell
                    </button>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import type { CellAnchor } from '../../services/datasets/useDatasets';
import apiClient from '../../services/api';

const props = defineProps<{
    isOpen: boolean;
    anchor: CellAnchor;
    fieldName: string;
    value: any;
    anchorRect: DOMRect | null;
}>();
const emit = defineEmits<{
    (e: 'close'): void;
    (e: 're-extract'): void;
}>();

const popoverRef = ref<HTMLElement | null>(null);
const sourceTitle = ref<string>('');

const displayValue = computed(() => {
    if (props.value === null || props.value === undefined) return '—';
    if (typeof props.value === 'object') return JSON.stringify(props.value);
    return String(props.value);
});

const formattedDate = computed(() => {
    if (!props.anchor.extractedAt) return '—';
    try {
        return new Date(props.anchor.extractedAt).toLocaleString();
    } catch {
        return props.anchor.extractedAt;
    }
});

const floatingStyle = computed(() => {
    if (!props.anchorRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const rect = props.anchorRect;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const width = 320;
    const height = 320;
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + width > vw - 8) left = Math.max(8, vw - width - 8);
    if (top + height > vh - 8) top = Math.max(8, rect.top - height - 6);
    return { top: `${top}px`, left: `${left}px` };
});

const fetchSourceTitle = async () => {
    sourceTitle.value = '';
    if (!props.anchor?.sourceResourceId) return;
    try {
        const resp = await apiClient.get(`/resources/${props.anchor.sourceResourceId}`);
        sourceTitle.value = resp.data?.title || resp.data?.name || `Resource ${props.anchor.sourceResourceId}`;
    } catch {
        sourceTitle.value = '';
    }
};

const openSource = () => {
    if (!props.anchor?.sourceResourceId || !sourceTitle.value) return;
    const url = props.anchor.page
        ? `/resources/${props.anchor.sourceResourceId}?page=${props.anchor.page}`
        : `/resources/${props.anchor.sourceResourceId}`;
    window.open(url, '_blank', 'noopener');
};

const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && props.isOpen) emit('close');
};

const onClickOutside = (event: MouseEvent) => {
    if (!props.isOpen) return;
    const target = event.target as Node | null;
    if (popoverRef.value && target && !popoverRef.value.contains(target)) {
        emit('close');
    }
};

watch(() => props.isOpen, (open) => {
    if (open) {
        fetchSourceTitle();
    }
});

onMounted(() => {
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('mousedown', onClickOutside);
});
</script>

<style scoped>
.popover-enter-active { transition: opacity 0.12s ease; }
.popover-leave-active { transition: opacity 0.08s ease; }
.popover-enter-from, .popover-leave-to { opacity: 0; }
</style>
