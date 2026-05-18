<template>
    <aside class="w-64 shrink-0 flex flex-col border-r border-border bg-surface">
        <div v-if="store.loading && !store.loaded" class="flex justify-center py-6">
            <LoadingSpinner size="sm" />
        </div>

        <div v-else class="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
            <!-- Personal assistant: still owned by AssistantStore. -->
            <div v-for="a in personalAssistants" :key="a.id"
                class="px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                :class="selection === 'assistant-' + a.id
                    ? 'bg-accent-subtle text-accent-dark'
                    : 'hover:bg-surface-hover text-text-secondary'"
                @click="onSelectAssistant(a.id)">
                <div class="flex items-center gap-2">
                    <span class="text-lg leading-none">{{ a.icon || '◇' }}</span>
                    <span class="text-sm font-semibold">{{ a.name }}</span>
                </div>
                <div class="text-[11px] text-text-muted mt-0.5 pl-7">{{ a.sub || 'Your personal assistant' }}</div>
            </div>

            <!-- Agents: separate entity, separate store. -->
            <AgentList
                @new-agent="$emit('new-agent')"
                @select-agent="onSelectAgent"
                @edit-agent="$emit('edit-agent', $event)" />
        </div>
    </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import LoadingSpinner from '../ui/LoadingSpinner.vue';
import { useAssistantStore } from '../../store/assistantStore';
import { useAgentStore } from '../../store/agentStore';
import AgentList from '../agent/AgentList.vue';
import type { Agent } from '../../types/Agent';

defineProps<{
    selection: string | null; // 'assistant-<id>' | 'agent-<id>' | null
}>();

const emit = defineEmits<{
    (e: 'new-agent'): void;
    (e: 'edit-agent', a: Agent): void;
    (e: 'select-assistant', id: number): void;
    (e: 'select-agent', a: Agent): void;
}>();

const store = useAssistantStore();
const agentStore = useAgentStore();

// Use the assistant store's existing sortedAssistants but keep only the
// personal one — non-personal assistants are deprecated as "helpers" and
// live in `agents` from Cambio #6 onwards.
const personalAssistants = computed(() => store.sortedAssistants.filter((a) => a.isSystem));

function onSelectAssistant(id: number) {
    emit('select-assistant', id);
}
function onSelectAgent(a: Agent) {
    void agentStore.selectAgent(a.id);
    emit('select-agent', a);
}
</script>
