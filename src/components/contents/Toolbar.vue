<template>
    <div class="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <div class="flex items-center gap-1">
                    <Button @click="handleAddMark" title="Add/Remove Highlight Mark"
                        :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': isMarkActive }]">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="2" y="5" width="16" height="10" rx="1" stroke="#4B5563" stroke-width="1.5" />
                            <rect x="4" y="7" width="12" height="6" rx="1" fill="#FFE082" stroke="none" />
                        </svg>
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import Button from '../ui/Button.vue';
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

const emit = defineEmits(['remove-mark', 'add-mark']);

const isMarkActive = ref(false);
const route = useRoute();
const { createMark, isLoading: isMarkLoading } = useMarkCreate();
const { deleteMark } = useMarkDelete();
const { marks, loadMarks } = useMarks();
const { updateMark } = useMarkUpdate();
const markContentMap = ref<Map<string, string>>(new Map());

const checkIfMarkActive = () => {
    if (!props.editor || !props.editor.state) return false;

    const isActive = props.editor.isActive('textMark');
    if (isActive) {
        const attrs = props.editor.getAttributes('textMark');
        return attrs && attrs.markId ? true : false;
    }

    return false;
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
                    markContentMap.value.set(mark._id, mark.content);
                });

                setTimeout(() => {
                    loadedMarks.forEach(mark => {
                        try {
                            if (!mark.content || !mark._id) {
                                return;
                            }

                            const content = props.editor.state.doc.textContent;
                            const position = content.indexOf(mark.content);

                            if (position !== -1) {
                                props.editor.commands.setTextSelection({
                                    from: position,
                                    to: position + mark.content.length
                                });
                                props.editor.commands.setTextMark(mark._id);
                            } else {
                                console.warn(`Mark content not found in document: ${mark.content}`);
                            }
                        } catch (err) {
                            console.error(`Error applying mark ${mark._id}:`, err);
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

        if (newMark && newMark._id) {
            props.editor.commands.setTextSelection({ from, to });
            props.editor.commands.setTextMark(newMark._id);

            emit('add-mark', {
                markId: newMark._id,
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
});

onBeforeUnmount(() => {
    if (props.editor) {
        props.editor.off('selectionUpdate', updateMarkActiveStatus);
        props.editor.off('update', handleEditorUpdate);
    }
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