<template>
    <div class="bg-white py-2">
        <!-- Context menu for text selection -->
        <div v-if="showContextMenu" :style="contextMenuStyle"
            class="fixed z-50 bg-white shadow-lg rounded-md border border-gray-200 py-1 min-w-[160px]" @click.stop>
            <button @click="handleContextMenuAction('highlight')"
                class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                :class="{ 'bg-gray-50': isMarkActive }">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="5" width="16" height="10" rx="1" stroke="currentColor" stroke-width="1.5" />
                    <rect x="4" y="7" width="12" height="6" rx="1" fill="#FFE082" stroke="none" />
                </svg>
                <span>{{ isMarkActive ? 'Remove Highlight' : 'Highlight' }}</span>
                <span class="ml-auto text-xs text-gray-400">Ctrl+H</span>
            </button>
            <button @click="handleContextMenuAction('comment')"
                class="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M17 4H3C2.44772 4 2 4.44772 2 5V15C2 15.5523 2.44772 16 3 16H6V18.5L10 16H17C17.5523 16 18 15.5523 18 15V5C18 4.44772 17.5523 4 17 4Z"
                        stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M7 9H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    <path d="M7 12H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
                <span>Add Comment</span>
                <span class="ml-auto text-xs text-gray-400">Ctrl+Shift+C</span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRoute } from 'vue-router';
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
    }
});

const emit = defineEmits(['remove-mark', 'add-mark', 'add-comment']);

const isMarkActive = ref(false);
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const route = useRoute();
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

const handleContextMenuAction = (action: 'highlight' | 'comment') => {
    showContextMenu.value = false;

    if (action === 'highlight') {
        handleAddMark();
    } else if (action === 'comment') {
        handleAddComment();
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

    // Update mark active status before showing menu
    updateMarkActiveStatus();

    // Position the context menu at the cursor
    contextMenuPosition.value = {
        x: event.clientX,
        y: event.clientY
    };

    showContextMenu.value = true;
};

const closeContextMenu = () => {
    showContextMenu.value = false;
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

        const newMark = await createMark(resourceId as string, text);

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

const checkForMarkChanges = (editor: any) => {
    if (markContentMap.value.size === 0) return;

    const doc = editor.state.doc;
    const markChanges = new Map<string, string>();

    const processNode = (node: any, pos: number) => {
        const marks = node.marks.filter((mark: any) => mark.type.name === 'textMark');

        if (marks.length > 0) {
            const content = node.text;

            marks.forEach((mark: any) => {
                const markId = mark.attrs.markId;
                const originalContent = markContentMap.value.get(markId);

                if (originalContent && content !== originalContent && !markChanges.has(markId)) {
                    markChanges.set(markId, content);
                }
            });
        }
    };

    doc.descendants((node: any, pos: number) => {
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

const handleEditorUpdate = ({ editor }: { editor: any }) => {
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