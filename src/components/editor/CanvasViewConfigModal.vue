<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="modelValue"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div
                    class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-md w-full mx-4 overflow-hidden">
                    <div class="px-6 py-4 border-b border-border-light">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">Insert Canvas</h3>
                        <p class="text-xs text-text-muted mt-0.5">Embed a canvas preview in your document</p>
                    </div>

                    <div class="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                        <!-- Loading -->
                        <div v-if="loadingCanvases" class="flex items-center justify-center py-8">
                            <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent">
                            </div>
                        </div>

                        <!-- Empty -->
                        <div v-else-if="canvases.length === 0" class="text-center py-8">
                            <p class="text-sm text-text-muted">No canvases found in this project</p>
                        </div>

                        <!-- Canvas list -->
                        <div v-else class="space-y-1">
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">Select a canvas</label>
                            <button v-for="canvas in canvases" :key="canvas.id" @click="selectedCanvasId = canvas.id"
                                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer text-left"
                                :class="selectedCanvasId === canvas.id
                                    ? 'border-accent bg-accent-subtle/50'
                                    : 'border-border hover:bg-surface-hover'">
                                <svg class="h-5 w-5 shrink-0" :class="selectedCanvasId === canvas.id ? 'text-accent' : 'text-text-muted'"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="9" cy="9" r="1.5" />
                                    <circle cx="15" cy="15" r="1.5" />
                                    <path d="M10.5 9.5L13.5 14" />
                                </svg>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-text-primary truncate">{{ canvas.name }}</p>
                                    <p class="text-[11px] text-text-muted">
                                        {{ getNodeCount(canvas) }} nodes
                                        <span v-if="canvas.updatedAt" class="ml-1">
                                            &middot; updated {{ formatDate(canvas.updatedAt) }}
                                        </span>
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                        <Button @click="close" variant="secondary">Cancel</Button>
                        <Button @click="handleInsert" variant="info" :disabled="!selectedCanvasId">
                            Insert
                        </Button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import apiClient from '../../services/api';
import Button from '../ui/Button.vue';
import { useProjectStore } from '../../store/projectStore';

const modelValue = defineModel<boolean>({ required: true });

const emit = defineEmits<{
    insert: [config: {
        canvasId: number;
        canvasName: string;
    }];
}>();

interface CanvasInfo {
    id: number;
    name: string;
    canvasData: { nodes: any[]; edges: any[] } | null;
    updatedAt: string;
}

const canvases = ref<CanvasInfo[]>([]);
const selectedCanvasId = ref<number | null>(null);
const loadingCanvases = ref(false);
const projectStore = useProjectStore();

watch(modelValue, async (open) => {
    if (open) {
        selectedCanvasId.value = null;
        loadingCanvases.value = true;
        try {
            const projectId = projectStore.currentProject?.id;
            const url = projectId ? `/canvases/project/${projectId}` : '/canvases';
            const response = await apiClient.get(url);
            canvases.value = response.data;
        } catch {
            canvases.value = [];
        } finally {
            loadingCanvases.value = false;
        }
    }
});

const getNodeCount = (canvas: CanvasInfo): number => {
    return canvas.canvasData?.nodes?.length || 0;
};

const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
};

const close = () => {
    modelValue.value = false;
};

const handleInsert = () => {
    const canvas = canvases.value.find(c => c.id === selectedCanvasId.value);
    if (!canvas) return;

    emit('insert', {
        canvasId: canvas.id,
        canvasName: canvas.name,
    });

    close();
};
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
