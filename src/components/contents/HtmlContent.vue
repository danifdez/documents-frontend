<template>
    <div>
        <Toolbar :editor="null" :resourceId="resourceId" @add-mark="handleAddMark" @remove-mark="handleRemoveMark"
            @add-comment="handleAddComment" />
        <div class="relative">
            <div v-if="savedSuccessfully"
                class="absolute top-2 right-2 bg-green-100 text-green-800 px-3 py-1 rounded-md shadow-sm z-10">
                Content saved
            </div>
            <div ref="extractedContent" :style="cssVars" class="w-full min-h-[600px] resource-detail" v-html="content">
            </div>
        </div>
        <CommentModal :is-visible="showCommentModal" :selected-text="selectedCommentText" :is-loading="isCommentLoading"
            @save="saveComment" @cancel="cancelComment" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import Toolbar from './Toolbar.vue';
import { useMarkCreate } from '../../services/marks/useMarkCreate';
import { useMarkDelete } from '../../services/marks/useMarkDelete';
import { useMarks } from '../../services/marks/useMarks';
import { useResource } from '../../services/resources/useResource';
import { useCommentCreate } from '../../services/comments/useCommentCreate';
import CommentModal from '../comments/CommentModal.vue';

const extractedContent = ref<HTMLDivElement | null>(null);
const matches = ref([]);
const savedSuccessfully = ref(false);
const selectedCommentText = ref('');
const currentSelection = ref(null);
const showCommentModal = ref(false);
const route = useRoute();
const { createMark } = useMarkCreate();
const { deleteMark } = useMarkDelete();
const { loadMarks } = useMarks();
const { updateResource } = useResource();
const { createComment, isLoading: isCommentLoading } = useCommentCreate();

const props = defineProps({
    content: {
        type: String,
    },
    resourceId: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['content-updated', 'highlight-comment']);

const settings = ref({ fontSize: 16, fontFamily: 'sans-serif', paragraphSpacing: 1.5 });

const cssVars = ref({
    '--font-size-p': settings.value.fontSize + 'px',
    '--font-family': settings.value.fontFamily,
    '--paragraph-spacing': settings.value.paragraphSpacing.toString(),
});

const escapeRegExp = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const applySettings = () => {
    cssVars.value = {
        '--font-size-p': settings.value.fontSize.toString(),
        '--font-family': settings.value.fontFamily || 'sans-serif',
        '--paragraph-spacing': settings.value.paragraphSpacing.toString(),
    };
};

const loadAndApplySettings = async () => {
    if (window.electronAPI && window.electronAPI.getSettings) {
        const loaded = await window.electronAPI.getSettings();
        if (loaded) {
            settings.value = loaded;
        }
    }
    applySettings();
};

const handleAddComment = () => {
    const windowSelection = window.getSelection();

    if (!windowSelection || windowSelection.rangeCount === 0) {
        return;
    }

    const range = windowSelection.getRangeAt(0);

    if (!extractedContent.value || !extractedContent.value.contains(range.commonAncestorContainer)) {
        return;
    }

    selectedCommentText.value = windowSelection.toString().trim();
    const storedPosition = storeSelectionPosition(windowSelection);
    currentSelection.value = storedPosition;
    showCommentModal.value = true;

    windowSelection.removeAllRanges();
};

const saveComment = async (commentText: string) => {
    try {
        if (!commentText.trim() || !props.resourceId || props.resourceId === 'new') {
            return;
        }

        const newComment = await createComment(
            props.resourceId,
            commentText,
        );

        if (currentSelection.value) {
            const span = document.createElement('span');
            span.className = 'comment-mark';
            span.setAttribute('data-comment-id', newComment._id);

            const success = wrapStoredSelection(currentSelection.value, span);

            if (!success) {
                console.error('Failed to wrap stored selection');
            }
        }

        showCommentModal.value = false;
        currentSelection.value = null;
        await saveModifiedContent();
    } catch (error) {
        console.error('Error saving comment:', error);
    }
};

const cancelComment = () => {
    showCommentModal.value = false;
    currentSelection.value = null;
    selectedCommentText.value = '';
};

const search = (text: string) => {
    clearHighlights();
    const regex = new RegExp(escapeRegExp(text), 'gi');
    const walker = document.createTreeWalker(extractedContent.value, NodeFilter.SHOW_TEXT, null);
    const ranges = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;
        let match;
        while ((match = regex.exec(node.textContent)) !== null) {
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            ranges.push(range);
        }
    }

    matches.value = ranges.map(range => {
        const highlight = document.createElement('mark');
        highlight.className = 'search-highlight';
        range.surroundContents(highlight);
        return highlight;
    });

    return matches.value.length;
}

const scrollTo = (index: number) => {
    matches.value.forEach((el, idx) =>
        el.classList.toggle('active-highlight', idx === index)
    );
    if (matches.value[index]) {
        matches.value[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

const clearHighlights = () => {
    const highlights = extractedContent.value.querySelectorAll('mark.search-highlight');
    highlights.forEach(mark => {
        const parent = mark.parentNode;
        while (mark.firstChild) {
            parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
    });
}

const saveModifiedContent = async () => {
    try {
        if (!extractedContent.value) return;

        const resourceId = props.resourceId || route.params.id;
        if (!resourceId || resourceId === 'new') return;

        const modifiedContent = extractedContent.value.innerHTML;

        await updateResource(resourceId as string, {
            content: modifiedContent
        });

        emit('content-updated', modifiedContent);

        savedSuccessfully.value = true;

        setTimeout(() => {
            savedSuccessfully.value = false;
        }, 2000);
    } catch (error) {
        savedSuccessfully.value = false;
        alert('Failed to save content. Please try again.');
    }
};

const handleAddMark = async (data: { text: string; from: number; to: number }) => {
    try {
        const resourceId = props.resourceId || route.params.id;

        if (!resourceId || resourceId === 'new') {
            alert('Resource must be saved before adding marks');
            return;
        }

        const newMark = await createMark(resourceId as string, data.text);

        if (newMark && newMark._id) {
            wrapTextWithMark(data.text, newMark._id);
            await saveModifiedContent();
        }
    } catch (error) {
        alert('Failed to create mark. Please try again.');
    }
};

const handleRemoveMark = async (markId: string) => {
    try {
        removeMarkFromDOM(markId);
        await deleteMark(markId);
        await saveModifiedContent();
    } catch (error) {
        alert('Failed to remove mark. Please try again.');
    }
};

const wrapTextWithMark = (text: string, markId: string) => {
    if (!extractedContent.value) return;

    const walker = document.createTreeWalker(
        extractedContent.value,
        NodeFilter.SHOW_TEXT,
        null
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }

    for (const textNode of textNodes) {
        const content = textNode.textContent;
        if (content && content.includes(text)) {
            const index = content.indexOf(text);
            if (index !== -1) {
                const beforeText = content.substring(0, index);
                const afterText = content.substring(index + text.length);

                const span = document.createElement('span');
                span.className = 'text-mark';
                span.setAttribute('data-mark-id', markId);
                span.textContent = text;
                span.style.backgroundColor = '#FFE082';
                span.style.borderRadius = '0.15rem';
                span.style.padding = '0.05rem 0.15rem';
                span.style.cursor = 'pointer';

                span.addEventListener('dblclick', () => handleRemoveMark(markId));

                const parent = textNode.parentNode;
                if (beforeText) {
                    parent.insertBefore(document.createTextNode(beforeText), textNode);
                }
                parent.insertBefore(span, textNode);
                if (afterText) {
                    parent.insertBefore(document.createTextNode(afterText), textNode);
                }
                parent.removeChild(textNode);
                break;
            }
        }
    }
};

const removeMarkFromDOM = (markId: string) => {
    if (!extractedContent.value) return;

    const markElement = extractedContent.value.querySelector(`[data-mark-id="${markId}"]`);
    if (markElement) {
        const parent = markElement.parentNode;
        const text = markElement.textContent;
        parent.insertBefore(document.createTextNode(text), markElement);
        parent.removeChild(markElement);
        parent.normalize();
    }
};

const loadExistingMarks = async () => {
    try {
        const resourceId = props.resourceId || route.params.id;
        if (resourceId && resourceId !== 'new') {
            const marks = await loadMarks(resourceId as string);

            marks.forEach(mark => {
                if (mark.content && mark._id) {
                    const existingMark = extractedContent.value?.querySelector(`[data-mark-id="${mark._id}"]`);
                    if (!existingMark) {
                        wrapTextWithMark(mark.content, mark._id);
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading marks:', error);
    }
};

onMounted(() => {
    setTimeout(() => {
        loadExistingMarks();
        loadAndApplySettings();
    }, 100);
});

watch(
    () => settings.value,
    () => {
        applySettings();
    },
    { deep: true }
);

const storeSelectionPosition = (selection: Selection) => {
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const container = extractedContent.value;

    return {
        startNodePath: getNodePath(range.startContainer, container),
        startOffset: range.startOffset,
        endNodePath: getNodePath(range.endContainer, container),
        endOffset: range.endOffset,
        text: selection.toString()
    };
};

const getNodePath = (node: Node, container: Element): number[] => {
    const path: number[] = [];
    let current = node;

    while (current && current !== container) {
        const parent = current.parentNode;
        if (parent) {
            const index = Array.from(parent.childNodes).indexOf(current as ChildNode);
            path.unshift(index);
            current = parent;
        } else {
            break;
        }
    }

    return path;
};

const wrapStoredSelection = (storedPosition: any, wrapperElement: HTMLElement) => {
    if (!storedPosition || !extractedContent.value) return false;

    try {
        const startNode = getNodeByPath(storedPosition.startNodePath, extractedContent.value);
        const endNode = getNodeByPath(storedPosition.endNodePath, extractedContent.value);

        if (!startNode || !endNode) return false;

        const range = document.createRange();
        range.setStart(startNode, storedPosition.startOffset);
        range.setEnd(endNode, storedPosition.endOffset);

        if (range.toString() === storedPosition.text) {
            range.surroundContents(wrapperElement);
            return true;
        }
    } catch (error) {
        console.error('Error restoring selection:', error);
    }

    return false;
};

const getNodeByPath = (path: number[], container: Element): Node | null => {
    let current: Node = container;

    for (const index of path) {
        if (current.childNodes[index]) {
            current = current.childNodes[index];
        } else {
            return null;
        }
    }

    return current;
};

defineExpose({
    search,
    matches,
    scrollTo,
    clearHighlights,
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

:deep(.search-highlight) {
    background-color: yellow;
    border-radius: 2px;
}

:deep(.search-highlight.active-highlight) {
    background-color: orange;
}

:deep(.comment-mark) {
    background-color: rgba(255, 255, 0, 0.3);
    border-bottom: 2px solid #FFD700;
    cursor: pointer;
    position: relative;
    display: inline;
    padding: 2px 0;
}

:deep(.comment-mark:hover) {
    background-color: rgba(255, 255, 0, 0.5);
}

:deep(.resource-detail) {
    font-family: var(--font-family);
}

:deep(.resource-detail img) {
    width: 100%;
    margin: calc(var(--paragraph-spacing) * 0.5em) 0;
}

:deep(.resource-detail p) {
    font-size: calc(var(--font-size-p) * 1px);
    margin: calc(var(--paragraph-spacing) * 0.5em);
}

:deep(.resource-detail ul li) {
    font-size: calc(var(--font-size-p) * 1px);
}

:deep(.resource-detail h1) {
    font-size: calc(var(--font-size-p) * 2.2px);
    margin-bottom: calc(var(--paragraph-spacing) * 1em);
    margin-top: calc(var(--paragraph-spacing) * 0.1em);
}

:deep(.resource-detail h2) {
    font-size: calc(var(--font-size-p) * 1.8px);
    margin-bottom: calc(var(--paragraph-spacing) * 0.4em);
    margin-top: calc(var(--paragraph-spacing) * 0.1em);
}

:deep(.resource-detail h3) {
    font-size: calc(var(--font-size-p) * 1.5px);
    margin-bottom: calc(var(--paragraph-spacing) * 0.8em);
    margin-top: calc(var(--paragraph-spacing) * 0.1em);
}
</style>