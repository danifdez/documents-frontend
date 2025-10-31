<template>
    <div v-bind="$attrs" class="h-full flex flex-col overflow-hidden">
        <div class="flex-shrink-0">
            <Breadcrumb :items="breadcrumbItems" />
        </div>

        <div v-if="isLoading" class="flex justify-center items-center flex-1">
            <p class="text-gray-500">Loading resource details...</p>
        </div>

        <div v-else-if="error" class="flex justify-center items-center flex-1">
            <p class="text-red-500">Error: {{ error }}</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-6 flex-1 overflow-hidden min-h-0"
            :class="[splitViewActive ? 'lg:grid-cols-2' : 'md:grid-cols-3', { 'drag-over': isDragOver }]"
            @dragover="onDragOver" @dragenter="onDragEnter" @dragleave="onDragLeave" @drop="onDrop">
            <div class="flex flex-col overflow-hidden min-h-0"
                :class="[splitViewActive ? 'lg:col-span-1' : 'md:col-span-2', { 'split-view-active': splitViewActive }]">
                <div class="bg-white p-4 shadow rounded-lg flex-shrink-0">
                    <div class="flex items-center mb-4">
                        <IconType :mimeType="resource.mimeType" />
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
                        <Button @click="confirmRemoveResource" variant="danger" title="Remove Resource">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Remove
                        </Button>
                    </div>
                    <Toolbar v-if="!isImageFile" :has-summary="resource.summary" :display-mode="displayMode"
                        @download="downloadResource" @startEdit="startEdit" @saveEdit="saveEdit"
                        @cancelEdit="cancelEdit" @changeDisplayMode="handleDisplayMode"
                        @create-document="showCreateDocumentModal = true" :hasExtractedContent="hasExtractedContent"
                        :hasTranslatedContent="hasTranslatedContent" :is-edit-mode="isEditMode" @ask="showChat = true"
                        :extractedContent="resource.content" :translatedContent="resource.translatedContent"
                        :sourceLanguage="resource.language || ''" :defaultLanguage="defaultLanguage"
                        @summarize="handleSummarizeJob" @translate="handleTranslate"
                        @extractEntities="handleExtractEntities"
                        :hasEntities="resource.entities && resource.entities.length > 0" />
                </div>

                <div
                    class="border border-gray-200 rounded-lg px-5 py-4 overflow-y-auto flex-1 min-h-0 bg-white mt-4 shadow">
                    <div v-if="isEditMode" class="w-full">
                        <EditorContent ref="editorContentRef" :content="editContent" :is-saving="false"
                            :saved-successfully="savedSuccessfully" @content-change="handleEditContentChange" />
                    </div>
                    <div v-else>
                        <HtmlContent v-if="!isImageFile && displayMode === 'extracted' && resource.id"
                            ref="extractedContent" :content="resource.content" :resource-id="String(resource.id)" />
                        <HtmlContent v-else-if="displayMode === 'translated'" ref="translatedContent"
                            :content="resource.translatedContent" :resource-id="String(resource.id)" />
                        <HtmlContent v-else-if="displayMode === 'summary'" ref="summaryContent"
                            :content="resource.summary" :resource-id="String(resource.id)" />
                        <iframe v-else-if="isHtmlFile && displayMode === 'raw'" class="w-full h-full min-h-[500px]"
                            :srcdoc="rawHtmlContent" sandbox="allow-same-origin" title="HTML Preview">
                        </iframe>
                        <iframe v-else-if="isPdfFile && displayMode === 'raw'" class="w-full h-full min-h-[500px]"
                            :src="`${apiBaseUrl}/resources/${resourceId}/view#toolbar=0&navpanes=0&scrollbar=0&sidebar=0`"
                            type="application/pdf" :title="resource.originalName || 'PDF Preview'">
                        </iframe>
                        <img v-else-if="isImageFile" class="w-full object-contain max-h-full"
                            :src="`${apiBaseUrl}/resources/${resourceId}/view`"
                            :alt="resource.originalName || 'Image Preview'" />
                    </div>
                </div>
            </div>

            <!-- Split View Document Area -->
            <div v-if="splitViewActive && splitDocument"
                class="lg:col-span-1 flex flex-col overflow-hidden min-h-0 split-document-panel">
                <div class="bg-white p-4 shadow rounded-lg flex-shrink-0">
                    <div class="flex items-center justify-between mb-4">
                        <input v-model="splitDocument.name" @input="handleDocumentNameChange" type="text"
                            class="text-2xl font-bold bg-transparent border-none outline-none focus:bg-gray-50 focus:px-2 focus:py-1 rounded w-full"
                            placeholder="Document name..." />
                        <Button @click="closeSplitView">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </Button>
                    </div>

                    <div class="mb-3 flex justify-between items-center">
                        <div class="flex gap-2">
                            <a :href="`/document/${splitDocument.id}`"
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
                </div>

                <div class="overflow-y-auto flex-1 min-h-0 bg-white mt-4 shadow rounded-lg p-4">
                    <EditorContent ref="splitEditor" :content="splitDocument.content || ''"
                        :is-saving="isDocumentSaving" :saved-successfully="documentSavedSuccessfully"
                        @content-change="handleDocumentContentChange" />
                </div>
            </div>

            <div v-if="!splitViewActive" class="md:col-span-1 flex flex-col overflow-hidden min-h-0">
                <div class="bg-white p-4 shadow rounded-lg flex-shrink-0">
                    <div class="flex items-center justify-between mb-4">
                        <ButtonGroup>
                            <Button variant="secondary" :active="viewSideBar === 'properties'"
                                @click="viewSideBar = 'properties'">
                                Properties
                            </Button>
                            <Button v-if="hasExtractedContent" variant="secondary" :active="viewSideBar === 'index'"
                                @click="(viewSideBar = 'index', refreshTocFromChild())">
                                Index
                            </Button>
                            <Button v-if="!isImageFile" variant="secondary" :active="viewSideBar === 'comments'"
                                @click="viewSideBar = 'comments'">
                                Comments
                            </Button>
                            <Button v-if="resource.entities && resource.entities.length > 0" variant="secondary"
                                :active="viewSideBar === 'entities'" @click="viewSideBar = 'entities'">
                                Entities
                            </Button>
                        </ButtonGroup>
                    </div>
                </div>

                <div class="overflow-y-auto flex-1 min-h-0 mt-4">
                    <Properties v-if="viewSideBar === 'properties'" :resource="resource" />
                    <CommentSidebar v-else-if="viewSideBar === 'comments'" :doc-id="resource.id" />
                    <div v-else-if="viewSideBar === 'index'" class="bg-white p-4 shadow rounded-lg">
                        <div class="mb-2">
                            <strong class="text-sm text-gray-700">Table of Contents</strong>
                        </div>
                        <div v-if="!tocItems.length">No headings found in this resource.</div>
                        <ul v-else class="space-y-1">
                            <li v-for="item in tocItems" :key="item.id"
                                :style="{ marginLeft: (item.level - 1) * 12 + 'px' }">
                                <a href="#" @click.prevent="scrollToHeadingFromSidebar(item.id)"
                                    class="text-blue-600 hover:underline">{{ item.text }}</a>
                            </li>
                        </ul>
                    </div>
                    <EntitiesList v-else-if="viewSideBar === 'entities'" :resource-id="resourceId"
                        :entities="resource.entities || []" @entity:removed="handleEntityRemoved"
                        @entity:merged="handleEntityMerged" @entity:highlight="handleEntityHighlight" />
                </div>
            </div>
        </div>

        <CreateDocumentModal v-model="showCreateDocumentModal" :project-id="String(projectStore.currentProject.id)"
            :resource-content="getResourceContentForDocument()" :resource-name="resource.name"
            :navigate-after-create="false" @document:created="onDocumentCreated" />

        <FloatingSearchBox :active-contents="activeContents" v-model="showSearch" />

        <ChatSidebar :show="showChat" :messages="chatMessages" @close="showChat = false" @send="handleSendMessage" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useRouter } from 'vue-router';
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
import Properties from '../components/resources/Properties.vue';
import Toolbar from '../components/resources/Toolbar.vue';
import IconType from '../components/resources/IconType.vue';
import FloatingSearchBox from '../components/ui/FloatingSearchBox.vue';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';
import HtmlContent from '../components/contents/HtmlContent.vue';
import CommentSidebar from '../components/comments/CommentSidebar.vue';
import ChatSidebar from '../components/ui/ChatSidebar.vue';
import EntitiesList from '../components/entities/EntitiesList.vue';
import Button from '../components/ui/Button.vue';
import ButtonGroup from '../components/ui/ButtonGroup.vue';

defineOptions({
    inheritAttrs: false
});

const router = useRouter();


const route = useRoute();
const resourceId = computed(() => route.params.id as string);
const { loadResource, updateResource, error, isLoading } = useResource();
const { saveDocument, loadDocument } = useDocument();
const resource = ref<any>({});
const projectStore = useProjectStore();
const notification = useNotification();
const rawHtmlContent = ref<string>('');
const displayMode = ref<'extracted' | 'raw' | 'translated' | 'summary'>('extracted');
const showCreateDocumentModal = ref(false);
const splitViewActive = ref(false);
const splitDocument = ref<any>(null);
const isDocumentSaving = ref(false);
const documentSavedSuccessfully = ref(false);
const documentSaveTimeout = ref<NodeJS.Timeout | null>(null);
const documentNameSaveTimeout = ref<NodeJS.Timeout | null>(null);
const apiBaseUrl = apiClient.defaults.baseURL;
const editorContentRef = ref();
const splitEditor = ref();
const viewSideBar = ref<'properties' | 'comments' | 'index' | 'entities'>('properties');

const isEditMode = ref(false);
const editContent = ref('');
const editType = ref<'content' | 'translatedContent'>('content');
const isSaving = ref(false);
const savedSuccessfully = ref(false);

const isEditingName = ref(false);
const editResourceName = ref('');
const isNameSaving = ref(false);
const nameSavedSuccessfully = ref(false);
const nameSaveTimeout = ref<NodeJS.Timeout | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);
const isCancelingNameEdit = ref(false);
const extractedContent = ref<any>(null);
const tocItems = ref<{ id: string; text: string; level: number }[]>([]);
const defaultLanguage = ref<string>('en');

const refreshTocFromChild = () => {
    // HtmlContent exposes `toc` and `scrollToHeading`
    try {
        if (extractedContent.value && extractedContent.value.toc) {
            tocItems.value = extractedContent.value.toc;
        } else {
            tocItems.value = [];
        }
    } catch (e) {
        tocItems.value = [];
    }
};

const scrollToHeadingFromSidebar = (id: string) => {
    try {
        if (extractedContent.value && typeof extractedContent.value.scrollToHeading === 'function') {
            extractedContent.value.scrollToHeading(id);
        }
    } catch (e) {
        console.error('Failed to scroll to heading', e);
    }
};


const { isPdfFile, isHtmlFile, isImageFile } = useResourceIcon(computed(() => resource.value.mimeType));

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
        path: `/project/${projectStore.currentProject.id}`
    });

    if (resource.value && resource.value.name) {
        items.push({
            name: resource.value.name
        });
    }

    return items;
});

const activeContents = computed(() => {
    const contents = [];
    if (isEditMode.value) {
        contents.push({
            type: 'edit',
            content: editorContentRef
        });
    } else {
        contents.push({
            type: 'html',
            content: extractedContent,
        });
    }

    if (splitDocument.value) {
        contents.push({
            type: 'edit',
            content: splitEditor,
        });
    }

    return contents;
});

const handleDisplayMode = (mode: 'extracted' | 'raw' | 'translated' | 'summary') => {
    displayMode.value = mode;
};

const hasExtractedContent = computed(() => {
    return resource.value.content && resource.value.content.trim().length > 0;
});

const hasTranslatedContent = computed(() => {
    return resource.value.translatedContent && resource.value.translatedContent.trim().length > 0;
});

const loadRawHtmlContent = async () => {
    if (!isHtmlFile.value) return;

    try {
        const response = await axios.get(`${apiBaseUrl}/resources/${resourceId.value}/download`, {
            responseType: 'text'
        });
        rawHtmlContent.value = response.data;
    } catch (err) {
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
        // Fetch translated content from the new backend endpoint if available
        try {
            const translatedRes = await apiClient.get(`/resources/${resourceId.value}/translated-content`);
            const translatedPayload = translatedRes?.data || {};
            resource.value.translatedContent = translatedPayload.translatedContent ?? resource.value.translatedContent ?? null;
        } catch (e) {
            // Ignore not found or other errors retrieving translated content — it's optional
            if (e?.response?.status && e.response.status !== 404) {
                console.warn('Failed to load translated content for resource', resourceId.value, e);
            }
            resource.value.translatedContent = resource.value.translatedContent ?? null;
        }
        // Load related entities from the new endpoint and normalize results
        try {
            const entitiesRes = await apiClient.get(`/resources/${resourceId.value}/entities`);
            const entitiesData = entitiesRes.data || [];
            // If backend returned raw rows (getRawMany), normalize keys to id/name/type
            resource.value.entities = entitiesData.map((row: any) => {
                // raw row from getRawMany may be like { entity_id: 1, entity_name: 'Name', entity_type: 'Type' }
                if (row.entity_id || row.entity_name) {
                    return {
                        id: row.entity_id ?? row.id,
                        name: row.entity_name ?? row.name,
                        type: row.entity_type ?? row.type,
                    };
                }

                // If backend returned full EntityEntity objects with entityType relation
                if (row.entityType) {
                    return {
                        id: row.id,
                        name: row.name,
                        type: row.entityType?.name ?? null,
                        translations: row.translations,
                        aliases: row.aliases,
                    };
                }

                return row;
            });
        } catch (e) {
            // don't block resource loading if entities fail
            console.warn('Failed to load entities for resource', resourceId.value, e);
            resource.value.entities = resource.value.entities || [];
        }

        if (!data.content || data.content.trim().length === 0) {
            displayMode.value = 'raw';
        }

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
    // Reset displayMode to 'extracted' when navigating to a new resource
    displayMode.value = 'extracted';
    loadResourceDetails();
});

// Watch for content becoming available and switch from raw to extracted view
watch(() => resource.value.content, (newContent, oldContent) => {
    // If we're in raw mode because there was no content, and content becomes available
    if (displayMode.value === 'raw' && newContent && newContent.trim().length > 0 && (!oldContent || oldContent.trim().length === 0)) {
        displayMode.value = 'extracted';
    }
});

// Watch for summary becoming available and switch to summary view
watch(() => resource.value.summary, (newSummary, oldSummary) => {
    // If summary becomes available after the resource was already loaded (oldSummary === null or ''),
    // switch to summary view. Don't switch on initial load (oldSummary === undefined).
    if (newSummary && newSummary.trim().length > 0 && oldSummary !== undefined && (!oldSummary || oldSummary.trim().length === 0)) {
        displayMode.value = 'summary';
    }
});

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
    if (!splitDocument.value || !splitDocument.value.id) {
        return;
    }

    if (documentSaveTimeout.value) {
        clearTimeout(documentSaveTimeout.value);
    }

    isDocumentSaving.value = true;
    documentSavedSuccessfully.value = false;

    documentSaveTimeout.value = setTimeout(async () => {
        try {
            await saveDocument(splitDocument.value.id, { content });
            splitDocument.value.content = content;
            documentSavedSuccessfully.value = true;

            setTimeout(() => {
                documentSavedSuccessfully.value = false;
            }, 3000);
        } catch (error) {
            notification.error('Failed to save document content');
        } finally {
            isDocumentSaving.value = false;
        }
    }, 1000);
};

const handleDocumentNameChange = async () => {
    if (!splitDocument.value || !splitDocument.value.id || !splitDocument.value.name.trim()) {
        return;
    }

    if (documentNameSaveTimeout.value) {
        clearTimeout(documentNameSaveTimeout.value);
    }

    isDocumentSaving.value = true;
    documentSavedSuccessfully.value = false;

    documentNameSaveTimeout.value = setTimeout(async () => {
        try {
            await saveDocument(splitDocument.value.id, { name: splitDocument.value.name.trim() });
            documentSavedSuccessfully.value = true;

            setTimeout(() => {
                documentSavedSuccessfully.value = false;
            }, 3000);
        } catch (error) {
            notification.error('Failed to save document name');
        } finally {
            isDocumentSaving.value = false;
        }
    }, 1000);
};

const removeResource = async () => {
    try {
        await apiClient.delete(`/resources/${resourceId.value}`);
        notification.success('Resource removed successfully');

        router.push(`/project/${projectStore.currentProject.id}`);
    } catch (error) {
        notification.error('Failed to remove resource');
    }
};

const confirmRemoveResource = () => {
    if (window.confirm('Are you sure you want to remove this resource? This action cannot be undone.')) {
        removeResource();
    }
};

const onDrop = async (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const droppedData = handleDrop(event);

    if (droppedData && droppedData.type === 'document') {
        try {
            const document = droppedData.document;
            if (document && document.id) {
                const fullDocument = await loadDocument(document.id);
                splitDocument.value = fullDocument;
                splitViewActive.value = true;
            }
        } catch (error) {
            notification.error('Failed to load document');
        }
    } else {
        const dataTransfer = event.dataTransfer;
        const files = dataTransfer?.files;

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
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

const startNameEdit = () => {
    isEditingName.value = true;
    editResourceName.value = resource.value.name;
    nameSavedSuccessfully.value = false;

    setTimeout(() => {
        nameInput.value?.focus();
        nameInput.value?.select();
    }, 50);
};

const cancelNameEdit = () => {
    isCancelingNameEdit.value = true;
    isEditingName.value = false;
    editResourceName.value = '';
    nameSavedSuccessfully.value = false;

    if (nameSaveTimeout.value) {
        clearTimeout(nameSaveTimeout.value);
    }

    setTimeout(() => {
        isCancelingNameEdit.value = false;
    }, 100);
};

const handleBlur = () => {
    if (!isCancelingNameEdit.value) {
        saveResourceName();
    }
};

const handleResourceNameChange = () => {
    if (nameSaveTimeout.value) {
        clearTimeout(nameSaveTimeout.value);
    }

    nameSavedSuccessfully.value = false;
};

const saveResourceName = async () => {
    if (isCancelingNameEdit.value || !editResourceName.value.trim()) {
        if (!isCancelingNameEdit.value && !editResourceName.value.trim()) {
            notification.error('Resource name cannot be empty');
        }
        return;
    }

    if (editResourceName.value.trim() === resource.value.name) {
        isEditingName.value = false;
        return;
    }

    if (nameSaveTimeout.value) {
        clearTimeout(nameSaveTimeout.value);
    }

    isNameSaving.value = true;
    nameSavedSuccessfully.value = false;

    try {
        await updateResource(resourceId.value, {
            name: editResourceName.value.trim()
        });

        resource.value.name = editResourceName.value.trim();
        nameSavedSuccessfully.value = true;

        setTimeout(() => {
            nameSavedSuccessfully.value = false;
            isEditingName.value = false;
        }, 1500);

        notification.success('Resource name updated successfully');
    } catch (error) {
        notification.error('Failed to update resource name');
        isEditingName.value = false;
    } finally {
        isNameSaving.value = false;
    }
};

onMounted(async () => {
    loadResourceDetails();
    // Load default language from settings
    if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings();
        defaultLanguage.value = settings?.language || 'en';
    }
});

const { showSearch } = useGlobalKeyboard();

const showChat = ref(false);
const chatMessages = ref<{ role: 'user' | 'assistant'; text: string }[]>([]);

function handleSendMessage(msg: string) {
    if (msg.trim()) {
        chatMessages.value.push({ role: 'user', text: msg });
    }
}

// Helper to get language from settings (async)
const getLanguageSetting = async (): Promise<string> => {
    if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings();
        return settings?.language || 'en';
    }
    return 'en';
};

const handleSummarizeJob = async () => {
    try {
        const language = await getLanguageSetting();
        await apiClient.post('/model/summarize', {
            targetLanguage: language,
            resourceId: resourceId.value,
        });
        notification.success('Summarization job created successfully');
    } catch (error) {
        notification.error('Failed to create summarization job');
    }
};



const handleTranslate = async () => {
    try {
        const language = await getLanguageSetting();
        await apiClient.post('/model/translate', {
            resourceId: resourceId.value,
            targetLanguage: language,
        });
        notification.success('Translation job created successfully');
    } catch (error) {
        notification.error('Failed to create translation job');
    }
}

const handleExtractEntities = async () => {
    if (!resourceId.value) return;
    try {
        await apiClient.post('/model/extract-entities', { resourceId: Number(resourceId.value) });
        notification.success('Entity extraction job created successfully');
        await loadResourceDetails();
    } catch (error) {
        notification.error('Failed to create entity extraction job');
    }
};

const handleEntityRemoved = (entityId: number) => {
    // Remove the entity from the local resource object
    if (resource.value.entities) {
        resource.value.entities = resource.value.entities.filter((entity: any) => entity.id !== entityId);
    }
};

const handleEntityMerged = (sourceEntityId: number, targetEntity: any) => {
    // Remove the source entity and update the target entity in the local resource object
    if (resource.value.entities) {
        const sourceIndex = resource.value.entities.findIndex((entity: any) => entity.id === sourceEntityId);
        if (sourceIndex !== -1) {
            resource.value.entities.splice(sourceIndex, 1);
        }

        const targetIndex = resource.value.entities.findIndex((entity: any) => entity.id === targetEntity.id);
        if (targetIndex !== -1) {
            resource.value.entities[targetIndex] = targetEntity;
        }
    }
};

const handleEntityHighlight = async (entity: any) => {
    // Determine which name to search for based on current display mode (extracted vs translated)
    let nameToHighlight = '';
    let aliasValues: string[] = [];

    try {
        if (displayMode.value === 'translated' && resource.value.translatedContent) {
            // Prefer translated name if available in entity.translations for the UI/target language
            const uiLang = await getLanguageSetting();
            if (entity.translations && entity.translations[uiLang]) {
                nameToHighlight = entity.translations[uiLang];
            } else if (entity.translations && entity.translations['es']) {
                nameToHighlight = entity.translations['es'];
            } else {
                nameToHighlight = entity.name;
            }
        } else {
            // extracted or raw content: use original name or translation matching resource language
            nameToHighlight = entity.name || '';
            if (entity.translations && resource.value.language && entity.translations[resource.value.language]) {
                nameToHighlight = entity.translations[resource.value.language];
            }
        }

        aliasValues = (entity.aliases || []).map((a: any) => a.value || '');
    } catch (e) {
        nameToHighlight = entity.name || '';
        aliasValues = (entity.aliases || []).map((a: any) => a.value || '');
    }

    if (extractedContent.value && extractedContent.value.highlightEntity) {
        extractedContent.value.highlightEntity(nameToHighlight, aliasValues);
    }
};
</script>

<style scoped>
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

.ask-btn {
    margin-bottom: 1rem;
}

.chat-sidebar {
    min-width: 320px;
    max-width: 100vw;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
}
</style>