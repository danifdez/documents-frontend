<template>
    <Modal :model-value="modelValue" :title="isEdit ? 'Edit helper' : 'New helper'"
        @update:model-value="$emit('update:modelValue', $event)">
        <div class="flex flex-col gap-4">
            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Name</label>
                <input v-model="form.name" type="text" required maxlength="100"
                    placeholder="Blog drafts"
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            </div>

            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Short description <span
                        class="text-text-muted">(optional)</span></label>
                <input v-model="form.sub" type="text" maxlength="300"
                    placeholder="Ideas and writing"
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            </div>

            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Scope folder <span
                        class="text-text-muted">(optional)</span></label>
                <input v-model="form.folderScope" type="text" maxlength="500"
                    placeholder="~/notes/blog/"
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                <p class="text-[11px] text-text-muted mt-1">The helper will work on files inside this folder
                    (in upcoming phases with tool use).</p>
            </div>

            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">System prompt <span
                        class="text-text-muted">(optional)</span></label>
                <textarea v-model="form.systemPrompt" rows="5"
                    placeholder="You are a literary editor. You help with ideas and copy review. Be direct, no fluff."
                    class="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
            </div>

            <label class="flex items-center gap-2 cursor-pointer">
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
import type { Assistant } from '../../types/Assistant';

const props = defineProps<{
    modelValue: boolean;
    assistant: Assistant | null;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
}>();

const store = useAssistantStore();

const isEdit = computed(() => props.assistant !== null);
const canSave = computed(() => form.value.name.trim().length > 0);

const form = ref({
    name: '',
    sub: '',
    folderScope: '',
    systemPrompt: '',
    pinned: false,
});
const saving = ref(false);
const error = ref<string | null>(null);

function resetForm(a: Assistant | null) {
    form.value = {
        name: a?.name ?? '',
        sub: a?.sub ?? '',
        folderScope: a?.folderScope ?? '',
        systemPrompt: a?.systemPrompt ?? '',
        pinned: a?.pinned ?? false,
    };
    error.value = null;
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
