<template>
    <Teleport to="body">
        <Transition name="assistant-modal" appear>
            <div v-if="modelValue" class="assistant-modal-overlay" @keydown.esc.stop="close" tabindex="-1">
                <div class="assistant-modal-container">
                    <!-- Sidebar -->
                    <AssistantSidebar
                        :selection="selectionKey"
                        @new-agent="openAgentEditor(null)"
                        @edit-agent="openAgentEditor"
                        @select-assistant="selectAssistant"
                        @select-agent="selectAgent" />

                    <!-- Chat area -->
                    <div class="flex-1 min-w-0 flex flex-col bg-surface-elevated">
                        <!-- Header -->
                        <header class="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
                            <div class="text-xl leading-none">{{ headerIcon }}</div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-baseline gap-2">
                                    <h2 class="font-semibold text-text-primary truncate">{{ headerName }}</h2>
                                    <code v-if="headerFolderScope"
                                        class="text-[11px] text-text-muted bg-surface px-1.5 py-0.5 rounded">
                                        {{ headerFolderScope }}
                                    </code>
                                </div>
                                <div v-if="headerSub" class="text-xs text-text-muted truncate">
                                    {{ headerSub }}
                                </div>
                                <!-- Agent scope notice — discreet single line, not a banner. -->
                                <div v-if="selection === 'agent' && activeAgent" class="text-[11px] text-text-muted truncate mt-0.5">
                                    {{ activeAgent.folderScope
                                        ? 'This agent only has access to its working folder.'
                                        : 'This agent has no working folder configured. It can only chat using its instructions.' }}
                                </div>
                            </div>

                            <!-- Pin toggle for agent in the header (mirrors the card star). -->
                            <button v-if="selection === 'agent' && activeAgent"
                                @click="onPinClick"
                                :title="activeAgent.pinned ? 'Unfavorite' : 'Favorite (won\'t expire)'"
                                class="text-lg leading-none px-2 py-1 rounded hover:bg-surface-hover transition-colors cursor-pointer"
                                :class="activeAgent.pinned ? 'text-amber-500' : 'text-text-muted hover:text-text-secondary'">
                                {{ activeAgent.pinned ? '★' : '☆' }}
                            </button>

                            <span v-if="selection === 'agent' && activeAgent && !activeAgent.pinned && agentExpirationText"
                                class="text-[11px] text-text-muted">
                                {{ agentExpirationText }}
                            </span>

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

                            <button v-if="selection === 'agent' && activeAgent" @click="openAgentEditor(activeAgent)"
                                class="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                                title="Edit agent">
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

                        <AssistantChat v-if="selection === 'assistant'" />
                        <AgentChat v-else-if="selection === 'agent'" />
                        <div v-else class="flex-1 flex items-center justify-center text-text-muted text-sm">
                            Pick a conversation from the sidebar.
                        </div>

                        <AssistantComposer
                            ref="composerRef"
                            :disabled="composerDisabled"
                            :placeholder="composerPlaceholder"
                            @send="handleSend" />
                    </div>

                    <MemoryPanel
                        :show="memoryOpen && canShowMemory"
                        :assistant-id="assistantStore.activeAssistant?.id ?? null"
                        @update:show="memoryOpen = $event" />

                    <AssistantFilesPanel
                        :show="filesOpen && canShowFiles"
                        :assistant-id="filesPanelAssistantId"
                        @update:show="filesOpen = $event" />
                </div>

                <AgentEditModal v-model="agentEditorOpen" :agent="agentEditing" />

                <UnfavoriteWarning :is-open="headerUnpinWarning"
                    @confirm="confirmHeaderUnpin" @cancel="headerUnpinWarning = false" />
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import AssistantSidebar from './AssistantSidebar.vue';
import AssistantChat from './AssistantChat.vue';
import AssistantComposer from './AssistantComposer.vue';
import MemoryPanel from './MemoryPanel.vue';
import AssistantFilesPanel from './AssistantFilesPanel.vue';
import AgentChat from '../agent/AgentChat.vue';
import AgentEditModal from '../agent/AgentEditModal.vue';
import UnfavoriteWarning from '../agent/UnfavoriteWarning.vue';
import { expirationLabel } from '../agent/expirationLabel';
import { useAssistantStore } from '../../store/assistantStore';
import { useAgentStore } from '../../store/agentStore';
import type { Agent } from '../../types/Agent';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
}>();

const assistantStore = useAssistantStore();
const agentStore = useAgentStore();

const composerRef = ref<InstanceType<typeof AssistantComposer> | null>(null);
const agentEditorOpen = ref(false);
const agentEditing = ref<Agent | null>(null);
const memoryOpen = ref(false);
const filesOpen = ref(false);
const headerUnpinWarning = ref(false);

// Active selection: 'assistant' | 'agent' | null.
const selection = ref<'assistant' | 'agent' | null>(null);

const selectionKey = computed(() => {
    if (selection.value === 'assistant' && assistantStore.activeId != null)
        return `assistant-${assistantStore.activeId}`;
    if (selection.value === 'agent' && agentStore.activeId != null)
        return `agent-${agentStore.activeId}`;
    return null;
});

const activeAgent = computed(() => agentStore.activeAgent);

const headerName = computed(() => {
    if (selection.value === 'assistant') return assistantStore.activeAssistant?.name || 'Assistant';
    if (selection.value === 'agent') return activeAgent.value?.name || 'Agent';
    return 'Assistant';
});

const headerIcon = computed(() => {
    if (selection.value === 'assistant') return assistantStore.activeAssistant?.icon || '◇';
    if (selection.value === 'agent') return activeAgent.value?.icon || '◇';
    return '◇';
});

const headerSub = computed(() => {
    if (selection.value === 'assistant') return assistantStore.activeAssistant?.sub || '';
    if (selection.value === 'agent') return activeAgent.value?.sub || '';
    return '';
});

const headerFolderScope = computed(() => {
    if (selection.value === 'assistant') return assistantStore.activeAssistant?.folderScope || null;
    if (selection.value === 'agent') return activeAgent.value?.folderScope || null;
    return null;
});

const agentExpirationText = computed(() => {
    const a = activeAgent.value;
    return a ? expirationLabel(a.expiresAt, a.pinned) : null;
});

const canShowMemory = computed(
    () => selection.value === 'assistant' && assistantStore.activeAssistant?.isSystem === true,
);
const canShowFiles = computed(() => {
    if (selection.value === 'assistant') return !!assistantStore.activeAssistant?.folderScope;
    if (selection.value === 'agent') return !!activeAgent.value?.folderScope;
    return false;
});
const filesPanelAssistantId = computed(() => {
    if (selection.value === 'assistant') return assistantStore.activeAssistant?.id ?? null;
    // The AssistantFilesPanel still expects an assistant id; for agents we
    // bypass file panel for now to keep the change focused — see T07-T10
    // notes. Returning null hides it.
    return null;
});

const composerDisabled = computed(() => {
    if (selection.value === 'assistant') {
        return !assistantStore.activeAssistant || (assistantStore.isActivePending && !assistantStore.activeStreamDone);
    }
    if (selection.value === 'agent') {
        return !agentStore.activeAgent || (agentStore.isActivePending && !agentStore.activeStreamDone);
    }
    return true;
});

const composerPlaceholder = computed(() => {
    if (selection.value === 'assistant') {
        if (!assistantStore.activeAssistant) return 'Select a conversation…';
        if (assistantStore.isActivePending && !assistantStore.activeStreamDone) return 'Waiting for response…';
        return `Message ${assistantStore.activeAssistant.name}… (Shift+Enter for a new line)`;
    }
    if (selection.value === 'agent') {
        if (!agentStore.activeAgent) return 'Select a conversation…';
        if (agentStore.isActivePending && !agentStore.activeStreamDone) return 'Waiting for response…';
        return `Message ${agentStore.activeAgent.name}… (Shift+Enter for a new line)`;
    }
    return 'Select a conversation…';
});

function toggleMemory() {
    memoryOpen.value = !memoryOpen.value;
    if (memoryOpen.value) filesOpen.value = false;
}

function toggleFiles() {
    filesOpen.value = !filesOpen.value;
    if (filesOpen.value) memoryOpen.value = false;
}

function close() {
    emit('update:modelValue', false);
}

function handleSend(text: string) {
    if (selection.value === 'assistant') {
        assistantStore.sendMessage(text);
    } else if (selection.value === 'agent') {
        agentStore.sendMessage(text);
    }
}

function openAgentEditor(a: Agent | null) {
    agentEditing.value = a;
    agentEditorOpen.value = true;
}

async function selectAssistant(id: number) {
    selection.value = 'assistant';
    await assistantStore.selectAssistant(id);
    await nextTick();
    composerRef.value?.focus();
}

async function selectAgent(a: Agent) {
    selection.value = 'agent';
    await agentStore.selectAgent(a.id);
    await nextTick();
    composerRef.value?.focus();
}

function onPinClick() {
    const a = activeAgent.value;
    if (!a) return;
    if (a.pinned) {
        headerUnpinWarning.value = true;
    } else {
        void agentStore.togglePin(a.id);
    }
}

function confirmHeaderUnpin() {
    headerUnpinWarning.value = false;
    if (activeAgent.value) void agentStore.togglePin(activeAgent.value.id);
}

function onKeydown(e: KeyboardEvent) {
    if (!props.modelValue) return;
    if (e.key === 'Escape') {
        if (agentEditorOpen.value) return;
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
            await Promise.all([assistantStore.load(), agentStore.load()]);
            // Default to the personal assistant.
            const personal = assistantStore.assistants.find((a) => a.isSystem);
            if (personal) {
                await selectAssistant(personal.id);
            }
        }
    },
);

watch(
    () => selection.value,
    () => {
        if (!canShowMemory.value) memoryOpen.value = false;
        if (!canShowFiles.value) filesOpen.value = false;
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
