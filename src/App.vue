<template>
  <MainLayout>
    <div class="container mx-auto p-1">
      <router-view></router-view>
    </div>
    <GlobalSearchModal ref="globalSearchModalRef" />
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import MainLayout from './components/layout/MainLayout.vue';
import GlobalSearchModal from './components/GlobalSearchModal.vue';
import { useGlobalSearchModal } from './composables/useGlobalSearchModal';
import socket from './services/notifications/notification';
import { useRouter } from 'vue-router';
import { useNotification } from './composables/useNotification';

const notification = useNotification();
const router = useRouter();
const globalSearchModalRef = ref();
useGlobalSearchModal(globalSearchModalRef);

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