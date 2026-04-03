<template>
    <div class="space-y-4">
        <div v-for="[category, items] in groupedProviders" :key="category">
            <h4 class="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                {{ categoryLabels[category] || category }}
            </h4>
            <div class="grid grid-cols-2 gap-2">
                <button v-for="provider in items" :key="provider.type" @click="$emit('select', provider)"
                    class="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-accent/40 hover:bg-surface-hover transition-all text-left cursor-pointer group"
                    :class="selected === provider.type ? 'border-accent bg-accent-subtle' : ''">
                    <div class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                        :class="categoryColors[provider.category] || 'bg-gray-100 text-gray-600'">
                        {{ provider.displayName.charAt(0) }}
                    </div>
                    <div class="min-w-0">
                        <span class="text-sm font-medium text-text-primary block truncate">{{ provider.displayName }}</span>
                        <span class="text-[10px] text-text-muted block mt-0.5 line-clamp-2">{{ provider.description }}</span>
                        <span v-if="provider.credentialsSchema"
                            class="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-600">
                            API Key
                        </span>
                    </div>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DataSourceProvider } from '../../services/data-sources/useDataSources';

const props = defineProps<{
    providers: DataSourceProvider[];
    selected?: string;
}>();

defineEmits<{
    select: [provider: DataSourceProvider];
}>();

const categoryLabels: Record<string, string> = {
    generic: 'Generic',
    government: 'Government & Statistics',
    finance: 'Finance & Markets',
    weather: 'Weather',
};

const categoryColors: Record<string, string> = {
    generic: 'bg-blue-50 text-blue-600',
    government: 'bg-emerald-50 text-emerald-600',
    finance: 'bg-violet-50 text-violet-600',
    weather: 'bg-sky-50 text-sky-600',
};

const categoryOrder = ['generic', 'government', 'finance', 'weather'];

const groupedProviders = computed(() => {
    const groups = new Map<string, DataSourceProvider[]>();
    for (const p of props.providers) {
        const cat = p.category || 'generic';
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat)!.push(p);
    }
    // Sort by category order
    const sorted = new Map<string, DataSourceProvider[]>();
    for (const cat of categoryOrder) {
        if (groups.has(cat)) sorted.set(cat, groups.get(cat)!);
    }
    // Add any remaining categories
    for (const [cat, items] of groups) {
        if (!sorted.has(cat)) sorted.set(cat, items);
    }
    return sorted;
});
</script>
