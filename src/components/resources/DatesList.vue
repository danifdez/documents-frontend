<template>
    <div class="bg-surface-elevated rounded-xl border border-border">
        <div class="px-4 py-3 border-b border-border-light flex items-center justify-between">
            <span class="text-sm font-semibold text-text-primary">Extracted dates</span>
            <span v-if="loading" class="text-xs text-text-muted">Loading…</span>
            <span v-else class="text-xs text-text-muted">{{ resolved.length }} resolved · {{ unresolved.length }} pending</span>
        </div>

        <div v-if="showAnchorBanner"
            class="px-4 py-3 border-b border-border-light bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
            <div>
                {{ unresolvedByMissingAnchor.length }} relative
                expression{{ unresolvedByMissingAnchor.length === 1 ? '' : 's' }}
                (e.g. <em>{{ unresolvedByMissingAnchor[0]?.rawExpression }}</em>) can't be resolved
                because we don't know when this resource was written.
            </div>
            <div class="flex items-center gap-2">
                <input type="date" v-model="anchorInput"
                    class="bg-surface border border-border rounded px-2 py-1 text-text-primary" />
                <button @click="saveAnchor" :disabled="!anchorInput || savingAnchor"
                    class="px-2 py-1 rounded bg-accent text-white text-xs disabled:opacity-50">
                    {{ savingAnchor ? 'Saving…' : 'Set authoring date' }}
                </button>
            </div>
        </div>

        <div v-if="!loading && dates.length === 0" class="px-4 py-6 text-sm text-text-muted text-center">
            No dates detected yet.
        </div>

        <ul v-if="resolved.length" class="divide-y divide-border-light">
            <li v-for="d in resolved" :key="d.id"
                class="px-4 py-2 hover:bg-surface-hover cursor-pointer"
                @click="$emit('select', d)">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="font-mono text-sm text-text-primary whitespace-nowrap">{{ formatDate(d) }}</span>
                        <span class="text-[10px] uppercase px-1.5 py-0.5 rounded"
                            :class="resolverClass(d.resolver)">{{ d.resolver }}</span>
                        <span v-if="d.precision"
                            class="text-[10px] uppercase px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">
                            {{ d.precision }}
                        </span>
                    </div>
                    <button @click.stop="handleRemove(d.id)"
                        class="text-xs text-text-muted hover:text-red-600">×</button>
                </div>
                <div class="text-xs text-text-muted italic mt-0.5 truncate">“{{ d.rawExpression }}”</div>
                <div v-if="d.contextSnippet" class="text-xs text-text-secondary mt-0.5 line-clamp-2">
                    {{ d.contextSnippet }}
                </div>
            </li>
        </ul>

        <div v-if="unresolved.length" class="px-4 py-3 border-t border-border-light">
            <div class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Unresolved</div>
            <ul class="space-y-1">
                <li v-for="d in unresolved" :key="d.id"
                    class="text-xs text-text-secondary flex items-center justify-between gap-2">
                    <span class="truncate">“{{ d.rawExpression }}”
                        <span class="text-text-muted">— {{ d.unresolvedReason || 'unresolved' }}</span></span>
                    <button @click="handleRemove(d.id)"
                        class="text-text-muted hover:text-red-600">×</button>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ResourceDate } from '../../types/ResourceDate';

const props = defineProps<{
    dates: ResourceDate[];
    loading: boolean;
    resourcePublicationDate?: string | null;
}>();

const emit = defineEmits<{
    (e: 'select', date: ResourceDate): void;
    (e: 'remove', id: number): void;
    (e: 'set-anchor', date: string): void;
}>();

const anchorInput = ref<string>('');
const savingAnchor = ref(false);

watch(
    () => props.resourcePublicationDate,
    (val) => {
        if (val) anchorInput.value = String(val).slice(0, 10);
    },
    { immediate: true },
);

const resolved = computed(() => props.dates.filter((d) => d.date));
const unresolved = computed(() => props.dates.filter((d) => !d.date));
const unresolvedByMissingAnchor = computed(() =>
    props.dates.filter((d) => !d.date && d.unresolvedReason === 'missing_anchor'),
);
const showAnchorBanner = computed(
    () => !props.resourcePublicationDate && unresolvedByMissingAnchor.value.length > 0,
);

function formatDate(d: ResourceDate): string {
    if (!d.date) return '—';
    if (d.endDate && d.endDate !== d.date) {
        return `${d.date} → ${d.endDate}`;
    }
    if (d.precision === 'year') return d.date.slice(0, 4);
    if (d.precision === 'month') return d.date.slice(0, 7);
    return d.date;
}

function resolverClass(resolver: string): string {
    if (resolver === 'dateparser') return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
    if (resolver === 'llm') return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
}

async function saveAnchor() {
    if (!anchorInput.value) return;
    savingAnchor.value = true;
    try {
        emit('set-anchor', anchorInput.value);
    } finally {
        savingAnchor.value = false;
    }
}

function handleRemove(id: number) {
    emit('remove', id);
}
</script>
