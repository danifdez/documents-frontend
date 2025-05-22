<template>
    <Modal v-model="showModal" title="Create New Thread">
        <form @submit.prevent="addThread" class="space-y-4">
            <div>
                <label for="threadName" class="block text-sm font-medium text-gray-700 mb-1">Thread Name</label>
                <input id="threadName" v-model="threadName" type="text" placeholder="Enter thread name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required />
            </div>

            <div>
                <label for="threadDescription" class="block text-sm font-medium text-gray-700 mb-1">Description
                    (optional)</label>
                <textarea id="threadDescription" v-model="threadDescription" placeholder="Enter thread description"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>

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

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    projectId: {
        type: String,
        required: true
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
        await createThread(threadName.value, props.projectId, threadDescription.value);

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