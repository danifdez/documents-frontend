<template>
  <div class="h-full overflow-y-auto">
    <h1 class="text-xl font-semibold text-text-primary mb-6">Profile</h1>

    <div class="flex gap-6">
      <!-- Left column: info -->
      <div class="flex-1 flex flex-col gap-6">
        <!-- Profile photo -->
        <div class="border border-border rounded-lg p-4">
          <div class="text-xs text-text-muted uppercase tracking-wider mb-3">Profile Photo</div>
          <div class="flex items-center gap-4">
            <Avatar
              :key="avatarVersion"
              :user-id="user?.id"
              :avatar-path="user?.avatarPath"
              :display-name="user?.displayName"
              :username="user?.username"
              size="xl"
            />
            <div class="flex flex-col gap-2">
              <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onFileSelected" />
              <button type="button" @click="fileInput?.click()" :disabled="isUploadingAvatar"
                class="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 cursor-pointer">
                {{ isUploadingAvatar ? 'Uploading...' : (user?.avatarPath ? 'Change photo' : 'Upload photo') }}
              </button>
              <button v-if="user?.avatarPath" type="button" @click="removeAvatar" :disabled="isUploadingAvatar"
                class="px-3 py-1.5 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-50 cursor-pointer">
                Remove photo
              </button>
              <p class="text-xs text-text-muted">PNG, JPEG, WEBP or GIF. Max 5 MB.</p>
            </div>
          </div>
          <div v-if="avatarMessage" class="text-sm rounded-lg px-3 py-2 mt-3"
            :class="avatarError ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-green-600 bg-green-50 dark:bg-green-900/20'">
            {{ avatarMessage }}
          </div>
        </div>

        <!-- Account -->
        <div class="border border-border rounded-lg p-4">
          <div class="text-xs text-text-muted uppercase tracking-wider mb-3">Account</div>
          <div class="flex flex-col gap-2">
            <div class="flex justify-between text-sm">
              <span class="text-text-muted">Username</span>
              <span class="text-text-primary font-medium">{{ user?.username }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-text-muted">Group</span>
              <span class="text-text-primary">{{ groupName }}</span>
            </div>
          </div>
        </div>

        <!-- Display name -->
        <form @submit.prevent="saveProfile" class="border border-border rounded-lg p-4 flex flex-col gap-4">
          <div class="text-xs text-text-muted uppercase tracking-wider">Display Name</div>
          <FormField label="" v-model="displayName" placeholder="Your display name" />
          <div class="flex justify-end">
            <button type="submit" :disabled="isSavingProfile"
              class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 cursor-pointer">
              {{ isSavingProfile ? 'Saving...' : 'Save' }}
            </button>
          </div>
          <div v-if="profileMessage" class="text-sm rounded-lg px-3 py-2"
            :class="profileError ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-green-600 bg-green-50 dark:bg-green-900/20'">
            {{ profileMessage }}
          </div>
        </form>

        <!-- Permissions -->
        <div class="border border-border rounded-lg p-4">
          <div class="text-xs text-text-muted uppercase tracking-wider mb-3">Permissions</div>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="perm in activePermissions" :key="perm"
              class="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent">
              {{ perm }}
            </span>
            <span v-if="activePermissions.length === 0" class="text-xs text-text-muted">No permissions assigned</span>
          </div>
        </div>
      </div>

      <!-- Right column: password -->
      <div class="flex-1 flex flex-col gap-6">
        <!-- Password change -->
        <form @submit.prevent="changePassword" class="border border-border rounded-lg p-4 flex flex-col gap-4">
          <div class="text-xs text-text-muted uppercase tracking-wider">Change Password</div>
          <FormField label="Current Password" v-model="currentPassword" type="password" required />
          <FormField label="New Password" v-model="newPassword" type="password" required />
          <FormField label="Confirm New Password" v-model="confirmPassword" type="password" required />
          <div class="flex justify-end">
            <button type="submit" :disabled="isSavingPassword"
              class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 cursor-pointer">
              {{ isSavingPassword ? 'Saving...' : 'Change Password' }}
            </button>
          </div>
          <div v-if="passwordMessage" class="text-sm rounded-lg px-3 py-2"
            :class="passwordError ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-green-600 bg-green-50 dark:bg-green-900/20'">
            {{ passwordMessage }}
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import apiClient from '../services/api';
import FormField from '../components/ui/FormField.vue';
import Avatar from '../components/ui/Avatar.vue';
import { useAuthStore } from '../store/authStore';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const activePermissions = computed(() => {
  const perms = user.value?.permissions || {};
  return Object.entries(perms).filter(([, v]) => v).map(([k]) => k).sort();
});

const displayName = ref('');
const groupName = ref('-');

const isSavingProfile = ref(false);
const profileMessage = ref('');
const profileError = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);
const isUploadingAvatar = ref(false);
const avatarMessage = ref('');
const avatarError = ref(false);
const avatarVersion = ref(0);

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  isUploadingAvatar.value = true;
  avatarMessage.value = '';

  try {
    const fd = new FormData();
    fd.append('avatar', file);
    const { data } = await apiClient.post('/auth/me/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    authStore.user = data;
    avatarVersion.value++;
    avatarMessage.value = 'Photo updated';
    avatarError.value = false;
  } catch (err: any) {
    avatarMessage.value = err.response?.data?.message || 'Failed to upload photo';
    avatarError.value = true;
  } finally {
    isUploadingAvatar.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

async function removeAvatar() {
  isUploadingAvatar.value = true;
  avatarMessage.value = '';

  try {
    await apiClient.delete('/auth/me/avatar');
    if (authStore.user) authStore.user = { ...authStore.user, avatarPath: null };
    avatarVersion.value++;
    avatarMessage.value = 'Photo removed';
    avatarError.value = false;
  } catch (err: any) {
    avatarMessage.value = err.response?.data?.message || 'Failed to remove photo';
    avatarError.value = true;
  } finally {
    isUploadingAvatar.value = false;
  }
}

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const isSavingPassword = ref(false);
const passwordMessage = ref('');
const passwordError = ref(false);

async function loadProfile() {
  try {
    const { data } = await apiClient.get('/auth/me');
    authStore.user = data;
    displayName.value = data.displayName || '';

    if (data.groupId) {
      try {
        const { data: group } = await apiClient.get(`/groups/${data.groupId}`);
        groupName.value = group.name;
      } catch {
        groupName.value = '-';
      }
    }
  } catch { /* auth interceptor handles redirect */ }
}

async function saveProfile() {
  isSavingProfile.value = true;
  profileMessage.value = '';

  try {
    const { data } = await apiClient.patch('/auth/me', { displayName: displayName.value });
    authStore.user = data;
    profileMessage.value = 'Profile updated';
    profileError.value = false;
  } catch (err: any) {
    profileMessage.value = err.response?.data?.message || 'Failed to update profile';
    profileError.value = true;
  } finally {
    isSavingProfile.value = false;
  }
}

async function changePassword() {
  passwordMessage.value = '';

  if (newPassword.value !== confirmPassword.value) {
    passwordMessage.value = 'New passwords do not match';
    passwordError.value = true;
    return;
  }

  if (newPassword.value.length < 4) {
    passwordMessage.value = 'Password must be at least 4 characters';
    passwordError.value = true;
    return;
  }

  isSavingPassword.value = true;

  try {
    await apiClient.patch('/auth/me', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    passwordMessage.value = 'Password changed successfully';
    passwordError.value = false;
  } catch (err: any) {
    passwordMessage.value = err.response?.data?.message || 'Failed to change password';
    passwordError.value = true;
  } finally {
    isSavingPassword.value = false;
  }
}

onMounted(loadProfile);
</script>
