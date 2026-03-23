<template>
    <BrowserNavbar v-model:url="currentUrl" @navigate="navigateToUrl" @extract="extractContent"
        @back="goBack" @forward="goForward" @reload="reload" />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import BrowserNavbar from '../components/browser/BrowserNavbar.vue';

const currentUrl = ref('');
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

const goBack = () => window.electronAPI.navigateTo('__action:goBack');
const goForward = () => window.electronAPI.navigateTo('__action:goForward');
const reload = () => window.electronAPI.navigateTo('__action:reload');

const extractContent = async () => {
    await window.electronAPI.extractContent(projectId.value);
};

onMounted(async () => {
    if (window.electronAPI?.getSettings) {
        const settings = await window.electronAPI.getSettings();
        if (settings?.defaultBrowserUrl) {
            currentUrl.value = settings.defaultBrowserUrl;
        }
    }

    window.electronAPI.onUrlChange((newUrl) => {
        currentUrl.value = newUrl;
    });

    window.electronAPI.onProjectIdChange((projectIdSent) => {
        projectId.value = projectIdSent;
    });
});
</script>
