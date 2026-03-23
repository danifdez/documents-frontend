<template>
    <div v-if="currentProjectId && resources.length > 0" class="resources-sidebar pt-3">
        <div class="px-3 mb-2 flex items-center justify-between">
            <h3 v-if="!isSearching" @click="startSearch"
                class="text-[11px] font-semibold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-secondary transition-colors"
                :class="{ 'sr-only': collapsed }">
                Resources
            </h3>
            <input v-if="isSearching && !collapsed" ref="searchInput" v-model="searchTerm" @blur="endSearch"
                @keyup.escape="endSearch" type="text" placeholder="Search resources..."
                class="text-sm border-0 outline-none bg-transparent w-full text-text-secondary placeholder:text-text-muted"
                @click.stop>
        </div>

        <div v-if="!collapsed" class="mt-1 overflow-y-auto max-h-48">
            <div v-if="isLoading" class="flex justify-center py-3">
                <LoadingSpinner size="sm" />
            </div>

            <router-link v-for="resource in filteredResources" :key="resource.id" :to="`/resource/${resource.id}`"
                class="group block px-3 py-2 text-sm text-text-secondary hover:bg-accent-subtle hover:text-accent-dark rounded-lg transition-all duration-200 text-left"
                :draggable="true" @dragstart="handleDragStart($event, resource)">
                <div class="flex items-center">
                    <span class="shrink-0 scale-75 origin-center"><IconType :mimeType="resource.mimeType" /></span>
                    <span class="ml-1 overflow-hidden overflow-ellipsis whitespace-nowrap text-[13px] flex-1">
                        {{ resource.name }}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg"
                        class="h-3 w-3 ml-auto text-text-muted opacity-0 group-hover:opacity-50 transition-opacity shrink-0"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                </div>
            </router-link>

            <div v-if="filteredResources.length === 0 && !isLoading"
                class="px-3 py-2 text-xs text-text-muted italic">
                {{ searchTerm ? 'No resources found' : 'No resources available' }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import { useResourceList } from '../services/resources/useResourceList';
import { useProjectStore } from '../store/projectStore';
import { useDragDrop } from '../composables/useDragDrop';
import IconType from '../components/resources/IconType.vue';
import socket from '../services/notifications/notification';

const { handleDragStart: dragStart } = useDragDrop();

const props = defineProps({
    collapsed: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['expand']);

const projectStore = useProjectStore();
const { loadResourcesByProject, isLoading } = useResourceList();
const resources = ref([]);
const searchTerm = ref('');
const isSearching = ref(false);
const searchInput = ref(null);

const filteredResources = computed(() => {
    if (!searchTerm.value) return resources.value;
    return resources.value.filter(resource =>
        resource.name.toLowerCase().includes(searchTerm.value.toLowerCase())
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

const handleDragStart = (event, resource) => {
    event.stopPropagation();
    dragStart(event, {
        type: 'resource',
        resource: resource
    });
};

const loadResources = async () => {
    if (currentProjectId.value) {
        try {
            resources.value = await loadResourcesByProject(currentProjectId.value);
        } catch (err) {
            console.error('Failed to load resources:', err);
            resources.value = [];
        }
    }
};

// Listen for socket notifications to refresh the resource list
const onNotification = () => {
    if (currentProjectId.value) {
        loadResources();
    }
};

watch(currentProjectId, (newId) => {
    if (newId) {
        loadResources();
    } else {
        resources.value = [];
    }
}, { immediate: true });

onMounted(() => {
    if (currentProjectId.value) {
        loadResources();
    }
    socket.on('notification', onNotification);
});

onBeforeUnmount(() => {
    socket.off('notification', onNotification);
});
</script>
