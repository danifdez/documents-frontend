<template>
    <div class="sidebar h-screen transition-all duration-300 flex flex-col border-r border-gray-200 bg-white shadow-sm"
        :class="{ 'w-16': collapsed, 'w-60': !collapsed }">
        <div class="flex justify-end p-2">
            <button class="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100" @click="toggleCollapse">
                <svg v-if="collapsed" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20"
                    fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clip-rule="evenodd" />
                </svg>
            </button>
        </div>

        <div class="flex flex-col flex-grow overflow-y-auto">
            <router-link to="/"
                class="flex items-center p-3 mb-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-all duration-200"
                :class="{ 'justify-center': collapsed }" active-class="bg-blue-50 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span v-if="!collapsed" class="ml-3 font-medium">Projects</span>
            </router-link>
            <button v-if="hasProjectSelected" @click="openBrowser"
                class="flex items-center p-3 mb-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-all duration-200"
                :class="{ 'justify-center': collapsed }">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span v-if="!collapsed" class="ml-3 font-medium">Open Browser</span>
            </button>
            <ResourceSidebar :collapsed="collapsed" @expand="handleResourceExpand" />
            <DocumentSidebar :collapsed="collapsed" @expand="handleDocumentExpand" />
        </div>
        <div class="p-2 mt-auto">
            <router-link to="/settings"
                class="flex items-center p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200 justify-center"
                :class="{ 'justify-center': collapsed }">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                        clip-rule="evenodd" />
                </svg>
                <span v-if="!collapsed" class="ml-3 font-medium">Settings</span>
            </router-link>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ResourceSidebar from './ResourceSidebar.vue';
import DocumentSidebar from './DocumentSidebar.vue';
import { useProjectStore } from '../store/projectStore';

const projectStore = useProjectStore();
const collapsed = ref(true);

const hasProjectSelected = computed(() => {
    return !!projectStore?.currentProject?._id;
});

const toggleCollapse = () => {
    collapsed.value = !collapsed.value;
};

const handleResourceExpand = () => {
    collapsed.value = false;
};

const handleDocumentExpand = () => {
    collapsed.value = false;
};

const openBrowser = async () => {
    await window.electronAPI.openExternalBrowser(projectStore.currentProject._id);
};
</script>