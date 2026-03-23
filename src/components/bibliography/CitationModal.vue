<template>
    <Modal v-model="isOpen" title="Insertar cita">
        <div class="p-4">
            <input
                type="text"
                v-model="searchQuery"
                placeholder="Buscar por título, autor o clave..."
                class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                autofocus
            />

            <div class="mt-4 max-h-72 overflow-y-auto">
                <div v-if="filtered.length === 0" class="text-center text-text-muted py-4">
                    No hay entradas bibliográficas. Añade referencias en el gestor de bibliografía.
                </div>
                <ul v-else>
                    <li
                        v-for="entry in filtered"
                        :key="entry.id"
                        class="p-2 hover:bg-surface-hover cursor-pointer rounded-md"
                        @click="selectEntry(entry)"
                    >
                        <div class="font-semibold text-sm">{{ entry.title || entry.citeKey || 'Sin título' }}</div>
                        <div class="text-xs text-text-muted">
                            {{ formatCreators(entry.creators) }}
                            <span v-if="entry.year"> · {{ entry.year }}</span>
                            <span v-if="entry.journal"> · {{ entry.journal }}</span>
                            <span v-if="entry.publisher"> · {{ entry.publisher }}</span>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </Modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Modal from '../ui/Modal/Modal.vue';
import type { BibliographyEntry, ZoteroCreator } from '../../types/Bibliography';

const props = defineProps<{
    modelValue: boolean;
    entries: BibliographyEntry[];
    citationFormat: 'apa' | 'numeric';
    existingEntryIds: number[];
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'select': [entry: BibliographyEntry, label: string];
}>();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
});

const searchQuery = ref('');

const creatorName = (c: ZoteroCreator): string => {
    if (c.name) return c.name;
    if (c.firstName) return `${c.lastName}, ${c.firstName}`;
    return c.lastName ?? '';
};

const filtered = computed(() => {
    const q = searchQuery.value.toLowerCase();
    if (!q) return props.entries;
    return props.entries.filter((e) => {
        return (
            e.title?.toLowerCase().includes(q) ||
            e.citeKey?.toLowerCase().includes(q) ||
            e.creators?.some((c) => creatorName(c).toLowerCase().includes(q)) ||
            e.year?.includes(q)
        );
    });
});

const formatCreators = (creators: ZoteroCreator[] | null): string => {
    const authors = (creators ?? []).filter((c) => c.creatorType === 'author');
    if (authors.length === 0) return '';
    if (authors.length === 1) return creatorName(authors[0]);
    if (authors.length === 2) return `${creatorName(authors[0])} & ${creatorName(authors[1])}`;
    return creatorName(authors[0]) + ' et al.';
};

const getSurname = (c: ZoteroCreator): string => c.lastName ?? c.name ?? '';

const buildLabel = (entry: BibliographyEntry): string => {
    if (props.citationFormat === 'numeric') {
        const nextIndex = props.existingEntryIds.includes(entry.id)
            ? props.existingEntryIds.indexOf(entry.id) + 1
            : props.existingEntryIds.length + 1;
        return `[${nextIndex}]`;
    }
    // APA
    const authors = (entry.creators ?? []).filter((c) => c.creatorType === 'author');
    let authorPart = '';
    if (authors.length === 0) {
        authorPart = entry.citeKey ?? 'Anon';
    } else if (authors.length === 1) {
        authorPart = getSurname(authors[0]);
    } else if (authors.length === 2) {
        authorPart = `${getSurname(authors[0])} & ${getSurname(authors[1])}`;
    } else {
        authorPart = `${getSurname(authors[0])} et al.`;
    }
    const year = entry.year ?? 's.f.';
    return `(${authorPart}, ${year})`;
};

const selectEntry = (entry: BibliographyEntry) => {
    const label = buildLabel(entry);
    emit('select', entry, label);
    isOpen.value = false;
};
</script>
