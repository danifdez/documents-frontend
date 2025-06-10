<template>
    <div>
        <Toolbar :editor="null" :resourceId="resourceId" @add-mark="handleAddMark" @remove-mark="handleRemoveMark" />
        <div class="relative">
            <div v-if="savedSuccessfully"
                class="absolute top-2 right-2 bg-green-100 text-green-800 px-3 py-1 rounded-md shadow-sm z-10">
                Content saved
            </div>
            <div ref="extractedContent" class="w-full min-h-[600px] resource-detail" v-html="content"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Toolbar from './Toolbar.vue';
import { useMarkCreate } from '../../services/marks/useMarkCreate';
import { useMarkDelete } from '../../services/marks/useMarkDelete';
import { useMarks } from '../../services/marks/useMarks';
import { useResource } from '../../services/resources/useResource';

const extractedContent = ref<HTMLDivElement | null>(null);
const matches = ref([]);
const savedSuccessfully = ref(false);
const route = useRoute();
const { createMark } = useMarkCreate();
const { deleteMark } = useMarkDelete();
const { loadMarks } = useMarks();
const { updateResource } = useResource();

const props = defineProps({
    content: {
        type: String,
    },
    resourceId: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['content-updated']);

const escapeRegExp = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    }, 100);
});

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
</style>