<template>
    <div class="bg-surface-elevated rounded-xl border border-border p-4">
        <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-text-primary">Timeline</span>
            <span class="text-xs text-text-muted">{{ resolved.length }} event{{ resolved.length === 1 ? '' : 's' }}</span>
        </div>

        <div v-if="resolved.length === 0" class="text-sm text-text-muted text-center py-8">
            No resolved dates to plot.
        </div>

        <div v-else class="relative py-6">
            <div class="absolute left-0 right-0 top-1/2 h-0.5 bg-border" />
            <div class="relative flex flex-col gap-1">
                <div class="flex items-center justify-between text-[10px] text-text-muted">
                    <span>{{ extent.min }}</span>
                    <span>{{ extent.max }}</span>
                </div>
                <div class="relative h-16">
                    <template v-for="(item, idx) in placed" :key="item.id">
                        <button @click="$emit('select', item)"
                            :style="{ left: item.leftPct + '%' }"
                            :title="`${item.date} · ${item.rawExpression}`"
                            class="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 group flex flex-col items-center">
                            <span class="block w-3 h-3 rounded-full border-2 border-white shadow"
                                :class="dotClass(item.resolver)" />
                            <span class="mt-1 text-[10px] text-text-secondary max-w-[120px] truncate">
                                {{ labelFor(item) }}
                            </span>
                        </button>
                    </template>
                </div>
            </div>
        </div>

        <div v-if="resolved.length" class="mt-3 space-y-1">
            <div v-for="item in resolved" :key="'row-' + item.id"
                class="flex items-center gap-2 text-xs hover:bg-surface-hover rounded px-2 py-1 cursor-pointer"
                @click="$emit('select', item)">
                <span class="font-mono text-text-primary whitespace-nowrap">{{ item.date }}</span>
                <span class="text-text-muted italic truncate">“{{ item.rawExpression }}”</span>
                <button v-if="canPromote" @click.stop="$emit('promote', item)"
                    class="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-border text-text-secondary hover:bg-accent-subtle hover:text-accent">
                    Add to project timeline
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ResourceDate } from '../../types/ResourceDate';

const props = defineProps<{
    dates: ResourceDate[];
    canPromote?: boolean;
}>();

defineEmits<{
    (e: 'select', date: ResourceDate): void;
    (e: 'promote', date: ResourceDate): void;
}>();

const resolved = computed(() => props.dates.filter((d) => !!d.date));

const extent = computed(() => {
    if (resolved.value.length === 0) return { min: '', max: '', minMs: 0, maxMs: 0 };
    const times = resolved.value.map((d) => new Date(d.date as string).getTime());
    const minMs = Math.min(...times);
    const maxMs = Math.max(...times);
    return {
        min: new Date(minMs).toISOString().slice(0, 10),
        max: new Date(maxMs).toISOString().slice(0, 10),
        minMs,
        maxMs,
    };
});

const placed = computed(() => {
    const { minMs, maxMs } = extent.value;
    const span = Math.max(1, maxMs - minMs);
    return resolved.value.map((d) => {
        const t = new Date(d.date as string).getTime();
        const leftPct = ((t - minMs) / span) * 100;
        return { ...d, leftPct };
    });
});

function labelFor(d: ResourceDate): string {
    if (d.precision === 'year') return (d.date || '').slice(0, 4);
    if (d.precision === 'month') return (d.date || '').slice(0, 7);
    return d.date || '';
}

function dotClass(resolver: string): string {
    if (resolver === 'dateparser') return 'bg-emerald-500';
    if (resolver === 'llm') return 'bg-blue-500';
    return 'bg-gray-400';
}
</script>
