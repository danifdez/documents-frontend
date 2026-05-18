<template>
    <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between pt-2">
            <h4 class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Agents</h4>
            <button @click="$emit('new-agent')"
                class="text-[11px] text-text-secondary hover:text-text-primary px-2 py-0.5 rounded hover:bg-surface-hover transition-colors cursor-pointer">
                + New
            </button>
        </div>

        <div v-if="store.loading && !store.loaded" class="flex justify-center py-4">
            <LoadingSpinner size="sm" />
        </div>

        <div v-else-if="store.error" class="text-[11px] text-red-500 px-3 py-2">
            {{ store.error }}
        </div>

        <div v-else-if="store.sortedAgents.length === 0" class="text-[11px] text-text-muted italic px-3 py-2">
            You don't have any agents yet. Create one to get started.
        </div>

        <template v-else>
            <AgentCard v-for="a in store.sortedAgents" :key="a.id"
                :agent="a" :active="store.activeId === a.id"
                @select="$emit('select-agent', a)"
                @edit="$emit('edit-agent', a)" />
        </template>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import LoadingSpinner from '../ui/LoadingSpinner.vue';
import AgentCard from './AgentCard.vue';
import { useAgentStore } from '../../store/agentStore';
import type { Agent } from '../../types/Agent';

defineEmits<{
    (e: 'new-agent'): void;
    (e: 'select-agent', a: Agent): void;
    (e: 'edit-agent', a: Agent): void;
}>();

const store = useAgentStore();

onMounted(() => {
    void store.load();
});
</script>
