<template>
    <div class="toc-sidebar flex flex-col min-w-[250px] max-w-[300px] h-full">
        <div class="flex items-center justify-start gap-2 p-4 pb-2 flex-shrink-0">
            <h3 class="text-lg font-semibold text-gray-800">Table of Contents</h3>
            <Button @click="extractHeadings" title="Refresh TOC">
                ↻
            </Button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 pt-2">
            <div v-if="headings.length === 0" class="text-gray-500 text-sm italic">
                No headings found
            </div>
            <nav v-else>
                <ul class="space-y-1">
                    <li v-for="(heading, index) in headings" :key="index">
                        <Button @click="scrollToHeading(heading)" :class-name="[
                            'inline-flex items-start justify-start w-full text-left py-2 px-3 text-sm leading-normal',
                            `toc-level-${heading.level}`
                        ].join(' ')" :style="{ paddingLeft: `${(heading.level - 1) * 12 + 12}px` }"
                            :title="heading.text">
                            <span class="block whitespace-normal break-words">{{ heading.text }}</span>
                        </Button>
                    </li>
                </ul>
            </nav>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import Button from '../ui/Button.vue';

interface Heading {
    id: string;
    text: string;
    level: number;
    position: number;
}

const props = defineProps<{
    editor: any;
}>();

const emit = defineEmits<{
    scrollTo: [position: number];
}>();

const headings = ref<Heading[]>([]);
const activeHeadingId = ref<string>('');

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
}; const generateHeadingId = (text: string): string => {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
};

const scrollToHeading = (heading: Heading) => {
    console.log('Scrolling to heading:', heading);

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

                            console.log('Fallback scroll executed for:', heading.text);
                        }
                        break;
                    }
                }
            } catch (error) {
                console.error('Fallback scroll error:', error);
            }
        }
    }, 300);
}; const updateActiveHeading = (scrollTop: number) => {
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
}, { immediate: true });// Also watch document changes as fallback
watch(() => props.editor?.state?.doc?.content, () => {
    if (props.editor?.state?.doc) {
        setTimeout(() => {
            extractHeadings();
        }, 100);
    }
}, { deep: true });

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
    scrollbar-color: #cbd5e1 #f1f5f9;
    background: transparent;
    border: 0;
}

.toc-sidebar::-webkit-scrollbar {
    width: 6px;
}

.toc-sidebar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

.toc-sidebar::-webkit-scrollbar-track {
    background: #f1f5f9;
}

.toc-level-1 {
    font-weight: 700;
    /* bold */
    color: #1f2937;
    font-size: 1.1rem;
    /* slightly larger */
}

.toc-level-2 {
    font-weight: 400;
    /* not bold */
    color: #374151;
    font-size: 1.1rem;
    /* same size as h1 */
}

.toc-level-3 {
    font-weight: 400;
    /* not bold */
    color: #6b7280;
    font-size: 0.9rem;
    /* normal */
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
