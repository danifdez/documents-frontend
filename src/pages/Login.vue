<template>
  <div class="min-h-screen flex items-center justify-center bg-surface">
    <div class="w-full max-w-sm p-8 rounded-2xl border border-border bg-surface shadow-lg">
      <div class="flex items-center justify-center mb-8">
        <div class="w-10 h-10 rounded-lg bg-accent flex items-center justify-center text-white font-semibold text-lg">
          D
        </div>
        <span class="ml-3 text-xl font-semibold text-text-primary tracking-tight">Documents</span>
      </div>

      <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
        <FormField label="Username" v-model="username" required placeholder="Enter your username" />
        <FormField label="Password" v-model="password" type="password" required placeholder="Enter your password" />

        <div v-if="errorMessage" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {{ errorMessage }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-medium
                 hover:bg-accent/90 transition-colors duration-200
                 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {{ isLoading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import FormField from '../components/ui/FormField.vue';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

async function handleLogin() {
  errorMessage.value = '';
  isLoading.value = true;
  try {
    await authStore.login(username.value, password.value);
    router.push('/');
  } catch (err: any) {
    errorMessage.value = err.response?.data?.message || 'Invalid credentials';
  } finally {
    isLoading.value = false;
  }
}
</script>
