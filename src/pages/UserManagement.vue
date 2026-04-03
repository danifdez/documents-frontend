<template>
  <div class="h-full overflow-y-auto">
    <!-- Tabs -->
    <div class="flex items-center gap-6 mb-6 border-b border-border">
      <button @click="activeTab = 'users'"
        :class="['pb-2 text-sm font-medium transition-colors cursor-pointer', activeTab === 'users' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-secondary']">
        Users
      </button>
      <button @click="activeTab = 'groups'"
        :class="['pb-2 text-sm font-medium transition-colors cursor-pointer', activeTab === 'groups' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-secondary']">
        Groups
      </button>
    </div>

    <!-- ═══ USERS TAB ═══ -->
    <div v-if="activeTab === 'users'">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-semibold text-text-primary">Users</h1>
        <button @click="showCreateModal = true"
          class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer">
          Create User
        </button>
      </div>

      <div v-if="isLoading" class="text-text-muted text-sm">Loading users...</div>

      <div v-else class="border border-border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-surface">
            <tr class="text-left text-xs font-medium text-text-muted uppercase tracking-wider">
              <th class="px-4 py-3">Username</th>
              <th class="px-4 py-3">Display Name</th>
              <th class="px-4 py-3">Group</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Permissions</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="u in users" :key="u.id" class="hover:bg-surface-hover transition-colors">
              <td class="px-4 py-3 text-sm text-text-primary font-medium">{{ u.username }}</td>
              <td class="px-4 py-3 text-sm text-text-secondary">{{ u.displayName || '-' }}</td>
              <td class="px-4 py-3 text-sm text-text-secondary">{{ getGroupName(u.groupId) }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="u.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'">
                  {{ u.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-text-muted">
                {{ formatPermissions(u.permissions) }}
              </td>
              <td class="px-4 py-3 text-right">
                <button @click="editUser(u)" class="text-sm text-accent hover:underline cursor-pointer mr-3">Edit</button>
                <button v-if="u.active" @click="deactivateUser(u.id)" class="text-sm text-red-500 hover:underline cursor-pointer">Deactivate</button>
                <button v-else @click="activateUser(u.id)" class="text-sm text-green-600 hover:underline cursor-pointer">Activate</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ GROUPS TAB ═══ -->
    <div v-if="activeTab === 'groups'">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-semibold text-text-primary">Permission Groups</h1>
        <button @click="showGroupModal = true"
          class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer">
          Create Group
        </button>
      </div>

      <div v-if="isLoadingGroups" class="text-text-muted text-sm">Loading groups...</div>

      <div v-else-if="groups.length === 0" class="text-text-muted text-sm">
        No groups created yet. Groups let you define a set of permissions and assign them to multiple users at once.
      </div>

      <div v-else class="grid gap-4">
        <div v-for="g in groups" :key="g.id"
          class="border border-border rounded-lg p-4 hover:bg-surface-hover transition-colors">
          <div class="flex items-start justify-between mb-2">
            <div>
              <h3 class="text-sm font-medium text-text-primary">{{ g.name }}</h3>
              <p v-if="g.description" class="text-xs text-text-muted mt-0.5">{{ g.description }}</p>
            </div>
            <div class="flex gap-2">
              <button @click="editGroup(g)" class="text-sm text-accent hover:underline cursor-pointer">Edit</button>
              <button @click="removeGroup(g.id)" class="text-sm text-red-500 hover:underline cursor-pointer">Delete</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span v-for="perm in enabledPermissions(g.permissions)" :key="perm"
              class="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
              {{ perm }}
            </span>
            <span v-if="enabledPermissions(g.permissions).length === 0" class="text-xs text-text-muted">No permissions</span>
          </div>
          <div class="text-xs text-text-muted mt-2">
            {{ countUsersInGroup(g.id) }} user{{ countUsersInGroup(g.id) !== 1 ? 's' : '' }}
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ CREATE / EDIT USER MODAL ═══ -->
    <div v-if="showCreateModal || editingUser" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeModal">
      <div class="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">
          {{ editingUser ? 'Edit User' : 'Create User' }}
        </h2>

        <form @submit.prevent="submitForm" class="flex flex-col gap-4">
          <div v-if="!editingUser">
            <FormField label="Username" v-model="form.username" required />
          </div>

          <FormField :label="editingUser ? 'New Password (leave empty to keep)' : 'Password'" v-model="form.password" type="password" :required="!editingUser" />

          <FormField label="Display Name" v-model="form.displayName" />

          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Group</label>
            <select v-model="form.groupId"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-1 focus:ring-accent">
              <option :value="null">No group (manual permissions)</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>

          <div v-if="!form.groupId">
            <label class="block text-sm font-medium text-text-secondary mb-2">Permissions</label>
            <div class="grid grid-cols-2 gap-2">
              <label v-for="perm in allPermissions" :key="perm" class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" v-model="form.permissions[perm]" class="rounded border-border accent-accent" />
                {{ perm }}
              </label>
            </div>
          </div>

          <div v-if="form.groupId" class="text-xs text-text-muted bg-surface-elevated rounded-lg px-3 py-2">
            Permissions are managed by the group. Assigned: {{ formatPermissions(getGroupPermissions(form.groupId)) }}
          </div>

          <div v-if="formError" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {{ formError }}
          </div>

          <div class="flex justify-end gap-3 mt-2">
            <button type="button" @click="closeModal"
              class="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" :disabled="isSubmitting"
              class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 cursor-pointer">
              {{ isSubmitting ? 'Saving...' : (editingUser ? 'Save Changes' : 'Create User') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ═══ CREATE / EDIT GROUP MODAL ═══ -->
    <div v-if="showGroupModal || editingGroup" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closeGroupModal">
      <div class="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">
          {{ editingGroup ? 'Edit Group' : 'Create Group' }}
        </h2>

        <form @submit.prevent="submitGroupForm" class="flex flex-col gap-4">
          <FormField label="Name" v-model="groupForm.name" required />
          <FormField label="Description" v-model="groupForm.description" />

          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Permissions</label>
            <div class="grid grid-cols-2 gap-2">
              <label v-for="perm in allPermissions" :key="perm" class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" v-model="groupForm.permissions[perm]" class="rounded border-border accent-accent" />
                {{ perm }}
              </label>
            </div>
          </div>

          <div v-if="editingGroup" class="text-xs text-text-muted bg-surface-elevated rounded-lg px-3 py-2">
            Updating permissions will apply to all {{ countUsersInGroup(editingGroup.id) }} user{{ countUsersInGroup(editingGroup.id) !== 1 ? 's' : '' }} in this group.
          </div>

          <div v-if="groupFormError" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
            {{ groupFormError }}
          </div>

          <div class="flex justify-end gap-3 mt-2">
            <button type="button" @click="closeGroupModal"
              class="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" :disabled="isGroupSubmitting"
              class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 cursor-pointer">
              {{ isGroupSubmitting ? 'Saving...' : (editingGroup ? 'Save Changes' : 'Create Group') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import apiClient from '../services/api';
import FormField from '../components/ui/FormField.vue';

const allPermissions = [
  // AI features
  'ask', 'summarize', 'translate', 'entity-extraction',
  'key-points', 'keywords', 'image-generate',
  // Core data
  'projects', 'documents', 'upload', 'export', 'write', 'delete',
  // Features
  'canvas', 'datasets', 'notes', 'calendar',
  'timelines', 'knowledge-base', 'bibliography', 'relationships', 'tasks',
  // Administration
  'user-management',
];

interface User {
  id: number;
  username: string;
  displayName: string | null;
  permissions: Record<string, boolean>;
  groupId: number | null;
  active: boolean;
}

interface PermissionGroup {
  id: number;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
}

const activeTab = ref<'users' | 'groups'>('users');

// ── Users state ──
const users = ref<User[]>([]);
const isLoading = ref(false);
const showCreateModal = ref(false);
const editingUser = ref<User | null>(null);
const isSubmitting = ref(false);
const formError = ref('');

const form = reactive({
  username: '',
  password: '',
  displayName: '',
  groupId: null as number | null,
  permissions: {} as Record<string, boolean>,
});

// ── Groups state ──
const groups = ref<PermissionGroup[]>([]);
const isLoadingGroups = ref(false);
const showGroupModal = ref(false);
const editingGroup = ref<PermissionGroup | null>(null);
const isGroupSubmitting = ref(false);
const groupFormError = ref('');

const groupForm = reactive({
  name: '',
  description: '',
  permissions: {} as Record<string, boolean>,
});

// ── Helpers ──

function getGroupName(groupId: number | null): string {
  if (!groupId) return '-';
  const g = groups.value.find((g) => g.id === groupId);
  return g ? g.name : '-';
}

function getGroupPermissions(groupId: number | null): Record<string, boolean> {
  if (!groupId) return {};
  const g = groups.value.find((g) => g.id === groupId);
  return g ? g.permissions : {};
}

function enabledPermissions(perms: Record<string, boolean>): string[] {
  return Object.entries(perms).filter(([, v]) => v).map(([k]) => k);
}

function countUsersInGroup(groupId: number): number {
  return users.value.filter((u) => u.groupId === groupId).length;
}

function formatPermissions(perms: Record<string, boolean>): string {
  const enabled = enabledPermissions(perms);
  if (enabled.length === 0) return 'None';
  if (enabled.length === allPermissions.length) return 'All';
  return enabled.join(', ');
}

// ── Users CRUD ──

function resetForm() {
  form.username = '';
  form.password = '';
  form.displayName = '';
  form.groupId = null;
  form.permissions = {};
  allPermissions.forEach((p) => (form.permissions[p] = false));
  formError.value = '';
}

function closeModal() {
  showCreateModal.value = false;
  editingUser.value = null;
  resetForm();
}

function editUser(u: User) {
  editingUser.value = u;
  form.username = u.username;
  form.password = '';
  form.displayName = u.displayName || '';
  form.groupId = u.groupId;
  form.permissions = { ...u.permissions };
}

async function loadUsers() {
  isLoading.value = true;
  try {
    const { data } = await apiClient.get('/users');
    users.value = data;
  } catch (err: any) {
    console.error('Failed to load users:', err);
  } finally {
    isLoading.value = false;
  }
}

async function submitForm() {
  isSubmitting.value = true;
  formError.value = '';

  try {
    const payload: Record<string, any> = {
      displayName: form.displayName,
      groupId: form.groupId,
    };
    if (!form.groupId) {
      payload.permissions = form.permissions;
    }
    if (form.password) payload.password = form.password;

    if (editingUser.value) {
      await apiClient.patch(`/users/${editingUser.value.id}`, payload);
    } else {
      payload.username = form.username;
      payload.password = form.password;
      await apiClient.post('/users', payload);
    }
    closeModal();
    await loadUsers();
  } catch (err: any) {
    formError.value = err.response?.data?.message || 'Operation failed';
  } finally {
    isSubmitting.value = false;
  }
}

async function deactivateUser(id: number) {
  await apiClient.delete(`/users/${id}`);
  await loadUsers();
}

async function activateUser(id: number) {
  await apiClient.patch(`/users/${id}`, { active: true });
  await loadUsers();
}

// ── Groups CRUD ──

function resetGroupForm() {
  groupForm.name = '';
  groupForm.description = '';
  groupForm.permissions = {};
  allPermissions.forEach((p) => (groupForm.permissions[p] = false));
  groupFormError.value = '';
}

function closeGroupModal() {
  showGroupModal.value = false;
  editingGroup.value = null;
  resetGroupForm();
}

function editGroup(g: PermissionGroup) {
  editingGroup.value = g;
  groupForm.name = g.name;
  groupForm.description = g.description || '';
  groupForm.permissions = {};
  allPermissions.forEach((p) => (groupForm.permissions[p] = !!g.permissions[p]));
}

async function loadGroups() {
  isLoadingGroups.value = true;
  try {
    const { data } = await apiClient.get('/groups');
    groups.value = data;
  } catch (err: any) {
    console.error('Failed to load groups:', err);
  } finally {
    isLoadingGroups.value = false;
  }
}

async function submitGroupForm() {
  isGroupSubmitting.value = true;
  groupFormError.value = '';

  try {
    if (editingGroup.value) {
      await apiClient.patch(`/groups/${editingGroup.value.id}`, {
        name: groupForm.name,
        description: groupForm.description,
        permissions: groupForm.permissions,
      });
    } else {
      await apiClient.post('/groups', {
        name: groupForm.name,
        description: groupForm.description,
        permissions: groupForm.permissions,
      });
    }
    closeGroupModal();
    await Promise.all([loadGroups(), loadUsers()]);
  } catch (err: any) {
    groupFormError.value = err.response?.data?.message || 'Operation failed';
  } finally {
    isGroupSubmitting.value = false;
  }
}

async function removeGroup(id: number) {
  await apiClient.delete(`/groups/${id}`);
  await Promise.all([loadGroups(), loadUsers()]);
}

// ── Init ──

onMounted(async () => {
  resetForm();
  resetGroupForm();
  await Promise.all([loadUsers(), loadGroups()]);
});
</script>
