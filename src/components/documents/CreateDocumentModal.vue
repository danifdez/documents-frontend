<template>
    <Modal v-model="showModal" title="Create New Document">
        <form @submit.prevent="createNewDocument" class="space-y-4">
            <div>
                <label for="documentName" class="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                <input id="documentName" v-model="documentName" type="text" placeholder="Enter document name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required />
            </div>

            <div>
                <label for="threadSelect" class="block text-sm font-medium text-gray-700 mb-1">Thread (optional)</label>
                <select id="threadSelect" v-model="selectedThreadId"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    <option value="">No thread selected</option>
                    <option v-for="thread in threads" :key="thread._id" :value="thread._id">
                        {{ thread.name }}
                    </option>
                </select>
                <p class="text-sm text-gray-500 mt-1">Select a thread to organize this document, or leave empty for an
                    unassigned document.</p>
            </div>

            <div class="flex justify-end pt-2" slot="footer">
                <Button type="button" variant="secondary" @click="closeModal" class="mr-2">
                    Cancel
                </Button>
                <Button type="submit" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Creating...' : 'Create Document' }}
                </Button>
            </div>
        </form>
    </Modal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDocument } from '../../services/documents/useDocument';
import { useThreadList } from '../../services/threads/useThreadList';
import { useNotification } from '../../composables/useNotification';
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
    },
    resourceContent: {
        type: String,
        default: ''
    },
    resourceName: {
        type: String,
        default: ''
    },
    navigateAfterCreate: {
        type: Boolean,
        default: true
    }
});

const emit = defineEmits(['update:modelValue', 'document:created']);

const router = useRouter();
const { createDocument } = useDocument();
const { threads, loadThreads } = useThreadList();
const notification = useNotification();

const documentName = ref('');
const selectedThreadId = ref('');
const isSubmitting = ref(false);
const showModal = ref(false);

showModal.value = props.modelValue;

watch(() => props.modelValue, (newVal) => {
    showModal.value = newVal;
    if (newVal) {
        documentName.value = props.resourceName ? `Document from ${props.resourceName}` : 'New Document';
    }
});

watch(() => showModal.value, (newVal) => {
    emit('update:modelValue', newVal);
});

onMounted(async () => {
    if (props.projectId) {
        try {
            await loadThreads(props.projectId);
        } catch (error) {
            console.error('Failed to load threads:', error);
            notification.error('Failed to load threads');
        }
    }
});

async function createNewDocument() {
    if (!documentName.value.trim()) return;

    try {
        isSubmitting.value = true;

        const documentData = {
            name: documentName.value.trim(),
            project: props.projectId,
            ...(selectedThreadId.value && { thread: selectedThreadId.value })
        };

        const newDocument = await createDocument(documentData);

        if (newDocument) {
            notification.success('Document created successfully');
            closeModal();
            emit('document:created', newDocument);

            if (props.navigateAfterCreate) {
                router.push(`/document/${newDocument._id}`);
            }
        }
    } catch (error) {
        console.error('Error creating document:', error);
        notification.error('Failed to create document');
    } finally {
        isSubmitting.value = false;
    }
}

function closeModal() {
    showModal.value = false;
    documentName.value = '';
    selectedThreadId.value = '';
    emit('update:modelValue', false);
}
</script>
