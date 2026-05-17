<template>
    <Teleport to="body">
        <Transition name="assistant-modal" appear>
            <div v-if="modelValue" class="assistant-modal-overlay" @keydown.esc.stop="close" tabindex="-1">
                <div class="assistant-modal-container">
                    <!-- Sidebar -->
                    <AssistantSidebar
                        @new-helper="openHelperEditor(null)"
                        @edit-helper="openHelperEditor" />

                    <!-- Chat area -->
                    <div class="flex-1 min-w-0 flex flex-col bg-surface-elevated">
                        <!-- Header -->
                        <header class="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
                            <div class="text-xl leading-none">{{ store.activeAssistant?.icon || '◇' }}</div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-baseline gap-2">
                                    <h2 class="font-semibold text-text-primary truncate">
                                        {{ store.activeAssistant?.name || 'Assistant' }}
                                    </h2>
                                    <code v-if="store.activeAssistant?.folderScope"
                                        class="text-[11px] text-text-muted bg-surface px-1.5 py-0.5 rounded">
                                        {{ store.activeAssistant.folderScope }}
                                    </code>
                                </div>
                                <div v-if="store.activeAssistant?.sub" class="text-xs text-text-muted truncate">
                                    {{ store.activeAssistant.sub }}
                                </div>
                            </div>

                            <button v-if="canPin"
                                @click="store.togglePin(store.activeAssistant!.id)"
                                :title="store.activeAssistant!.pinned ? 'Unpin' : 'Pin as favorite'"
                                class="text-lg leading-none px-2 py-1 rounded hover:bg-surface-hover transition-colors cursor-pointer"
                                :class="store.activeAssistant!.pinned ? 'text-amber-500' : 'text-text-muted hover:text-text-secondary'">
                                {{ store.activeAssistant!.pinned ? '★' : '☆' }}
                            </button>

                            <button v-if="canShowMemory" @click="toggleMemory"
                                title="Assistant memory"
                                class="flex items-center gap-1.5 px-2.5 py-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer text-sm"
                                :class="{ '!bg-accent-subtle !text-accent-dark': memoryOpen }">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="1.75">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 0V4m0 14v3m4-7h3M5 11H2m17.071-6.071l-2.121 2.121M7.05 16.95l-2.121 2.121M19.071 19.071l-2.121-2.121M7.05 7.05L4.929 4.929" />
                                </svg>
                                <span>Memory</span>
                            </button>

                            <button v-if="canShowFiles" @click="toggleFiles"
                                title="Working folder files"
                                class="flex items-center gap-1.5 px-2.5 py-1 rounded text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer text-sm"
                                :class="{ '!bg-accent-subtle !text-accent-dark': filesOpen }">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="1.75">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span>Files</span>
                            </button>

                            <button v-if="canEdit" @click="openHelperEditor(store.activeAssistant)"
                                class="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                                title="Edit helper">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="1.75">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </button>

                            <button @click="close"
                                class="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                                title="Close (Esc)">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="1.75">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </header>

                        <AssistantChat />

                        <AssistantComposer
                            ref="composerRef"
                            :disabled="!store.activeAssistant || (store.isActivePending && !store.activeStreamDone)"
                            :placeholder="composerPlaceholder"
                            @send="handleSend" />
                    </div>

                    <MemoryPanel
                        :show="memoryOpen && canShowMemory"
                        :assistant-id="store.activeAssistant?.id ?? null"
                        @update:show="memoryOpen = $event" />

                    <AssistantFilesPanel
                        :show="filesOpen && canShowFiles"
                        :assistant-id="store.activeAssistant?.id ?? null"
                        @update:show="filesOpen = $event" />
                </div>

                <HelperEditModal v-model="helperEditorOpen" :assistant="helperEditing" />
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import AssistantSidebar from './AssistantSidebar.vue';
import AssistantChat from './AssistantChat.vue';
import AssistantComposer from './AssistantComposer.vue';
import HelperEditModal from './HelperEditModal.vue';
import MemoryPanel from './MemoryPanel.vue';
import AssistantFilesPanel from './AssistantFilesPanel.vue';
import { useAssistantStore } from '../../store/assistantStore';
import type { Assistant } from '../../types/Assistant';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
}>();

const store = useAssistantStore();
const composerRef = ref<InstanceType<typeof AssistantComposer> | null>(null);
const helperEditorOpen = ref(false);
const helperEditing = ref<Assistant | null>(null);
const memoryOpen = ref(false);
const filesOpen = ref(false);

const canPin = computed(() => store.activeAssistant && !store.activeAssistant.isSystem);
const canEdit = computed(() => !!store.activeAssistant);
const canShowMemory = computed(() => store.activeAssistant?.isSystem === true);
const canShowFiles = computed(() => !!store.activeAssistant?.folderScope);

function toggleMemory() {
    memoryOpen.value = !memoryOpen.value;
    if (memoryOpen.value) filesOpen.value = false;
}

function toggleFiles() {
    filesOpen.value = !filesOpen.value;
    if (filesOpen.value) memoryOpen.value = false;
}

const composerPlaceholder = computed(() => {
    if (!store.activeAssistant) return 'Select a conversation…';
    if (store.isActivePending && !store.activeStreamDone) return 'Waiting for response…';
    return `Message ${store.activeAssistant.name}… (Shift+Enter for a new line)`;
});

function close() {
    emit('update:modelValue', false);
}

function handleSend(text: string) {
    store.sendMessage(text);
}

function openHelperEditor(a: Assistant | null) {
    helperEditing.value = a;
    helperEditorOpen.value = true;
}

function onKeydown(e: KeyboardEvent) {
    if (!props.modelValue) return;
    if (e.key === 'Escape') {
        if (helperEditorOpen.value) return; // its own modal handles Esc
        if (memoryOpen.value) {
            e.preventDefault();
            memoryOpen.value = false;
            return;
        }
        if (filesOpen.value) {
            e.preventDefault();
            filesOpen.value = false;
            return;
        }
        e.preventDefault();
        close();
    }
}

watch(
    () => props.modelValue,
    async (v) => {
        if (v) {
            await store.load();
            // Always default to the personal assistant when (re)opening the modal
            const personal = store.assistants.find((a) => a.isSystem);
            if (personal) {
                await store.selectAssistant(personal.id);
            } else if (store.activeId != null) {
                await store.selectAssistant(store.activeId);
            }
            await nextTick();
            composerRef.value?.focus();
        }
    },
);

watch(
    () => store.activeId,
    async (id) => {
        // Memory only applies to the personal assistant; close the panel
        // when switching away from it. Files require a folderScope.
        if (!canShowMemory.value) memoryOpen.value = false;
        if (!canShowFiles.value) filesOpen.value = false;
        if (id != null && props.modelValue) {
            await store.selectAssistant(id);
            await nextTick();
            composerRef.value?.focus();
        }
    },
);

onMounted(() => {
    document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.assistant-modal-overlay {
    position: fixed;
    inset: 0;
    background-color: var(--color-surface);
    z-index: 40;
    display: flex;
}

.assistant-modal-container {
    width: 100%;
    height: 100%;
    background-color: var(--color-surface);
    overflow: hidden;
    display: flex;
}

.assistant-modal-enter-active,
.assistant-modal-leave-active {
    transition: opacity 0.2s ease;
}

.assistant-modal-enter-from,
.assistant-modal-leave-to {
    opacity: 0;
}

.assistant-modal-enter-active .assistant-modal-container {
    animation: amodal-in 0.2s ease-out;
}

@keyframes amodal-in {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>
