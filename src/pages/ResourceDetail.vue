<template>
    <div class="container mx-auto p-5 max-w-7xl">
        <Breadcrumb :items="breadcrumbItems" />
        <div v-if="isLoading" class="flex justify-center items-center h-64">
            <p class="text-gray-500">Loading resource details...</p>
        </div>

        <div v-else-if="error" class="flex justify-center items-center h-64">
            <p class="text-red-500">Error: {{ error }}</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-6"
            :class="[splitViewActive ? 'lg:grid-cols-2' : 'md:grid-cols-3', { 'drag-over': isDragOver }]"
            @dragover="onDragOver" @dragenter="onDragEnter" @dragleave="onDragLeave" @drop="onDrop">
            <div class="space-y-6"
                :class="[splitViewActive ? 'lg:col-span-1' : 'md:col-span-2', { 'split-view-active': splitViewActive }]">
                <div class="bg-white p-4 shadow rounded-lg">
                    <div class="flex items-center mb-4">
                        <div class="flex items-center flex-grow">
                            <input v-if="isEditingName" v-model="editResourceName" @input="handleResourceNameChange"
                                @keyup.enter="saveResourceName" @keyup.escape="cancelNameEdit" @blur="handleBlur"
                                type="text"
                                class="text-2xl font-bold bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mr-3 flex-grow"
                                placeholder="Resource name..." ref="nameInput" />
                            <h1 v-else @dblclick="startNameEdit"
                                class="text-2xl font-bold mr-3 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                                title="Double-click to edit">{{ resource.name }}</h1>
                        </div>
                        <span v-if="resource.mimeType"
                            class="bg-blue-500 text-white p-1 rounded-md mr-2 flex items-center justify-center"
                            :title="resource.mimeType">
                            <svg v-if="isPdfFile" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
                                fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                    clip-rule="evenodd" />
                            </svg>

                            <svg v-else-if="isDocumentFile" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                                viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                    clip-rule="evenodd" />
                            </svg>

                            <svg v-else-if="isHtmlFile" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                                viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                                    clip-rule="evenodd" />
                            </svg>

                            <svg v-else-if="isTextFile" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5"
                                viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                    clip-rule="evenodd" />
                            </svg>

                            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
                                fill="currentColor">
                                <path fill-rule="evenodd"
                                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                    clip-rule="evenodd" />
                            </svg>
                        </span>
                    </div>

                    <div class="mb-3 flex justify-between">
                        <div class="flex gap-2">
                            <a @click="downloadResource"
                                class="inline-flex items-center px-4 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </a>
                            <button @click="showCreateDocumentModal = true"
                                class="inline-flex items-center px-4 py-1 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                                title="Create new document from this resource">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            <button
                                v-if="!isEditMode && (displayMode === 'extracted' || displayMode === 'translated') &&
                                    ((displayMode === 'extracted' && resource.content) || (displayMode === 'translated' && resource.translatedContent))"
                                @click="startEdit" type="button"
                                class="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        </div>
                        <div class="flex items-center gap-2">
                            <div v-if="!isEditMode" class="flex rounded-md shadow-sm" role="group">
                                <button v-if="resource.content" @click="displayMode = 'extracted'" type="button"
                                    class="px-4 py-1 text-sm font-medium rounded-l-lg"
                                    :class="displayMode === 'extracted' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'">
                                    Extracted Content
                                </button>
                                <button v-if="resource.translatedContent" @click="displayMode = 'translated'"
                                    type="button" class="px-4 py-1 text-sm font-medium"
                                    :class="displayMode === 'translated' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'">
                                    Translated
                                </button>
                                <button @click="displayMode = 'raw'" type="button"
                                    class="px-4 py-1 text-sm font-medium rounded-r-lg"
                                    :class="displayMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'">
                                    Original
                                </button>
                            </div>
                            <div v-if="isEditMode" class="flex gap-2">
                                <button @click="saveEdit" :disabled="isSaving" type="button"
                                    class="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                    <svg v-if="isSaving" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                            stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                        </path>
                                    </svg>
                                    {{ isSaving ? 'Saving...' : 'Save' }}
                                </button>
                                <button @click="cancelEdit" :disabled="isSaving" type="button"
                                    class="inline-flex items-center px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="border border-gray-200 rounded-md p-5 overflow-auto">
                        <!-- Edit mode content -->
                        <div v-if="isEditMode" class="w-full min-h-[600px]">
                            <EditorContent :content="editContent" :is-saving="false"
                                :saved-successfully="savedSuccessfully" @content-change="handleEditContentChange" />
                        </div>

                        <!-- Normal display mode content -->
                        <div v-else>
                            <div v-if="displayMode === 'extracted'" class="w-full min-h-[600px] resource-detail"
                                v-html="resource.content">
                            </div>
                            <div v-if="displayMode === 'translated'" class="w-full min-h-[600px] resource-detail"
                                v-html="resource.translatedContent"></div>
                            <iframe v-else-if="isHtmlFile && displayMode === 'raw'" class="w-full min-h-[600px]"
                                :srcdoc="rawHtmlContent" sandbox="allow-same-origin" title="HTML Preview">
                            </iframe>
                            <iframe v-else-if="isPdfFile && displayMode === 'raw'" class="w-full min-h-[600px]"
                                :src="`${apiBaseUrl}/resources/${resourceId}/view#toolbar=0&navpanes=0&scrollbar=0&sidebar=0`"
                                type="application/pdf" :title="resource.originalName || 'PDF Preview'">
                            </iframe>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Split View Document Area -->
            <div v-if="splitViewActive && splitDocument" class="lg:col-span-1 space-y-6 split-document-panel">
                <div class="bg-white p-4 shadow rounded-lg">
                    <div class="flex items-center justify-between mb-4">
                        <input v-model="splitDocument.name" @input="handleDocumentNameChange" type="text"
                            class="text-2xl font-bold bg-transparent border-none outline-none focus:bg-gray-50 focus:px-2 focus:py-1 rounded w-full"
                            placeholder="Document name..." />
                        <button @click="closeSplitView" class="text-gray-500 hover:text-gray-700 ml-2 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div class="mb-3 flex justify-between items-center">
                        <div class="flex gap-2">
                            <a :href="`/document/${splitDocument._id}`"
                                class="inline-flex items-center px-4 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </a>
                        </div>
                        <div v-if="isDocumentSaving" class="flex items-center text-sm text-gray-500">
                            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            Saving...
                        </div>
                        <div v-else-if="documentSavedSuccessfully" class="flex items-center text-sm text-green-600">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 13l4 4L19 7" />
                            </svg>
                            Saved
                        </div>
                    </div>

                    <div class="h-[600px]">
                        <EditorContent :content="splitDocument.content || ''" :is-saving="isDocumentSaving"
                            :saved-successfully="documentSavedSuccessfully"
                            @content-change="handleDocumentContentChange" />
                    </div>
                </div>
            </div>

            <div v-if="!splitViewActive" class="space-y-6 md:col-span-1">
                <div v-if="resource.description" class="bg-white p-4 shadow rounded-lg">
                    <h2 class="text-xl font-semibold mb-2">Description</h2>
                    <p class="text-gray-700">{{ resource.description }}</p>
                </div>
                <div class="bg-gray-50 rounded-md">
                    <strong class="text-gray-700">Source</strong>
                    <br />
                    <a v-if="resource.type?.abbreviation === 'WEB'" :href="resource.source" target="_blank"
                        rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 hover:underline">
                        {{ resource.source }}
                    </a>
                    <span v-else>{{ resource.source }}</span>
                </div>
                <div class="bg-gray-50 rounded-md">
                    <strong class="text-gray-700">Original name</strong>
                    <br />
                    {{ resource.originalName }}
                </div>
                <div class="bg-gray-50 rounded-md">
                    <strong class="text-gray-700">Upload date</strong>
                    <br />
                    {{ resource.uploadDate ? new Date(resource.uploadDate).toLocaleString() : '' }}
                </div>
                <div class="bg-gray-50 rounded-md">
                    <strong class="text-gray-700">Size</strong>
                    <br />
                    {{ formatFileSize(resource.fileSize) }}
                </div>
                <div v-if="resource?.language" class="bg-gray-50 rounded-md">
                    <strong class="text-gray-700">Language</strong>
                    <br />
                    {{ resource.language }}
                </div>
                <div v-if="resource.metadata" class="bg-white p-4 shadow rounded-lg">
                    <h2 class="text-xl font-semibold mb-3">Metadata</h2>
                    <div class="space-y-3">
                        <div v-for="(value, key) in resource.metadata" :key="key" class="bg-gray-50 rounded-md">
                            <strong class="text-gray-700">{{ formatKey(key) }}</strong><br />{{ value }}
                        </div>
                    </div>
                </div>
                <div v-if="resource.entities && resource.entities.length > 0" class="bg-white p-4 shadow rounded-lg">
                    <h2 class="text-xl font-semibold mb-3">Entities</h2>
                    <div class="space-y-3">
                        <div v-for="(value, key) in resource.entities" :key="key" class="bg-gray-50 rounded-md">
                            <strong class="text-gray-700">{{ value.entity }}</strong><br />{{ value.word }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <CreateDocumentModal v-model="showCreateDocumentModal" :project-id="projectStore.currentProject._id"
        :resource-content="getResourceContentForDocument()" :resource-name="resource.name"
        :navigate-after-create="false" @document:created="onDocumentCreated" />
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useResource } from '../services/resources/useResource';
import { useResourceIcon } from '../composables/useResourceIcon';
import { useDocument } from '../services/documents/useDocument';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import CreateDocumentModal from '../components/documents/CreateDocumentModal.vue';
import EditorContent from '../components/editor/EditorContent.vue';
import axios from 'axios';
import { useProjectStore } from '../store/projectStore';
import { useNotification } from '../composables/useNotification';
import apiClient from '../services/api';
import { useDragDrop } from '../composables/useDragDrop';

const route = useRoute();
const resourceId = computed(() => route.params.id as string);
const { loadResource, updateResource, error, isLoading } = useResource();
const { saveDocument, loadDocument } = useDocument();
const resource = ref<any>({});
const projectStore = useProjectStore();
const notification = useNotification();
const rawHtmlContent = ref<string>('');
const displayMode = ref<'extracted' | 'raw' | 'translated'>('extracted');
const showCreateDocumentModal = ref(false);
const splitViewActive = ref(false);
const splitDocument = ref<any>(null);
const isDocumentSaving = ref(false);
const documentSavedSuccessfully = ref(false);
const documentSaveTimeout = ref<NodeJS.Timeout | null>(null);
const documentNameSaveTimeout = ref<NodeJS.Timeout | null>(null);
const apiBaseUrl = apiClient.defaults.baseURL || 'http://backend:3000';

const isEditMode = ref(false);
const editContent = ref('');
const editType = ref<'content' | 'translatedContent'>('content');
const isSaving = ref(false);
const savedSuccessfully = ref(false);

// Resource name editing state
const isEditingName = ref(false);
const editResourceName = ref('');
const isNameSaving = ref(false);
const nameSavedSuccessfully = ref(false);
const nameSaveTimeout = ref<NodeJS.Timeout | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);
const isCancelingNameEdit = ref(false);
const { isPdfFile, isDocumentFile, isHtmlFile, isTextFile } = useResourceIcon(resource);

const {
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop
} = useDragDrop();

const breadcrumbItems = computed(() => {
    const items = [];

    items.push({
        name: projectStore.currentProject.name,
        path: `/project/${projectStore.currentProject._id}`
    });

    if (resource.value && resource.value.name) {
        items.push({
            name: resource.value.name
        });
    }

    return items;
});

const formatKey = (key: string | number): string => {
    const strKey = String(key);
    return strKey.charAt(0).toUpperCase() + strKey.slice(1).replace(/([A-Z])/g, ' $1');
};

const loadRawHtmlContent = async () => {
    if (!isHtmlFile.value) return;

    try {
        const response = await axios.get(`${apiBaseUrl}/resources/${resourceId.value}/download`, {
            responseType: 'text'
        });
        rawHtmlContent.value = response.data;
    } catch (err) {
        console.error('Failed to load raw HTML content:', err);
        rawHtmlContent.value = 'Error loading raw HTML content';
    }
};

watch(displayMode, (newMode: 'extracted' | 'raw') => {
    if (newMode === 'raw' && !rawHtmlContent.value && isHtmlFile.value) {
        loadRawHtmlContent();
    }
});

const loadResourceDetails = async () => {
    try {
        const data = await loadResource(resourceId.value);
        resource.value = data;
        if ('mimeType' in data && data.mimeType === 'text/html' && displayMode.value === 'raw') {
            await loadRawHtmlContent();
        }
    } catch (err) {
        console.error('Failed to load resource:', err);
    }
};

const downloadResource = async () => {
    try {
        const link = document.createElement('a');
        link.href = `${apiBaseUrl}/resources/${resourceId.value}/download`;
        link.download = resource.value.originalName || `resource-${resourceId.value}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error('Failed to download resource:', err);
    }
};

watch(resourceId, () => {
    loadResourceDetails();
});

const formatFileSize = (bytes: number | string | undefined): string => {
    if (bytes === undefined || bytes === null) return '';

    const sizeInBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(sizeInBytes)) return '';

    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];

    let size = sizeInBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return unitIndex === 0
        ? `${size} ${units[unitIndex]}`
        : `${size.toFixed(2).replace(/\.00$/, '')} ${units[unitIndex]}`;
};

const getResourceContentForDocument = (): string => {
    if (resource.value.content) {
        return resource.value.content;
    }
    if (resource.value.translatedContent) {
        return resource.value.translatedContent;
    }
    return '';
};

const onDocumentCreated = (document: any) => {
    notification.success(`Document "${document.name}" created successfully`);
    splitDocument.value = document;
    splitViewActive.value = true;
};

const closeSplitView = () => {
    splitViewActive.value = false;
    splitDocument.value = null;
};

const handleDocumentContentChange = async (content: string) => {
    if (!splitDocument.value || !splitDocument.value._id) {
        return;
    }

    if (documentSaveTimeout.value) {
        clearTimeout(documentSaveTimeout.value);
    }

    isDocumentSaving.value = true;
    documentSavedSuccessfully.value = false;

    documentSaveTimeout.value = setTimeout(async () => {
        try {
            await saveDocument(splitDocument.value._id, { content });
            splitDocument.value.content = content;
            documentSavedSuccessfully.value = true;

            setTimeout(() => {
                documentSavedSuccessfully.value = false;
            }, 3000);
        } catch (error) {
            console.error('Error saving document content:', error);
            notification.error('Failed to save document content');
        } finally {
            isDocumentSaving.value = false;
        }
    }, 1000);
};

const handleDocumentNameChange = async () => {
    if (!splitDocument.value || !splitDocument.value._id || !splitDocument.value.name.trim()) {
        return;
    }

    if (documentNameSaveTimeout.value) {
        clearTimeout(documentNameSaveTimeout.value);
    }

    isDocumentSaving.value = true;
    documentSavedSuccessfully.value = false;

    documentNameSaveTimeout.value = setTimeout(async () => {
        try {
            await saveDocument(splitDocument.value._id, { name: splitDocument.value.name.trim() });
            documentSavedSuccessfully.value = true;

            setTimeout(() => {
                documentSavedSuccessfully.value = false;
            }, 3000);
        } catch (error) {
            console.error('Error saving document name:', error);
            notification.error('Failed to save document name');
        } finally {
            isDocumentSaving.value = false;
        }
    }, 1000);
};

const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const droppedData = handleDrop(event);

    if (droppedData && droppedData.type === 'document') {
        try {
            const document = droppedData.document;
            if (document && document._id) {
                const fullDocument = await loadDocument(document._id);
                splitDocument.value = fullDocument;
                splitViewActive.value = true;
                notification.success(`Document "${document.name}" opened in split view`);
            }
        } catch (error) {
            console.error('Error loading dropped document:', error);
            notification.error('Failed to load document');
        }
    } else {
        const dataTransfer = event.dataTransfer;
        const files = dataTransfer?.files;

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                notification.info(`File dropped: ${file.name} (${formatFileSize(file.size)})`);
            }
        } else {
            const url = dataTransfer?.getData('text/uri-list') || dataTransfer?.getData('text/plain');
            if (url) {
                notification.info(`Link dropped: ${url}`);
            }
        }
    }
};

const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handleDragOver(event);
};

const onDragEnter = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handleDragEnter(event);
};

const onDragLeave = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handleDragLeave(event);
};

const startEdit = () => {
    if (displayMode.value === 'extracted' && resource.value.content) {
        editType.value = 'content';
        editContent.value = resource.value.content;
    } else if (displayMode.value === 'translated' && resource.value.translatedContent) {
        editType.value = 'translatedContent';
        editContent.value = resource.value.translatedContent;
    }
    isEditMode.value = true;
    savedSuccessfully.value = false;
};

const handleEditContentChange = (content: string) => {
    editContent.value = content;
};

const saveEdit = async () => {
    if (!editContent.value.trim()) {
        notification.error('Content cannot be empty');
        return;
    }

    isSaving.value = true;
    savedSuccessfully.value = false;

    try {
        const updateData = {
            [editType.value]: editContent.value
        };

        await updateResource(resourceId.value, updateData);

        resource.value[editType.value] = editContent.value;

        savedSuccessfully.value = true;
        isEditMode.value = false;

        notification.success('Content updated successfully');

        setTimeout(() => {
            savedSuccessfully.value = false;
        }, 3000);
    } catch (error) {
        console.error('Error saving content:', error);
        notification.error('Failed to save content');
    } finally {
        isSaving.value = false;
    }
};

const cancelEdit = () => {
    isEditMode.value = false;
    editContent.value = '';
    savedSuccessfully.value = false;
};

// Resource name editing functions
const startNameEdit = () => {
    isEditingName.value = true;
    editResourceName.value = resource.value.name;
    nameSavedSuccessfully.value = false;

    // Focus the input after the DOM updates
    setTimeout(() => {
        nameInput.value?.focus();
        nameInput.value?.select();
    }, 50);
};

const cancelNameEdit = () => {
    console.log('cancelNameEdit called');
    isCancelingNameEdit.value = true;
    isEditingName.value = false;
    editResourceName.value = '';
    nameSavedSuccessfully.value = false;

    if (nameSaveTimeout.value) {
        clearTimeout(nameSaveTimeout.value);
    }

    // Reset canceling flag after a short delay
    setTimeout(() => {
        isCancelingNameEdit.value = false;
    }, 100);
};

const handleBlur = () => {
    // Don't save on blur if we're in the process of canceling
    if (!isCancelingNameEdit.value) {
        saveResourceName();
    }
};

const handleResourceNameChange = () => {
    if (nameSaveTimeout.value) {
        clearTimeout(nameSaveTimeout.value);
    }

    // Clear success state when user starts typing
    nameSavedSuccessfully.value = false;
};

const saveResourceName = async () => {
    console.log('saveResourceName called');

    // Don't proceed if we're canceling or if the input is empty
    if (isCancelingNameEdit.value || !editResourceName.value.trim()) {
        if (!isCancelingNameEdit.value && !editResourceName.value.trim()) {
            notification.error('Resource name cannot be empty');
        }
        return;
    }

    if (editResourceName.value.trim() === resource.value.name) {
        // No changes, just exit edit mode
        isEditingName.value = false;
        return;
    }

    if (nameSaveTimeout.value) {
        clearTimeout(nameSaveTimeout.value);
    }

    isNameSaving.value = true;
    nameSavedSuccessfully.value = false;

    try {
        const updatedResource = await updateResource(resourceId.value, {
            name: editResourceName.value.trim()
        });

        // Update the local resource data
        resource.value.name = editResourceName.value.trim();

        nameSavedSuccessfully.value = true;

        // Show success state briefly, then exit edit mode
        setTimeout(() => {
            nameSavedSuccessfully.value = false;
            isEditingName.value = false;
        }, 1500);

        notification.success('Resource name updated successfully');
    } catch (error) {
        console.error('Error updating resource name:', error);
        notification.error('Failed to update resource name');
        isEditingName.value = false; // Exit edit mode on error
    } finally {
        isNameSaving.value = false;
    }
};

onMounted(() => {
    loadResourceDetails();
});
</script>

<style>
.resource-detail h1 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 1rem;
    margin-top: 0;
}

.resource-detail h2 {
    font-size: 1.25rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    margin-top: 0;
}

.resource-detail h3 {
    font-size: 1.125rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    margin-top: 0;
}

.resource-detail p {
    margin-bottom: 1rem;
}

.split-view-active {
    border-right: 2px solid #e5e7eb;
}

.split-document-panel {
    border-left: 2px solid #3b82f6;
    box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.1);
}

@media (max-width: 1024px) {
    .split-view-active {
        border-right: none;
        border-bottom: 2px solid #e5e7eb;
    }

    .split-document-panel {
        border-left: none;
        border-top: 2px solid #3b82f6;
        box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
    }
}

.drag-over {
    border: 2px dashed #3b82f6 !important;
    background-color: rgba(59, 130, 246, 0.1) !important;
    border-radius: 8px;
    position: relative;
}

.drag-over::before {
    content: 'Drop documents here to open in split view';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(59, 130, 246, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: none;
}
</style>