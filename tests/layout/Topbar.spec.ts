import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Topbar from '@/layout/Topbar.vue';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import { useFeatureStore } from '@/store/featureStore';
import { useProjectStore } from '@/store/projectStore';
import type { Project } from '@/types/Project';
import { useGlobalKeyboard } from '@/composables/useGlobalKeyboard';
import { useFavoritesPanel } from '@/composables/useFavoritesPanel';
import { useTaskPanel } from '@/composables/useTaskPanel';

const project: Project = { id: 11, name: 'Archives', status: 'active' as const, description: null, createdAt: '', updatedAt: '' };
const user: Omit<AuthUser, 'permissions'> = { id: 7, username: 'sreader', displayName: 'Sarah Reader', avatarPath: null, groupId: null };
const button = (name: string) => screen.getByRole('button', { name });

async function openTopbar({ path = '/', signedIn = false, admin = false, withProject = false, features = {} } = {}) {
  const component = { template: '<main />' };
  const router = createRouter({ history: createMemoryHistory(), routes: [
    '/', '/project/:id/calendar', '/document/:id', '/calendar', '/knowledge-base', '/knowledge-base/:id', '/relationships',
    '/datasets', '/bibliography', '/settings', '/profile', '/admin/users', '/login',
  ].map((path) => ({ path, component })) });
  const pinia = createPinia();
  if (withProject) useProjectStore(pinia).setCurrentProject(project);
  useFeatureStore(pinia).setBackendFeatures(features);
  const auth = useAuthStore(pinia);
  if (signedIn) {
    auth.authRequired = true;
    auth.user = { ...user, permissions: { 'user-management': admin } };
  }
  await router.push(path);
  render(Topbar, { global: { plugins: [router, pinia], stubs: {
    WorkspaceSelector: true, SyncIndicator: true,
    Avatar: { props: ['displayName'], template: '<span>{{ displayName }}</span>' },
  } } });
  return { router, auth };
}

beforeEach(() => {
  localStorage.clear();
  const { showAssistant, showNotesPanel, quickNoteRequested } = useGlobalKeyboard();
  showAssistant.value = false;
  showNotesPanel.value = false;
  quickNoteRequested.value = 0;
  useFavoritesPanel().showFavoritesPanel.value = false;
  useTaskPanel().showTaskPanel.value = false;
});

afterEach(() => vi.restoreAllMocks());

describe('top bar navigation', () => {
  it('limits navigation to enabled sections and marks a nested knowledge route active', async () => {
    const { router } = await openTopbar({ path: '/knowledge-base/17', features: { datasets: false, relationships: false, bibliography: false } });
    const knowledge = button('Knowledge');
    expect(knowledge.classList.contains('topbar-nav-link--active')).toBe(true);
    await fireEvent.click(knowledge);
    expect(knowledge.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    expect(screen.getByRole('menuitem', { name: /Knowledge base/ }).classList.contains('topbar-menu-item--active')).toBe(true);

    await fireEvent.keyDown(document.body, { key: 'Tab' });
    expect(screen.getByRole('menu')).toBeTruthy();
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    await fireEvent.click(knowledge);
    await fireEvent.click(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
    await fireEvent.click(knowledge);
    await router.push('/document/4');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('link', { name: 'Projects' }).classList.contains('topbar-nav-link--active')).toBe(true);
  });

  it('links to the selected project calendar and toggles project tools', async () => {
    await openTopbar({ withProject: true, path: '/project/11/calendar' });
    const calendar = screen.getByRole('link', { name: 'Calendar' });
    expect(calendar.getAttribute('href')).toBe('/project/11/calendar');
    expect(calendar.classList.contains('topbar-nav-link--active')).toBe(true);
    await fireEvent.click(button('Note'));
    expect(useGlobalKeyboard().showNotesPanel.value).toBe(true);
    expect(useGlobalKeyboard().quickNoteRequested.value).toBe(1);
    await fireEvent.click(button('Tasks'));
    expect(useTaskPanel().showTaskPanel.value).toBe(true);
    await fireEvent.click(button('Favorites'));
    expect(useFavoritesPanel().showFavoritesPanel.value).toBe(true);
    await fireEvent.click(button('Assistant'));
    expect(useGlobalKeyboard().showAssistant.value).toBe(true);
    await fireEvent.click(button('Assistant'));
    expect(useGlobalKeyboard().showAssistant.value).toBe(false);
  });

  it('shows the regular calendar and keeps project actions hidden when no project is selected', async () => {
    await openTopbar({ features: { knowledge_base: false, relationships: false, datasets: false, bibliography: false } });
    expect(screen.getByRole('link', { name: 'Calendar' }).getAttribute('href')).toBe('/calendar');
    expect(screen.queryByRole('button', { name: 'Knowledge' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Favorites' })).toBeNull();
  });

  it.each([false, true])('limits user management by permission and sends the user to login on sign-out (admin: %s)', async (admin) => {
    const { router, auth } = await openTopbar({ signedIn: true, admin });
    const logout = vi.spyOn(auth, 'logout');
    await fireEvent.click(button('Knowledge'));
    await fireEvent.click(button('Sarah Reader'));
    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(screen.getByRole('link', { name: 'Profile' }).getAttribute('href')).toBe('/profile');
    expect(Boolean(screen.queryByRole('link', { name: 'User management' }))).toBe(admin);
    await fireEvent.click(button('Sign out'));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/login'));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(auth.user).toBeNull();
  });
});
