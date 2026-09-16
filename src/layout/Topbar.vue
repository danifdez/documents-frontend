<template>
  <header class="app-topbar flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface-elevated/95 px-3">
    <router-link to="/" class="topbar-brand flex shrink-0 items-center gap-2 no-underline" title="Documents">
      <img src="../assets/app-icon.svg" alt="" class="h-8 w-8 shrink-0 rounded-lg" />
      <span class="topbar-brand-copy text-sm font-semibold tracking-tight text-text-primary">Documents</span>
    </router-link>

    <div class="h-6 w-px shrink-0 bg-border"></div>

    <div class="topbar-workspace w-44 shrink-0">
      <WorkspaceSelector :collapsed="false" />
    </div>

    <nav class="topbar-navigation flex shrink-0 items-center gap-0.5" aria-label="Main navigation">
      <router-link to="/" class="topbar-nav-link" :class="{ 'topbar-nav-link--active': projectsActive }">
        Projects
      </router-link>
      <router-link :to="calendarRoute" class="topbar-nav-link" :class="{ 'topbar-nav-link--active': calendarActive }">
        Calendar
      </router-link>

      <div v-if="knowledgeItems.length" ref="knowledgeMenuRef" class="relative">
        <button type="button" class="topbar-nav-link" :class="{ 'topbar-nav-link--active': knowledgeActive }"
          :aria-expanded="knowledgeOpen" aria-haspopup="menu" @click="toggleKnowledge">
          Knowledge
          <svg class="h-3 w-3 transition-transform" :class="{ 'rotate-180': knowledgeOpen }" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <div v-if="knowledgeOpen" class="topbar-menu left-0" role="menu">
          <router-link v-for="item in knowledgeItems" :key="item.to" :to="item.to" class="topbar-menu-item"
            :class="{ 'topbar-menu-item--active': isKnowledgeItemActive(item.to) }" role="menuitem"
            @click="knowledgeOpen = false">
            <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-text-secondary">
              <component :is="item.icon" />
            </span>
            <span class="min-w-0">
              <span class="block text-xs font-medium text-text-primary">{{ item.label }}</span>
              <span class="block truncate text-[10px] text-text-muted">{{ item.description }}</span>
            </span>
          </router-link>
        </div>
      </div>
    </nav>

    <div class="ml-auto flex shrink-0 items-center gap-0.5">
      <SyncIndicator :collapsed="true" />

      <button class="topbar-action" title="New note (Ctrl+Alt+N)" @click="createQuickNote">
        <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M12 6.75v10.5M6.75 12h10.5M5.25 3.75h13.5a1.5 1.5 0 011.5 1.5v13.5a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z" />
        </svg>
        <span class="topbar-action-label">Note</span>
      </button>

      <button class="topbar-action" title="Tasks (Ctrl+Shift+T)" @click="toggleTaskPanel">
        <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M9 6.75h10.5M9 12h10.5M9 17.25h10.5M4.5 6.75l.75.75 1.5-1.5M4.5 12l.75.75 1.5-1.5M4.5 17.25l.75.75 1.5-1.5" />
        </svg>
        <span class="topbar-action-label">Tasks</span>
      </button>

      <button class="topbar-action topbar-action--accent" title="Assistant (Ctrl+J)"
        @click="showAssistant = !showAssistant">
        <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M12 3l1.25 4.25L17.5 8.5l-4.25 1.25L12 14l-1.25-4.25L6.5 8.5l4.25-1.25L12 3zM18.5 14l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3z" />
        </svg>
        <span class="topbar-action-label">Assistant</span>
      </button>

      <router-link to="/settings" class="topbar-icon-action" active-class="topbar-icon-action--active"
        title="Settings">
        <svg class="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3" />
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1.1V21h-3.2v-.1A1.7 1.7 0 0010 19.8a1.7 1.7 0 00-1-.6 1.7 1.7 0 00-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-.6-1 1.7 1.7 0 00-1.1-.4H3v-3.2h.1A1.7 1.7 0 004.2 10a1.7 1.7 0 00.6-1 1.7 1.7 0 00-.34-1.88l-.06-.06L7.26 4.2l.06.06A1.7 1.7 0 009.2 4.6a1.7 1.7 0 001-.6 1.7 1.7 0 00.4-1.1V3h3.2v.1a1.7 1.7 0 00.4 1.1 1.7 1.7 0 001 .6 1.7 1.7 0 001.88-.34l.06-.06L20 7.26l-.06.06A1.7 1.7 0 0019.6 9c.1.4.3.75.6 1 .3.26.7.4 1.1.4h.1v3.2h-.1c-.4 0-.8.14-1.1.4-.3.25-.5.6-.6 1z" />
        </svg>
      </router-link>

      <div v-if="authRequired && currentUser" ref="profileMenuRef" class="relative ml-0.5">
        <button class="rounded-full p-0.5 ring-offset-2 ring-offset-surface-elevated hover:ring-2 hover:ring-accent/30"
          :aria-expanded="profileOpen" aria-haspopup="menu" @click="toggleProfile">
          <Avatar :user-id="currentUser.id" :avatar-path="currentUser.avatarPath"
            :display-name="currentUser.displayName" :username="currentUser.username" size="sm" />
        </button>
        <div v-if="profileOpen" class="topbar-menu right-0 w-52" role="menu">
          <div class="border-b border-border-light px-3 py-2.5">
            <p class="truncate text-xs font-medium text-text-primary">{{ currentUser.displayName || currentUser.username }}</p>
            <p class="truncate text-[10px] text-text-muted">{{ currentUser.username }}</p>
          </div>
          <router-link to="/profile" class="topbar-menu-simple" @click="profileOpen = false">Profile</router-link>
          <router-link v-if="isAdmin" to="/admin/users" class="topbar-menu-simple" @click="profileOpen = false">User
            management</router-link>
          <button class="topbar-menu-simple w-full text-left text-red-500" @click="handleLogout">Sign out</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkspaceSelector from '../components/WorkspaceSelector.vue';
import SyncIndicator from '../components/SyncIndicator.vue';
import Avatar from '../components/ui/Avatar.vue';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';
import { useTaskPanel } from '../composables/useTaskPanel';
import { useProjectStore } from '../store/projectStore';
import { useFeatureStore } from '../store/featureStore';
import { useAuthStore } from '../store/authStore';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const featureStore = useFeatureStore();
const authStore = useAuthStore();
const { showAssistant, showNotesPanel, quickNoteRequested } = useGlobalKeyboard();
const { toggleTaskPanel } = useTaskPanel();

const knowledgeOpen = ref(false);
const profileOpen = ref(false);
const knowledgeMenuRef = ref<HTMLElement | null>(null);
const profileMenuRef = ref<HTMLElement | null>(null);

const calendarRoute = computed(() => projectStore.currentProject?.id
  ? `/project/${projectStore.currentProject.id}/calendar`
  : '/calendar');
const authRequired = computed(() => authStore.authRequired);
const isAdmin = computed(() => authStore.isAdmin);
const currentUser = computed(() => authStore.user);

const projectsActive = computed(() => route.path === '/' || [
  '/project/', '/thread/', '/document/', '/resource/', '/canvas/', '/timeline/',
].some(prefix => route.path.startsWith(prefix)));
const calendarActive = computed(() => route.path === '/calendar' || route.path.includes('/calendar'));

const icon = (path: string) => ({
  render: () => h('svg', {
    class: 'h-4 w-4', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '1.8',
  }, [h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: path })]),
});

const knowledgeItems = computed(() => [
  { enabled: featureStore.isEnabled('knowledge_base'), label: 'Knowledge base', description: 'Curated concepts and context', to: '/knowledge-base', icon: icon('M12 4.5a6 6 0 00-3.66 10.76c.72.55 1.16 1.36 1.16 2.27V18h5v-.47c0-.9.44-1.72 1.16-2.27A6 6 0 0012 4.5zM9.75 21h4.5') },
  { enabled: featureStore.isEnabled('relationships'), label: 'Relationships', description: 'Entities and connected knowledge', to: '/relationships', icon: icon('M8.1 11.1l7.8-3.2M8.1 12.9l7.8 3.2M6 14.25a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5zM18 9.25a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5zM18 19.25a2.25 2.25 0 110-4.5 2.25 2.25 0 010 4.5z') },
  { enabled: featureStore.isEnabled('datasets'), label: 'Datasets', description: 'Structured collections and analysis', to: '/datasets', icon: icon('M4.5 6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3S16.14 3 12 3 4.5 4.34 4.5 6zm0 0v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6m-15 6v6c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-6') },
  { enabled: featureStore.isEnabled('bibliography'), label: 'Bibliography', description: 'Sources and references', to: '/bibliography', icon: icon('M12 6.25A7.5 7.5 0 006 3.5H3.75v15H6A7.5 7.5 0 0112 21m0-14.75a7.5 7.5 0 016-2.75h2.25v15H18A7.5 7.5 0 0012 21V6.25z') },
].filter(item => item.enabled));

const knowledgeActive = computed(() => knowledgeItems.value.some(item => isKnowledgeItemActive(item.to)));

function isKnowledgeItemActive(path: string) {
  return route.path === path || route.path.startsWith(`${path}/`);
}

function toggleKnowledge() {
  profileOpen.value = false;
  knowledgeOpen.value = !knowledgeOpen.value;
}

function toggleProfile() {
  knowledgeOpen.value = false;
  profileOpen.value = !profileOpen.value;
}

function createQuickNote() {
  showNotesPanel.value = true;
  quickNoteRequested.value++;
}

function handleLogout() {
  profileOpen.value = false;
  authStore.logout();
  router.push('/login');
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (knowledgeMenuRef.value && !knowledgeMenuRef.value.contains(target)) knowledgeOpen.value = false;
  if (profileMenuRef.value && !profileMenuRef.value.contains(target)) profileOpen.value = false;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  knowledgeOpen.value = false;
  profileOpen.value = false;
}

watch(() => route.fullPath, () => {
  knowledgeOpen.value = false;
  profileOpen.value = false;
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>
