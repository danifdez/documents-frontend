<template>
  <div class="h-full overflow-y-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-semibold text-text-primary">User Management</h1>
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
            <th class="px-4 py-3">Role</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Permissions</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="u in users" :key="u.id" class="hover:bg-surface-hover transition-colors">
            <td class="px-4 py-3 text-sm text-text-primary font-medium">{{ u.username }}</td>
            <td class="px-4 py-3 text-sm text-text-secondary">{{ u.displayName || '-' }}</td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="u.role === 'admin' ? 'bg-accent/10 text-accent' : 'bg-surface text-text-secondary'">
                {{ u.role }}
              </span>
            </td>
            <td class="px-4 py-3">
              <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                :class="u.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'">
                {{ u.active ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-4 py-3 text-xs text-text-muted">
              {{ u.role === 'admin' ? 'All' : formatPermissions(u.permissions) }}
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

    <!-- Create / Edit Modal -->
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

          <FormField label="Role" v-model="form.role" type="select" :options="[{ label: 'User', value: 'user' }, { label: 'Admin', value: 'admin' }]" />

          <div v-if="form.role !== 'admin'">
            <label class="block text-sm font-medium text-text-secondary mb-2">Permissions</label>
            <div class="grid grid-cols-2 gap-2">
              <label v-for="perm in allPermissions" :key="perm" class="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input type="checkbox" v-model="form.permissions[perm]" class="rounded border-border accent-accent" />
                {{ perm }}
              </label>
            </div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import apiClient from '../services/api';
import FormField from '../components/ui/FormField.vue';

const allPermissions = [
  'ask', 'summarize', 'translate', 'entity-extraction',
  'key-points', 'keywords', 'projects', 'upload', 'export',
];

interface User {
  id: number;
  username: string;
  displayName: string | null;
  role: string;
  permissions: Record<string, boolean>;
  active: boolean;
}

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
  role: 'user',
  permissions: {} as Record<string, boolean>,
});

function resetForm() {
  form.username = '';
  form.password = '';
  form.displayName = '';
  form.role = 'user';
  form.permissions = {};
  allPermissions.forEach((p) => (form.permissions[p] = true));
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
  form.role = u.role;
  form.permissions = { ...u.permissions };
}

function formatPermissions(perms: Record<string, boolean>): string {
  const enabled = Object.entries(perms).filter(([, v]) => v).map(([k]) => k);
  if (enabled.length === 0) return 'None';
  if (enabled.length === allPermissions.length) return 'All';
  return enabled.join(', ');
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
    if (editingUser.value) {
      const payload: Record<string, any> = {
        displayName: form.displayName,
        role: form.role,
        permissions: form.role === 'admin' ? {} : form.permissions,
      };
      if (form.password) payload.password = form.password;
      await apiClient.patch(`/users/${editingUser.value.id}`, payload);
    } else {
      await apiClient.post('/users', {
        username: form.username,
        password: form.password,
        displayName: form.displayName,
        role: form.role,
        permissions: form.role === 'admin' ? {} : form.permissions,
      });
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

onMounted(() => {
  resetForm();
  loadUsers();
});
</script>
