<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="closable && $emit('close')">
    <div class="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-sm p-6">
      <h2 class="text-lg font-semibold text-text-primary mb-4">
        {{ editing ? 'Edit Workspace' : 'Add Workspace' }}
      </h2>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <FormField label="Name" v-model="name" required placeholder="My Server" />
        <FormField label="Server URL" v-model="url" type="url" required placeholder="http://192.168.1.100:3000" />

        <button type="button" @click="testConnection" :disabled="testing || !url"
          class="w-full py-2 rounded-lg border border-border text-sm font-medium transition-colors cursor-pointer"
          :class="testResult === 'ok' ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20'
                 : testResult === 'fail' ? 'border-red-500 text-red-500 bg-red-50 dark:bg-red-900/20'
                 : 'text-text-secondary hover:bg-surface-hover'">
          <span v-if="testing">Testing...</span>
          <span v-else-if="testResult === 'ok'">Connected</span>
          <span v-else-if="testResult === 'fail'">Connection failed</span>
          <span v-else>Test Connection</span>
        </button>

        <div v-if="error" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {{ error }}
        </div>

        <div class="flex justify-end gap-3 mt-2">
          <button v-if="closable" type="button" @click="$emit('close')"
            class="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="submit"
            class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer">
            {{ editing ? 'Save' : 'Add' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import type { Workspace } from '../types/Workspace';
import FormField from './ui/FormField.vue';

const props = withDefaults(defineProps<{
  workspace?: Workspace | null;
  closable?: boolean;
}>(), {
  closable: true,
});

const emit = defineEmits<{
  close: [];
  save: [{ name: string; url: string }];
}>();

const editing = !!props.workspace;
const name = ref(props.workspace?.name || '');
const url = ref(props.workspace?.url || '');
const testing = ref(false);
const testResult = ref<'ok' | 'fail' | null>(null);
const error = ref('');

async function testConnection() {
  testing.value = true;
  testResult.value = null;
  try {
    await axios.get(`${url.value}/auth/status`, { timeout: 5000 });
    testResult.value = 'ok';
  } catch {
    testResult.value = 'fail';
  } finally {
    testing.value = false;
  }
}

function handleSubmit() {
  if (!name.value.trim() || !url.value.trim()) return;
  // Remove trailing slash
  const cleanUrl = url.value.replace(/\/+$/, '');
  emit('save', { name: name.value.trim(), url: cleanUrl });
}

onMounted(() => {
  if (props.workspace) {
    name.value = props.workspace.name;
    url.value = props.workspace.url;
  }
});
</script>
