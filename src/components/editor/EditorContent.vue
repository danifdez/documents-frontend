<template>
    <div class="editor-container">
        <EditorToolbar :editor="editor" :is-saving="isSaving" :saved-successfully="savedSuccessfully"
            :show-comments="showComments" :show-toc="showToc" :context="context" @add-comment="handleAddCommentRequest"
            @add-mark="handleAddMarkRequest" @remove-mark="handleRemoveMark"
            @add-reference="showReferenceModal = true" @add-dataset-view="showDatasetViewModal = true"
            @add-dataset-chart="showDatasetChartModal = true" @add-canvas-view="showCanvasViewModal = true"
            @add-timeline-view="showTimelineViewModal = true" @add-citation="showCitationModal = true"
            @convert-table-to-dataset="handleConvertTableToDataset"
            @marker-applied="emit('marker-applied')" />
        <div class="editor-scroll-wrapper">
            <div class="flex-1 p-4 border border-border rounded-lg overflow-auto bg-surface-elevated min-h-[300px] outline-none font-sans leading-relaxed editor-content"
                ref="editorScrollRef"
                spellcheck="false" autocorrect="off" autocomplete="off" data-gramm="false" data-enable-grammarly="false"
                data-lt-tmp-id="false" data-lt-active="false" data-lt-autocomplete="off" data-lt-spellcheck="false">
                <div class="editor-with-gutter" ref="editorWithGutterRef">
                    <div class="editor-main">
                        <template v-if="editor">
                            <editor-content :style="cssVars" :editor="editor" />
                        </template>
                        <BibliographyList
                            v-if="context === 'document' && editor"
                            :editor="editor"
                            :entries="bibliographyEntries"
                            :citation-format="(props.citationFormat as 'apa' | 'numeric')"
                        />
                    </div>
                    <div v-if="context !== 'summary'" class="marker-gutter">
                        <div v-for="m in markerPositions" :key="m.id"
                            class="marker-gutter-icon"
                            :class="`marker-gutter-icon-${m.type}`"
                            :style="{ top: m.top + 'px' }"
                            :title="m.label + ': ' + m.text"
                            @click="handleMarkerGutterClick(m.id)">
                            {{ m.icon }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <CommentModal :is-visible="showCommentModal" :selected-text="selectedCommentText" :is-loading="isCommentLoading"
            @save="saveComment" @cancel="cancelComment" />
        <MarkModal :is-visible="showMarkModal" :selected-text="selectedMarkText" :is-loading="isMarkLoading"
            @save="saveMark" @cancel="cancelMark" />
        <ReferenceModal v-model="showReferenceModal" @select="handleReferenceSelect" />
        <DatasetViewConfigModal v-model="showDatasetViewModal" @insert="handleDatasetViewInsert" />
        <DatasetChartConfigModal v-model="showDatasetChartModal" @insert="handleDatasetChartInsert" />
        <CanvasViewConfigModal v-model="showCanvasViewModal" @insert="handleCanvasViewInsert" />
        <TimelineViewConfigModal v-model="showTimelineViewModal" @insert="handleTimelineViewInsert" />
        <TableToDatasetModal v-model="showTableToDatasetModal" :table-data="parsedTableData"
            :project-id="projectId" @created="handleTableDatasetCreated" />
        <CitationModal
            v-model="showCitationModal"
            :entries="bibliographyEntries"
            :citation-format="(props.citationFormat as 'apa' | 'numeric')"
            :existing-entry-ids="citedEntryIds"
            @select="handleCitationSelect"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import { Editor, EditorContent } from '@tiptap/vue-3';
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin } from 'prosemirror-state';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import CommentExtension from './extensions/CommentExtension';
import MarkExtension from './extensions/MarkExtension';
import { MarkerExtension, MARKER_CONFIG } from './extensions/CalloutExtension';
import type { MarkerType } from './extensions/CalloutExtension';
import { MathExtension } from './extensions/MathExtension';
import { VideoExtension } from './extensions/VideoExtension';
import EditorToolbar from './EditorToolbar.vue';
import CommentModal from '../comments/CommentModal.vue';
import MarkModal from '../marks/MarkModal.vue';
import { useRoute, useRouter } from 'vue-router';
import { useCommentCreate } from '../../services/comments/useCommentCreate';
import { useMarkCreate } from '../../services/marks/useMarkCreate';
import { useMarkUpdate } from '../../services/marks/useMarkUpdate';
import { useMarkDelete } from '../../services/marks/useMarkDelete';
import { useMarks } from '../../services/marks/useMarks';
import ReferenceModal from '../../components/references/ReferenceModal.vue';
import Image from '@tiptap/extension-image';
import { ReferenceNode } from './extensions/ReferenceExtension';
import { DatasetViewExtension } from './extensions/DatasetViewExtension';
import { DatasetChartExtension } from './extensions/DatasetChartExtension';
import { CanvasViewExtension } from './extensions/CanvasViewExtension';
import { TimelineViewExtension } from './extensions/TimelineViewExtension';
import DatasetViewConfigModal from './DatasetViewConfigModal.vue';
import DatasetChartConfigModal from './DatasetChartConfigModal.vue';
import CanvasViewConfigModal from './CanvasViewConfigModal.vue';
import TimelineViewConfigModal from '../../components/canvas/TimelinePickerModal.vue';
import TableToDatasetModal from './TableToDatasetModal.vue';
import { parseTableFromEditor, type ParsedTable } from './utils/parseTableFromEditor';
import { useNotification } from '../../composables/useNotification';
import { CitationNode } from './extensions/CitationExtension';
import CitationModal from '../bibliography/CitationModal.vue';
import BibliographyList from '../bibliography/BibliographyList.vue';
import { useBibliography } from '../../services/bibliography/useBibliography';
import type { BibliographyEntry } from '../../types/Bibliography';
import 'katex/dist/katex.min.css';

const props = defineProps({
    content: {
        type: String,
        default: ''
    },
    isSaving: {
        type: Boolean,
        default: false
    },
    savedSuccessfully: {
        type: Boolean,
        default: false
    },
    showToc: {
        type: Boolean,
        default: false
    },
    context: {
        type: String,
        default: 'document' // 'document' or 'resource'
    },
    projectId: {
        type: Number,
        default: null,
    },
    citationFormat: {
        type: String,
        default: 'apa',
    },
});

const emit = defineEmits([
    'content-change',
    'toggle-comments',
    'highlight-comment',
    'highlight-mark',
    'comment-created',
    'marker-applied',
]);

const editor = ref(null);
const isMounted = ref(false);
const showComments = ref(false);
const route = useRoute();
const router = useRouter();
const notification = useNotification();
const { createComment, isLoading: isCommentLoading } = useCommentCreate();
const { createMark, isLoading: isMarkLoading } = useMarkCreate();
const { updateMark } = useMarkUpdate();
const { deleteMark } = useMarkDelete();
const { marks, loadMarks } = useMarks();
const markContentMap = ref<Map<string, string>>(new Map());
const showCommentModal = ref(false);
const showMarkModal = ref(false);
const selectedCommentText = ref('');
const selectedMarkText = ref('');
const currentSelection = ref(null);
const matches = ref([]);
const showReferenceModal = ref(false);
const showDatasetViewModal = ref(false);
const showDatasetChartModal = ref(false);
const showCanvasViewModal = ref(false);
const showTimelineViewModal = ref(false);
const showTableToDatasetModal = ref(false);
const parsedTableData = ref<ParsedTable | null>(null);
const showCitationModal = ref(false);
const { entries: bibliographyEntries, loadByProject, loadGlobal } = useBibliography();
let currentDecorations = DecorationSet.empty

// -- Marker gutter --
const editorScrollRef = ref<HTMLElement | null>(null);
const editorWithGutterRef = ref<HTMLElement | null>(null);
const markerPositions = ref<Array<{ id: string; type: string; icon: string; label: string; text: string; top: number }>>([]);

const updateMarkerPositions = () => {
    if (!editorWithGutterRef.value || !editor.value) {
        markerPositions.value = [];
        return;
    }
    const container = editorWithGutterRef.value;
    const scrollEl = editorScrollRef.value;
    if (!scrollEl) return;

    const containerRect = container.getBoundingClientRect();
    const spans = container.querySelectorAll('[data-marker-id]');
    const seen = new Set<string>();
    const positions: typeof markerPositions.value = [];

    spans.forEach((span) => {
        const id = span.getAttribute('data-marker-id');
        if (!id || seen.has(id)) return;
        seen.add(id);

        const type = (span.getAttribute('data-marker-type') || 'idea') as MarkerType;
        const config = MARKER_CONFIG[type] || MARKER_CONFIG.idea;
        const rect = span.getBoundingClientRect();
        // Position relative to the flex container (which is the gutter's parent)
        const top = rect.top - containerRect.top;

        positions.push({
            id,
            type,
            icon: config.icon,
            label: config.label,
            text: (span.textContent || '').slice(0, 40),
            top,
        });
    });

    markerPositions.value = positions;
};

const handleMarkerGutterClick = (markerId: string) => {
    if (!editor.value) return;

    const el = editorWithGutterRef.value?.querySelector(`[data-marker-id="${markerId}"]`) as HTMLElement | null;
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Flash highlight
        el.style.transition = 'box-shadow 0.3s ease, background-color 0.3s ease';
        el.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
        el.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
        setTimeout(() => {
            el.style.boxShadow = '';
            el.style.backgroundColor = '';
        }, 2000);
    }
};

const settings = ref({ fontSize: 16, fontFamily: 'sans-serif', paragraphSpacing: 1.5 });

const cssVars = ref({
    '--font-size-p': settings.value.fontSize.toString(),
    '--font-family': settings.value.fontFamily,
    '--paragraph-spacing': settings.value.paragraphSpacing.toString(),
});

function createSearchDecorationPlugin(getDecorations) {
    return new Plugin({
        props: {
            decorations() {
                return getDecorations()
            },
        },
    })
}

const toggleComments = () => {
    showComments.value = !showComments.value;
    emit('toggle-comments', showComments.value);
};

const handleAddCommentRequest = (selection: { text: string; from: number; to: number }) => {
    selectedCommentText.value = selection.text;
    currentSelection.value = {
        from: selection.from,
        to: selection.to
    };
    showCommentModal.value = true;
};

const saveComment = async (commentText: string) => {
    try {
        if (!commentText.trim() || !route.params.id || route.params.id === 'new') {
            return;
        }

        const entityType = props.context === 'resource' ? 'resource' : 'doc';
        const newComment = await createComment(
            String(route.params.id),
            commentText,
            entityType,
        );

        if (editor.value && currentSelection.value) {
            const { from, to } = currentSelection.value;
            editor.value.commands.setTextSelection({ from, to });
            editor.value.commands.setComment(newComment.id);
        }

        showCommentModal.value = false;
        currentSelection.value = null;

        emit('comment-created');

        if (!showComments.value) {
            toggleComments();
        }
    } catch (error) {
        console.error('Error saving comment:', error);
    }
};

const cancelComment = () => {
    showCommentModal.value = false;
    currentSelection.value = null;
    selectedCommentText.value = '';
};

const highlightComment = (commentId: string) => {
    emit('highlight-comment', commentId);
};

const handleAddMarkRequest = (selection: { text: string; from: number; to: number }) => {
    selectedMarkText.value = selection.text;
    currentSelection.value = {
        from: selection.from,
        to: selection.to
    };
    showMarkModal.value = true;
};

const saveMark = async () => {
    try {
        if (!route.params.id || route.params.id === 'new') {
            return;
        }

        const entityType = props.context === 'resource' ? 'resource' : 'doc';
        const newMark = await createMark(
            route.params.id as string,
            selectedMarkText.value,
            entityType,
        );

        if (editor.value && currentSelection.value) {
            const { from, to } = currentSelection.value;
            editor.value.commands.setTextSelection({ from, to });
            editor.value.commands.setTextMark(newMark.id);
        }

        showMarkModal.value = false;
        currentSelection.value = null;
    } catch (error) {
        console.error('Error creating mark:', error);
    }
};

const cancelMark = () => {
    showMarkModal.value = false;
    currentSelection.value = null;
};

const onMarkClick = (markId: string) => {
    console.log('Mark clicked:', markId);
};

const loadDocumentMarks = async () => {
    try {
        if (route.params.id && route.params.id !== 'new') {
            const loadedMarks = await loadMarks(route.params.id as string);

            if (editor.value && loadedMarks.length > 0) {
                loadedMarks.forEach(mark => {
                    markContentMap.value.set(mark.id, mark.content);
                });
                setTimeout(() => {
                    loadedMarks.forEach(mark => {
                        try {
                            if (!mark.content || !mark.id) {
                                console.warn('Invalid mark data:', mark);
                                return;
                            }

                            const content = editor.value.state.doc.textContent;
                            const position = content.indexOf(mark.content);

                            if (position !== -1) {
                                editor.value.commands.setTextSelection({
                                    from: position,
                                    to: position + mark.content.length
                                });
                                editor.value.commands.setTextMark(mark.id);
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

const checkForMarkChanges = (editor: Editor) => {
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

const handleDatasetViewInsert = (config: { datasetId: number; datasetName: string; fields: string[]; filters: { field: string; operator: string; value: string }[] }) => {
    editor.value
        .chain()
        .focus()
        .insertDatasetView(config)
        .run();
};

const handleDatasetChartInsert = (config: { chartId: number; chartName: string; datasetId: number; datasetName: string }) => {
    editor.value
        .chain()
        .focus()
        .insertDatasetChart(config)
        .run();
};

const handleCanvasViewInsert = (config: { canvasId: number; canvasName: string }) => {
    editor.value
        .chain()
        .focus()
        .insertCanvasView(config)
        .run();
};

const handleTimelineViewInsert = (config: { timelineId: number; timelineName: string; filterMode: string; epochId?: string; dateFrom?: string; dateTo?: string }) => {
    editor.value
        .chain()
        .focus()
        .insertTimelineView(config)
        .run();
};

const handleConvertTableToDataset = () => {
    if (!editor.value) return;
    const parsed = parseTableFromEditor(editor.value);
    if (!parsed || parsed.headers.length === 0) return;
    parsedTableData.value = parsed;
    showTableToDatasetModal.value = true;
};

const handleTableDatasetCreated = (info: { datasetId: number; datasetName: string; schema: Record<string, any>[]; replaceTable: boolean }) => {
    if (info.replaceTable && parsedTableData.value?.tablePos && editor.value) {
        const { from, to } = parsedTableData.value.tablePos;
        editor.value.chain().focus()
            .deleteRange({ from, to })
            .insertDatasetView({
                datasetId: info.datasetId,
                datasetName: info.datasetName,
                fields: info.schema.map((f: Record<string, any>) => f.key),
                filters: [],
            })
            .run();
    }
};

const handleReferenceSelect = (item: Record<string, any>) => {
    const { from, to } = editor.value.state.selection;
    const text = editor.value.state.doc.textBetween(from, to) || item.name || item.content;

    editor.value
        .chain()
        .focus()
        .insertReferenceNode({
            referenceId: item.id,
            referenceType: item.type,
            text: text,
        })
        .run();
};

const handleCitationSelect = (entry: BibliographyEntry, label: string) => {
    if (!editor.value) return;
    // For numeric format, renumber all existing citations after insertion
    editor.value
        .chain()
        .focus()
        .insertCitation({
            entryId: entry.id,
            citeKey: entry.citeKey ?? String(entry.id),
            label,
        })
        .run();

    if (props.citationFormat === 'numeric') {
        renumberCitations();
    }
};

const renumberCitations = () => {
    if (!editor.value) return;
    const doc = editor.value.state.doc;
    const order: number[] = [];
    const seen = new Set<number>();
    doc.descendants((node: Record<string, any>) => {
        if (node.type.name === 'citationNode') {
            const id = node.attrs['data-entry-id'];
            if (id != null && !seen.has(id)) {
                seen.add(id);
                order.push(id);
            }
        }
    });
    // Dispatch a transaction to update all data-label attrs
    const tr = editor.value.state.tr;
    let changed = false;
    doc.descendants((node: Record<string, any>, pos: number) => {
        if (node.type.name === 'citationNode') {
            const id = node.attrs['data-entry-id'];
            const idx = order.indexOf(id) + 1;
            const newLabel = `[${idx}]`;
            if (node.attrs['data-label'] !== newLabel) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, 'data-label': newLabel });
                changed = true;
            }
        }
    });
    if (changed) {
        editor.value.view.dispatch(tr);
    }
};

const citedEntryIds = computed<number[]>(() => {
    if (!editor.value) return [];
    const ids: number[] = [];
    const seen = new Set<number>();
    editor.value.state.doc.descendants((node: Record<string, any>) => {
        if (node.type.name === 'citationNode') {
            const id = node.attrs['data-entry-id'];
            if (id != null && !seen.has(id)) {
                seen.add(id);
                ids.push(id);
            }
        }
    });
    return ids;
});

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

onMounted(async () => {
    isMounted.value = true;

    editor.value = new Editor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
                blockquote: {
                    HTMLAttributes: {
                        class: 'border-l-4 border-border pl-4 my-2 text-text-muted',
                    },
                },
                codeBlock: {
                    HTMLAttributes: {
                        class: 'code-block',
                    },
                },
                code: {
                    HTMLAttributes: {
                        class: 'inline-code',
                    },
                },
                link: false,
                underline: false,
            }),
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'border-collapse w-full my-2',
                },
            }),
            TableRow,
            TableHeader.configure({
                HTMLAttributes: {
                    class: 'bg-surface-hover font-semibold',
                },
            }),
            TableCell.configure({
                HTMLAttributes: {
                    class: 'border border-border p-2',
                },
            }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
                HTMLAttributes: {
                    class: 'text-blue-500 underline cursor-pointer',
                    target: '_blank',
                    rel: 'noopener noreferrer',
                },
            }),
            Placeholder.configure({
                placeholder: 'Start writing...',
            }),
            CommentExtension.configure({
                HTMLAttributes: {
                    class: 'bg-yellow-100 rounded px-1',
                },
                onCommentClick: (commentId) => {
                    highlightComment(commentId);
                    if (!showComments.value) {
                        toggleComments();
                    }
                },
            }),
            MarkExtension.configure({
                HTMLAttributes: {
                    class: 'bg-orange-100 rounded px-1',
                },
                onMarkClick: onMarkClick,
            }),
            MarkerExtension.configure({
                onMarkerClick: (markerId, markerType) => {
                    emit('highlight-mark', markerId);
                },
            }),
            MathExtension,
            VideoExtension,
            ReferenceNode,
            CitationNode,
            DatasetViewExtension,
            DatasetChartExtension,
            CanvasViewExtension,
            TimelineViewExtension,
            Image.configure({
                inline: false,
                allowBase64: true,
            }),
        ],
        content: props.content || '<p></p>',
        autofocus: true,
        editable: true,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            checkForMarkChanges(editor);
            emit('content-change', html);
            nextTick(() => updateMarkerPositions());
        },
    });

    if (editor.value) {
        editor.value.registerPlugin(createSearchDecorationPlugin(() => currentDecorations))
    }

    await loadDocumentMarks();
    if (props.projectId) {
        loadByProject(props.projectId);
    } else {
        loadGlobal();
    }
    loadAndApplySettings();

    // Initial marker gutter update
    nextTick(() => updateMarkerPositions());

    // Update marker gutter on scroll (positions are relative to viewport so need recalc)
    if (editorScrollRef.value) {
        editorScrollRef.value.addEventListener('scroll', updateMarkerPositions);
    }
});

onBeforeUnmount(() => {
    isMounted.value = false;
    if (editorScrollRef.value) {
        editorScrollRef.value.removeEventListener('scroll', updateMarkerPositions);
    }
    if (editor.value) {
        editor.value.destroy();
    }
});

watch(() => props.content, (newContent) => {
    if (editor.value && newContent !== editor.value.getHTML()) {
        editor.value.commands.setContent(newContent || '<p></p>');
        nextTick(() => updateMarkerPositions());
    }
}, { deep: true });

watch(
    () => settings.value,
    () => {
        applySettings();
    },
    { deep: true }
);

const setLink = (url: string) => {
    if (url === '' || url === undefined) {
        editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
    }

    // Make sure the URL has a valid protocol
    if (!/^https?:\/\//i.test(url) && !url.startsWith('#')) {
        url = 'https://' + url;
    }

    editor.value
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url, target: '_blank' })
        .run();
};

const handleRemoveMark = async (markId: string) => {
    try {
        if (!editor.value) return;

        editor.value.chain()
            .focus()
            .extendMarkRange('textMark')
            .unsetMark('textMark')
            .run();

        await deleteMark(markId);
        markContentMap.value.delete(markId);
    } catch (error) {
        console.error('Error removing mark:', error);
    }
};

const search = (text: string) => {
    matches.value = [];
    const decorations: Decoration[] = [];
    editor.value.state.doc.descendants((node, pos) => {
        if (node.isText) {
            let index = node.text.indexOf(text);
            while (index !== -1) {
                const from = pos + index;
                const to = pos + index + text.length;

                matches.value.push({
                    from,
                    to,
                    match: text
                });
                decorations.push(
                    Decoration.inline(from, to, { class: 'search-highlight' })
                );

                index = node.text.indexOf(text, index + 1);
            }
        }
    });
    currentDecorations = DecorationSet.create(editor.value.state.doc, decorations)
    editor.value.view.dispatch(editor.value.state.tr)
    return matches.value.length;
}

const scrollTo = (index: number) => {
    if (!matches.value.length || index >= matches.value.length || !editor.value) return;

    const { from, to } = matches.value[index];

    editor.value.chain().setTextSelection({ from, to }).run();

    requestAnimationFrame(() => {
        try {
            const dom = editor.value.view.domAtPos(from);
            const element = dom.node.nodeType === 3 ? dom.node.parentElement : dom.node as HTMLElement;

            if (element && typeof element.scrollIntoView === 'function') {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (e) {
            console.error('scrollTo error:', e);
        }
    });
};

const clearHighlights = () => {
    matches.value = [];
    currentDecorations = DecorationSet.empty;
    if (editor.value) {
        editor.value.view.dispatch(editor.value.state.tr);
    }
};

const scrollToPosition = (position: number) => {
    if (!editor.value) return;

    // First, set the text selection at the position
    editor.value.chain().setTextSelection(position).run();
    editor.value.commands.focus();

    // Find the editor container element for proper scrolling
    const editorElement = editor.value.view.dom;
    const scrollContainer = editorElement.closest('.editor-content') || editorElement.parentElement;

    // Scroll the element into view with proper timing
    setTimeout(() => {
        try {
            const dom = editor.value.view.domAtPos(position);
            let targetElement = dom.node;

            // If it's a text node, get the parent element
            if (targetElement.nodeType === 3) {
                targetElement = targetElement.parentElement;
            }

            // Find the actual heading element
            while (targetElement && !['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(targetElement.tagName)) {
                targetElement = targetElement.parentElement;
                if (!targetElement || targetElement === document.body) break;
            }

            if (targetElement && typeof targetElement.scrollIntoView === 'function') {
                // Use scrollIntoView with proper options for better positioning
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });

                // Additional manual scroll adjustment to ensure proper viewport positioning
                setTimeout(() => {
                    if (scrollContainer && scrollContainer.scrollTop !== undefined) {
                        const elementRect = targetElement.getBoundingClientRect();
                        const containerRect = scrollContainer.getBoundingClientRect();

                        // Calculate the offset to position the heading near the top of the viewport
                        const offset = 20; // 20px from top
                        const currentScroll = scrollContainer.scrollTop;
                        const elementPosition = elementRect.top - containerRect.top;
                        const targetScroll = currentScroll + elementPosition - offset;

                        scrollContainer.scrollTo({
                            top: Math.max(0, targetScroll),
                            behavior: 'smooth'
                        });
                    }
                }, 100);
            }
        } catch (e) {
            console.error('scrollToPosition error:', e);
        }
    }, 150);
}; defineExpose({
    editor,
    setLink,
    search,
    scrollTo,
    scrollToPosition,
    clearHighlights,
    undo() {
        if (editor.value) {
            editor.value.commands.undo();
        }
    },
    redo() {
        if (editor.value) {
            editor.value.commands.redo();
        }
    },
});

</script>

<style scoped>
.editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.editor-scroll-wrapper {
    flex: 1 1 auto;
    min-height: 0;
    max-height: 100%;
    height: calc(100vh - 200px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.editor-content {
    position: relative;
    height: 100%;
    max-height: 100%;
    overflow-y: scroll;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) var(--color-surface-hover);
}

.editor-with-gutter {
    display: flex;
    min-height: 100%;
}

.editor-main {
    flex: 1;
    min-width: 0;
}

.marker-gutter {
    width: 32px;
    flex-shrink: 0;
    position: relative;
}

.marker-gutter-icon {
    position: absolute;
    right: 0;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    cursor: pointer;
    border-radius: 6px;
    transition: transform 0.15s, box-shadow 0.15s;
    user-select: none;
    z-index: 5;
}

.marker-gutter-icon:hover {
    transform: scale(1.2);
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}

.marker-gutter-icon-idea {
    background: rgba(59, 130, 246, 0.1);
}
.marker-gutter-icon-idea:hover {
    background: rgba(59, 130, 246, 0.2);
}

.marker-gutter-icon-important {
    background: rgba(239, 68, 68, 0.1);
}
.marker-gutter-icon-important:hover {
    background: rgba(239, 68, 68, 0.2);
}

.marker-gutter-icon-review {
    background: rgba(245, 158, 11, 0.1);
}
.marker-gutter-icon-review:hover {
    background: rgba(245, 158, 11, 0.2);
}

.editor-content::-webkit-scrollbar {
    width: 8px;
}

.editor-content::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 4px;
}

.editor-content::-webkit-scrollbar-track {
    background: var(--color-surface-hover);
}

:deep(.search-highlight) {
    background-color: yellow;
    border-radius: 2px;
}

:deep(.ProseMirror) {
    min-height: 280px;
    padding: 0.5rem;
    outline: none;
    font-size: calc(var(--font-size-p) * 1px);
    margin-bottom: calc(var(--paragraph-spacing) * 0.5em);
    font-family: var(--font-family);
}

:deep(.ProseMirror img) {
    width: 100%;
    margin: calc(var(--paragraph-spacing) * 0.5em) 0;
}

:deep(.ProseMirror h1) {
    font-size: calc(var(--font-size-p) * 2.2px);
    margin-bottom: calc(var(--paragraph-spacing) * 1em);
    margin-top: calc(var(--paragraph-spacing) * 0.1em);
}

:deep(.ProseMirror h2) {
    font-size: calc(var(--font-size-p) * 1.8px);
    margin-bottom: calc(var(--paragraph-spacing) * 0.4em);
    margin-top: calc(var(--paragraph-spacing) * 0.1em);
}

:deep(.ProseMirror h3) {
    font-size: calc(var(--font-size-p) * 1.5px);
    margin-bottom: calc(var(--paragraph-spacing) * 0.8em);
    margin-top: calc(var(--paragraph-spacing) * 0.1em);
}

:deep(.ProseMirror p) {
    margin-bottom: calc(var(--paragraph-spacing) * 0.5em);
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
    color: var(--color-text-muted);
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
}

.menu-item {
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    padding: 0.25rem 0.5rem;
    margin: 0 0.25rem;
    cursor: pointer;
}

.menu-item:hover {
    background-color: var(--color-surface-hover);
}

.menu-item.is-active {
    background-color: var(--color-border);
    font-weight: bold;
}

:deep(.editor-content table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
}

:deep(.editor-content th) {
    background-color: var(--color-surface-hover);
    font-weight: 600;
    text-align: left;
    border: 1px solid var(--color-border);
    padding: 0.5rem;
}

:deep(.editor-content td) {
    border: 1px solid var(--color-border);
    padding: 0.5rem;
}

:deep(.editor-content tr:nth-child(even)) {
    background-color: var(--color-surface-hover);
}

:deep(.editor-content ul) {
    list-style-type: disc !important;
    padding-left: 2.5rem;
    margin: 0.5rem 0;
}

:deep(.editor-content ul li) {
    display: list-item !important;
    margin-bottom: 0.25rem;
    list-style-type: disc !important;
}

:deep(.editor-content ol) {
    list-style-type: decimal;
    padding-left: 2.5rem;
    margin: 0.5rem 0;
}

:deep(.editor-content ol li) {
    display: list-item;
    margin-bottom: 0.25rem;
}

:deep(.editor-content a) {
    color: #3b82f6;
    text-decoration: underline;
    cursor: pointer;
}

:deep(.editor-content a:hover) {
    color: #2563eb;
}

:deep(.editor-content blockquote) {
    border-left: 4px solid var(--color-border);
    padding-left: 1rem;
    margin: 0.5rem 0;
    color: var(--color-text-muted);
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

:deep(.text-mark) {
    background-color: #FFE082;
    border-radius: 0.15rem;
    padding: 0.05rem 0.15rem;
    cursor: pointer;
}

/* Inline code */
:deep(.ProseMirror code),
:deep(.inline-code) {
    background-color: var(--color-surface-hover);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 1px 5px;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
    font-size: 0.875em;
    color: #EB5757;
}

/* Code block */
:deep(.code-block),
:deep(.ProseMirror pre) {
    background-color: #1E1E2E;
    color: #CDD6F4;
    border-radius: 8px;
    padding: 32px 20px 16px 20px;
    margin: 12px 0;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace;
    font-size: 0.875em;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre;
    position: relative;
}

:deep(.ProseMirror pre)::before {
    content: attr(data-language);
    position: absolute;
    top: 6px;
    right: 12px;
    font-size: 0.7em;
    color: #7F849C;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-family: system-ui, sans-serif;
    pointer-events: none;
}

:deep(.ProseMirror pre code) {
    background: none;
    border: none;
    padding: 0;
    color: inherit;
    font-size: inherit;
}

/* Marker highlights */
:deep(.marker-highlight) {
    cursor: pointer;
    transition: background-color 0.2s;
}

:deep(.marker-highlight:hover) {
    filter: brightness(0.92);
}

:deep(.marker-idea) {
    background: rgba(59, 130, 246, 0.12);
    border-bottom: 2px solid #3B82F6;
}

:deep(.marker-important) {
    background: rgba(239, 68, 68, 0.12);
    border-bottom: 2px solid #EF4444;
}

:deep(.marker-review) {
    background: rgba(245, 158, 11, 0.12);
    border-bottom: 2px solid #F59E0B;
}

/* Math nodes */
:deep(.math-node) {
    display: inline-block;
    vertical-align: middle;
    cursor: pointer;
}

:deep(.math-node:hover) {
    background-color: #EDE9FE !important;
    border-color: #C4B5FD !important;
}

/* Video embeds */
:deep(.video-embed) {
    margin: 12px 0;
    text-align: center;
}

:deep(.video-embed iframe) {
    max-width: 100%;
    border-radius: 8px;
}

:deep(.video-embed video) {
    max-width: 100%;
    border-radius: 8px;
}

/* Dataset View styling */
:deep(.dataset-view-wrapper) {
    margin: 12px 0;
    user-select: none;
}

:deep(.dataset-view-wrapper .dataset-view-node) {
    transition: box-shadow 0.15s ease;
}

:deep(.ProseMirror .dataset-view-wrapper.ProseMirror-selectednode .dataset-view-node) {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}

/* Dataset Chart styling */
:deep(.dataset-chart-wrapper) {
    margin: 12px 0;
    user-select: none;
}

:deep(.dataset-chart-wrapper .dataset-chart-node) {
    transition: box-shadow 0.15s ease;
}

:deep(.ProseMirror .dataset-chart-wrapper.ProseMirror-selectednode .dataset-chart-node) {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}

/* Canvas View styling */
:deep(.canvas-view-wrapper) {
    margin: 12px 0;
    user-select: none;
}

:deep(.canvas-view-wrapper .canvas-view-node) {
    transition: box-shadow 0.15s ease;
}

:deep(.ProseMirror .canvas-view-wrapper.ProseMirror-selectednode .canvas-view-node) {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}

/* Timeline View styling */
:deep(.timeline-view-wrapper) {
    margin: 12px 0;
    user-select: none;
}

:deep(.timeline-view-wrapper .timeline-view-node) {
    transition: box-shadow 0.15s ease;
}

:deep(.ProseMirror .timeline-view-wrapper.ProseMirror-selectednode .timeline-view-node) {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
}

/* Image styling */
:deep(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    margin: calc(var(--paragraph-spacing) * 0.5em) 0;
    border-radius: 6px;
}

:deep(.ProseMirror img.ProseMirror-selectednode) {
    outline: 3px solid #3B82F6;
    outline-offset: 2px;
}

/* Highlight mark backgrounds */
:deep(mark) {
    border-radius: 2px;
    padding: 1px 2px;
}
</style>