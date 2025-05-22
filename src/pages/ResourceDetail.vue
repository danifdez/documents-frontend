<template>
    <div class="container mx-auto p-5 max-w-7xl">
        <Breadcrumb :items="breadcrumbItems" />
        <div v-if="isLoading" class="flex justify-center items-center h-64">
            <p class="text-gray-500">Loading resource details...</p>
        </div>

        <div v-else-if="error" class="flex justify-center items-center h-64">
            <p class="text-red-500">Error: {{ error }}</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="md:col-span-2 space-y-6">
                <div class="bg-white p-4 shadow rounded-lg">
                    <div class="flex items-center mb-4">
                        <h1 class="text-2xl font-bold mr-3">{{ resource.name }}</h1>
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
                        <div>
                            <a @click="downloadResource"
                                class="inline-flex items-center px-4 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                            </a>
                        </div>
                        <div class="flex rounded-md shadow-sm" role="group">
                            <button v-if="resource.content" @click="displayMode = 'extracted'" type="button"
                                class="px-4 py-1 text-sm font-medium rounded-l-lg"
                                :class="displayMode === 'extracted' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'">
                                Extracted Content
                            </button>
                            <button v-if="resource.translatedContent" @click="displayMode = 'translated'" type="button"
                                class="px-4 py-1 text-sm font-medium"
                                :class="displayMode === 'translated' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'">
                                Translated
                            </button>
                            <button @click="displayMode = 'raw'" type="button"
                                class="px-4 py-1 text-sm font-medium rounded-r-lg"
                                :class="displayMode === 'raw' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'">
                                Original
                            </button>
                        </div>
                    </div>

                    <div class="border border-gray-200 rounded-md p-5 overflow-auto">
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

            <div class="md:col-span-1 space-y-6">
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
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useResource } from '../services/resources/useResource';
import { useResourceIcon } from '../composables/useResourceIcon';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import axios from 'axios';
import { useProjectStore } from '../store/projectStore';
import apiClient from '../services/api';

const route = useRoute();
const resourceId = computed(() => route.params.id as string);
const { loadResource, error, isLoading } = useResource();
const resource = ref<any>({});
const projectStore = useProjectStore();
const rawHtmlContent = ref<string>('');
const displayMode = ref<'extracted' | 'raw' | 'translated'>('extracted');
const apiBaseUrl = apiClient.defaults.baseURL || 'http://nestjs-app:3000';
const { isPdfFile, isDocumentFile, isHtmlFile, isTextFile } = useResourceIcon(resource);

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
</style>