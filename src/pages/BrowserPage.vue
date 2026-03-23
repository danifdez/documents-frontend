<template>
    <div class="flex flex-col h-screen bg-surface">
        <BrowserNavbar v-model:url="currentUrl" @navigate="navigateToUrl" @extract="extractContent"
            @back="goBack" @forward="goForward" @reload="doReload" />

        <!-- Web content -->
        <webview ref="webviewRef" :src="initialUrl" :partition="`persist:browser-${partitionKey}`"
            class="flex-1 border-none" />

        <!-- Send to doc modal -->
        <SendToDocModal :is-open="showSendToDocModal" :selected-text="selectedText" :project-id="projectId ? Number(projectId) : null"
            @close="showSendToDocModal = false" @send-to-existing="handleSendToExistingDoc"
            @create-new-doc="handleCreateNewDoc" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import BrowserNavbar from '../components/browser/BrowserNavbar.vue';
import SendToDocModal from '../components/contents/SendToDocModal.vue';
import apiClient from '../services/api';

const route = useRoute();
const projectId = route.params.id || null;
const partitionKey = projectId || 'global';
const initialUrl = 'https://github.com/electron/electron';
const currentUrl = ref(initialUrl);
const webviewRef = ref(null);

const selectedText = ref('');
const showSendToDocModal = ref(false);

const goBack = () => webviewRef.value?.goBack();
const goForward = () => webviewRef.value?.goForward();
const doReload = () => webviewRef.value?.reload();

const navigateToUrl = () => {
    if (!currentUrl.value || !webviewRef.value) return;

    let url = currentUrl.value;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    webviewRef.value.loadURL(url);
};

const extractContent = async () => {
    const wv = webviewRef.value;
    if (!wv) return;

    try {
        const content = await wv.executeJavaScript('document.documentElement.outerHTML');
        const title = await wv.executeJavaScript('document.title');
        const url = wv.getURL();
        await window.electronAPI.extractWebpage({ content, title, url, projectId });
    } catch (error) {
        console.error('Error extracting content:', error);
    }
};

// Show native context menu when text is selected in webview
const handleWebviewContextMenu = async (event) => {
    const params = event.params ?? event;
    const text = (params.selectionText ?? '').trim();
    if (!text) return;

    const action = await window.electronAPI.showSelectionContextMenu();
    if (action === 'send-to-doc') {
        selectedText.value = text;
        showSendToDocModal.value = true;
    }
};

const escapeHtml = (text) => {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

const handleSendToExistingDoc = async (docId) => {
    showSendToDocModal.value = false;
    try {
        const doc = await apiClient.get(`/docs/${docId}`);
        const existing = doc.data.content || '';
        const paragraph = `<p>${escapeHtml(selectedText.value)}</p>`;
        await apiClient.patch(`/docs/${docId}`, { content: existing + paragraph });
    } catch (error) {
        console.error('Failed to send selection to document', error);
    }
};

const handleCreateNewDoc = async () => {
    showSendToDocModal.value = false;
    try {
        const paragraph = `<p>${escapeHtml(selectedText.value)}</p>`;
        await apiClient.post('/docs', {
            name: `Selection from browser`,
            content: paragraph,
            project: projectId ? { id: Number(projectId) } : null,
        });
    } catch (error) {
        console.error('Failed to create document from selection', error);
    }
};

onMounted(() => {
    const wv = webviewRef.value;
    if (!wv) return;

    wv.addEventListener('did-navigate', () => {
        currentUrl.value = wv.getURL();
    });
    wv.addEventListener('did-navigate-in-page', () => {
        currentUrl.value = wv.getURL();
    });
    wv.addEventListener('context-menu', handleWebviewContextMenu);
});

onBeforeUnmount(() => {
    const wv = webviewRef.value;
    if (wv) {
        wv.removeEventListener('context-menu', handleWebviewContextMenu);
    }
});
</script>
