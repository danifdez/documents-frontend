<template>
    <div v-if="currentProjectId && canvases.length > 0" class="canvases-sidebar pt-3">
        <div class="px-3 mb-2 flex items-center justify-between">
            <h3 v-if="!isSearching" @click="startSearch"
                class="text-[11px] font-semibold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-secondary transition-colors"
                :class="{ 'sr-only': collapsed }">
                Canvases
            </h3>
            <input v-if="isSearching && !collapsed" ref="searchInput" v-model="searchTerm" @blur="endSearch"
                @keyup.escape="endSearch" type="text" placeholder="Search canvases..."
                class="text-sm border-0 outline-none bg-transparent w-full text-text-secondary placeholder:text-text-muted"
                @click.stop>
        </div>

        <div v-if="!collapsed" class="mt-1 overflow-y-auto max-h-48">
            <div v-if="isLoading" class="flex justify-center py-3">
                <LoadingSpinner size="sm" />
            </div>

            <router-link v-for="canvas in filteredCanvases" :key="canvas.id" :to="`/canvas/${canvas.id}`"
                class="group block px-3 py-2 text-sm text-text-secondary hover:bg-accent-subtle hover:text-accent-dark rounded-lg transition-all duration-200 text-left">
                <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-text-muted" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>

                    <span class="ml-2 overflow-hidden overflow-ellipsis whitespace-nowrap text-[13px]">
                        {{ canvas.name }}
                    </span>
                </div>
            </router-link>

            <div v-if="filteredCanvases.length === 0 && !isLoading"
                class="px-3 py-2 text-xs text-text-muted italic">
                {{ searchTerm ? 'No canvases found' : 'No canvases available' }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import { useRoute } from 'vue-router';
import { useCanvasList } from '../services/canvas/useCanvasList';
import { useProjectStore } from '../store/projectStore';

const props = defineProps({
    collapsed: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['expand']);

const route = useRoute();
const projectStore = useProjectStore();
const { loadCanvasesByProject, isLoading } = useCanvasList();
const canvases = ref([]);
const searchTerm = ref('');
const isSearching = ref(false);
const searchInput = ref(null);

const filteredCanvases = computed(() => {
    if (!searchTerm.value) return canvases.value;
    return canvases.value.filter(canvas =>
        canvas.name.toLowerCase().includes(searchTerm.value.toLowerCase())
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

const loadCanvases = async () => {
    if (currentProjectId.value) {
        try {
            canvases.value = await loadCanvasesByProject(currentProjectId.value);
        } catch (err) {
            console.error('Failed to load canvases:', err);
            canvases.value = [];
        }
    }
};

watch(currentProjectId, (newId) => {
    if (newId) {
        loadCanvases();
    } else {
        canvases.value = [];
    }
}, { immediate: true });

onMounted(() => {
    if (currentProjectId.value) {
        loadCanvases();
    }
});
</script>
