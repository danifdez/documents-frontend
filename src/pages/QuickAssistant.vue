<template>
    <div class="flex h-full w-full min-w-0 flex-col overflow-hidden bg-surface">
        <header class="qa-drag flex min-w-0 shrink-0 items-center gap-2 border-b border-border bg-surface-elevated px-3 py-2">
            <div class="qa-no-drag min-w-0 flex-1">
                <QuickAssistantSwitcher :selection="selectionKey" @select-assistant="selectAssistant"
                    @select-agent="selectAgent" />
            </div>
            <button type="button" class="qa-no-drag shrink-0 rounded p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary cursor-pointer"
                title="Close (Esc)" @click="hide">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </header>

        <div v-if="!workspaceReady" class="flex flex-1 items-center justify-center px-6 text-center text-sm text-text-muted">
            {{ workspaceStore.initialized ? 'Open Documents to set up a workspace first.' : 'Starting the assistant…' }}
        </div>

        <template v-else>
            <AssistantChat v-if="selection === 'assistant'" />
            <AgentChat v-else-if="selection === 'agent'" />
            <div v-else class="flex flex-1 items-center justify-center text-sm text-text-muted">
                Loading the assistant…
            </div>

            <AssistantComposer ref="composerRef" :disabled="composerDisabled" :placeholder="composerPlaceholder"
                @send="handleSend" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import QuickAssistantSwitcher from '../components/assistant/QuickAssistantSwitcher.vue';
import AssistantChat from '../components/assistant/AssistantChat.vue';
import AgentChat from '../components/agent/AgentChat.vue';
import AssistantComposer from '../components/assistant/AssistantComposer.vue';
import { useAssistantStore } from '../store/assistantStore';
import { useAgentStore } from '../store/agentStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { Agent } from '../types/Agent';

const assistantStore = useAssistantStore();
const agentStore = useAgentStore();
const workspaceStore = useWorkspaceStore();

const selection = ref<'assistant' | 'agent' | null>(null);
const composerRef = ref<InstanceType<typeof AssistantComposer> | null>(null);

const workspaceReady = computed(
    () => workspaceStore.initialized && workspaceStore.hasWorkspaces,
);

const selectionKey = computed(() => {
    if (selection.value === 'assistant' && assistantStore.activeId != null)
        return `assistant-${assistantStore.activeId}`;
    if (selection.value === 'agent' && agentStore.activeId != null)
        return `agent-${agentStore.activeId}`;
    return null;
});

const composerDisabled = computed(() => {
    if (selection.value === 'assistant') {
        return !assistantStore.activeAssistant || assistantStore.isActivePending;
    }
    if (selection.value === 'agent') {
        return !agentStore.activeAgent || agentStore.isActivePending;
    }
    return true;
});

const composerPlaceholder = computed(() => {
    if (selection.value === 'assistant') {
        if (!assistantStore.activeAssistant) return 'Select a conversation…';
        if (assistantStore.isActivePending) return 'Waiting for response…';
        return `Message ${assistantStore.activeAssistant.name}… (Shift+Enter for a new line)`;
    }
    if (selection.value === 'agent') {
        if (!agentStore.activeAgent) return 'Select a conversation…';
        if (agentStore.isActivePending) return 'Waiting for response…';
        return `Message ${agentStore.activeAgent.name}… (Shift+Enter for a new line)`;
    }
    return 'Select a conversation…';
});

async function resetToPersonal() {
    await Promise.all([assistantStore.load(), agentStore.load()]);
    const personal = assistantStore.assistants[0];
    if (personal) await selectAssistant(personal.id);
}

async function syncWorkspaceIfChanged() {
    try {
        const active = await window.electronAPI.getActiveWorkspace();
        if (!active || active.id === workspaceStore.activeWorkspaceId) return;
        await workspaceStore.loadWorkspaces();
        await resetToPersonal();
    } catch {
        // Keep the current workspace if the check fails.
    }
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

function handleSend(text: string) {
    if (selection.value === 'assistant') {
        assistantStore.sendMessage(text);
    } else if (selection.value === 'agent') {
        agentStore.sendMessage(text);
    }
}

function hide() {
    void window.quickAssistant?.hide();
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        e.preventDefault();
        hide();
    }
}

let stopShown: (() => void) | null = null;
let initialised = false;

const stopWatch = watch(
    workspaceReady,
    async (ready) => {
        if (!ready || initialised) return;
        initialised = true;
        await resetToPersonal();
    },
    { immediate: true },
);

onMounted(() => {
    // The app-wide `body { min-width: 760px }` would clip this small window.
    document.body.classList.add('quick-assistant-window');
    stopShown = window.quickAssistant?.onShown?.(() => {
        void syncWorkspaceIfChanged();
    }) ?? null;
    document.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
    document.body.classList.remove('quick-assistant-window');
    stopWatch();
    stopShown?.();
    document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.qa-drag {
    -webkit-app-region: drag;
}

.qa-no-drag {
    -webkit-app-region: no-drag;
}
</style>
