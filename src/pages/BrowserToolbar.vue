<template>
    <div class="flex flex-row items-center p-3 bg-white w-full">
        <div class="flex flex-1 w-full gap-2 items-center">
            <input type="text"
                class="flex-grow py-2 px-4 text-base border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-150 w-full shadow-sm"
                placeholder="Enter URL" v-model="currentUrl" @keyup.enter="navigateToUrl" />
            <Button @click="navigateToUrl"
                class="ml-1 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md px-4 py-2 transition-colors duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300">Go</Button>
            <Button @click="extractContent"
                class="ml-1 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md px-4 py-2 transition-colors duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-300">Extract</Button>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Button from '../components/ui/Button.vue';

const currentUrl = ref('https://github.com/electron/electron');
const projectId = ref(null);

const navigateToUrl = () => {
    if (!currentUrl.value) return;

    let url = currentUrl.value;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    window.electronAPI.navigateTo(url)
        .then(success => {
            if (!success) {
                console.error('Failed to navigate to URL');
            }
        })
        .catch(error => {
            console.error('Error navigating to URL:', error);
        });
};

const extractContent = async () => {
    await window.electronAPI.extractContent(projectId.value);
}

onMounted(() => {
    window.electronAPI.onUrlChange((newUrl) => {
        currentUrl.value = newUrl;
    });

    window.electronAPI.onProjectIdChange((projectIdSent) => {
        projectId.value = projectIdSent;
    });
});
</script>
