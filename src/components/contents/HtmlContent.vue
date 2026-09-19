<template>
    <div>
        <Toolbar :editor="null" :resourceId="resourceId" :hasWorkspace="hasWorkspace" @add-mark="handleAddMark"
            @remove-mark="handleRemoveMark" @add-comment="handleAddComment"
            @add-reading-point="handleAddReadingPoint" @add-section-point="handleAddSectionPoint"
            @send-selection-to-workspace="onToolbarSendSelection" @send-selection-to-doc="onToolbarSendToDoc"
            @summarize-selection="onToolbarSummarizeSelection" />
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
        <ReadingPointsLayer v-if="resourceId && resourceId !== 'new'" ref="readingPointsLayerRef"
            :controller="readingPointsController" :target="extractedContent" />
        <div v-if="showContextMenu"
            :style="{ position: 'fixed', left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px', zIndex: 10000 }"
            class="bg-surface-elevated border-border border rounded shadow-lg">
            <ul class="py-1">
                <li class="px-4 py-2 hover:bg-surface-hover cursor-pointer" @click="saveImageAsResource">Save image as
                    resource</li>
            </ul>
        </div>
        <div v-if="annotationMenu.visible"
            :style="{ position: 'fixed', left: `${annotationMenu.x}px`, top: `${annotationMenu.y}px`, zIndex: 10001 }"
            class="bg-surface-elevated border-border border rounded shadow-lg">
            <ul class="py-1">
                <li class="px-4 py-2 hover:bg-surface-hover cursor-pointer text-sm"
                    @click="deleteAnnotationFromMenu">Eliminar</li>
            </ul>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, type PropType } from 'vue';
import { onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import Toolbar from './Toolbar.vue';
import { useMarkCreate } from '../../services/marks/useMarkCreate';
import { useMarkDelete } from '../../services/marks/useMarkDelete';
import { useMarks } from '../../services/marks/useMarks';
import { useResource } from '../../services/resources/useResource';
import { useCommentCreate } from '../../services/comments/useCommentCreate';
import { useCommentList } from '../../services/comments/useCommentList';
import { useProjectStore } from '../../store/projectStore';
import CommentModal from '../comments/CommentModal.vue';
import ReadingPointsLayer from '../readingPoints/ReadingPointsLayer.vue';
import { useReadingPointsController } from '../readingPoints/useReadingPointsController';
import apiClient from '../../services/api';
import type { ResourceContentMode } from '../../types/ResourceDisplayMode';

const extractedContent = ref<HTMLDivElement | null>(null);
const matches = ref([]);
const toc = ref<{ id: string; text: string; level: number }[]>([]);
const savedSuccessfully = ref(false);
const selectedCommentText = ref('');
const currentSelection = ref(null);
const showCommentModal = ref(false);
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
// Menú de un elemento anotado (resaltado o comentario): solo eliminarlo.
const annotationMenu = ref<{
    visible: boolean;
    x: number;
    y: number;
    kind: 'mark' | 'comment' | null;
    id: string | null;
}>({ visible: false, x: 0, y: 0, kind: null, id: null });
const contextMenuImageUrl = ref({ url: '', alt: '', name: '' });
const route = useRoute();
const { createMark } = useMarkCreate();
const { deleteMark } = useMarkDelete();
const { loadMarks } = useMarks();
const { updateResource } = useResource();
const { createComment, isLoading: isCommentLoading } = useCommentCreate();
const { loadComments } = useCommentList();
const { currentProject } = useProjectStore();

const props = defineProps({
    content: {
        type: String,
    },
    resourceId: {
        type: String,
        required: true,
    },
    hasWorkspace: {
        type: Boolean,
        default: false,
    },
    displayMode: {
        type: String as PropType<ResourceContentMode>,
        default: 'extracted',
    },
    readingPointsController: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(['content-updated', 'highlight-comment', 'send-selection-to-workspace', 'send-selection-to-doc', 'summarize-selection']);

const readingPointsLayerRef = ref<any>(null);
const readingPointsController = (props as any).readingPointsController
    ?? useReadingPointsController(() => props.resourceId || '', 'resource');

const handleAddReadingPoint = (coords?: { x: number; y: number }) =>
    readingPointsLayerRef.value?.saveReadingAt(coords?.x ?? -1, coords?.y ?? -1);
const handleAddSectionPoint = (coords?: { x: number; y: number }) =>
    readingPointsLayerRef.value?.saveSectionAt(coords?.x ?? -1, coords?.y ?? -1);
const onReadingPointKeydown = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return;
    const key = event.key.toLowerCase();
    if (key === 'm') {
        event.preventDefault();
        handleAddReadingPoint();
    } else if (key === 'k') {
        event.preventDefault();
        handleAddSectionPoint();
    }
};

const onToolbarSendSelection = (text: string) => {
    // Forward the event up to parent components (Resource.vue)
    try {
        if (text && text.trim()) {
            emit('send-selection-to-workspace', text);
        }
    } catch (e) {
        console.error('Failed to forward send-selection-to-workspace event', e);
    }
};

const onToolbarSendToDoc = (text: string) => {
    try {
        if (text && text.trim()) {
            emit('send-selection-to-doc', text);
        }
    } catch (e) {
        console.error('Failed to forward send-selection-to-doc event', e);
    }
};

const onToolbarSummarizeSelection = (text: string) => {
    try {
        if (text && text.trim()) {
            emit('summarize-selection', text);
        }
    } catch (e) {
        console.error('Failed to forward summarize-selection event', e);
    }
};

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

const anchorFromContainer = (quote: string) => {
    const text = extractedContent.value?.textContent || '';
    if (!quote) return {};
    const at = text.indexOf(quote);
    if (at < 0) return { quote };
    const CONTEXT = 120;
    return {
        quote,
        prefix: text.slice(Math.max(0, at - CONTEXT), at),
        suffix: text.slice(at + quote.length, at + quote.length + CONTEXT),
        position: at,
    };
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
            'resource',
            anchorFromContainer(selectedCommentText.value),
        );

        if (currentSelection.value) {
            const span = document.createElement('span');
            span.className = 'comment-mark';
            span.setAttribute('data-comment-id', newComment.id);

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

const clearEntityHighlights = () => {
    if (!extractedContent.value) return;
    const highlights = extractedContent.value.querySelectorAll('mark.entity-highlight');
    highlights.forEach(mark => {
        const parent = mark.parentNode;
        while (mark.firstChild) {
            parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
    });
};

/**
 * Build a mapping from normalized (accent-free) string positions back to original string positions.
 * Returns { normalized, map } where map[i] = index in original string for position i in normalized.
 */
const buildNormalizedMap = (original: string): { normalized: string; map: number[] } => {
    const map: number[] = [];
    let normalized = '';
    for (let i = 0; i < original.length; i++) {
        const nfd = original[i].normalize('NFD');
        for (const ch of nfd) {
            // Skip combining diacritical marks (U+0300–U+036F)
            if (ch.charCodeAt(0) >= 0x0300 && ch.charCodeAt(0) <= 0x036f) continue;
            normalized += ch;
            map.push(i);
        }
    }
    // Add end sentinel so we can slice correctly
    map.push(original.length);
    return { normalized, map };
};

const highlightEntity = (entityName: string, aliases: string[] = []) => {
    if (!extractedContent.value) return;

    clearEntityHighlights();

    const termsToHighlight = [entityName, ...(aliases || [])].filter(term => term && term.trim());
    if (termsToHighlight.length === 0) return;

    const walker = document.createTreeWalker(
        extractedContent.value,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tagName = parent.tagName.toLowerCase();
                if (tagName === 'mark' || tagName === 'script' || tagName === 'style') {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.classList.contains('search-highlight') ||
                    parent.classList.contains('entity-highlight') ||
                    parent.classList.contains('comment-mark') ||
                    parent.classList.contains('marker-highlight') ||
                    parent.classList.contains('text-mark')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const nodesToProcess: Text[] = [];
    let node;
    while (node = walker.nextNode()) {
        nodesToProcess.push(node as Text);
    }

    // Normalize search terms (remove accents for matching)
    const normalizedTerms = termsToHighlight.map(t => escapeRegExp(t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()));
    const termsPattern = normalizedTerms.join('|');

    let totalHighlighted = 0;

    nodesToProcess.forEach(textNode => {
        const originalText = textNode.textContent;
        if (!originalText) return;

        // Build normalized text with position mapping back to original
        const { normalized, map } = buildNormalizedMap(originalText);

        // Try with Unicode-aware word boundaries first
        let pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${termsPattern})(?![\\p{L}\\p{N}])`, 'giu');
        let matches: { origStart: number; origEnd: number }[] = [];
        let match;

        while ((match = pattern.exec(normalized)) !== null) {
            const normStart = match.index;
            const normEnd = normStart + match[0].length;
            matches.push({ origStart: map[normStart], origEnd: map[normEnd] });
        }

        // Fallback: if no matches with word boundaries, try without boundaries (simple substring)
        if (matches.length === 0) {
            const fallbackPattern = new RegExp(`(${termsPattern})`, 'giu');
            while ((match = fallbackPattern.exec(normalized)) !== null) {
                const normStart = match.index;
                const normEnd = normStart + match[0].length;
                matches.push({ origStart: map[normStart], origEnd: map[normEnd] });
            }
        }

        if (matches.length === 0) return;

        const parent = textNode.parentNode;
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;

        for (const m of matches) {
            if (m.origStart > lastIndex) {
                fragment.appendChild(document.createTextNode(originalText.slice(lastIndex, m.origStart)));
            }
            const highlight = document.createElement('mark');
            highlight.className = 'entity-highlight';
            highlight.textContent = originalText.slice(m.origStart, m.origEnd);
            fragment.appendChild(highlight);
            lastIndex = m.origEnd;
            totalHighlighted++;
        }

        if (lastIndex < originalText.length) {
            fragment.appendChild(document.createTextNode(originalText.slice(lastIndex)));
        }

        parent?.replaceChild(fragment, textNode);
    });

    // Scroll to first highlight
    if (totalHighlighted > 0) {
        const firstHighlight = extractedContent.value.querySelector('.entity-highlight');
        if (firstHighlight) {
            firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};

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

const handleAddMark = async (data: { text: string; from: number; to: number; type?: string }) => {
    try {
        const resourceId = props.resourceId || route.params.id;

        if (!resourceId || resourceId === 'new') {
            alert('Resource must be saved before adding marks');
            return;
        }

        const type = data.type || 'highlight';
        const newMark = await createMark(
            resourceId as string,
            data.text,
            'resource',
            type,
            anchorFromContainer(data.text),
        );

        if (newMark && newMark.id) {
            wrapTextWithMark(data.text, newMark.id, type);
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

const wrapTextWithMark = (text: string, markId: string, type: string = 'highlight') => {
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
                span.className = `marker-highlight marker-type-${type}`;
                span.setAttribute('data-mark-id', markId);
                span.setAttribute('data-mark-type', type);
                span.textContent = text;
                span.style.cursor = 'pointer';

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

const wrapTextWithComment = (text: string, commentId: string) => {
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
                span.className = 'comment-mark';
                span.setAttribute('data-comment-id', commentId);
                span.textContent = text;
                span.style.cursor = 'pointer';

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
            const marks = await loadMarks(resourceId as string, 'resource');

            marks.forEach(mark => {
                if (mark.content && mark.id) {
                    const existingMark = extractedContent.value?.querySelector(`[data-mark-id="${mark.id}"]`);
                    if (!existingMark) {
                        wrapTextWithMark(mark.content, mark.id, mark.type || 'highlight');
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading marks:', error);
    }
};

const loadExistingComments = async () => {
    try {
        const resourceId = props.resourceId || route.params.id;
        if (!resourceId || resourceId === 'new') return;

        const list: any[] = await loadComments(String(resourceId), 'resource');
        (list || []).forEach((comment) => {
            if (!comment.id || !comment.quote) return;
            const existing = extractedContent.value?.querySelector(`[data-comment-id="${comment.id}"]`);
            if (!existing) {
                wrapTextWithComment(comment.quote, comment.id);
            }
        });
    } catch (error) {
        console.error('Error loading comments:', error);
    }
};

onMounted(() => {
    setTimeout(() => {
        loadExistingMarks();
        loadExistingComments();
        loadAndApplySettings();
    }, 100);
    if (extractedContent.value) {
        extractedContent.value.addEventListener('contextmenu', handleImageContextMenu);
    }
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', onReadingPointKeydown);
    setTimeout(() => buildToc(), 150);
});

watch(
    () => settings.value,
    () => {
        applySettings();
    },
    { deep: true }
);

// rebuild TOC when content changes
watch(
    () => props.content,
    () => {
        setTimeout(() => {
            buildToc();
        }, 50);
    }
);

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '')
        .replace(/-+/g, '-');
};

const buildToc = () => {
    toc.value = [];
    if (!extractedContent.value) return;
    const headings = extractedContent.value.querySelectorAll('h1,h2,h3,h4,h5,h6');
    const used = new Set<string>();
    headings.forEach((h: Element) => {
        const level = parseInt(h.tagName.substring(1), 10);
        const text = (h.textContent || '').trim();
        if (!text) return;
        let id = h.getAttribute('id') || slugify(text);
        let unique = id;
        let i = 1;
        while (used.has(unique)) {
            unique = `${id}-${i++}`;
        }
        used.add(unique);
        h.setAttribute('id', unique);
        toc.value.push({ id: unique, text, level });
    });
};

const scrollToHeading = (id: string) => {
    if (!extractedContent.value) return;
    const el = extractedContent.value.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    if (el) {
        // scroll within the container
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('toc-target');
        setTimeout(() => el.classList.remove('toc-target'), 1500);
    }
};

const storeSelectionPosition = (selection: Selection) => {    if (!selection.rangeCount) return null;

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

const isRemoteImage = (src) => {
    if (typeof src === 'string' && src.startsWith('data:image/')) {
        return true;
    }
    try {
        const url = new URL(src, window.location.origin);
        return url.origin !== window.location.origin && url.protocol.startsWith('http');
    } catch {
        return false;
    }
};

const handleImageContextMenu = (event) => {
    // Un clic derecho sobre un resaltado o un comentario abre su propio menú,
    // con la única opción de eliminarlo.
    const target = event.target as HTMLElement | null;
    const markEl = target?.closest?.('[data-mark-id]') as HTMLElement | null;
    const commentEl = target?.closest?.('[data-comment-id]') as HTMLElement | null;
    if (markEl || commentEl) {
        event.preventDefault();
        showContextMenu.value = false;
        annotationMenu.value = {
            visible: true,
            x: event.clientX,
            y: event.clientY,
            kind: markEl ? 'mark' : 'comment',
            id: markEl ? markEl.getAttribute('data-mark-id') : commentEl!.getAttribute('data-comment-id'),
        };
        return;
    }
    annotationMenu.value.visible = false;

    if (!extractedContent.value) return;
    if (target && target.tagName === 'IMG') {
        const src = target.getAttribute('src');
        if (src && isRemoteImage(src)) {
            event.preventDefault();
            let name = '';
            try {
                const urlObj = new URL(src, window.location.origin);
                name = urlObj.pathname.split('/').pop() || '';
            } catch {
                name = src.split('/').pop() || '';
            }
            contextMenuImageUrl.value = { url: src, alt: target.getAttribute('alt') || '', name: name };
            showContextMenu.value = true;
            contextMenuPosition.value = { x: event.clientX, y: event.clientY };
        } else {
            showContextMenu.value = false;
        }
    } else {
        showContextMenu.value = false;
    }
};

const handleClickOutside = (event) => {
    if (showContextMenu.value) {
        showContextMenu.value = false;
    }
    if (annotationMenu.value.visible) {
        annotationMenu.value.visible = false;
    }
};

const deleteAnnotationFromMenu = async () => {
    const menu = annotationMenu.value;
    annotationMenu.value.visible = false;
    if (!menu.id) return;
    if (menu.kind === 'mark') {
        await handleRemoveMark(menu.id);
    } else {
        await removeCommentMark(menu.id);
    }
};

const saveImageAsResource = async () => {
    if (!contextMenuImageUrl.value) return;
    try {
        const response = await fetch(contextMenuImageUrl.value.url);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('file', blob, 'imported-image.jpg');
        formData.append('relatedTo', props.resourceId);
        formData.append('projectId', currentProject.id);
        formData.append('url', contextMenuImageUrl.value.url);
        formData.append('originalName', contextMenuImageUrl.value.name);
        formData.append('name', contextMenuImageUrl.value.alt || '');

        await apiClient.post('/resources/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        emit('content-updated');
    } catch (error) {
        console.error('Error importing image as resource:', error);
        alert('Failed to import image as resource.');
    } finally {
        showContextMenu.value = false;
    }
};

const highlightComment = (commentId: string) => {
    if (!extractedContent.value) return;
    const el = extractedContent.value.querySelector(`span[data-comment-id="${commentId}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.transition = 'background-color 0.5s ease';
    el.style.backgroundColor = 'var(--color-accent-subtle, rgba(99, 102, 241, 0.2))';
    setTimeout(() => {
        el.style.backgroundColor = '';
    }, 2000);
};

const removeCommentMark = async (commentId: string) => {
    if (!extractedContent.value) return;
    const el = extractedContent.value.querySelector(`span[data-comment-id="${commentId}"]`) as HTMLElement | null;
    if (!el) return;
    const parent = el.parentNode;
    if (parent) {
        while (el.firstChild) {
            parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
        parent.normalize();
    }
    await saveModifiedContent();
};

onBeforeUnmount(() => {
    if (extractedContent.value) {
        extractedContent.value.removeEventListener('contextmenu', handleImageContextMenu);
    }
    document.removeEventListener('click', handleClickOutside);
    window.removeEventListener('keydown', onReadingPointKeydown);
});
defineExpose({
    search,
    matches,
    scrollTo,
    scrollToHeading,
    toc,
    clearHighlights,
    highlightEntity,
    clearEntityHighlights,
    highlightComment,
    removeCommentMark,
    openReadingPoint(point: any) {
        readingPointsLayerRef.value?.openPoint(point);
    },
});
</script>

<style scoped>
:deep(.marker-type-idea) {
    background: rgba(59, 130, 246, 0.12);
    border-bottom: 2px solid #3B82F6;
}

:deep(.marker-type-important) {
    background: rgba(239, 68, 68, 0.12);
    border-bottom: 2px solid #EF4444;
}

:deep(.marker-type-review) {
    background: rgba(245, 158, 11, 0.12);
    border-bottom: 2px solid #F59E0B;
}

:deep(.marker-type-highlight) {
    background: #FFE082;
}

:deep(.marker-highlight) {
    border-radius: 2px;
    padding: 1px 2px;
    cursor: pointer;
}

:deep(.marker-highlight:hover) {
    filter: brightness(0.92);
}

/* Legacy class name kept for content saved before the unified mark model. */
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

:deep(.entity-highlight) {
    background-color: #E3F2FD;
    border-radius: 0.25rem;
    padding: 0.125rem;
    border: 1px solid #2196F3;
    color: #1976D2;
    font-weight: 500;
    cursor: pointer;
}

:deep(.entity-highlight:hover) {
    background-color: #BBDEFB;
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
    overflow-x: auto;
}

:deep(.resource-detail img) {
    margin: calc(var(--paragraph-spacing) * 0.5em) 0;
}

:deep(.resource-detail p) {
    font-size: calc(var(--font-size-p) * 1px);
    margin: calc(var(--paragraph-spacing) * 0.5em);
}

/* Ensure lists show bullets/numbers and proper indentation inside resource content */
:deep(.resource-detail ul),
:deep(.resource-detail ol) {
    margin-top: calc(var(--paragraph-spacing) * 0.5em);
    margin-bottom: calc(var(--paragraph-spacing) * 0.75em);
    padding-left: 2rem;
    /* increase indentation from container */
    /* Use outside so marker doesn't wrap into its own line */
    list-style-position: outside;
}

:deep(.resource-detail ul) {
    list-style-type: disc;
}

:deep(.resource-detail ol) {
    list-style-type: decimal;
}

:deep(.resource-detail ul ul),
:deep(.resource-detail ol ul),
:deep(.resource-detail ul ol),
:deep(.resource-detail ol ol) {
    padding-left: 1.25rem;
    /* nested lists increase indentation */
    margin-top: 0;
    margin-bottom: 0;
}

/* Try to reduce the visual gap between marker and text */
:deep(.resource-detail li) {
    margin-bottom: calc(var(--paragraph-spacing) * 0.25em);
}

/* Make sure paragraphs inside list items don't create extra line breaks */
:deep(.resource-detail li > p) {
    display: inline;
    margin: 0;
}

:deep(.resource-detail li::marker) {
    /* Slightly reduce marker font size so it sits closer to the text */
    font-size: 0.95em;
    opacity: 0.95;
    /* Add a small right margin to keep marker near text */
    margin-right: 0.35rem;
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

:deep(.resource-detail table) {
    width: auto;
    max-width: 100%;
    table-layout: auto;
    display: block;
    overflow-x: auto;
    margin: 1em 0;
    background: var(--color-surface-elevated);
    font-size: calc(var(--font-size-p) * 1px);
}

:deep(.resource-detail th),
:deep(.resource-detail td) {
    border: 1px solid var(--color-border);
    padding: 0.75em 1em;
    text-align: left;
}

:deep(.resource-detail th) {
    background: var(--color-surface-hover);
    font-weight: 600;
    color: var(--color-text-secondary);
}

:deep(.resource-detail tr:nth-child(even)) {
    background: var(--color-surface-hover);
}

:deep(.resource-detail tr:hover) {
    background: var(--color-surface-hover);
}

/* highlight when navigated from TOC */
:deep(.toc-target) {
    transition: background-color 0.3s ease;
    background-color: rgba(99, 102, 241, 0.12);
}
</style>
