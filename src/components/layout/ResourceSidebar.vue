<template>
    <div v-if="currentProjectId && resources.length > 0" class="resources-sidebar border-t border-gray-200 pt-3">
        <div class="px-3 mb-2 flex items-center justify-between">
            <h3 v-if="!isSearching" @click="startSearch"
                class="text-sm font-semibold text-gray-700 cursor-pointer hover:text-gray-900"
                :class="{ 'sr-only': collapsed }">
                Project Resources
            </h3>
            <input v-if="isSearching && !collapsed" ref="searchInput" v-model="searchTerm" @blur="endSearch"
                @keyup.escape="endSearch" type="text" placeholder="Search resources..."
                class="text-sm border-0 outline-none bg-transparent w-full font-semibold text-gray-700" @click.stop>
            <button v-if="collapsed" class="text-gray-500 hover:text-gray-700 mx-auto" @click="expandSidebar">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            </button>
        </div>

        <div v-if="!collapsed" class="mt-1 overflow-y-auto max-h-48">
            <div v-if="isLoading" class="flex justify-center py-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
            </div>

            <router-link v-for="resource in filteredResources" :key="resource._id" :to="`/resource/${resource._id}`"
                class="block px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 rounded-md transition-all duration-200 text-left">
                <div class="flex items-center">
                    <svg v-if="getResourceIconType(resource) === 'pdf'" xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clip-rule="evenodd" />
                    </svg>
                    <svg v-else-if="getResourceIconType(resource) === 'document'" xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clip-rule="evenodd" />
                    </svg>
                    <svg v-else-if="getResourceIconType(resource) === 'html'" xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd"
                            d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                            clip-rule="evenodd" />
                    </svg>
                    <svg v-else-if="getResourceIconType(resource) === 'text'" xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clip-rule="evenodd" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20"
                        fill="currentColor">
                        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                            clip-rule="evenodd" />
                    </svg>

                    <span class="ml-2 overflow-hidden overflow-ellipsis whitespace-nowrap">
                        {{ resource.name }}
                    </span>
                </div>
            </router-link>

            <div v-if="filteredResources.length === 0 && !isLoading" class="px-3 py-2 text-sm text-gray-500 italic">
                {{ searchTerm ? 'No resources found' : 'No resources available' }}
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useResourceList } from '../../services/resources/useResourceList';
import { getResourceIconType } from '../../composables/useResourceIcon';
import { useProjectStore } from '../../store/projectStore';

const props = defineProps({
    collapsed: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['expand']);

const route = useRoute();
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
    if (projectStore.currentProject) {
        return projectStore.currentProject._id;
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
});
</script>