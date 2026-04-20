<template>
  <div
    class="rounded-full overflow-hidden flex items-center justify-center shrink-0 select-none"
    :class="[sizeClass, !imageUrl ? 'bg-accent/20 text-accent' : '']"
    :title="title"
  >
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="title || 'avatar'"
      class="w-full h-full object-cover"
      @error="onImageError"
    />
    <span v-else class="font-semibold" :class="textClass">{{ initials }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import apiClient from '../../services/api';

interface Props {
  userId?: number | null;
  avatarPath?: string | null;
  displayName?: string | null;
  username?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
});

const imageUrl = ref<string | null>(null);

const initials = computed(() => {
  const name = props.displayName || props.username || '?';
  return name.slice(0, 2).toUpperCase();
});

const title = computed(() => props.displayName || props.username || '');

const sizeClass = computed(() => ({
  xs: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
}[props.size]));

const textClass = computed(() => ({
  xs: 'text-[9px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-2xl',
}[props.size]));

async function loadAvatar() {
  revokeUrl();

  if (!props.userId || !props.avatarPath) {
    imageUrl.value = null;
    return;
  }

  try {
    const { data } = await apiClient.get(`/users/${props.userId}/avatar`, {
      responseType: 'blob',
    });
    imageUrl.value = URL.createObjectURL(data);
  } catch {
    imageUrl.value = null;
  }
}

function revokeUrl() {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
    imageUrl.value = null;
  }
}

function onImageError() {
  revokeUrl();
}

watch(
  () => [props.userId, props.avatarPath],
  () => loadAvatar(),
  { immediate: true },
);

onUnmounted(revokeUrl);
</script>
