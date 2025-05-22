<template>
    <div class="flex flex-row items-center p-2.5 bg-gray-100 border-b border-gray-300 w-full box-border">
        <div class="flex flex-1 w-full">
            <input type="text"
                class="flex-grow py-2 px-3 text-sm border border-gray-300 rounded-l-md outline-none focus:border-blue-500 focus:shadow-outline-blue w-full"
                placeholder="Enter URL" v-model="currentUrl" @keyup.enter="navigateToUrl" />
            <Button @click="navigateToUrl">Go</Button>
            <Button @click="extractContent">Extract</Button>
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
