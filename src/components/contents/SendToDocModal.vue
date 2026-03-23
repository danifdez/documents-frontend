<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center"
                @click.self="$emit('close')">
                <div class="fixed inset-0 bg-black/40" @click="$emit('close')"></div>
                <div
                    class="relative bg-surface-elevated rounded-xl shadow-2xl border border-border w-full max-w-md mx-4 overflow-hidden">

                    <!-- Header -->
                    <div class="px-5 py-4 border-b border-border-light">
                        <h3 class="text-sm font-semibold text-text-primary">Send selection to document</h3>
                    </div>

                    <!-- Selected text preview -->
                    <div class="px-5 pt-4">
                        <div
                            class="bg-surface rounded-lg border border-border-light px-3 py-2 text-xs text-text-muted max-h-20 overflow-y-auto">
                            "{{ truncatedText }}"
                        </div>
                    </div>

                    <!-- Doc list -->
                    <div class="px-5 py-3 max-h-60 overflow-y-auto">
                        <!-- Create new option -->
                        <label
                            class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-surface-hover transition-colors"
                            :class="{ 'bg-accent-subtle': selectedOption === 'new' }">
                            <input type="radio" v-model="selectedOption" value="new" class="accent-accent" />
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            <span class="text-sm font-medium text-accent">Create new document</span>
                        </label>

                        <!-- Separator -->
                        <div v-if="docs.length > 0" class="border-t border-border-light my-1"></div>

                        <!-- Loading -->
                        <div v-if="isLoading" class="px-3 py-4 text-center text-xs text-text-muted">
                            Loading documents...
                        </div>

                        <!-- Existing docs -->
                        <label v-for="doc in docs" :key="doc.id"
                            class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-surface-hover transition-colors"
                            :class="{ 'bg-accent-subtle': selectedOption === String(doc.id) }">
                            <input type="radio" v-model="selectedOption" :value="String(doc.id)"
                                class="accent-accent" />
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-text-muted shrink-0"
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <span class="text-sm text-text-primary truncate">{{ doc.name }}</span>
                        </label>

                        <!-- Empty state -->
                        <div v-if="!isLoading && docs.length === 0"
                            class="px-3 py-2 text-xs text-text-muted text-center">
                            No documents in this project
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-5 py-3 border-t border-border-light flex justify-end gap-2">
                        <button @click="$emit('close')"
                            class="px-4 py-2 text-sm text-text-secondary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer">
                            Cancel
                        </button>
                        <button @click="handleConfirm" :disabled="!selectedOption"
                            class="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                            {{ selectedOption === 'new' ? 'Create & Send' : 'Send' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import apiClient from '../../services/api';

const props = defineProps({
    isOpen: { type: Boolean, required: true },
    selectedText: { type: String, default: '' },
    projectId: { type: Number, default: undefined },
});

const emit = defineEmits(['close', 'send-to-existing', 'create-new-doc']);

const docs = ref<any[]>([]);
const isLoading = ref(false);
const selectedOption = ref<string>('new');

const truncatedText = computed(() => {
    const text = props.selectedText;
    return text.length > 200 ? text.slice(0, 200) + '...' : text;
});

const loadDocs = async () => {
    if (!props.projectId) return;
    isLoading.value = true;
    try {
        const response = await apiClient.get(`/docs/project/${props.projectId}`);
        docs.value = response.data;
    } catch (e) {
        console.error('Failed to load docs', e);
        docs.value = [];
    } finally {
        isLoading.value = false;
    }
};

const handleConfirm = () => {
    if (selectedOption.value === 'new') {
        emit('create-new-doc');
    } else {
        emit('send-to-existing', Number(selectedOption.value));
    }
};

watch(() => props.isOpen, (val) => {
    if (val) {
        selectedOption.value = 'new';
        loadDocs();
    }
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
