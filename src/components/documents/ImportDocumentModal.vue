<template>
  <Modal :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" title="Import Documents"
    :close-on-backdrop="false">
    <div class="space-y-4">
      <div class="flex flex-col">
        <label class="block text-sm font-medium text-gray-700 mb-1">Select Documents</label>
        <div
          class="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
          @click="selectDocuments">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="mt-2 text-sm text-gray-500">Click to select documents</p>
          <p class="text-xs text-gray-400">You can select multiple files</p>
        </div>
      </div>

      <div v-if="selectedFiles.length > 0" class="mt-4">
        <h4 class="text-sm font-semibold mb-2">Selected Documents ({{ selectedFiles.length }})</h4>
        <div class="max-h-48 overflow-y-auto">
          <div v-for="(file, index) in selectedFiles" :key="index"
            class="flex justify-between items-center py-2 border-b last:border-b-0">
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="text-sm truncate max-w-xs">{{ file.name }}</span>
            </div>
            <button @click="removeFile(index)" class="text-red-500 hover:text-red-700" title="Remove file">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div v-if="isImporting" class="flex items-center justify-center space-x-2 py-2">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        <span class="text-sm">Processing documents... ({{ processedCount }}/{{ selectedFiles.length }})</span>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <Button @click="$emit('update:modelValue', false)" variant="secondary">
          Cancel
        </Button>
        <Button @click="importDocuments" :disabled="isImporting || selectedFiles.length === 0">
          {{ isImporting ? 'Importing...' : 'Import Documents' }}
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';
import Modal from '../ui/Modal/Modal.vue';
import Button from '../ui/Button.vue';
import { useNotification } from '../../composables/useNotification';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  projectId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:modelValue', 'documents:imported']);

const selectedFiles = ref<File[]>([]);
const isImporting = ref(false);
const processedCount = ref(0);
const notification = useNotification();

const selectDocuments = async () => {
  try {
    const files = await window.electronAPI.openMultipleFileDialog();
    if (files && files.length > 0) {
      selectedFiles.value = files;
    }
  } catch (error) {
    notification.error('Error selecting documents', {
      message: 'There was a problem selecting documents',
      duration: 5000
    });
  }
};

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1);
};

const importDocuments = async () => {
  if (selectedFiles.value.length === 0) return;

  isImporting.value = true;
  processedCount.value = 0;

  try {
    const results = [];

    // Process each file sequentially
    for (const file of selectedFiles.value) {
      try {
        const result = await window.electronAPI.uploadDocument(props.projectId, file.path);
        results.push(result);
        processedCount.value++;
      } catch (error) {
        notification.error(`Error importing document: ${file.name}`, {
          message: error.message || 'Failed to import document',
          duration: 5000
        });
      }
    }

    // Reset and close modal
    selectedFiles.value = [];
    emit('documents:imported');
    emit('update:modelValue', false);
  } catch (error) {
    notification.error('Error importing documents', {
      message: error.message || 'Failed to import documents',
      duration: 5000
    });
  } finally {
    isImporting.value = false;
    processedCount.value = 0;
  }
};
</script>