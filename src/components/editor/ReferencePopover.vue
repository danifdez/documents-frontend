<template>
    <span class="ref-popover-wrapper" style="display: inline; position: relative;">
        <!-- Rendered node -->
        <span ref="badgeEl" :style="currentStyle" @click.stop="togglePopover">
            <template v-if="displayMode === 'quote-citation'">"{{ markText }}" <span :style="miniBadgeStyle">{{ parentName }}</span></template>
            <template v-else>{{ displayText }}</template>
        </span>

        <!-- Popover -->
        <Teleport to="body">
            <div v-if="showPopover" ref="popoverRef" class="ref-popover" :style="popoverPosition" @click.stop>
                <div class="popover-content">
                    <!-- Header -->
                    <div class="popover-header">
                        <span class="type-badge" :style="typeBadgeStyle">{{ typeLabel }}</span>
                        <button class="close-btn" @click="showPopover = false">&times;</button>
                    </div>

                    <!-- Loading -->
                    <div v-if="isLoading" class="popover-loading">Loading...</div>

                    <!-- Bibliography -->
                    <template v-else-if="refType === 'bibliography' && bibEntry">
                        <p class="popover-title">{{ bibEntry.title || 'Untitled' }}</p>
                        <p v-if="authorsText" class="popover-secondary">{{ authorsText }}</p>
                        <div class="popover-meta">
                            <span v-if="bibEntry.year">{{ bibEntry.year }}</span>
                            <span v-if="bibEntry.journal">{{ bibEntry.journal }}</span>
                            <span v-if="bibEntry.publisher">{{ bibEntry.publisher }}</span>
                            <span v-if="bibEntry.volume">Vol. {{ bibEntry.volume }}<template v-if="bibEntry.number">({{ bibEntry.number }})</template></span>
                            <span v-if="bibEntry.pages">pp. {{ bibEntry.pages }}</span>
                        </div>
                        <p v-if="bibEntry.doi" class="popover-link-text">
                            DOI: <a :href="'https://doi.org/' + bibEntry.doi" target="_blank" rel="noopener">{{ bibEntry.doi }}</a>
                        </p>
                        <p v-if="bibEntry.url && !bibEntry.doi" class="popover-link-text">
                            <a :href="bibEntry.url" target="_blank" rel="noopener">{{ bibEntry.url }}</a>
                        </p>
                        <div class="popover-nav-group">
                            <a class="popover-nav" href="#" @click.prevent="navigate(bibEntryLink)">Go to entry</a>
                            <a v-if="bibEntry.sourceResource" class="popover-nav" href="#"
                                @click.prevent="navigate(`/resource/${bibEntry.sourceResource.id}`)">
                                View resource: {{ bibEntry.sourceResource.name }}
                            </a>
                        </div>
                    </template>

                    <!-- Resource -->
                    <template v-else-if="refType === 'resource' && detail">
                        <p class="popover-title">{{ detail.title || detail.name || 'Untitled' }}</p>
                        <p v-if="detail.author" class="popover-secondary">{{ detail.author }}</p>
                        <div class="popover-meta">
                            <span v-if="detail.publicationDate">{{ detail.publicationDate.slice(0, 4) }}</span>
                            <span v-if="detail.type">{{ detail.type }}</span>
                        </div>
                        <p v-if="detail.url" class="popover-link-text">
                            <a :href="detail.url" target="_blank" rel="noopener">{{ detail.url }}</a>
                        </p>
                        <a class="popover-nav" href="#" @click.prevent="navigate(`/resource/${refId}`)">Go to resource</a>
                    </template>

                    <!-- Doc -->
                    <template v-else-if="refType === 'doc' && detail">
                        <p class="popover-title">{{ detail.name || 'Untitled' }}</p>
                        <div class="popover-meta">
                            <span v-if="detail.project?.name">{{ detail.project.name }}</span>
                        </div>
                        <a class="popover-nav" href="#" @click.prevent="navigate(`/document/${refId}`)">Go to document</a>
                    </template>

                    <!-- Mark -->
                    <template v-else-if="refType === 'mark' && detail">
                        <p class="popover-title">"{{ detail.content || 'No content' }}"</p>
                        <p v-if="detail.note" class="popover-secondary">{{ detail.note }}</p>
                        <div class="popover-nav-group">
                            <a v-if="detail.resource" class="popover-nav" href="#"
                                @click.prevent="navigate(`/resource/${detail.resource.id}`)">
                                <span class="popover-nav-icon">&#8599;</span> {{ detail.resource.name || detail.resource.title || 'View resource' }}
                            </a>
                            <a v-else-if="detail.doc" class="popover-nav" href="#"
                                @click.prevent="navigate(`/document/${detail.doc.id}`)">
                                <span class="popover-nav-icon">&#8599;</span> {{ detail.doc.name || 'View document' }}
                            </a>
                        </div>
                    </template>

                    <!-- Knowledge -->
                    <template v-else-if="refType === 'knowledge' && detail">
                        <p class="popover-title">{{ detail.title || 'Untitled' }}</p>
                        <p v-if="detail.summary" class="popover-secondary">{{ detail.summary }}</p>
                        <div v-if="detail.tags?.length" class="popover-tags">
                            <span v-for="tag in detail.tags" :key="tag" class="popover-tag">{{ tag }}</span>
                        </div>
                        <a class="popover-nav" href="#" @click.prevent="navigate(`/knowledge-base/${refId}`)">Go to KB entry</a>
                    </template>

                    <!-- Not found -->
                    <div v-else-if="!isLoading" class="popover-empty">
                        <p>Could not load information.</p>
                    </div>

                    <!-- Display mode config -->
                    <div class="popover-config">
                        <span class="config-label">Format:</span>
                        <div class="config-buttons">
                            <button v-for="mode in availableModes" :key="mode.value"
                                :class="displayMode === mode.value ? 'active' : ''"
                                @click="changeDisplayMode(mode.value)">
                                {{ mode.label }}
                            </button>
                        </div>
                    </div>

                    <!-- Citation style (bibliography only) -->
                    <div v-if="refType === 'bibliography'" class="popover-config">
                        <span class="config-label">Style:</span>
                        <div class="config-buttons">
                            <button v-for="s in citeStyles" :key="s"
                                :class="effectiveCiteStyle === s ? 'active' : ''"
                                @click="changeCiteStyle(s)">
                                {{ s.toUpperCase() }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>
    </span>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import apiClient from '../../services/api';
import router from '../../router';
import type { BibliographyEntry } from '../../types/Bibliography';
import { creatorDisplayName } from '../../types/Bibliography';
import { formatInlineCitation, formatFullCitation, type CitationStyle } from '../../services/citations/citationFormatter';

const props = defineProps<{
    refId: string;
    refType: string;
    label: string;
    displayMode: string;
    citeStyle: string;
    getEntries: () => BibliographyEntry[];
    onUpdateAttrs: (attrs: Record<string, any>) => void;
}>();

const showPopover = ref(false);
const popoverRef = ref<HTMLElement | null>(null);
const badgeEl = ref<HTMLElement | null>(null);
const popoverPosition = ref<Record<string, string>>({});
const detail = ref<Record<string, any> | null>(null);
const bibEntry = ref<BibliographyEntry | null>(null);
const isLoading = ref(false);

const citeStyles: CitationStyle[] = ['apa', 'chicago', 'ieee', 'mla', 'vancouver'];
const effectiveCiteStyle = computed(() => (props.citeStyle || 'apa') as CitationStyle);

// ── Colors per type ──
const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
    bibliography: { bg: '#dbeafe', fg: '#1d4ed8' },
    resource: { bg: '#e0e7ff', fg: '#3730a3' },
    doc: { bg: '#d1fae5', fg: '#065f46' },
    mark: { bg: '#fef3c7', fg: '#92400e' },
    knowledge: { bg: '#ede9fe', fg: '#5b21b6' },
};

const colors = computed(() => COLOR_MAP[props.refType] || COLOR_MAP.resource);

const TYPE_LABELS: Record<string, string> = {
    bibliography: 'Bibliography',
    resource: 'Resource',
    doc: 'Document',
    mark: 'Mark',
    knowledge: 'Knowledge Base',
};
const typeLabel = computed(() => TYPE_LABELS[props.refType] || props.refType);

const typeBadgeStyle = computed(() => ({
    fontSize: '10px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: colors.value.fg,
    background: colors.value.bg,
    padding: '2px 6px',
    borderRadius: '4px',
}));

// ── Styles based on displayMode ──
const currentStyle = computed(() => {
    const base = { cursor: 'pointer', display: 'inline' };
    const mode = props.displayMode;
    if (mode === 'full' || mode === 'title' || mode === 'quote') {
        return { ...base, color: colors.value.fg, textDecoration: 'underline', textDecorationStyle: 'dotted' as const };
    }
    if (mode === 'quote-citation') {
        return { ...base, color: colors.value.fg };
    }
    // mark citation: inline quoted text, no badge
    if (props.refType === 'mark') {
        return { ...base, color: colors.value.fg, fontStyle: 'italic' as const };
    }
    // citation (default): badge
    return {
        ...base,
        background: colors.value.bg,
        color: colors.value.fg,
        borderRadius: '3px',
        padding: '0 4px',
        fontSize: '0.9em',
        whiteSpace: 'nowrap',
    };
});

const miniBadgeStyle = computed(() => ({
    background: colors.value.bg,
    borderRadius: '3px',
    padding: '0 3px',
    fontSize: '0.8em',
    marginLeft: '2px',
}));

// ── Extract current numeric index from label (for IEEE/Vancouver) ──
const currentIndex = computed(() => {
    const m = props.label.match(/\[(\d+)\]/) || props.label.match(/\((\d+)\)/);
    return m ? Number(m[1]) : undefined;
});

// ── Mark helpers ──
const markText = computed(() => {
    if (detail.value?.content) return detail.value.content;
    return props.label;
});

const parentName = computed(() => {
    if (!detail.value) return 'ref';
    if (detail.value.resource) return detail.value.resource.name || detail.value.resource.title || 'resource';
    if (detail.value.doc) return detail.value.doc.name || 'document';
    return 'ref';
});

// ── Display text ──
const displayText = computed(() => {
    const mode = props.displayMode;
    // Bibliography: always compute dynamically
    if (props.refType === 'bibliography' && bibEntry.value) {
        if (mode === 'full') {
            return formatFullCitation(bibEntry.value, effectiveCiteStyle.value, currentIndex.value);
        }
        return formatInlineCitation(bibEntry.value, effectiveCiteStyle.value, currentIndex.value);
    }
    // Mark citation: show full quoted text
    if (props.refType === 'mark' && mode === 'citation') {
        return `"${markText.value}"`;
    }
    if (mode === 'title') {
        if (detail.value) return detail.value.title || detail.value.name || props.label;
    }
    if (mode === 'quote') {
        if (props.refType === 'mark') {
            return `"${markText.value}"`;
        }
        if (detail.value) return detail.value.content || props.label;
    }
    return props.label;
});

// ── Available modes per type ──
const MODES: Record<string, { value: string; label: string }[]> = {
    bibliography: [
        { value: 'citation', label: 'Citation' },
        { value: 'full', label: 'Full' },
    ],
    resource: [
        { value: 'citation', label: 'Badge' },
        { value: 'title', label: 'Title' },
    ],
    doc: [
        { value: 'citation', label: 'Badge' },
        { value: 'title', label: 'Title' },
    ],
    mark: [
        { value: 'citation', label: 'Citation' },
        { value: 'quote-citation', label: 'Text + ref' },
    ],
    knowledge: [
        { value: 'citation', label: 'Badge' },
    ],
};
const availableModes = computed(() => MODES[props.refType] || MODES.resource);

// ── Bibliography entry link ──
const bibEntryLink = computed(() => {
    if (!bibEntry.value) return '/bibliography';
    const projectId = bibEntry.value.project?.id;
    const base = projectId ? `/project/${projectId}/bibliography` : '/bibliography';
    return `${base}?entry=${bibEntry.value.id}`;
});

// ── Authors text (bibliography) ──
const authorsText = computed(() => {
    if (!bibEntry.value?.creators?.length) return '';
    return bibEntry.value.creators.map(c => creatorDisplayName(c)).join('; ');
});

// ── Data fetching ──
const fetchData = async () => {
    if (props.refType === 'bibliography') {
        const entries = props.getEntries();
        bibEntry.value = entries.find(e => e.id === Number(props.refId)) ?? null;
        return;
    }
    if (detail.value) return;
    isLoading.value = true;
    try {
        const endpoints: Record<string, string> = {
            resource: `/resources/${props.refId}`,
            doc: `/docs/${props.refId}`,
            mark: `/marks/${props.refId}`,
            knowledge: `/knowledge-entries/${props.refId}`,
        };
        const endpoint = endpoints[props.refType];
        if (endpoint) {
            const response = await apiClient.get(endpoint);
            detail.value = response.data;
        }
    } catch {
        detail.value = null;
    } finally {
        isLoading.value = false;
    }
};

// ── Position ──
const updatePosition = () => {
    if (!badgeEl.value) return;
    const rect = badgeEl.value.getBoundingClientRect();
    popoverPosition.value = {
        position: 'fixed',
        top: `${rect.bottom + 6}px`,
        left: `${rect.left}px`,
        zIndex: '9999',
    };
};

const togglePopover = async () => {
    showPopover.value = !showPopover.value;
    if (showPopover.value) {
        fetchData();
        await nextTick();
        updatePosition();
    }
};

const changeDisplayMode = (mode: string) => {
    props.onUpdateAttrs({ 'data-display-mode': mode });
};

const changeCiteStyle = (style: string) => {
    const newAttrs: Record<string, any> = { 'data-cite-style': style };
    // Recompute label for bibliography
    if (props.refType === 'bibliography' && bibEntry.value) {
        newAttrs['data-label'] = formatInlineCitation(
            bibEntry.value,
            style as CitationStyle,
            currentIndex.value,
        );
    }
    props.onUpdateAttrs(newAttrs);
};

const navigate = (path: string) => {
    showPopover.value = false;
    router.push(path);
};

const onClickOutside = (e: MouseEvent) => {
    if (
        showPopover.value &&
        popoverRef.value && !popoverRef.value.contains(e.target as Node) &&
        badgeEl.value && !badgeEl.value.contains(e.target as Node)
    ) {
        showPopover.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', onClickOutside, true);
    if (props.refType === 'bibliography') {
        const entries = props.getEntries();
        bibEntry.value = entries.find(e => e.id === Number(props.refId)) ?? null;
    } else if (props.refType === 'mark') {
        // Pre-fetch mark detail for inline display (quote modes need content + parent name)
        fetchData();
    }
});

onBeforeUnmount(() => {
    document.removeEventListener('click', onClickOutside, true);
    showPopover.value = false;
});
</script>

<style scoped>
.ref-popover {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    width: 340px;
    max-width: 90vw;
    overflow: hidden;
}
.popover-content { padding: 12px 14px; }
.popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}
.close-btn {
    background: none; border: none; font-size: 18px;
    color: #94a3b8; cursor: pointer; padding: 0 2px; line-height: 1;
}
.close-btn:hover { color: #475569; }
.popover-title {
    font-size: 13px; font-weight: 600; color: #1e293b;
    margin: 0 0 4px; line-height: 1.3;
}
.popover-secondary {
    font-size: 12px; color: #475569;
    margin: 0 0 6px; line-height: 1.3;
}
.popover-meta {
    display: flex; flex-wrap: wrap; gap: 4px 8px;
    font-size: 11px; color: #64748b; margin-bottom: 4px;
}
.popover-meta span:not(:last-child)::after {
    content: '·'; margin-left: 8px; color: #cbd5e1;
}
.popover-link-text {
    font-size: 11px; margin: 4px 0 0; word-break: break-all;
}
.popover-link-text a { color: #2563eb; text-decoration: none; }
.popover-link-text a:hover { text-decoration: underline; }
.popover-nav {
    display: inline-block; margin-top: 6px;
    font-size: 12px; color: #3730a3; text-decoration: none; font-weight: 500;
}
.popover-nav:hover { text-decoration: underline; }
.popover-nav-group {
    display: flex; flex-direction: column; gap: 2px; margin-top: 6px;
}
.popover-nav-icon { font-size: 11px; }
.popover-tags {
    display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;
}
.popover-tag {
    font-size: 10px; background: #f1f5f9; color: #475569;
    padding: 1px 6px; border-radius: 4px;
}
.popover-loading { font-size: 12px; color: #94a3b8; padding: 8px 0; }
.popover-empty p { font-size: 12px; color: #94a3b8; margin: 0; }
.popover-config {
    margin-top: 8px; padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    display: flex; align-items: center; gap: 8px;
}
.config-label { font-size: 11px; color: #64748b; white-space: nowrap; }
.config-buttons { display: flex; gap: 4px; flex-wrap: wrap; }
.config-buttons button {
    font-size: 10px; padding: 2px 7px;
    border: 1px solid #e2e8f0; border-radius: 4px;
    background: white; color: #475569; cursor: pointer;
}
.config-buttons button:hover { background: #f8fafc; }
.config-buttons button.active {
    background: #e0e7ff; color: #3730a3; border-color: #a5b4fc;
}
</style>
