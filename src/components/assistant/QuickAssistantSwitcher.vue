<template>
    <div ref="dropdownRef" class="relative">
        <button type="button" @click="open = !open"
            class="flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-left transition-colors hover:bg-surface-hover cursor-pointer">
            <span class="shrink-0 text-base leading-none">{{ currentIcon }}</span>
            <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-text-primary">{{ currentName }}</span>
                <span v-if="currentSub" class="block truncate text-[11px] text-text-muted">{{ currentSub }}</span>
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0 text-text-muted"
                :class="{ 'rotate-180': open }" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </button>

        <div v-if="open"
            class="absolute inset-x-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface-elevated py-1 shadow-lg">
            <div class="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Personal assistant
            </div>
            <button v-for="a in assistantStore.assistants" :key="'assistant-' + a.id"
                type="button" @click="chooseAssistant(a.id)"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                :class="selection === 'assistant-' + a.id
                    ? 'bg-accent-subtle text-accent-dark'
                    : 'text-text-secondary hover:bg-surface-hover'">
                <span class="shrink-0 text-base leading-none">{{ a.icon || '◇' }}</span>
                <span class="min-w-0 flex-1">
                    <span class="block truncate font-medium">{{ a.name }}</span>
                    <span class="block truncate text-[11px] text-text-muted">{{ a.sub || 'Your personal assistant' }}</span>
                </span>
            </button>

            <div class="mt-1 border-t border-border pt-1">
                <div class="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Agents
                </div>
                <button v-for="a in agentStore.sortedAgents" :key="'agent-' + a.id"
                    type="button" @click="chooseAgent(a)"
                    class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                    :class="selection === 'agent-' + a.id
                        ? 'bg-accent-subtle text-accent-dark'
                        : 'text-text-secondary hover:bg-surface-hover'">
                    <span class="shrink-0 text-base leading-none">{{ a.icon || '◇' }}</span>
                    <span class="min-w-0 flex-1">
                        <span class="block truncate font-medium">{{ a.name }}</span>
                        <span v-if="a.sub" class="block truncate text-[11px] text-text-muted">{{ a.sub }}</span>
                    </span>
                </button>
                <div v-if="agentStore.sortedAgents.length === 0"
                    class="px-3 py-2 text-[11px] italic text-text-muted">
                    You don't have any agents yet.
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useAssistantStore } from '../../store/assistantStore';
import { useAgentStore } from '../../store/agentStore';
import type { Agent } from '../../types/Agent';

const props = defineProps<{
    selection: string | null;
}>();

const emit = defineEmits<{
    (e: 'select-assistant', id: number): void;
    (e: 'select-agent', a: Agent): void;
}>();

const assistantStore = useAssistantStore();
const agentStore = useAgentStore();

const open = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const activeAssistant = computed(() => assistantStore.activeAssistant);
const activeAgent = computed(() => agentStore.activeAgent);

const currentName = computed(() => {
    if (props.selection?.startsWith('agent-')) return activeAgent.value?.name || 'Agent';
    return activeAssistant.value?.name || 'Assistant';
});

const currentIcon = computed(() => {
    if (props.selection?.startsWith('agent-')) return activeAgent.value?.icon || '◇';
    return activeAssistant.value?.icon || '◇';
});

const currentSub = computed(() => {
    if (props.selection?.startsWith('agent-')) return activeAgent.value?.sub || '';
    return activeAssistant.value?.sub || 'Your personal assistant';
});

function chooseAssistant(id: number) {
    open.value = false;
    emit('select-assistant', id);
}

function chooseAgent(a: Agent) {
    open.value = false;
    emit('select-agent', a);
}

function handleClickOutside(event: MouseEvent) {
    if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
        open.value = false;
    }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>
