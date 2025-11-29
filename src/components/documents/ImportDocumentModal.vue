<template>
  <Modal :modelValue="modelValue" @update:modelValue="$emit('update:modelValue', $event)" title="Import Documents"
    :close-on-backdrop="false" @dragenter.prevent="handleDragEnter" @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave" @drop.prevent="handleDrop">
    <div class="space-y-4">
      <div class="flex flex-col">
        <label class="block text-sm font-medium text-gray-700 mb-1">Select Documents</label>
        <div ref="dropZoneRef"
          class="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 w-full min-h-28"
          :class="{ 'border-blue-500 bg-blue-50': dragging }" @click="selectDocuments"
          @dragenter.prevent="handleDragEnter" @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p class="mt-2 text-sm text-gray-500">{{ dragging ? 'Drop files here' : 'Click to select documents' }}</p>
          <p class="text-xs text-gray-400">You can select multiple files</p>
        </div>
        <!-- Hidden file input fallback for non-electron browsers -->
        <input ref="fileInputRef" type="file" class="hidden" multiple @change="onFileInputChange" />
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
            <Button @click="removeFile(index)" title="Remove file">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
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
const dragging = ref(false);
const dragCounter = ref(0);
const isImporting = ref(false);
const processedCount = ref(0);
const notification = useNotification();
const API_URL = 'http://localhost:3000';

const uploadFile = async (file: any) => {
  // If Electron API is available and we have a path, use it
  if ((window as any).electronAPI?.uploadDocument && (file as any).path) {
    return (window as any).electronAPI.uploadDocument(props.projectId, (file as any).path);
  }

  // Fallback: browser File -> FormData to API
  if (file instanceof File || (file?.arrayBuffer && typeof file.arrayBuffer === 'function')) {
    try {
      const fd = new FormData();
      fd.append('file', file as File, (file as any).name || 'file');
      fd.append('name', (file as any).name || 'file');
      fd.append('projectId', props.projectId);
      const resp = await fetch(`${API_URL}/resources/upload`, {
        method: 'POST',
        body: fd,
      });
      const json = await resp.json();
      return json;
    } catch (err) {
      return { error: `Failed to upload file via fetch: ${(err as Error).message}` };
    }
  }

  return { error: 'Unsupported file object' };
};
const fileInputRef = ref<HTMLInputElement | null>(null);
const dropZoneRef = ref<HTMLElement | null>(null);

const selectDocuments = async () => {
  try {
    // Prefer Electron dialog if available, otherwise fallback to native input
    if ((window as any).electronAPI?.openMultipleFileDialog) {
      const files = await (window as any).electronAPI.openMultipleFileDialog();
      if (files && files.length > 0) addFiles(files);
    } else if (fileInputRef.value) {
      fileInputRef.value.value = '';
      fileInputRef.value.click();
    }
  } catch (error) {
    notification.error('Error selecting documents', {
      title: 'There was a problem selecting documents'
    });
  }
};

const onFileInputChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = input.files;
  if (files && files.length > 0) addFiles(files);
};

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1);
};

const addFiles = (files: FileList | File[]) => {
  const arr = Array.from(files as any) as File[];
  for (const file of arr) {
    const path = (file as any).path ?? (file as any).webkitRelativePath ?? (file as File).name;
    const already = selectedFiles.value.some(f => ((f as any).path ?? f.name) === path);
    if (!already) {
      selectedFiles.value.push(file as File);
    }
  }
};

const handleDragEnter = (e: DragEvent) => {
  e.preventDefault();
  // Only set dragging if inside the drop zone area
  if (dropZoneRef.value && !dropZoneRef.value.contains(e.target as Node)) return;
  dragCounter.value++;
  if (dragCounter.value > 0) dragging.value = true;
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  // Only set dragging if inside drop zone
  if (dropZoneRef.value && dropZoneRef.value.contains(e.target as Node)) dragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  // Only update state if leaving the drop zone
  if (dropZoneRef.value && !dropZoneRef.value.contains(e.target as Node)) return;
  dragCounter.value--;
  if (dragCounter.value <= 0) {
    dragCounter.value = 0;
    dragging.value = false;
  }
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  // Ignore drops outside the drop zone area
  if (dropZoneRef.value && !dropZoneRef.value.contains(e.target as Node)) return;
  dragCounter.value = 0;
  dragging.value = false;
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    addFiles(files);
  } else {
    // Fallback: try to use items (e.g., Safari/edge)
    const items = e.dataTransfer?.items;
    if (items && items.length > 0) {
      const filesFromItems: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) filesFromItems.push(f);
        }
      }
      if (filesFromItems.length > 0) addFiles(filesFromItems);
    }
  }
};

const importDocuments = async () => {
  if (selectedFiles.value.length === 0) return;

  isImporting.value = true;
  processedCount.value = 0;

  try {
    const uploadPromises = selectedFiles.value.map(file => {
      return (async () => {
        try {
          const path = (file as any).path;
          const r = await uploadFile(file);
          processedCount.value++;
          return { status: 'fulfilled', value: r };
        } catch (err) {
          processedCount.value++;
          notification.error(`Error importing document: ${file.name}`, { title: (err as Error).message || 'Failed to import document' });
          return { status: 'rejected', reason: err };
        }
      })();
    });

    const results = await Promise.all(uploadPromises);

    // Process results from the upload promises - check for 'error' in resolved values
    let successCount = 0;
    let failureCount = 0;
    for (let i = 0; i < results.length; i++) {
      const res = results[i] as any;
      // If the result is the status wrapper we returned above
      if (res && res.status === 'fulfilled') {
        const value = res.value;
        if (!value || value.error) {
          failureCount++;
          notification.error(`Failed to import: ${selectedFiles.value[i]?.name ?? 'unknown'}`, { title: value?.error ?? 'Upload failed' });
        } else {
          successCount++;
        }
      } else if (res && res.status === 'rejected') {
        failureCount++;
        notification.error(`Failed to import: ${selectedFiles.value[i]?.name ?? 'unknown'}`, { title: (res.reason as Error)?.message ?? 'Upload failed' });
      } else {
        // Other shape — check for error payload directly
        if (res && res.error) {
          failureCount++;
          notification.error(`Failed to import: ${selectedFiles.value[i]?.name ?? 'unknown'}`, { title: res.error });
        } else {
          successCount++;
        }
      }
    }

    // Show summary notification
    if (successCount > 0) notification.success(`${successCount} of ${selectedFiles.value.length} documents imported successfully`);
    if (failureCount > 0) notification.warning(`${failureCount} documents could not be imported`);

    // Reset and close modal
    selectedFiles.value = [];
    emit('documents:imported');
    emit('update:modelValue', false);
  } catch (error) {
    notification.error('Error importing documents', {
      title: (error as Error).message || 'Failed to import documents'
    });
  } finally {
    isImporting.value = false;
    processedCount.value = 0;
  }
};
</script>