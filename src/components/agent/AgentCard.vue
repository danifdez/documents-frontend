<template>
    <div class="px-3 py-2.5 rounded-lg cursor-pointer transition-colors group"
        :class="active ? 'bg-accent-subtle text-accent-dark' : 'hover:bg-surface-hover text-text-secondary'"
        @click="$emit('select')">
        <div class="flex items-center gap-2">
            <span v-if="agent.icon" class="text-base leading-none">{{ agent.icon }}</span>
            <span class="text-sm font-medium truncate flex-1">{{ agent.name }}</span>

            <!-- Favorite toggle (star) — same UI in card and chat header. -->
            <button @click.stop="onStarClick"
                class="leading-none px-1.5 py-0.5 rounded hover:bg-surface transition-colors cursor-pointer"
                :class="agent.pinned ? 'text-amber-500' : 'text-text-muted hover:text-text-secondary'"
                :title="agent.pinned ? 'Unfavorite' : 'Favorite (won\'t expire)'">
                {{ agent.pinned ? '★' : '☆' }}
            </button>

            <!-- Edit / delete in a small ghost menu. -->
            <button
                class="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-surface text-text-muted hover:text-text-primary cursor-pointer"
                @click.stop="$emit('edit')" title="Edit agent">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
            </button>
            <button
                class="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-surface text-text-muted hover:text-red-600 cursor-pointer"
                @click.stop="onDelete" title="Delete agent">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                </svg>
            </button>
        </div>
        <div v-if="agent.sub" class="text-[11px] text-text-muted mt-0.5 truncate">{{ agent.sub }}</div>
        <div v-if="expirationText" class="text-[10px] text-text-muted mt-0.5">{{ expirationText }}</div>
    </div>

    <UnfavoriteWarning :is-open="warningOpen"
        @confirm="confirmUnfavorite" @cancel="warningOpen = false" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Agent } from '../../types/Agent';
import { useAgentStore } from '../../store/agentStore';
import UnfavoriteWarning from './UnfavoriteWarning.vue';
import { expirationLabel } from './expirationLabel';

const props = defineProps<{
    agent: Agent;
    active: boolean;
}>();

const emit = defineEmits<{
    (e: 'select'): void;
    (e: 'edit'): void;
}>();

const store = useAgentStore();
const warningOpen = ref(false);

const expirationText = computed(() => expirationLabel(props.agent.expiresAt, props.agent.pinned));

function onStarClick() {
    if (props.agent.pinned) {
        // Unfavoriting goes through the warning modal first.
        warningOpen.value = true;
    } else {
        void store.togglePin(props.agent.id);
    }
}

async function confirmUnfavorite() {
    warningOpen.value = false;
    await store.togglePin(props.agent.id);
}

async function onDelete() {
    if (!confirm(`Delete the agent "${props.agent.name}"? Its conversation will also be deleted.`)) return;
    try {
        await store.deleteAgent(props.agent.id);
    } catch (e: any) {
        alert(e?.response?.data?.message || e?.message || 'Could not delete the agent');
    }
}
</script>
