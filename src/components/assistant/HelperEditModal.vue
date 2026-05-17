<template>
    <Modal :model-value="modelValue" :title="modalTitle"
        @update:model-value="$emit('update:modelValue', $event)">
        <div class="flex flex-col gap-4">
            <div v-if="!isSystem">
                <label class="block text-xs font-medium text-text-secondary mb-1">Name</label>
                <input v-model="form.name" type="text" required maxlength="100"
                    placeholder="Blog drafts"
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            </div>

            <div v-if="!isSystem">
                <label class="block text-xs font-medium text-text-secondary mb-1">Short description <span
                        class="text-text-muted">(optional)</span></label>
                <input v-model="form.sub" type="text" maxlength="300"
                    placeholder="Ideas and writing"
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            </div>

            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Working folder <span
                        class="text-text-muted">(optional)</span></label>

                <div v-if="form.folderScope" class="flex items-center gap-2">
                    <span
                        class="flex-1 min-w-0 truncate text-left text-sm font-mono px-3 py-2 rounded-lg border border-border bg-surface-elevated"
                        dir="rtl"
                        :title="form.folderScope">{{ form.folderScope }}</span>
                    <button type="button" @click="handlePick"
                        :disabled="!folderPicker.isAvailable"
                        :title="folderPicker.isAvailable ? '' : 'Available only in the desktop app'"
                        class="px-3 py-2 text-xs rounded-lg border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                        Change…
                    </button>
                    <button type="button" @click="form.folderScope = ''"
                        class="px-3 py-2 text-xs rounded-lg text-text-secondary hover:bg-surface-hover cursor-pointer">
                        Remove
                    </button>
                </div>

                <button v-else type="button" @click="handlePick"
                    :disabled="!folderPicker.isAvailable"
                    :title="folderPicker.isAvailable ? '' : 'Available only in the desktop app'"
                    class="px-3 py-2 text-sm rounded-lg border border-border hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    Pick folder…
                </button>

                <p v-if="folderScopeChanged" class="text-[11px] text-amber-600 dark:text-amber-500 mt-1">
                    Indexed files from the previous folder will no longer be available.
                </p>
                <p v-else class="text-[11px] text-text-muted mt-1">
                    Files inside this folder will be indexed and made available to folder tools.
                </p>
            </div>

            <div v-if="!isSystem">
                <label class="block text-xs font-medium text-text-secondary mb-1">System prompt <span
                        class="text-text-muted">(optional)</span></label>
                <textarea v-model="form.systemPrompt" rows="5"
                    placeholder="You are a literary editor. You help with ideas and copy review. Be direct, no fluff."
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
            </div>

            <label v-if="!isSystem" class="flex items-center gap-2 cursor-pointer">
                <input v-model="form.pinned" type="checkbox" class="rounded" />
                <span class="text-sm text-text-secondary">Pin as favorite (appears at the top of the list)</span>
            </label>

            <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
        </div>

        <template #footer>
            <button v-if="isEdit && assistant && !assistant.isSystem" @click="handleDelete"
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Modal from '../ui/Modal/Modal.vue';
import { useAssistantStore } from '../../store/assistantStore';
import { useFolderPicker } from '../../composables/useFolderPicker';
import type { Assistant } from '../../types/Assistant';

const props = defineProps<{
    modelValue: boolean;
    assistant: Assistant | null;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
}>();

const store = useAssistantStore();
const folderPicker = useFolderPicker();

const isEdit = computed(() => props.assistant !== null);
const isSystem = computed(() => props.assistant?.isSystem === true);
const modalTitle = computed(() => {
    if (isSystem.value) return 'Edit assistant';
    return isEdit.value ? 'Edit helper' : 'New helper';
});
const canSave = computed(() => isSystem.value || form.value.name.trim().length > 0);

const form = ref({
    name: '',
    sub: '',
    folderScope: '',
    systemPrompt: '',
    pinned: false,
});
const originalFolderScope = ref<string>('');
const saving = ref(false);
const error = ref<string | null>(null);

const folderScopeChanged = computed(
    () => !!originalFolderScope.value && form.value.folderScope !== originalFolderScope.value,
);

function resetForm(a: Assistant | null) {
    form.value = {
        name: a?.name ?? '',
        sub: a?.sub ?? '',
        folderScope: a?.folderScope ?? '',
        systemPrompt: a?.systemPrompt ?? '',
        pinned: a?.pinned ?? false,
    };
    originalFolderScope.value = a?.folderScope ?? '';
    error.value = null;
}

async function handlePick() {
    const picked = await folderPicker.pick({ title: 'Pick the helper working folder' });
    if (picked) form.value.folderScope = picked;
}

watch(
    () => [props.modelValue, props.assistant],
    () => {
        if (props.modelValue) resetForm(props.assistant);
    },
    { immediate: true },
);

async function handleSave() {
    if (!canSave.value) return;
    saving.value = true;
    error.value = null;
    try {
        const payload = {
            name: form.value.name.trim(),
            sub: form.value.sub.trim() || undefined,
            folderScope: form.value.folderScope.trim() || undefined,
            systemPrompt: form.value.systemPrompt.trim() || undefined,
            pinned: form.value.pinned,
        };
        if (isEdit.value && props.assistant) {
            await store.updateAssistant(props.assistant.id, payload);
        } else {
            await store.createHelper(payload);
        }
        emit('update:modelValue', false);
    } catch (e: any) {
        error.value = e?.response?.data?.message || e?.message || 'Error saving';
    } finally {
        saving.value = false;
    }
}

async function handleDelete() {
    if (!props.assistant) return;
    if (!confirm(`Delete the helper "${props.assistant.name}"? Its conversation will also be deleted.`)) return;
    saving.value = true;
    try {
        await store.deleteAssistant(props.assistant.id);
        emit('update:modelValue', false);
    } catch (e: any) {
        error.value = e?.message || 'Error deleting';
    } finally {
        saving.value = false;
    }
}
</script>
