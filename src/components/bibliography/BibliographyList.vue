<template>
    <div v-if="citedEntries.length > 0" class="mt-8 pt-4 border-t border-border">
        <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">Referencias</h3>
        <ol class="space-y-1">
            <li v-for="(entry, index) in citedEntries" :key="entry.id" class="text-sm leading-snug">
                <span v-if="citationFormat === 'numeric'" class="font-medium">[{{ index + 1 }}]&nbsp;</span>
                <span>{{ formatEntry(entry) }}</span>
            </li>
        </ol>
    </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import type { BibliographyEntry, ZoteroCreator } from '../../types/Bibliography';

const props = defineProps<{
    editor: any;
    entries: BibliographyEntry[];
    citationFormat: 'apa' | 'numeric';
}>();

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
    const ids: number[] = [];
    const seen = new Set<number>();
    props.editor.state.doc.descendants((node: any) => {
        if (node.type.name === 'citationNode') {
            const id = node.attrs['data-entry-id'];
            if (id != null && !seen.has(id)) {
                seen.add(id);
                ids.push(id);
            }
        }
    });
    return ids
        .map((id) => props.entries.find((e) => e.id === id))
        .filter((e): e is BibliographyEntry => e != null);
});

const getSurname = (c: ZoteroCreator): string => c.lastName ?? c.name ?? '';

const formatEntry = (entry: BibliographyEntry): string => {
    const authors = (entry.creators ?? []).filter((c) => c.creatorType === 'author');
    let authorStr = '';
    if (authors.length === 0) {
        authorStr = 'Anónimo';
    } else if (authors.length <= 6) {
        authorStr = authors.map(getSurname).join(', ');
    } else {
        authorStr = getSurname(authors[0]) + ' et al.';
    }

    const year = entry.year ? `(${entry.year})` : '';
    const title = entry.title ? `${entry.title}.` : '';
    const journal = entry.journal
        ? `${entry.journal}${entry.volume ? `, ${entry.volume}` : ''}${entry.number ? `(${entry.number})` : ''}${entry.pages ? `, ${entry.pages}` : ''}.`
        : '';
    const publisher = entry.publisher ? `${entry.publisher}.` : '';
    const doi = entry.doi ? `https://doi.org/${entry.doi}` : (entry.url ?? '');

    return [authorStr, year, title, journal, publisher, doi]
        .filter(Boolean)
        .join(' ');
};
</script>
