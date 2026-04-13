<template>
    <div v-if="citedEntries.length > 0" class="mt-8 pt-4 border-t border-border">
        <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">References</h3>
        <ol class="space-y-1">
            <li v-for="(entry, index) in citedEntries" :key="entry.id" class="text-sm leading-snug">
                <span>{{ formatFullCitation(entry, effectiveStyle, index + 1) }}</span>
            </li>
        </ol>
    </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import type { BibliographyEntry } from '../../types/Bibliography';
import { formatFullCitation, type CitationStyle } from '../../services/citations/citationFormatter';

const props = defineProps<{
    editor: any;
    entries: BibliographyEntry[];
    citationFormat: string;
}>();

const effectiveStyle = computed(() => (props.citationFormat || 'apa') as CitationStyle);

// Track document updates
const updateTick = ref(0);

watch(() => props.editor, (editor) => {
    if (editor) {
        editor.on('update', () => {
            updateTick.value++;
        });
    }
}, { immediate: true });

const citedEntries = computed(() => {
    // eslint-disable-next-line no-unused-expressions
    updateTick.value; // reactive dependency
    if (!props.editor) return [];
    const ids: string[] = [];
    const seen = new Set<string>();
    props.editor.state.doc.descendants((node: any) => {
        if (node.type.name === 'referenceNode' && node.attrs['data-ref-type'] === 'bibliography') {
            const id = node.attrs['data-ref-id'];
            if (id != null && !seen.has(String(id))) {
                seen.add(String(id));
                ids.push(String(id));
            }
        }
    });
    return ids
        .map((id) => props.entries.find((e) => String(e.id) === id))
        .filter((e): e is BibliographyEntry => e != null);
});
</script>
