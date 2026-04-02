<template>
    <div class="flex flex-col h-screen bg-surface">
        <BrowserNavbar v-model:url="currentUrl" :private-mode="isPrivateMode" :augment-enabled="augment.enabled.value"
            @navigate="navigateToUrl"
            @extract="extractContent" @ask="openAskPanel" @add-bibliography="addBibliography"
            @back="goBack" @forward="goForward" @reload="doReload"
            @toggle-private-mode="togglePrivateMode" @toggle-augment="handleToggleAugment" />

        <!-- Web content -->
        <div class="flex-1 relative">
            <webview ref="webviewRef" :key="webviewKey" :src="initialUrl" :partition="partition"
                class="absolute inset-0 border-none" style="width: 100%; height: 100%;" />

            <!-- Augmentation indicator -->
            <AugmentIndicator :is-analyzing="augment.isAnalyzing.value"
                :entity-count="augment.entityCount.value"
                :block-connection-count="augment.blockConnectionCount.value"
                :enabled="augment.enabled.value"
                @dismiss="augment.cleanup(webviewRef)" />
        </div>

        <!-- Lookup results panel -->
        <Teleport to="body">
            <Transition name="lookup-overlay">
                <div v-if="showLookup" class="fixed inset-0 z-50 flex justify-end" @click.self="showLookup = false">
                    <Transition name="lookup-panel" appear>
                        <div v-if="showLookup"
                            class="h-full w-[420px] max-w-full bg-surface-elevated border-l border-border flex flex-col shadow-2xl shadow-black/10">
                            <div class="flex items-center justify-between px-5 py-4 border-b border-border-light">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent" fill="none"
                                            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 class="text-sm font-semibold text-text-primary">Related information</h2>
                                        <p class="text-[11px] text-text-muted truncate max-w-[260px]">"{{ lookupTerm }}"</p>
                                    </div>
                                </div>
                                <button @click="showLookup = false"
                                    class="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div class="flex-1 overflow-y-auto">
                                <div v-if="lookupLoading" class="flex items-center justify-center py-12">
                                    <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
                                </div>
                                <div v-else-if="lookupResults.length === 0" class="flex flex-col items-center justify-center py-12 text-center px-6">
                                    <p class="text-sm text-text-muted">No related information found</p>
                                </div>
                                <div v-else class="divide-y divide-border">
                                    <div v-for="result in lookupResults" :key="`${result.source}-${result.collection}-${result.id}`"
                                        @click="navigateToResult(result)"
                                        class="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-hover transition-colors cursor-pointer">
                                        <span class="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider"
                                            :class="collectionBadgeClass(result.collection)">
                                            {{ result.collection }}
                                        </span>
                                        <div class="min-w-0 flex-1">
                                            <p class="text-sm font-medium text-text-primary line-clamp-1"
                                                v-html="result.highlightedName || result.name"></p>
                                            <p v-if="result.highlightedContent" class="text-xs text-text-muted mt-0.5 line-clamp-3"
                                                v-html="result.highlightedContent"></p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Transition>
                </div>
            </Transition>
        </Teleport>

        <!-- Ask AI chat panel -->
        <ChatSidebar :show="showChat" :messages="chatMessages" :project-id="projectId ? Number(projectId) : null"
            :context="pageContext" subtitle="Ask questions about this page"
            @close="showChat = false" @send="handleSendMessage" />

        <!-- Send to doc modal -->
        <SendToDocModal :is-open="showSendToDocModal" :selected-text="selectedText" :project-id="projectId ? Number(projectId) : null"
            @close="showSendToDocModal = false" @send-to-existing="handleSendToExistingDoc"
            @create-new-doc="handleCreateNewDoc" />

        <!-- Augment detail panel -->
        <AugmentDetailPanel :show="showDetailPanel" :collection="detailCollection" :item-id="detailItemId"
            @close="showDetailPanel = false"
            @navigate="openDetailPanel"
            @open-full="navigateToFullView" />
    </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import BrowserNavbar from '../components/browser/BrowserNavbar.vue';
import AugmentIndicator from '../components/browser/AugmentIndicator.vue';
import AugmentDetailPanel from '../components/browser/AugmentDetailPanel.vue';
import ChatSidebar from '../components/ui/ChatSidebar.vue';
import SendToDocModal from '../components/contents/SendToDocModal.vue';
import { useBibliography } from '../services/bibliography/useBibliography';
import { useLookup } from '../services/search/useLookup';
import { usePageAugmentation } from '../services/browser/usePageAugmentation';
import { useNotification } from '../composables/useNotification';
import apiClient from '../services/api';

const route = useRoute();
const projectId = route.params.id || null;
const partitionKey = projectId || 'global';
const initialUrl = 'https://github.com/electron/electron';
const currentUrl = ref(initialUrl);
const webviewRef = ref(null);
const isPrivateMode = ref(false);
const webviewKey = ref(0);

const partition = computed(() =>
    isPrivateMode.value
        ? `browser-${partitionKey}-private`
        : `persist:browser-${partitionKey}`
);

const togglePrivateMode = () => {
    isPrivateMode.value = !isPrivateMode.value;
    webviewKey.value++;
};

const augment = usePageAugmentation();

const handleToggleAugment = async () => {
    augment.toggle();
    if (!augment.enabled.value) {
        await augment.cleanup(webviewRef.value);
    } else {
        // Re-analyze current page when re-enabled
        await augment.analyze(webviewRef.value, projectId);
    }
};

// Detail panel state
const showDetailPanel = ref(false);
const detailCollection = ref('');
const detailItemId = ref(null);

const openDetailPanel = (collection, id) => {
    detailCollection.value = collection;
    detailItemId.value = Number(id);
    showDetailPanel.value = true;
};

const navigateToFullView = (collection, id) => {
    showDetailPanel.value = false;
    const routeMap = {
        entities: `/entities/${id}`,
        resources: `/resource/${id}`,
        docs: `/document/${id}`,
        knowledge: `/knowledge-base/${id}`,
        notes: `/notes`,
        canvases: `/canvas/${id}`,
        events: `/calendar`,
        datasets: `/datasets/${id}`,
    };
    const path = routeMap[collection];
    if (path) {
        window.electronAPI?.navigateMainWindow(path);
    }
};

const selectedText = ref('');
const showSendToDocModal = ref(false);
const showLookup = ref(false);
const lookupTerm = ref('');
const { results: lookupResults, isLoading: lookupLoading, lookup } = useLookup();
const showChat = ref(false);
const chatMessages = ref([]);
const pageContext = ref('');

const extractPageTextScript = `
(function() {
    const clone = document.body.cloneNode(true);
    const removeTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'video', 'audio', 'canvas', 'img'];
    removeTags.forEach(tag => clone.querySelectorAll(tag).forEach(el => el.remove()));
    const removeSelectors = [
        'nav', 'header', 'footer',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '[aria-hidden="true"]',
        '.nav', '.navbar', '.header', '.footer', '.sidebar', '.menu',
        '.cookie', '.banner', '.ad', '.ads', '.advertisement',
        '.popup', '.modal', '.overlay', '.toast',
        '#cookie', '#nav', '#header', '#footer', '#sidebar', '#menu'
    ];
    removeSelectors.forEach(sel => {
        try { clone.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
    });
    const text = clone.innerText;
    clone.remove();
    return text.split('\\n').map(l => l.trim()).filter(Boolean).join('\\n');
})()
`;

const openAskPanel = async () => {
    const wv = webviewRef.value;
    if (wv) {
        try {
            const text = await wv.executeJavaScript(extractPageTextScript);
            const title = await wv.executeJavaScript('document.title');
            const url = wv.getURL();
            pageContext.value = `Page: ${title}\nURL: ${url}\n\n${text}`;
        } catch {
            pageContext.value = '';
        }
    }
    showChat.value = true;
};

const handleSendMessage = (msg) => {
    if (msg.trim()) {
        chatMessages.value.push({ role: 'user', text: msg });
    }
};

const { createEntry } = useBibliography();
const notification = useNotification();

const addBibliography = async () => {
    const wv = webviewRef.value;
    if (!wv) return;

    try {
        const title = await wv.executeJavaScript('document.title');
        const url = wv.getURL();
        const host = new URL(url).hostname.replace(/^www\./, '');
        const today = new Date().toISOString().split('T')[0];

        await createEntry({
            entryType: 'webpage',
            title,
            url,
            websiteTitle: host,
            accessDate: today,
            projectId: projectId ? Number(projectId) : undefined,
        });

        notification.success('Page added to bibliography');
    } catch (err) {
        console.error('Failed to add bibliography entry:', err);
        notification.error('Failed to add bibliography entry');
    }
};

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

const performLookup = async (text) => {
    lookupTerm.value = text.length > 80 ? text.slice(0, 80) + '…' : text;
    showLookup.value = true;
    await lookup(text, projectId ? Number(projectId) : undefined);
};

const collectionBadgeClass = (collection) => {
    const map = {
        docs: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        resources: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        knowledge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        entities: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        notes: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
        canvases: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
        events: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        datasets: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    };
    return map[collection] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
};

const navigateToResult = (result) => {
    const routes = {
        docs: `/document/${result.id}`,
        resources: `/resource/${result.id}`,
        knowledge: `/knowledge-base/${result.id}`,
        entities: `/entities/${result.id}`,
        notes: `/notes`,
        canvases: `/canvas/${result.id}`,
        events: `/calendar`,
        datasets: `/datasets/${result.id}`,
    };
    const path = routes[result.collection];
    if (path) {
        showLookup.value = false;
        window.electronAPI.navigateMainWindow(path);
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
    } else if (action === 'lookup') {
        performLookup(text);
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

const originalTitle = document.title;


// Handle navigation messages from injected scripts via console.log
const NAV_PREFIX = '__DOCS_NAV__:';
const collectionMap = {
    entity: 'entities', entities: 'entities',
    resource: 'resources', resources: 'resources',
    doc: 'docs', docs: 'docs',
    knowledge: 'knowledge',
    note: 'notes', notes: 'notes',
    canvas: 'canvases', canvases: 'canvases',
    event: 'events', events: 'events',
    dataset: 'datasets', datasets: 'datasets',
};

const handleConsoleMessage = (e) => {
    // Electron webview console-message: message can be in e.message or e.params[0]
    const msg = e.message || (e.params && e.params[0]) || '';
    if (!msg.startsWith(NAV_PREFIX)) return;
    const url = msg.slice(NAV_PREFIX.length);
    if (!url.startsWith('documents-app://')) return;

    const path = url.replace('documents-app://', '');
    const [rawCollection, id] = path.split('/');
    const collection = collectionMap[rawCollection];
    if (collection && id) {
        openDetailPanel(collection, id);
    }
};

// Also handle via page-title-updated as fallback for webview IPC
const handleTitleNav = (e) => {
    const title = e.title || '';
    if (!title.startsWith(NAV_PREFIX)) return;

    const url = title.slice(NAV_PREFIX.length);
    if (!url.startsWith('documents-app://')) return;

    const path = url.replace('documents-app://', '');
    const [rawCollection, id] = path.split('/');
    const collection = collectionMap[rawCollection];
    if (collection && id) {
        openDetailPanel(collection, id);
        // Restore original title
        const wv = webviewRef.value;
        if (wv) {
            wv.executeJavaScript('document.title = document.__docAugOrigTitle || document.title');
        }
    }
};

const setupWebviewListeners = (wv) => {
    if (!wv) return;
    wv.addEventListener('did-navigate', () => {
        currentUrl.value = wv.getURL();
        // Deactivate augmentation on every navigation
        if (augment.enabled.value) {
            augment.enabled.value = false;
            augment.cleanup(wv);
        }
    });
    wv.addEventListener('did-navigate-in-page', () => {
        currentUrl.value = wv.getURL();
    });
    // did-finish-load no longer triggers augmentation automatically
    // User must click the toggle button to analyze each page
    wv.addEventListener('page-title-updated', (e) => {
        const title = e.title || '';
        if (title.startsWith(NAV_PREFIX)) {
            handleTitleNav(e);
        } else {
            document.title = `${title} - Documents`;
        }
    });
    wv.addEventListener('console-message', handleConsoleMessage);
    wv.addEventListener('context-menu', handleWebviewContextMenu);
};

watch(webviewRef, (wv, oldWv) => {
    if (oldWv) {

        oldWv.removeEventListener('context-menu', handleWebviewContextMenu);
        oldWv.removeEventListener('console-message', handleConsoleMessage);
    }
    setupWebviewListeners(wv);
}, { immediate: true });

onBeforeUnmount(() => {
    document.title = originalTitle;
    const wv = webviewRef.value;
    if (wv) {
        wv.removeEventListener('context-menu', handleWebviewContextMenu);
        wv.removeEventListener('console-message', handleConsoleMessage);
        augment.cleanup(wv);
    }
});
</script>

<style scoped>
.lookup-overlay-enter-active,
.lookup-overlay-leave-active {
    transition: opacity 0.2s ease;
}
.lookup-overlay-enter-from,
.lookup-overlay-leave-to {
    opacity: 0;
}
.lookup-panel-enter-active {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.lookup-panel-leave-active {
    transition: transform 0.2s ease-in;
}
.lookup-panel-enter-from,
.lookup-panel-leave-to {
    transform: translateX(100%);
}
</style>
