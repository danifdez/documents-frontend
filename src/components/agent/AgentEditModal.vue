<template>
    <Modal :model-value="modelValue" :title="modalTitle"
        @update:model-value="$emit('update:modelValue', $event)">
        <div class="flex flex-col gap-4">
            <div v-if="isEdit && agent" class="text-xs text-text-muted">
                <span v-if="agent.pinned" class="text-amber-500">★</span>
                <span v-if="agent.pinned">Favorite — won't expire</span>
                <span v-else>{{ expiration || 'No expiration set' }}</span>
            </div>

            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Name</label>
                <input v-model="form.name" type="text" required maxlength="100"
                    placeholder="Vacation planner"
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            </div>

            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Short description <span
                        class="text-text-muted">(optional)</span></label>
                <input v-model="form.sub" type="text" maxlength="300"
                    placeholder="Plan and write a trip itinerary"
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            </div>

            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Icon <span
                        class="text-text-muted">(optional)</span></label>
                <input v-model="form.icon" type="text" maxlength="16"
                    placeholder="✈️"
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            </div>

            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Working folder <span
                        class="text-text-muted">(optional)</span></label>

                <div v-if="form.folderScope" class="flex items-center gap-2">
                    <span
                        class="flex-1 min-w-0 truncate text-left text-sm font-mono px-3 py-2 rounded-lg border border-border bg-surface-elevated"
                        dir="rtl" :title="form.folderScope">{{ form.folderScope }}</span>
                    <button type="button" @click="handlePick" :disabled="!folderPicker.isAvailable"
                        :title="folderPicker.isAvailable ? '' : 'Available only in the desktop app'"
                        class="px-3 py-2 text-xs rounded-lg border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                        Change…
                    </button>
                    <button type="button" @click="form.folderScope = ''"
                        class="px-3 py-2 text-xs rounded-lg text-text-secondary hover:bg-surface-hover cursor-pointer">
                        Remove
                    </button>
                </div>

                <button v-else type="button" @click="handlePick" :disabled="!folderPicker.isAvailable"
                    :title="folderPicker.isAvailable ? '' : 'Available only in the desktop app'"
                    class="px-3 py-2 text-sm rounded-lg border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    Choose folder…
                </button>

                <p v-if="folderScopeChanged && isEdit"
                    class="text-[11px] text-amber-600 dark:text-amber-500 mt-1">
                    Indexed files from the previous folder will no longer be available.
                </p>
                <p v-else class="text-[11px] text-text-muted mt-1">
                    Files inside this folder will be indexed and accessible via folder tools.
                </p>
            </div>

            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Instructions <span
                        class="text-text-muted">(optional)</span></label>
                <textarea v-model="form.systemPrompt" rows="5"
                    placeholder="You are an agent for a specific task. Be direct, no fluff."
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
            </div>

            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" :checked="form.pinned"
                    @change="onPinnedChange(($event.target as HTMLInputElement).checked)"
                    class="rounded" />
                <span class="text-sm text-text-secondary">Favorite (always at the top of the list, won't expire)</span>
            </label>

            <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
        </div>

        <template #footer>
            <button v-if="isEdit && agent" @click="handleDelete"
                class="px-4 py-2 text-sm rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer mr-auto">
                Delete
            </button>
            <button @click="$emit('update:modelValue', false)"
                class="px-4 py-2 text-sm rounded-lg text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
                Cancel
            </button>
            <button @click="handleSave" :disabled="!canSave || saving"
                class="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer">
                {{ saving ? 'Saving…' : isEdit ? 'Save' : 'Create' }}
            </button>
        </template>
    </Modal>

    <UnfavoriteWarning :is-open="warningOpen"
        @confirm="confirmUnfavorite" @cancel="cancelUnfavorite" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Modal from '../ui/Modal/Modal.vue';
import { useAgentStore } from '../../store/agentStore';
import { useFolderPicker } from '../../composables/useFolderPicker';
import { useAgents } from '../../services/agents/useAgents';
import { expirationLabel } from './expirationLabel';
import UnfavoriteWarning from './UnfavoriteWarning.vue';
import type { Agent } from '../../types/Agent';

const props = defineProps<{
    modelValue: boolean;
    agent: Agent | null;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
}>();

const store = useAgentStore();
const folderPicker = useFolderPicker();
const api = useAgents();

const isEdit = computed(() => props.agent !== null);
const modalTitle = computed(() => isEdit.value ? 'Edit agent' : 'New agent');
const canSave = computed(() => form.value.name.trim().length > 0);

const form = ref({
    name: '',
    sub: '',
    icon: '',
    folderScope: '',
    systemPrompt: '',
    pinned: false,
});
const originalFolderScope = ref<string>('');
const saving = ref(false);
const error = ref<string | null>(null);
const warningOpen = ref(false);
const pendingUnpin = ref(false);

const expiration = computed(() =>
    props.agent ? expirationLabel(props.agent.expiresAt, props.agent.pinned) : null,
);

const folderScopeChanged = computed(
    () => !!originalFolderScope.value && form.value.folderScope !== originalFolderScope.value,
);

function fillForm(a: Agent | null) {
    form.value = {
        name: a?.name ?? '',
        sub: a?.sub ?? '',
        icon: a?.icon ?? '',
        folderScope: a?.folderScope ?? '',
        systemPrompt: a?.systemPrompt ?? '',
        pinned: a?.pinned ?? false,
    };
    originalFolderScope.value = a?.folderScope ?? '';
    error.value = null;
    pendingUnpin.value = false;
}

async function loadFresh(id: number) {
    try {
        const fresh = await api.get(id);
        fillForm(fresh);
    } catch (e: any) {
        // Falls back to the in-memory dataset if the fetch fails.
        fillForm(props.agent);
        error.value = e?.message || 'Could not load the latest agent state';
    }
}

watch(
    () => [props.modelValue, props.agent?.id],
    async ([open, id]) => {
        if (!open) return;
        if (isEdit.value && typeof id === 'number') {
            fillForm(props.agent);
            await loadFresh(id);
        } else {
            fillForm(null);
        }
    },
    { immediate: true },
);

async function handlePick() {
    const picked = await folderPicker.pick({ title: 'Pick the agent working folder' });
    if (picked) form.value.folderScope = picked;
}

function onPinnedChange(next: boolean) {
    if (!isEdit.value) {
        // For creation we don't need the warning — the agent isn't created yet.
        form.value.pinned = next;
        return;
    }
    if (form.value.pinned && !next) {
        // Unfavoriting an existing agent → show the warning before applying.
        warningOpen.value = true;
        pendingUnpin.value = true;
        return;
    }
    form.value.pinned = next;
}

function confirmUnfavorite() {
    warningOpen.value = false;
    pendingUnpin.value = false;
    form.value.pinned = false;
}

function cancelUnfavorite() {
    warningOpen.value = false;
    pendingUnpin.value = false;
    // No checkbox state mutation needed — v-model isn't bound directly because
    // we intercept @change. The DOM checkbox reflects whatever `form.pinned`
    // is on the next render.
}

async function handleSave() {
    if (!canSave.value) return;
    saving.value = true;
    error.value = null;
    try {
        const payload = {
            name: form.value.name.trim(),
            sub: form.value.sub.trim() || undefined,
            icon: form.value.icon.trim() || undefined,
            folderScope: form.value.folderScope.trim()
                ? form.value.folderScope.trim()
                : (isEdit.value ? null : undefined),
            systemPrompt: form.value.systemPrompt.trim() || undefined,
            pinned: form.value.pinned,
        };
        if (isEdit.value && props.agent) {
            await store.updateAgent(props.agent.id, payload);
        } else {
            await store.createAgent(payload);
        }
        emit('update:modelValue', false);
    } catch (e: any) {
        error.value = e?.response?.data?.message || e?.message || 'Error saving';
    } finally {
        saving.value = false;
    }
}

async function handleDelete() {
    if (!props.agent) return;
    if (!confirm(`Delete the agent "${props.agent.name}"? Its conversation will also be deleted.`)) return;
    saving.value = true;
    try {
        await store.deleteAgent(props.agent.id);
        emit('update:modelValue', false);
    } catch (e: any) {
        error.value = e?.message || 'Error deleting';
    } finally {
        saving.value = false;
    }
}
</script>
