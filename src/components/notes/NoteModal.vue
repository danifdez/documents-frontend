<template>
    <Modal v-model="showModal" title="New Note">
        <form @submit.prevent="handleCreate" class="space-y-5">
            <FormField label="Title" v-model="title" placeholder="Note title" required />
            <FormField label="Content" v-model="content" type="textarea" placeholder="Write something..." :rows="4" hint="Optional" />

            <div class="flex justify-end gap-2.5 pt-2">
                <Button type="button" variant="secondary" @click="closeModal">Cancel</Button>
                <Button type="submit" variant="info" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Creating...' : 'Create Note' }}
                </Button>
            </div>
        </form>
    </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useNotes } from '../../services/notes/useNotes';
import Modal from '../ui/Modal/Modal.vue';
import Button from '../ui/Button.vue';
import FormField from '../ui/FormField.vue';

const props = defineProps<{
    modelValue: boolean;
    projectId?: string | number;
    threadId?: string | number;
}>();

const emit = defineEmits(['update:modelValue', 'note:created']);

const { createNote } = useNotes();
const title = ref('');
const content = ref('');
const isSubmitting = ref(false);
const showModal = ref(false);

watch(() => props.modelValue, (v) => { showModal.value = v; });
watch(showModal, (v) => { emit('update:modelValue', v); });

async function handleCreate() {
    if (!title.value.trim()) return;
    isSubmitting.value = true;
    try {
        const data: any = { title: title.value.trim() };
        if (content.value.trim()) {
            data.content = `<p>${content.value.trim().replace(/\n/g, '</p><p>')}</p>`;
        }
        if (props.projectId) {
            data.project = { id: Number(props.projectId) };
        }
        if (props.threadId) {
            data.thread = { id: Number(props.threadId) };
        }
        const note = await createNote(data);
        title.value = '';
        content.value = '';
        closeModal();
        emit('note:created', note);
    } catch (err) {
        console.error('Error creating note:', err);
    } finally {
        isSubmitting.value = false;
    }
}

function closeModal() {
    showModal.value = false;
    emit('update:modelValue', false);
}
</script>
