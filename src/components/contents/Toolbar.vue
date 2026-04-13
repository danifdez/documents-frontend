<template>
    <div class="bg-surface-elevated py-2">
        <!-- Context menu for text selection -->
        <div v-if="showContextMenu" :style="contextMenuStyle"
            class="fixed z-50 bg-surface-elevated shadow-lg rounded-md border border-border py-1 min-w-[160px]" @click.stop>
            <button @click="handleContextMenuAction('highlight')"
                class="w-full px-4 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-sm"
                :class="{ 'bg-surface-hover': isMarkActive }">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="5" width="16" height="10" rx="1" stroke="currentColor" stroke-width="1.5" />
                    <rect x="4" y="7" width="12" height="6" rx="1" fill="#FFE082" stroke="none" />
                </svg>
                <span>{{ isMarkActive ? 'Remove Highlight' : 'Highlight' }}</span>
                <span class="ml-auto text-xs text-text-muted">Ctrl+H</span>
            </button>
            <button @click="handleContextMenuAction('comment')"
                class="w-full px-4 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M17 4H3C2.44772 4 2 4.44772 2 5V15C2 15.5523 2.44772 16 3 16H6V18.5L10 16H17C17.5523 16 18 15.5523 18 15V5C18 4.44772 17.5523 4 17 4Z"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M7 9H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    <path d="M7 12H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
                <span>Add Comment</span>
                <span class="ml-auto text-xs text-text-muted">Ctrl+Shift+C</span>
            </button>
            <button @click="handleContextMenuAction('send')"
                class="w-full px-4 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 10l8-6v4h6v4h-6v4l-8-6z" fill="currentColor" />
                </svg>
                <span>Send to workspace</span>
            </button>
            <button @click="handleContextMenuAction('send-to-doc')"
                class="w-full px-4 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2z" stroke="currentColor" stroke-width="1.5" fill="none" />
                    <path d="M8 7h4M8 10h4M8 13h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
                <span>Send to document</span>
            </button>
            <button v-if="hasWorkspace" @click="handleContextMenuAction('summarize')"
                class="w-full px-4 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6h16v2H4zM4 11h10v2H4zM4 16h8v2H4z" fill="currentColor" />
                </svg>
                <span>Summarize selection</span>
                <span class="ml-auto text-xs text-text-muted">Ctrl+Alt+S</span>
            </button>
            <div class="border-t border-border my-1"></div>
            <button @click="handleContextMenuAction('search-kb')"
                class="w-full px-4 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-sm">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span>Search in KB</span>
            </button>
            <button @click="handleContextMenuAction('search-wiki')"
                class="w-full px-4 py-2 text-left hover:bg-surface-hover flex items-center gap-2 text-sm">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Search in Wikipedia</span>
            </button>

            <!-- Lookup results panel -->
            <template v-if="lookupTab">
                <div class="border-t border-border max-h-60 overflow-y-auto">
                    <!-- Loading -->
                    <div v-if="lookupLoading" class="flex items-center justify-center py-4">
                        <div class="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
                    </div>

                    <!-- KB results -->
                    <template v-else-if="lookupTab === 'kb'">
                        <div v-if="kbResults.length === 0" class="px-4 py-3 text-center">
                            <p class="text-xs text-text-muted">No KB entries found</p>
                            <button @click="handleCreateKBEntry"
                                class="mt-1 text-xs text-accent hover:underline cursor-pointer">
                                Create new entry
                            </button>
                        </div>
                        <div v-for="entry in kbResults" :key="entry.id" @click="goToKBEntry(entry.id)"
                            class="px-4 py-2 border-b border-border last:border-0 cursor-pointer hover:bg-surface-hover text-sm">
                            <p class="font-medium text-text-primary text-xs line-clamp-1">{{ entry.title }}</p>
                            <p v-if="entry.summary" class="text-xs text-text-muted mt-0.5 line-clamp-2">{{ entry.summary }}</p>
                        </div>
                    </template>

                    <!-- Wikipedia result -->
                    <template v-else-if="lookupTab === 'wiki'">
                        <div v-if="wikiError" class="px-4 py-3 text-center">
                            <p class="text-xs text-text-muted">{{ wikiError }}</p>
                        </div>
                        <div v-else-if="wikiResult" class="px-4 py-3">
                            <div class="flex gap-2">
                                <img v-if="wikiResult.thumbnail" :src="wikiResult.thumbnail" alt=""
                                    class="w-10 h-10 rounded object-cover shrink-0" />
                                <div class="min-w-0">
                                    <p class="text-xs font-semibold text-text-primary mb-0.5">{{ wikiResult.title }}</p>
                                    <p class="text-xs text-text-secondary line-clamp-4 leading-relaxed">{{ wikiResult.extract }}</p>
                                </div>
                            </div>
                            <a :href="wikiResult.url" target="_blank" rel="noopener"
                                class="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                                View on Wikipedia
                                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    </template>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useKnowledgeBase } from '../../services/knowledge/useKnowledgeBase';
import { useWikipedia } from '../../services/knowledge/useWikipedia';
import type { KnowledgeEntry } from '../../services/knowledge/useKnowledgeBase';
import { useMarkCreate } from '../../services/marks/useMarkCreate';
import { useMarkDelete } from '../../services/marks/useMarkDelete';
import { useMarks } from '../../services/marks/useMarks';
import { useMarkUpdate } from '../../services/marks/useMarkUpdate';

const props = defineProps({
    editor: {
        type: Object,
    },
    resourceId: {
        type: String,
    },
    hasWorkspace: {
        type: Boolean,
        default: false,
    }
});

const emit = defineEmits(['remove-mark', 'add-mark', 'add-comment', 'send-selection-to-workspace', 'send-selection-to-doc', 'summarize-selection']);

const isMarkActive = ref(false);
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const route = useRoute();
const kbRouter = useRouter();
const { loadEntries: loadKBEntries, createEntry: createKBEntry } = useKnowledgeBase();
const { search: searchWiki } = useWikipedia();
const lookupTab = ref<'kb' | 'wiki' | null>(null);
const lookupLoading = ref(false);
const kbResults = ref<KnowledgeEntry[]>([]);
const wikiResult = ref<any>(null);
const wikiError = ref<string | null>(null);
const contextMenuSelectedText = ref('');
const { createMark, isLoading: isMarkLoading } = useMarkCreate();
const { deleteMark } = useMarkDelete();
const { marks, loadMarks } = useMarks();
const { updateMark } = useMarkUpdate();
const markContentMap = ref<Map<string, string>>(new Map());

// Computed style for context menu positioning
const contextMenuStyle = computed(() => ({
    top: `${contextMenuPosition.value.y}px`,
    left: `${contextMenuPosition.value.x}px`,
}));

const checkIfMarkActive = () => {
    if (!props.editor || !props.editor.state) return false;

    const isActive = props.editor.isActive('textMark');
    if (isActive) {
        const attrs = props.editor.getAttributes('textMark');
        return attrs && attrs.markId ? true : false;
    }

    return false;
};

const handleAddComment = () => {
    emit('add-comment');
};

const handleContextMenuAction = (action: 'highlight' | 'comment' | 'send' | 'summarize' | 'send-to-doc' | 'search-kb' | 'search-wiki') => {
    if (action === 'search-kb') {
        searchInKB();
        return;
    }
    if (action === 'search-wiki') {
        searchInWikipedia();
        return;
    }
    showContextMenu.value = false;
    lookupTab.value = null;

    if (action === 'highlight') {
        handleAddMark();
    } else if (action === 'comment') {
        handleAddComment();
    } else if (action === 'send') {
        // get selection and emit to parent
        try {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) return;
            const text = selection.toString().trim();
            if (!text) return;
            emit('send-selection-to-workspace', text);
            // clear native selection
            selection.removeAllRanges();
        } catch (e) {
            console.error('Failed to capture selection for send action', e);
        }
    }
    else if (action === 'send-to-doc') {
        try {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) return;
            const text = selection.toString().trim();
            if (!text) return;
            emit('send-selection-to-doc', text);
            selection.removeAllRanges();
        } catch (e) {
            console.error('Failed to capture selection for send-to-doc action', e);
        }
    }
    else if (action === 'summarize') {
        try {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) return;
            const text = selection.toString().trim();
            if (!text) return;
            emit('summarize-selection', text);
            selection.removeAllRanges();
        } catch (e) {
            console.error('Failed to capture selection for summarize action', e);
        }
    }
};

const searchInKB = async () => {
    lookupTab.value = 'kb';
    lookupLoading.value = true;
    try {
        const results = await loadKBEntries(contextMenuSelectedText.value);
        kbResults.value = results ?? [];
    } finally {
        lookupLoading.value = false;
    }
};

const searchInWikipedia = async () => {
    lookupTab.value = 'wiki';
    wikiResult.value = null;
    wikiError.value = null;
    lookupLoading.value = true;
    try {
        const result = await searchWiki(contextMenuSelectedText.value);
        if (result) {
            wikiResult.value = result;
        } else {
            wikiError.value = 'Article not found on Wikipedia';
        }
    } finally {
        lookupLoading.value = false;
    }
};

const goToKBEntry = (id: number) => {
    showContextMenu.value = false;
    lookupTab.value = null;
    kbRouter.push(`/knowledge-base/${id}`);
};

const handleCreateKBEntry = async () => {
    showContextMenu.value = false;
    lookupTab.value = null;
    try {
        const entry = await createKBEntry({ title: contextMenuSelectedText.value });
        kbRouter.push(`/knowledge-base/${entry.id}`);
    } catch (err) {
        console.error('Error creating KB entry:', err);
    }
};

const handleContextMenu = (event: MouseEvent) => {
    const selection = window.getSelection();

    // Check if there's a text selection
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        showContextMenu.value = false;
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const text = selection.toString().trim();
    contextMenuSelectedText.value = text.length > 80 ? text.slice(0, 80) : text;

    // Update mark active status before showing menu
    updateMarkActiveStatus();

    // Reset lookup state
    lookupTab.value = null;
    kbResults.value = [];
    wikiResult.value = null;
    wikiError.value = null;

    // Position the context menu at the cursor
    contextMenuPosition.value = {
        x: event.clientX,
        y: event.clientY
    };

    showContextMenu.value = true;
};

const closeContextMenu = () => {
    showContextMenu.value = false;
    lookupTab.value = null;
};

const handleKeyboardShortcut = (event: KeyboardEvent) => {
    // Ctrl+H for Highlight
    if (event.ctrlKey && event.key === 'h' && !event.shiftKey) {
        event.preventDefault();
        handleAddMark();
        return;
    }

    // Ctrl+Shift+C for Comment
    if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        handleAddComment();
        return;
    }

    // Ctrl+Alt+S for Summarize selection
    if (event.ctrlKey && event.altKey && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        handleContextMenuAction('summarize');
        return;
    }
};

const updateMarkActiveStatus = () => {
    try {
        isMarkActive.value = checkIfMarkActive();
    } catch (error) {
        isMarkActive.value = false;
    }
};

const loadDocumentMarks = async () => {
    try {
        const resourceId = props.resourceId || route.params.id;
        if (resourceId && resourceId !== 'new') {
            const loadedMarks = await loadMarks(resourceId as string);

            if (props.editor && loadedMarks.length > 0) {
                loadedMarks.forEach(mark => {
                    markContentMap.value.set(mark.id, mark.content);
                });

                setTimeout(() => {
                    loadedMarks.forEach(mark => {
                        try {
                            if (!mark.content || !mark.id) {
                                return;
                            }

                            const content = props.editor.state.doc.textContent;
                            const position = content.indexOf(mark.content);

                            if (position !== -1) {
                                props.editor.commands.setTextSelection({
                                    from: position,
                                    to: position + mark.content.length
                                });
                                props.editor.commands.setTextMark(mark.id);
                            } else {
                                console.warn(`Mark content not found in document: ${mark.content}`);
                            }
                        } catch (err) {
                            console.error(`Error applying mark ${mark.id}:`, err);
                        }
                    });
                }, 500);
            }
        }
    } catch (error) {
        console.error('Error loading marks:', error);
    }
};

const handleAddMark = async () => {
    if (!props.editor) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            alert('Please select some text to highlight');
            return;
        }

        const range = selection.getRangeAt(0);
        if (range.collapsed) {
            alert('Please select some text to highlight');
            return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText) {
            alert('Please select some text to highlight');
            return;
        }

        const selectedElement = range.commonAncestorContainer;
        const parentElement = selectedElement.nodeType === Node.TEXT_NODE
            ? selectedElement.parentElement
            : selectedElement as Element;

        const existingMark = parentElement?.closest('[data-mark-id]') ||
            parentElement?.querySelector('[data-mark-id]');

        if (existingMark) {
            const markId = existingMark.getAttribute('data-mark-id');
            if (markId) {
                emit('remove-mark', markId);
                return;
            }
        }

        emit('add-mark', {
            text: selectedText,
            from: 0,
            to: selectedText.length
        });

        selection.removeAllRanges();
        return;
    }

    if (isMarkActive.value) {
        const attrs = props.editor.getAttributes('textMark');
        if (attrs.markId) {
            try {
                props.editor.chain()
                    .focus()
                    .extendMarkRange('textMark')
                    .unsetMark('textMark')
                    .run();

                await deleteMark(attrs.markId);

                emit('remove-mark', attrs.markId);
            } catch (error) {
                alert('Failed to remove mark. Please try again.');
            }
        }
        return;
    }

    const { from, to } = props.editor.state.selection;
    if (from === to) {
        alert('Please select some text to highlight');
        return;
    }

    const text = props.editor.state.doc.textBetween(from, to);

    try {
        const resourceId = props.resourceId || route.params.id;

        if (!resourceId || resourceId === 'new') {
            alert('Resource must be saved before adding marks');
            return;
        }

        const newMark = await createMark(resourceId as string, text, 'resource');

        if (newMark && newMark.id) {
            props.editor.commands.setTextSelection({ from, to });
            props.editor.commands.setTextMark(newMark.id);

            emit('add-mark', {
                markId: newMark.id,
                text,
                from,
                to
            });
        }
    } catch (error) {
        alert('Failed to create mark. Please try again.');
    }
};

const checkForMarkChanges = (editor: Record<string, any>) => {
    if (markContentMap.value.size === 0) return;

    const doc = editor.state.doc;
    const markChanges = new Map<string, string>();

    const processNode = (node: Record<string, any>, pos: number) => {
        const marks = node.marks.filter((mark: Record<string, any>) => mark.type.name === 'textMark');

        if (marks.length > 0) {
            const content = node.text;

            marks.forEach((mark: Record<string, any>) => {
                const markId = mark.attrs.markId;
                const originalContent = markContentMap.value.get(markId);

                if (originalContent && content !== originalContent && !markChanges.has(markId)) {
                    markChanges.set(markId, content);
                }
            });
        }
    };

    doc.descendants((node: Record<string, any>, pos: number) => {
        if (node.isText) {
            processNode(node, pos);
        }
        return true;
    });

    if (markChanges.size > 0) {
        markChanges.forEach((newContent, markId) => {
            updateMark(markId, newContent)
                .then(() => {
                    markContentMap.value.set(markId, newContent);
                    console.log(`Updated mark ${markId} with new content: ${newContent}`);
                })
                .catch(error => {
                    console.error(`Error updating mark ${markId}:`, error);
                });
        });
    }
};

watch(() => props.editor?.state.selection, () => {
    updateMarkActiveStatus();
}, { deep: true });

watch(() => props.editor, async (newEditor, oldEditor) => {
    if (oldEditor) {
        oldEditor.off('selectionUpdate', updateMarkActiveStatus);
        oldEditor.off('update', handleEditorUpdate);
    }

    if (newEditor) {
        newEditor.on('selectionUpdate', updateMarkActiveStatus);
        newEditor.on('update', handleEditorUpdate);
        updateMarkActiveStatus();
        await loadDocumentMarks();
    }
}, { immediate: false });

const handleEditorUpdate = ({ editor }: { editor: Record<string, any> }) => {
    checkForMarkChanges(editor);
};

onMounted(async () => {
    if (props.editor) {
        props.editor.on('selectionUpdate', updateMarkActiveStatus);
        props.editor.on('update', handleEditorUpdate);
        updateMarkActiveStatus();
        await loadDocumentMarks();
    }

    // Add event listeners for context menu and keyboard shortcuts
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', closeContextMenu);
    document.addEventListener('keydown', handleKeyboardShortcut);
});

onBeforeUnmount(() => {
    if (props.editor) {
        props.editor.off('selectionUpdate', updateMarkActiveStatus);
        props.editor.off('update', handleEditorUpdate);
    }

    // Remove event listeners
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('click', closeContextMenu);
    document.removeEventListener('keydown', handleKeyboardShortcut);
});

</script>

<style scoped>
:deep(.text-mark) {
    background-color: #FFE082;
    border-radius: 0.15rem;
    padding: 0.05rem 0.15rem;
    cursor: pointer;
}

:deep(.text-mark:hover) {
    background-color: #FFD54F;
}
</style>