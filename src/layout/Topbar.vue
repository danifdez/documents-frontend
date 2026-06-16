<template>
    <header class="topbar flex items-center gap-2 px-3 h-14 border-b border-border shrink-0"
        style="background: linear-gradient(180deg, var(--color-sidebar-from) 0%, var(--color-sidebar-to) 100%);">

        <!-- Brand -->
        <router-link to="/" class="flex items-center gap-2.5 min-w-0 no-underline shrink-0">
            <div
                class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-semibold text-sm shrink-0">
                D
            </div>
            <span class="font-semibold text-sm text-text-primary tracking-tight">Documents</span>
        </router-link>

        <!-- Workspace selector -->
        <div class="w-56 shrink-0 ml-2">
            <WorkspaceSelector :collapsed="false" />
        </div>

        <div class="h-6 w-px bg-border mx-1 shrink-0"></div>

        <!-- Navigation -->
        <nav class="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto">
            <NavItem label="Browser" @click="openBrowser">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
            </NavItem>

            <NavItem v-if="featureStore.isEnabled('relationships')" label="Relationships" to="/relationships">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            </NavItem>

            <NavItem v-if="featureStore.isEnabled('datasets')" label="Datasets" to="/datasets">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            </NavItem>

            <NavItem v-if="featureStore.isEnabled('bibliography')" label="Bibliography" to="/bibliography">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            </NavItem>

            <NavItem v-if="featureStore.isEnabled('knowledge_base')" label="Knowledge Base" to="/knowledge-base">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            </NavItem>

            <NavItem v-if="featureStore.isEnabled('calendar')" label="Calendar" :to="calendarRoute">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </NavItem>
        </nav>

        <!-- Right cluster -->
        <div class="flex items-center gap-1 shrink-0">
            <button v-if="featureStore.isEnabled('assistants')"
                @click="showAssistant = !showAssistant"
                title="Assistant (Ctrl+J)"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors cursor-pointer text-sm font-medium">
                <span>◇ Assistant</span>
                <span class="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-border-light">Ctrl J</span>
            </button>

            <SyncIndicator :collapsed="false" />

            <router-link v-if="authRequired && isAdmin" to="/admin/users"
                title="Users"
                class="p-2 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-secondary transition-colors"
                active-class="!bg-accent-subtle !text-accent-dark">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            </router-link>

            <router-link to="/settings"
                title="Settings"
                class="p-2 rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-secondary transition-colors"
                active-class="!bg-accent-subtle !text-accent-dark">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </router-link>

            <div v-if="authRequired && currentUser" class="flex items-center gap-2 pl-2 ml-1 border-l border-border-light">
                <router-link to="/profile" class="shrink-0 hover:opacity-90 transition-opacity cursor-pointer" title="Profile">
                    <Avatar
                        :user-id="currentUser.id"
                        :avatar-path="currentUser.avatarPath"
                        :display-name="currentUser.displayName"
                        :username="currentUser.username"
                        size="sm"
                    />
                </router-link>
                <router-link to="/profile" class="text-xs text-text-muted hover:text-text-secondary transition-colors max-w-32 truncate">
                    {{ currentUser.displayName || currentUser.username }}
                </router-link>
                <button @click="handleLogout" title="Sign out"
                    class="p-1.5 rounded text-text-muted hover:text-red-500 transition-colors cursor-pointer shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </div>
    </header>
</template>

<script setup>
import { computed } from 'vue';
import WorkspaceSelector from '../components/WorkspaceSelector.vue';
import SyncIndicator from '../components/SyncIndicator.vue';
import Avatar from '../components/ui/Avatar.vue';
import NavItem from '../components/ui/NavItem.vue';
import { useProjectStore } from '../store/projectStore';
import { useAuthStore } from '../store/authStore';
import { useFeatureStore } from '../store/featureStore';
import { useRouter } from 'vue-router';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const projectStore = useProjectStore();
const authStore = useAuthStore();
const featureStore = useFeatureStore();
const router = useRouter();
const { showAssistant } = useGlobalKeyboard();

const hasProjectSelected = computed(() => !!projectStore?.currentProject?.id);

const calendarRoute = computed(() => {
    if (hasProjectSelected.value) {
        return `/project/${projectStore.currentProject.id}/calendar`;
    }
    return '/calendar';
});

const authRequired = computed(() => authStore.authRequired);
const isAdmin = computed(() => authStore.isAdmin);
const currentUser = computed(() => authStore.user);

const handleLogout = () => {
    authStore.logout();
    router.push('/login');
};

const openBrowser = async () => {
    await window.electronAPI.openExternalBrowser(projectStore.currentProject?.id);
};
</script>
