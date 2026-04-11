<template>
    <div v-if="currentProjectId && allItems.length > 0" class="documents-sidebar pt-3">
        <div class="px-3 mb-2 flex items-center justify-between">
            <h3 v-if="!isSearching" @click="startSearch"
                class="text-[11px] font-semibold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-secondary transition-colors"
                :class="{ 'sr-only': collapsed }">
                Documents
            </h3>
            <input v-if="isSearching && !collapsed" ref="searchInput" v-model="searchTerm" @blur="endSearch"
                @keyup.escape="endSearch" type="text" placeholder="Search..."
                class="text-sm border-0 outline-none bg-transparent w-full text-text-secondary placeholder:text-text-muted"
                @click.stop>
        </div>

        <div v-if="!collapsed" class="mt-1 overflow-y-auto max-h-48">
            <div v-if="isLoading || isCanvasesLoading || isTimelinesLoading" class="flex justify-center py-3">
                <LoadingSpinner size="sm" />
            </div>

            <router-link v-for="item in filteredItems" :key="item.key" :to="item.to"
                class="group block px-3 py-2 text-sm text-text-secondary hover:bg-accent-subtle hover:text-accent-dark rounded-lg transition-all duration-200 text-left"
                :draggable="item.type === 'document'" @dragstart="item.type === 'document' ? handleDragStart($event, item.raw) : undefined">
                <div class="flex items-center">
                    <!-- Document icon -->
                    <svg v-if="item.type === 'document'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-text-muted" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <!-- Canvas icon -->
                    <svg v-else-if="item.type === 'canvas'" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-amber-500" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    <!-- Timeline icon -->
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-emerald-500" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>

                    <span class="ml-2 overflow-hidden overflow-ellipsis whitespace-nowrap text-[13px]">
                        {{ item.name }}
                    </span>

                    <svg v-if="item.type === 'document'" xmlns="http://www.w3.org/2000/svg"
                        class="h-3 w-3 ml-auto text-text-muted opacity-0 group-hover:opacity-50 transition-opacity shrink-0"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                </div>
            </router-link>

            <div v-if="filteredItems.length === 0 && !isLoading && !isCanvasesLoading"
                class="px-3 py-2 text-xs text-text-muted italic">
                {{ searchTerm ? 'No results found' : 'No documents available' }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import { useDocumentProjectList } from '../services/documents/useDocumentProjectList';
import { useCanvasList } from '../services/canvas/useCanvasList';
import { useTimelines } from '../services/timelines/useTimelines';
import { useProjectStore } from '../store/projectStore';
import { useDragDrop } from '../composables/useDragDrop';
import { getSocket } from '../services/notifications/notification';

const props = defineProps({
    collapsed: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['expand']);

const projectStore = useProjectStore();
const { loadDocumentsByProject, isLoading } = useDocumentProjectList();
const { loadCanvasesByProject, isLoading: isCanvasesLoading } = useCanvasList();
const { loadTimelinesByProject, isLoading: isTimelinesLoading } = useTimelines();
const { handleDragStart: dragStart } = useDragDrop();
const documents = ref([]);
const canvases = ref([]);
const timelines = ref([]);
const searchTerm = ref('');
const isSearching = ref(false);
const searchInput = ref(null);

const allItems = computed(() => {
    const docs = documents.value.map(d => ({
        key: `d-${d.id}`,
        name: d.name,
        to: `/document/${d.id}`,
        type: 'document',
        updatedAt: d.updatedAt || d.createdAt,
        raw: d,
    }));
    const cvs = canvases.value.map(c => ({
        key: `c-${c.id}`,
        name: c.name,
        to: `/canvas/${c.id}`,
        type: 'canvas',
        updatedAt: c.updatedAt || c.createdAt,
        raw: c,
    }));
    const tls = timelines.value.map(t => ({
        key: `tl-${t.id}`,
        name: t.name,
        to: `/timeline/${t.id}`,
        type: 'timeline',
        updatedAt: t.updatedAt || t.createdAt,
        raw: t,
    }));
    return [...docs, ...cvs, ...tls].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
});

const filteredItems = computed(() => {
    if (!searchTerm.value) return allItems.value;
    const term = searchTerm.value.toLowerCase();
    return allItems.value.filter(item =>
        item.name.toLowerCase().includes(term)
    );
});

const currentProjectId = computed(() => {
    return projectStore.currentProject?.id ?? null;
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

const loadAll = async () => {
    if (currentProjectId.value) {
        try {
            documents.value = await loadDocumentsByProject(currentProjectId.value);
        } catch (err) {
            console.error('Failed to load documents:', err);
            documents.value = [];
        }
        try {
            canvases.value = await loadCanvasesByProject(currentProjectId.value);
        } catch (err) {
            console.error('Failed to load canvases:', err);
            canvases.value = [];
        }
        try {
            timelines.value = await loadTimelinesByProject(currentProjectId.value);
        } catch (err) {
            console.error('Failed to load timelines:', err);
            timelines.value = [];
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

// Listen for socket notifications to refresh the list
const onNotification = () => {
    if (currentProjectId.value) {
        loadAll();
    }
};

watch(currentProjectId, (newId) => {
    if (newId) {
        loadAll();
    } else {
        documents.value = [];
        canvases.value = [];
        timelines.value = [];
    }
}, { immediate: true });

onMounted(() => {
    if (currentProjectId.value) {
        loadAll();
    }
    getSocket().on('notification', onNotification);
});

onBeforeUnmount(() => {
    getSocket().off('notification', onNotification);
});
</script>
