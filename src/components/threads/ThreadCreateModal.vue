<template>
    <Modal v-model="showModal" title="Create New Thread">
        <form @submit.prevent="addThread" class="space-y-4">
            <FormField label="Thread Name" v-model="threadName" placeholder="Enter thread name" required />
            <FormField label="Description" v-model="threadDescription" type="textarea" placeholder="Enter thread description" hint="Optional" />

            <div class="flex justify-end pt-2" slot="footer">
                <Button type="button" variant="secondary" @click="closeModal" class="mr-2">
                    Cancel
                </Button>
                <Button type="submit" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Creating...' : 'Create Thread' }}
                </Button>
            </div>
        </form>
    </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useThreadCreate } from '../../services/threads/useThreadCreate';
import Modal from '../ui/Modal/Modal.vue';
import Button from '../ui/Button.vue';
import FormField from '../ui/FormField.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    projectId: {
        type: String,
        required: true
    },
    parentId: {
        type: [String, Number],
        default: null
    }
});

const emit = defineEmits(['update:modelValue', 'thread:created']);

const { newThreadId, status, isLoading, createThread } = useThreadCreate();
const threadName = ref('');
const threadDescription = ref('');
const isSubmitting = ref(false);
const showModal = ref(false);

showModal.value = props.modelValue;

watch(() => props.modelValue, (newVal) => {
    showModal.value = newVal;
});

watch(() => showModal.value, (newVal) => {
    emit('update:modelValue', newVal);
});

async function addThread() {
    if (!threadName.value.trim()) return;

    try {
        isSubmitting.value = true;
        await createThread(threadName.value, props.projectId, threadDescription.value, props.parentId);

        if (status.value) {
            threadName.value = '';
            threadDescription.value = '';
            closeModal();
            emit('thread:created', newThreadId.value);
        }
    } catch (error) {
        console.error('Error adding thread:', error);
    } finally {
        isSubmitting.value = false;
    }
}

function closeModal() {
    showModal.value = false;
    emit('update:modelValue', false);
}
</script>