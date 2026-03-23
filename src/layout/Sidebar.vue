<template>
    <div class="sidebar h-screen transition-all duration-300 ease-in-out flex flex-col border-r border-border"
        :class="{ 'w-[3.75rem]': collapsed, 'w-60': !collapsed }"
        style="background: linear-gradient(180deg, var(--color-sidebar-from) 0%, var(--color-sidebar-to) 100%);">

        <!-- Brand / Collapse toggle -->
        <div class="flex items-center px-3 py-4 border-b border-border-light"
            :class="{ 'justify-center': collapsed, 'justify-between': !collapsed }">
            <router-link to="/" v-if="!collapsed" class="flex items-center gap-2.5 min-w-0 no-underline">
                <div
                    class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    D
                </div>
                <span class="font-semibold text-sm text-text-primary truncate tracking-tight">Documents</span>
            </router-link>
            <button @click="toggleCollapse"
                class="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors duration-200 cursor-pointer">
                <svg v-if="collapsed" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20"
                    fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                        clip-rule="evenodd" />
                </svg>
            </button>
        </div>

        <!-- Workspace Selector -->
        <div class="px-2 py-2 border-b border-border-light">
            <WorkspaceSelector :collapsed="collapsed" />
        </div>

        <!-- Navigation -->
        <nav class="flex flex-col flex-grow overflow-y-auto px-2 py-3 gap-0.5">
            <button @click="openBrowser"
                class="group flex items-center px-3 py-2.5 text-text-secondary rounded-lg transition-all duration-200 hover:bg-surface-hover cursor-pointer w-full"
                :class="collapsed ? 'justify-center' : 'text-left'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span v-if="!collapsed"
                    class="ml-3 text-sm font-medium group-hover:text-text-primary transition-colors">Browser</span>
            </button>

            <router-link to="/entities"
                class="group flex items-center px-3 py-2.5 text-text-secondary rounded-lg transition-all duration-200"
                :class="{ 'justify-center': collapsed }" active-class="!bg-accent-subtle !text-accent-dark font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span v-if="!collapsed"
                    class="ml-3 text-sm font-medium group-hover:text-text-primary transition-colors">Entities</span>
            </router-link>

            <router-link to="/datasets"
                class="group flex items-center px-3 py-2.5 text-text-secondary rounded-lg transition-all duration-200"
                :class="{ 'justify-center': collapsed }" active-class="!bg-accent-subtle !text-accent-dark font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <span v-if="!collapsed"
                    class="ml-3 text-sm font-medium group-hover:text-text-primary transition-colors">Datasets</span>
            </router-link>

            <router-link to="/notes"
                class="group flex items-center px-3 py-2.5 text-text-secondary rounded-lg transition-all duration-200"
                :class="{ 'justify-center': collapsed }" active-class="!bg-accent-subtle !text-accent-dark font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span v-if="!collapsed"
                    class="ml-3 text-sm font-medium group-hover:text-text-primary transition-colors">Notes</span>
            </router-link>

            <router-link to="/knowledge-base"
                class="group flex items-center px-3 py-2.5 text-text-secondary rounded-lg transition-all duration-200"
                :class="{ 'justify-center': collapsed }" active-class="!bg-accent-subtle !text-accent-dark font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span v-if="!collapsed"
                    class="ml-3 text-sm font-medium group-hover:text-text-primary transition-colors">Knowledge Base</span>
            </router-link>

            <router-link to="/calendar"
                class="group flex items-center px-3 py-2.5 text-text-secondary rounded-lg transition-all duration-200"
                :class="{ 'justify-center': collapsed }" active-class="!bg-accent-subtle !text-accent-dark font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span v-if="!collapsed"
                    class="ml-3 text-sm font-medium group-hover:text-text-primary transition-colors">Calendar</span>
            </router-link>

            <button @click="toggleTaskPanel()"
                class="group flex items-center px-3 py-2.5 text-text-secondary rounded-lg transition-all duration-200 hover:bg-surface-hover cursor-pointer w-full"
                :class="collapsed ? 'justify-center' : 'text-left'">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span v-if="!collapsed"
                    class="ml-3 text-sm font-medium group-hover:text-text-primary transition-colors">Tasks</span>
            </button>

            <ResourceSidebar :collapsed="collapsed" @expand="handleResourceExpand" />
            <DocumentSidebar :collapsed="collapsed" @expand="handleDocumentExpand" />
        </nav>

        <!-- Settings & User -->
        <div class="px-2 py-3 border-t border-border-light flex flex-col gap-0.5">
            <router-link v-if="authRequired && isAdmin" to="/admin/users"
                class="group flex items-center px-3 py-2.5 text-text-muted rounded-lg transition-all duration-200 hover:bg-surface-hover hover:text-text-secondary"
                :class="{ 'justify-center': collapsed }" active-class="!bg-accent-subtle !text-accent-dark">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span v-if="!collapsed"
                    class="ml-3 text-sm font-medium group-hover:text-text-primary transition-colors">Users</span>
            </router-link>

            <router-link to="/settings"
                class="group flex items-center px-3 py-2.5 text-text-muted rounded-lg transition-all duration-200 hover:bg-surface-hover hover:text-text-secondary"
                :class="{ 'justify-center': collapsed }" active-class="!bg-accent-subtle !text-accent-dark">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span v-if="!collapsed"
                    class="ml-3 text-sm font-medium group-hover:text-text-primary transition-colors">Settings</span>
            </router-link>

            <SyncIndicator :collapsed="collapsed" />

            <div v-if="authRequired && currentUser" class="flex items-center px-3 py-2 gap-2"
                :class="{ 'justify-center': collapsed }">
                <div class="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                    {{ userInitials }}
                </div>
                <span v-if="!collapsed" class="text-xs text-text-muted truncate flex-1">{{ currentUser.displayName || currentUser.username }}</span>
                <button v-if="!collapsed" @click="handleLogout" title="Sign out"
                    class="p-1 rounded text-text-muted hover:text-red-500 transition-colors cursor-pointer shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ResourceSidebar from './ResourceSidebar.vue';
import DocumentSidebar from './DocumentSidebar.vue';
import WorkspaceSelector from '../components/WorkspaceSelector.vue';
import SyncIndicator from '../components/SyncIndicator.vue';
import { useProjectStore } from '../store/projectStore';
import { useTaskPanel } from '../composables/useTaskPanel';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'vue-router';

const projectStore = useProjectStore();
const authStore = useAuthStore();
const router = useRouter();
const { toggleTaskPanel } = useTaskPanel();
const collapsed = ref(true);

const hasProjectSelected = computed(() => {
    return !!projectStore?.currentProject?.id;
});

const authRequired = computed(() => authStore.authRequired);
const isAdmin = computed(() => authStore.isAdmin);
const currentUser = computed(() => authStore.user);
const userInitials = computed(() => {
    const name = currentUser.value?.displayName || currentUser.value?.username || '?';
    return name.slice(0, 2).toUpperCase();
});

const handleLogout = () => {
    authStore.logout();
    router.push('/login');
};

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
    await window.electronAPI.openExternalBrowser(projectStore.currentProject?.id);
};
</script>
