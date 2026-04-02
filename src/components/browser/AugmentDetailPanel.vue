<template>
    <Teleport to="body">
        <Transition name="augment-detail-overlay">
            <div v-if="show" class="fixed inset-0 z-50 flex justify-end" @click.self="$emit('close')">
                <Transition name="augment-detail-panel" appear>
                    <div v-if="show"
                        class="h-full w-[440px] max-w-full bg-surface-elevated border-l border-border flex flex-col shadow-2xl shadow-black/10">

                        <!-- Header -->
                        <div class="flex items-center justify-between px-5 py-4 border-b border-border-light">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                    :class="headerIconClass">
                                    <svg v-if="collection === 'entities'" class="h-4 w-4" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <svg v-else-if="collection === 'resources'" class="h-4 w-4" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                        stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                                        {{ collectionLabel }}</p>
                                    <h2 class="text-sm font-semibold text-text-primary truncate">
                                        {{ displayName }}</h2>
                                </div>
                            </div>
                            <button @click="$emit('close')"
                                class="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer shrink-0">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <!-- Content -->
                        <div class="flex-1 overflow-y-auto">
                            <!-- Loading -->
                            <div v-if="loading" class="flex items-center justify-center py-16">
                                <div
                                    class="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent">
                                </div>
                            </div>

                            <!-- Error -->
                            <div v-else-if="error" class="px-5 py-12 text-center">
                                <p class="text-sm text-text-muted">{{ error }}</p>
                            </div>

                            <!-- Entity detail -->
                            <template v-else-if="collection === 'entities' && entityDetail">
                                <div class="px-5 py-4 space-y-4">
                                    <!-- Type badge -->
                                    <div>
                                        <span
                                            class="px-2 py-1 rounded-md text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                            {{ entityDetail.entityType?.name || 'Entity' }}
                                        </span>
                                    </div>

                                    <!-- Description -->
                                    <div v-if="entityDetail.description">
                                        <p class="text-xs font-medium text-text-muted mb-1">Description</p>
                                        <p class="text-sm text-text-secondary leading-relaxed">{{
                                            entityDetail.description }}</p>
                                    </div>

                                    <!-- Aliases -->
                                    <div v-if="entityDetail.aliases?.length">
                                        <p class="text-xs font-medium text-text-muted mb-1.5">Aliases</p>
                                        <div class="flex flex-wrap gap-1.5">
                                            <span v-for="alias in entityDetail.aliases" :key="alias.value"
                                                class="px-2 py-0.5 rounded text-xs bg-surface-hover text-text-secondary">
                                                {{ alias.value }}
                                                <span class="text-text-muted ml-0.5">({{ alias.locale }})</span>
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Translations -->
                                    <div
                                        v-if="entityDetail.translations && Object.keys(entityDetail.translations).length">
                                        <p class="text-xs font-medium text-text-muted mb-1.5">Translations</p>
                                        <div class="flex flex-wrap gap-1.5">
                                            <span v-for="(value, locale) in entityDetail.translations" :key="locale"
                                                class="px-2 py-0.5 rounded text-xs bg-surface-hover text-text-secondary">
                                                {{ value }}
                                                <span class="text-text-muted ml-0.5">({{ locale }})</span>
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Projects -->
                                    <div v-if="entityDetail.projects?.length">
                                        <p class="text-xs font-medium text-text-muted mb-1.5">Projects</p>
                                        <div class="flex flex-wrap gap-1.5">
                                            <span v-for="proj in entityDetail.projects" :key="proj.id"
                                                class="px-2 py-0.5 rounded text-xs bg-accent-subtle text-accent">
                                                {{ proj.name }}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Related resources -->
                                <div v-if="entityDetail.resources?.length"
                                    class="border-t border-border px-5 py-4">
                                    <p class="text-xs font-medium text-text-muted mb-2">
                                        Appears in ({{ entityDetail.resources.length }}
                                        {{ entityDetail.resources.length === 1 ? 'resource' : 'resources' }})</p>
                                    <div class="space-y-0.5">
                                        <div v-for="res in entityDetail.resources" :key="res.id"
                                            @click="$emit('navigate', 'resources', res.id)"
                                            class="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-surface-hover cursor-pointer transition-colors group">
                                            <svg class="h-3.5 w-3.5 text-text-muted shrink-0" fill="none"
                                                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <div class="min-w-0 flex-1">
                                                <p class="text-xs text-text-primary truncate group-hover:text-accent transition-colors">
                                                    {{ res.name }}</p>
                                                <p v-if="res.project" class="text-[10px] text-text-muted truncate">
                                                    {{ res.project.name }}</p>
                                            </div>
                                            <span v-if="res.status"
                                                class="text-[9px] px-1.5 py-0.5 rounded bg-surface-hover text-text-muted shrink-0">
                                                {{ res.status }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Knowledge entries -->
                                <div v-if="entityDetail.knowledgeEntries?.length"
                                    class="border-t border-border px-5 py-4">
                                    <p class="text-xs font-medium text-text-muted mb-2">
                                        Knowledge ({{ entityDetail.knowledgeEntries.length }})</p>
                                    <div class="space-y-0.5">
                                        <div v-for="entry in entityDetail.knowledgeEntries" :key="entry.id"
                                            @click="$emit('navigate', 'knowledge', entry.id)"
                                            class="px-2 py-2 rounded-md hover:bg-surface-hover cursor-pointer transition-colors group">
                                            <p class="text-xs font-medium text-text-primary group-hover:text-accent transition-colors">
                                                {{ entry.title }}</p>
                                            <p v-if="entry.summary"
                                                class="text-[11px] text-text-muted mt-0.5 line-clamp-2">
                                                {{ entry.summary }}</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- No related data -->
                                <div v-if="!entityDetail.resources?.length && !entityDetail.knowledgeEntries?.length"
                                    class="border-t border-border px-5 py-8 text-center">
                                    <p class="text-xs text-text-muted">No related resources or knowledge entries</p>
                                </div>
                            </template>

                            <!-- Resource / Doc / Generic detail -->
                            <template v-else-if="genericDetail">
                                <div class="px-5 py-4 space-y-4">
                                    <!-- Title (if different from name) -->
                                    <div v-if="genericDetail.title && genericDetail.title !== (genericDetail.name || '')">
                                        <p class="text-xs font-medium text-text-muted mb-1">Title</p>
                                        <p class="text-sm text-text-secondary">{{ genericDetail.title }}</p>
                                    </div>

                                    <!-- Status / Type info -->
                                    <div v-if="genericDetail.status || genericDetail.type" class="flex gap-2">
                                        <span v-if="genericDetail.status"
                                            class="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-text-secondary">
                                            {{ genericDetail.status }}
                                        </span>
                                        <span v-if="genericDetail.type"
                                            class="px-2 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-text-secondary">
                                            {{ genericDetail.type }}
                                        </span>
                                    </div>

                                    <!-- Summary -->
                                    <div v-if="genericDetail.summary">
                                        <p class="text-xs font-medium text-text-muted mb-1">Summary</p>
                                        <p class="text-sm text-text-secondary leading-relaxed whitespace-pre-line">{{
                                            genericDetail.summary }}</p>
                                    </div>

                                    <!-- Key points -->
                                    <div v-if="genericDetail.keyPoints?.length">
                                        <p class="text-xs font-medium text-text-muted mb-1.5">Key points</p>
                                        <ul class="space-y-1">
                                            <li v-for="(kp, i) in genericDetail.keyPoints" :key="i"
                                                class="text-xs text-text-secondary flex gap-1.5">
                                                <span class="text-text-muted shrink-0">-</span>
                                                <span>{{ kp }}</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <!-- Keywords -->
                                    <div v-if="genericDetail.keywords?.length">
                                        <p class="text-xs font-medium text-text-muted mb-1.5">Keywords</p>
                                        <div class="flex flex-wrap gap-1.5">
                                            <span v-for="kw in genericDetail.keywords" :key="kw"
                                                class="px-2 py-0.5 rounded text-xs bg-surface-hover text-text-secondary">
                                                {{ kw }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Content preview -->
                                    <div v-if="contentPreview">
                                        <p class="text-xs font-medium text-text-muted mb-2">Content</p>
                                        <div class="text-sm text-text-secondary leading-relaxed prose prose-sm max-w-none
                                            [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mb-2
                                            [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1.5
                                            [&_h3]:text-sm [&_h3]:font-medium [&_h3]:mb-1
                                            [&_p]:mb-2 [&_p]:text-sm
                                            [&_ul]:pl-4 [&_ul]:mb-2
                                            [&_li]:text-sm [&_li]:mb-0.5
                                            [&_img]:hidden"
                                            v-html="contentPreview"></div>
                                    </div>

                                    <!-- Fallback: no meaningful content -->
                                    <div v-if="!genericDetail.summary && !genericDetail.keyPoints?.length && !contentPreview"
                                        class="py-6 text-center">
                                        <p class="text-xs text-text-muted">No preview available</p>
                                    </div>
                                </div>
                            </template>
                        </div>

                        <!-- Footer (not for entities) -->
                        <div v-if="collection !== 'entities'" class="px-5 py-3 border-t border-border-light">
                            <button @click="$emit('open-full', collection, itemId)"
                                class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-accent hover:bg-accent-subtle transition-colors cursor-pointer">
                                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Open full view
                            </button>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import apiClient from '../../services/api';

const props = defineProps<{
    show: boolean;
    collection: string;
    itemId: number | null;
}>();

defineEmits<{
    close: [];
    navigate: [collection: string, id: number];
    'open-full': [collection: string, id: number];
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const entityDetail = ref<any>(null);
const genericDetail = ref<any>(null);

const contentPreview = computed(() => {
    const data = genericDetail.value;
    if (!data) return '';
    // Use content or translated_content, truncated
    const raw = data.content || data.translated_content || '';
    if (!raw) return '';
    // If it's HTML, return truncated version
    if (raw.includes('<')) return raw.slice(0, 3000);
    // Plain text: wrap in paragraph
    return '<p>' + raw.slice(0, 2000) + '</p>';
});

const displayName = computed(() => {
    if (entityDetail.value) return entityDetail.value.name;
    if (genericDetail.value) return genericDetail.value.name || genericDetail.value.title || 'Untitled';
    return 'Loading...';
});

const collectionLabel = computed(() => {
    const labels: Record<string, string> = {
        entities: 'Entity',
        resources: 'Resource',
        docs: 'Document',
        knowledge: 'Knowledge Entry',
        notes: 'Note',
        canvases: 'Canvas',
        events: 'Event',
        datasets: 'Dataset',
    };
    return labels[props.collection] || props.collection;
});

const headerIconClass = computed(() => {
    const classes: Record<string, string> = {
        entities: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
        resources: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
        docs: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        knowledge: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        notes: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
        canvases: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    };
    return classes[props.collection] || 'bg-accent-subtle text-accent';
});

const endpointMap: Record<string, string> = {
    entities: '/entities/{id}/detailed',
    resources: '/resources/{id}',
    docs: '/docs/{id}',
    knowledge: '/knowledge/{id}',
    notes: '/notes/{id}',
    canvases: '/canvases/{id}',
    datasets: '/datasets/{id}',
};

const loadDetail = async () => {
    if (props.itemId == null || !props.collection) return;

    loading.value = true;
    error.value = null;
    entityDetail.value = null;
    genericDetail.value = null;

    try {
        const template = endpointMap[props.collection];
        if (!template) {
            error.value = `Unknown collection type: ${props.collection}`;
            return;
        }
        const url = template.replace('{id}', String(props.itemId));
        const res = await apiClient.get(url);
        const data = res.data;

        if (props.collection === 'entities') {
            entityDetail.value = data;
        } else {
            // Only keep a preview of content fields to avoid heavy DOM
            if (data.content && data.content.length > 3000) {
                data.content = data.content.slice(0, 3000);
            }
            if (data.translated_content && data.translated_content.length > 3000) {
                data.translated_content = data.translated_content.slice(0, 3000);
            }
            genericDetail.value = data;
        }
    } catch (err: any) {
        error.value = err.response?.data?.message || 'Failed to load details';
    } finally {
        loading.value = false;
    }
};

watch(() => [props.show, props.collection, props.itemId], ([show]) => {
    if (show && props.itemId) {
        loadDetail();
    } else {
        entityDetail.value = null;
        genericDetail.value = null;
        error.value = null;
    }
});
</script>

<style scoped>
.augment-detail-overlay-enter-active,
.augment-detail-overlay-leave-active {
    transition: opacity 0.2s ease;
}

.augment-detail-overlay-enter-from,
.augment-detail-overlay-leave-to {
    opacity: 0;
}

.augment-detail-panel-enter-active {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.augment-detail-panel-leave-active {
    transition: transform 0.2s ease-in;
}

.augment-detail-panel-enter-from,
.augment-detail-panel-leave-to {
    transform: translateX(100%);
}
</style>
