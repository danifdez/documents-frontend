<template>
    <div class="toc-sidebar flex flex-col h-full bg-surface-elevated rounded-2xl border border-border">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border-light flex-shrink-0">
            <h3 class="text-sm font-semibold text-text-primary">Table of Contents</h3>
            <button @click="refresh" title="Refresh"
                class="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
        </div>
        <div class="flex-1 overflow-y-auto py-2">
            <div v-if="entries.length === 0" class="text-text-muted text-sm px-4 py-6 text-center">
                No headings found
            </div>
            <nav v-else>
                <ul>
                    <li v-for="entry in entries" :key="entry.key">
                        <template v-if="entry.kind === 'heading'">
                            <button @click="scrollToHeading(entry.heading!)" :class="[
                                'w-full text-left py-1.5 pr-3 transition-colors hover:bg-surface-hover cursor-pointer',
                                `toc-level-${entry.level}`
                            ]" :style="{ paddingLeft: `${(entry.level - 1) * 12 + 16}px` }"
                                :title="entry.label">
                                <span class="block whitespace-normal break-words text-sm">{{ entry.label }}</span>
                            </button>
                        </template>
                        <button v-else @click="goToPoint(entry.point!)"
                            class="w-full text-left py-1.5 pr-3 transition-colors hover:bg-surface-hover cursor-pointer"
                            :class="entry.kind === 'reading' ? 'toc-point-reading' : 'toc-point-section'"
                            :style="{ paddingLeft: pointIndent(entry) }" :title="entry.label">
                            <span class="flex items-center gap-1.5 min-w-0">
                                <span class="toc-point-dot"
                                    :class="entry.kind === 'reading' ? 'toc-point-dot-reading' : 'toc-point-dot-section'"></span>
                                <span class="truncate text-sm">{{ entry.label }}</span>
                                <span v-if="entry.point && entry.point.kind === 'reading'" class="toc-point-tag">progreso</span>
                            </span>
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch, computed } from 'vue';
import { useReadingPointsController } from '../readingPoints/useReadingPointsController';
import { useTocWithReadingPoints, type TocEntry, type TocHeadingLike } from '../readingPoints/useTocWithReadingPoints';
import { scrollToPoint } from '../readingPoints/useReadingPointAnchors';

interface Heading {
    id: string;
    text: string;
    level: number;
    position: number;
}

const props = defineProps<{
    editor: any;
    controller?: ReturnType<typeof useReadingPointsController> | null;
    target?: HTMLElement | null;
}>();

const emit = defineEmits<{
    scrollTo: [position: number];
}>();

const headings = ref<TocHeadingLike[]>([]);
const activeHeadingId = ref<string>('');

const localController = useReadingPointsController(() => '', 'doc');
const readingController = computed(() => props.controller ?? localController);
const enabled = computed(() => Boolean(props.controller));
const { entries } = useTocWithReadingPoints(headings, readingController.value, enabled);

// Un marca de lectura va a nivel 0; el punto de libro se sangra un paso.
const pointIndent = (entry: TocEntry): string => {
    const base = entry.kind === 'reading' ? 0 : 12;
    return `${base + 16}px`;
};

// Cleanup function for editor event listeners
let editorUpdateCleanup: (() => void) | null = null;
let scrollListenerCleanup: (() => void) | null = null;

const updateActiveHeadingOnScroll = () => {
    if (!props.editor || headings.value.length === 0) return;

    try {
        const editorElement = props.editor.view.dom;
        const scrollContainer = editorElement.closest('.editor-content') || editorElement.parentElement;

        if (!scrollContainer) return;

        const containerRect = scrollContainer.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop;

        // Find which heading is currently most visible
        let currentHeading = headings.value[0];

        for (const heading of headings.value) {
            const headingElements = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6');

            for (const el of headingElements) {
                if (el.textContent?.trim() === heading.text) {
                    const elementRect = el.getBoundingClientRect();
                    const elementTop = elementRect.top - containerRect.top + scrollTop;

                    // If this heading is above or at the current scroll position, it could be the active one
                    if (elementTop <= scrollTop + 100) { // 100px threshold
                        currentHeading = heading;
                    }
                    break;
                }
            }
        }

        if (currentHeading.id !== activeHeadingId.value) {
            activeHeadingId.value = currentHeading.id;
        }
    } catch (error) {
        console.error('Error updating active heading:', error);
    }
};

const extractHeadings = () => {
    if (!props.editor || !props.editor.state) return;

    const newHeadings: Heading[] = [];
    const doc = props.editor.state.doc;

    try {
        // Use descendants method which is the standard way in ProseMirror
        doc.descendants((node: any, pos: number) => {
            if (node.type && node.type.name === 'heading') {
                const text = node.textContent ? node.textContent.trim() : '';

                if (text) {
                    const level = node.attrs && node.attrs.level ? node.attrs.level : 1;
                    const id = generateHeadingId(text);

                    newHeadings.push({
                        id,
                        text,
                        level,
                        position: pos
                    });
                }
            }
            return true; // Continue traversing
        });
    } catch (error) {
        console.error('Error during heading extraction:', error);
    }

    headings.value = newHeadings;
};

const generateHeadingId = (text: string): string => {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
};

const scrollToHeading = (heading: Heading) => {
    // Set active heading for visual feedback
    activeHeadingId.value = heading.id;

    // Emit scroll event to parent
    emit('scrollTo', heading.position);

    // Additional fallback scroll mechanism
    setTimeout(() => {
        if (props.editor && props.editor.view) {
            try {
                // Alternative approach: find the heading by text content
                const editorElement = props.editor.view.dom;
                const headings = editorElement.querySelectorAll('h1, h2, h3, h4, h5, h6');

                for (const el of headings) {
                    if (el.textContent?.trim() === heading.text) {
                        const scrollContainer = editorElement.closest('.editor-content') || editorElement.parentElement;

                        if (scrollContainer) {
                            const containerRect = scrollContainer.getBoundingClientRect();
                            const elementRect = el.getBoundingClientRect();
                            const offset = 20; // Offset from top

                            const targetScroll = scrollContainer.scrollTop + (elementRect.top - containerRect.top) - offset;

                            scrollContainer.scrollTo({
                                top: Math.max(0, targetScroll),
                                behavior: 'smooth'
                            });
                        }
                        break;
                    }
                }
            } catch (error) {
                console.error('Fallback scroll error:', error);
            }
        }
    }, 300);
};

const goToPoint = (point: any) => {
    if (props.target) scrollToPoint(props.target, point);
};

const refresh = () => {
    extractHeadings();
    readingController.value.load();
};

const updateActiveHeading = (scrollTop: number) => {
    // This would be called when the user scrolls to update the active heading
    // For now, we'll implement a simple version
    if (headings.value.length > 0) {
        // Find the closest heading based on scroll position
        // This is a simplified implementation
        const currentHeading = headings.value[0];
        activeHeadingId.value = currentHeading.id;
    }
};

// Watch for editor changes to update headings
watch(() => props.editor, (newEditor, oldEditor) => {
    // Cleanup previous editor listeners
    if (editorUpdateCleanup) {
        editorUpdateCleanup();
        editorUpdateCleanup = null;
    }

    if (scrollListenerCleanup) {
        scrollListenerCleanup();
        scrollListenerCleanup = null;
    }

    if (newEditor && newEditor.state) {
        // Initial extraction
        setTimeout(() => {
            extractHeadings();
        }, 200);

        // Listen to editor update events
        const updateHandler = () => {
            setTimeout(extractHeadings, 100);
        };

        newEditor.on('update', updateHandler);

        // Set up scroll listener for active heading detection
        setTimeout(() => {
            const editorElement = newEditor.view.dom;
            const scrollContainer = editorElement.closest('.editor-content') || editorElement.parentElement;

            if (scrollContainer) {
                const scrollHandler = () => {
                    updateActiveHeadingOnScroll();
                };

                scrollContainer.addEventListener('scroll', scrollHandler, { passive: true });

                scrollListenerCleanup = () => {
                    scrollContainer.removeEventListener('scroll', scrollHandler);
                };
            }
        }, 300);

        // Store cleanup function
        editorUpdateCleanup = () => {
            newEditor.off('update', updateHandler);
        };
    }
}, { immediate: true });

// Also watch document changes as fallback
watch(() => props.editor?.state?.doc?.content, () => {
    if (props.editor?.state?.doc) {
        setTimeout(() => {
            extractHeadings();
        }, 100);
    }
}, { deep: true });

// El panel puede montarse con los puntos ya cargados por la página; si no,
// recárgalos al aparecer.
watch(() => props.controller, (value) => {
    if (value) value.load();
}, { immediate: true });

defineExpose({
    extractHeadings,
    updateActiveHeading
});

// Cleanup on component unmount
onBeforeUnmount(() => {
    if (editorUpdateCleanup) {
        editorUpdateCleanup();
    }
    if (scrollListenerCleanup) {
        scrollListenerCleanup();
    }
});
</script>

<style scoped>
.toc-sidebar {
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) var(--color-surface-hover);
    background: transparent;
    border: 0;
}

.toc-sidebar::-webkit-scrollbar {
    width: 6px;
}

.toc-sidebar::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
}

.toc-sidebar::-webkit-scrollbar-track {
    background: var(--color-surface-hover);
}

.toc-level-1 {
    font-weight: 700;
    color: var(--color-text-primary);
    font-size: 1.1rem;
}

.toc-level-2 {
    font-weight: 400;
    color: var(--color-text-secondary);
    font-size: 1.1rem;
}

.toc-level-3 {
    font-weight: 400;
    color: var(--color-text-muted);
    font-size: 0.9rem;
}

.toc-point-reading {
    color: var(--color-text-primary);
}

.toc-point-section {
    color: var(--color-text-secondary);
}

.toc-point-dot {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    flex-shrink: 0;
}

.toc-point-dot-reading {
    background: #8ab4f8;
}

.toc-point-dot-section {
    background: #49be8f;
}

.toc-point-tag {
    margin-left: auto;
    font-size: 10px;
    color: var(--color-text-muted);
}

.toc-sidebar button:hover {
    background: transparent !important;
    transform: none !important;
}

.toc-sidebar button:active {
    transform: none !important;
}

.toc-sidebar button {
    text-align: left;
    background: transparent;
    border: none;
    box-shadow: none;
    appearance: none;
}

.toc-sidebar ul {
    list-style-type: none;
    padding-left: 0;
    margin: 0;
}

.toc-sidebar ul li {
    margin-bottom: 0;
    /* use `space-y` for spacing only; remove extra gap */
}
</style>
