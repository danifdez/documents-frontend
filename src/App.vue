<template>
  <MainLayout>
    <div class="flex-1 flex flex-col min-h-0 overflow-hidden pr-3 pl-3">
      <router-view class="flex-1 min-h-0 overflow-hidden" />
    </div>
    <GlobalSearchModal :show="showGlobalSearch" @close="showGlobalSearch = false" />
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import MainLayout from './layout/MainLayout.vue';
import GlobalSearchModal from './components/GlobalSearchModal.vue';
import { useGlobalKeyboard } from './composables/useGlobalKeyboard';
import socket from './services/notifications/notification';
import { useRouter } from 'vue-router';
import { useNotification } from './composables/useNotification';

const notification = useNotification();
const router = useRouter();
const { showGlobalSearch } = useGlobalKeyboard();

onMounted(() => {
  socket.connect();
  socket.on('connect', () => {
    console.log('Connected to server');
  });
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  socket.on('notification', (data) => {
    notification.info('Resource extracted', {
      link: {
        text: 'View resource',
        url: `/resource/${data.resourceId}`,
        onClick: () => {
          router.push(`/resource/${data.resourceId}`);
        }
      }
    });
  });
});
</script>