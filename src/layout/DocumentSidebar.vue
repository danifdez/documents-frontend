<template>
    <div v-if="currentProjectId && documents.length > 0" class="documents-sidebar border-t border-gray-200 pt-3">
        <div class="px-3 mb-2 flex items-center justify-between">
            <h3 v-if="!isSearching" @click="startSearch"
                class="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                :class="{ 'sr-only': collapsed }">
                Project Documents
            </h3>
            <input v-if="isSearching && !collapsed" ref="searchInput" v-model="searchTerm" @blur="endSearch"
                @keyup.escape="endSearch" type="text" placeholder="Search documents..."
                class="text-sm border-0 outline-none bg-transparent w-full font-semibold text-gray-700" @click.stop>
            <!-- Expand button removed to avoid duplicate small buttons when main sidebar is collapsed -->
        </div>

        <div v-if="!collapsed" class="mt-1 overflow-y-auto max-h-48">
            <div v-if="isLoading" class="flex justify-center py-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
            </div>

            <router-link v-for="document in filteredDocuments" :key="document.id" :to="`/document/${document.id}`"
                class="block px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 rounded-md transition-all duration-200 text-left"
                :draggable="true" @dragstart="handleDragStart($event, document)">
                <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clip-rule="evenodd" />
                    </svg>

                    <span class="ml-2 overflow-hidden overflow-ellipsis whitespace-nowrap">
                        {{ document.name }}
                    </span>

                    <!-- Drag indicator -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 ml-auto text-gray-400 opacity-50" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                </div>
            </router-link>

            <div v-if="filteredDocuments.length === 0 && !isLoading" class="px-3 py-2 text-sm text-gray-500 italic">
                {{ searchTerm ? 'No documents found' : 'No documents available' }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useDocumentProjectList } from '../services/documents/useDocumentProjectList';
import { useProjectStore } from '../store/projectStore';
import { useDragDrop } from '../composables/useDragDrop';
import Button from '../components/ui/Button.vue';

const props = defineProps({
    collapsed: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['expand']);

const route = useRoute();
const projectStore = useProjectStore();
const { loadDocumentsByProject, isLoading } = useDocumentProjectList();
const { handleDragStart: dragStart } = useDragDrop();
const documents = ref([]);
const searchTerm = ref('');
const isSearching = ref(false);
const searchInput = ref(null);

const filteredDocuments = computed(() => {
    if (!searchTerm.value) return documents.value;
    return documents.value.filter(document =>
        document.name.toLowerCase().includes(searchTerm.value.toLowerCase())
    );
});

const currentProjectId = computed(() => {
    if (projectStore.currentProject) {
        return projectStore.currentProject.id;
    }

    if (route.params.id) {
        return route.params.id;
    }

    return null;
});

const expandSidebar = () => {
    emit('expand');
};

const startSearch = () => {
    if (props.collapsed) {
        expandSidebar();
    }
    isSearching.value = true;
    nextTick(() => {
        if (searchInput.value) {
            searchInput.value.focus();
        }
    });
};

const endSearch = () => {
    isSearching.value = false;
    searchTerm.value = '';
};

const loadDocuments = async () => {
    if (currentProjectId.value) {
        try {
            documents.value = await loadDocumentsByProject(currentProjectId.value);
        } catch (err) {
            console.error('Failed to load documents:', err);
            documents.value = [];
        }
    }
};

const handleDragStart = (event, document) => {
    event.stopPropagation();
    dragStart(event, {
        type: 'document',
        document: document
    });
};

watch(currentProjectId, (newId) => {
    if (newId) {
        loadDocuments();
    } else {
        documents.value = [];
    }
}, { immediate: true });

onMounted(() => {
    if (currentProjectId.value) {
        loadDocuments();
    }
});
</script>
