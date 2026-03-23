<template>
    <form @submit.prevent="handleSubmit" class="space-y-5">

        <!-- Item type + CiteKey -->
        <div class="flex gap-3">
            <div class="flex-1">
                <label class="block text-xs font-medium text-text-muted mb-1">Tipo de elemento</label>
                <select v-model="form.entryType"
                    class="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent bg-surface-elevated">
                    <optgroup v-for="group in itemTypeGroups" :key="group.label" :label="group.label">
                        <option v-for="t in group.types" :key="t.value" :value="t.value">{{ t.label }}</option>
                    </optgroup>
                </select>
            </div>
            <div class="w-44">
                <label class="block text-xs font-medium text-text-muted mb-1">Clave BibTeX</label>
                <input v-model="form.citeKey" type="text" placeholder="autor2024"
                    class="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
        </div>

        <!-- Title -->
        <FormField label="Título *" v-model="form.title" required placeholder="Título del trabajo" />
        <FormField v-if="showField('shortTitle')" label="Título corto" v-model="form.shortTitle" />

        <!-- Creators -->
        <div>
            <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-medium text-text-muted">Autores / Creadores</label>
                <div class="flex gap-1">
                    <button v-for="role in availableCreatorTypes" :key="role.value" type="button"
                        @click="addCreator(role.value)"
                        class="px-2 py-0.5 text-xs rounded border border-border hover:bg-surface-hover text-text-muted">
                        + {{ role.label }}
                    </button>
                </div>
            </div>
            <div class="space-y-1.5">
                <div v-for="(creator, idx) in form.creators" :key="idx"
                    class="flex gap-2 items-center">
                    <select v-model="creator.creatorType"
                        class="w-28 px-2 py-1.5 text-xs border border-border rounded bg-surface-elevated focus:outline-none">
                        <option v-for="ct in allCreatorTypes" :key="ct.value" :value="ct.value">{{ ct.label }}</option>
                    </select>
                    <input v-model="creator.lastName" type="text" placeholder="Apellido"
                        class="flex-1 px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent" />
                    <input v-model="creator.firstName" type="text" placeholder="Nombre"
                        class="flex-1 px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent" />
                    <button type="button" @click="removeCreator(idx)"
                        class="p-1 text-text-muted hover:text-red-500 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
                <div v-if="!form.creators || form.creators.length === 0"
                    class="text-xs text-text-muted italic py-1">Sin creadores añadidos</div>
            </div>
        </div>

        <!-- Abstract -->
        <FormField label="Resumen" v-model="form.abstract" type="textarea" placeholder="Resumen del trabajo..." />

        <!-- Publication details — vary by type -->
        <div class="grid grid-cols-2 gap-3">
            <!-- Journal -->
            <FormField v-if="showField('journal')" class="col-span-2" label="Publicación" v-model="form.journal" :placeholder="journalPlaceholder" />
            <FormField v-if="showField('journalAbbreviation')" label="Abreviatura" v-model="form.journalAbbreviation" />

            <!-- Booktitle / proceedingsTitle -->
            <FormField v-if="showField('booktitle')" class="col-span-2" :label="booktitleLabel" v-model="form.booktitle" />

            <!-- Conference name -->
            <FormField v-if="showField('conferenceName')" class="col-span-2" label="Nombre del congreso" v-model="form.conferenceName" />

            <!-- Volume / Issue / Pages -->
            <FormField v-if="showField('volume')" label="Volumen" v-model="form.volume" />
            <FormField v-if="showField('number')" :label="numberLabel" v-model="form.number" />
            <FormField v-if="showField('pages')" label="Páginas" v-model="form.pages" placeholder="1-15" />
            <FormField v-if="showField('numberOfPages')" label="Nº de páginas" v-model="form.numberOfPages" />

            <!-- Year -->
            <FormField label="Año" v-model="form.year" placeholder="2024" />

            <!-- Edition -->
            <FormField v-if="showField('edition')" label="Edición" v-model="form.edition" />

            <!-- Publisher / Place -->
            <FormField v-if="showField('publisher')" label="Editorial" v-model="form.publisher" />
            <FormField v-if="showField('place')" label="Lugar" v-model="form.place" />

            <!-- Series -->
            <FormField v-if="showField('series')" class="col-span-2" label="Serie" v-model="form.series" />
            <FormField v-if="showField('series')" label="Número de serie" v-model="form.seriesNumber" />
            <FormField v-if="showField('numberOfVolumes')" label="Nº de volúmenes" v-model="form.numberOfVolumes" />

            <!-- Institution / University / ThesisType / ReportType -->
            <FormField v-if="showField('institution')" class="col-span-2" :label="institutionLabel" v-model="form.institution" />
            <FormField v-if="showField('university')" class="col-span-2" label="Universidad" v-model="form.university" />
            <FormField v-if="showField('thesisType')" label="Tipo de tesis" v-model="form.thesisType" placeholder="Doctoral, Máster..." />
            <FormField v-if="showField('reportNumber')" label="Nº de informe" v-model="form.reportNumber" />
            <FormField v-if="showField('reportType')" label="Tipo de informe" v-model="form.reportType" />

            <!-- Website fields -->
            <FormField v-if="showField('websiteTitle')" class="col-span-2" label="Título del sitio web" v-model="form.websiteTitle" />
            <FormField v-if="showField('websiteType')" class="col-span-2" label="Tipo de web" v-model="form.websiteType" />
        </div>

        <!-- Identifiers -->
        <div class="grid grid-cols-2 gap-3">
            <FormField label="DOI" v-model="form.doi" placeholder="10.xxxx/xxxx" />
            <FormField v-if="showField('isbn')" label="ISBN" v-model="form.isbn" />
            <FormField v-if="showField('issn')" label="ISSN" v-model="form.issn" />
            <FormField class="col-span-2" label="URL" v-model="form.url" />
            <FormField v-if="showField('accessDate')" label="Fecha de acceso" v-model="form.accessDate" placeholder="2024-01-15" />
        </div>

        <!-- Archive / Library fields (collapsed by default) -->
        <details class="group">
            <summary class="cursor-pointer text-xs font-medium text-text-muted flex items-center gap-1 select-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
                Campos de archivo / biblioteca
            </summary>
            <div class="mt-2 grid grid-cols-2 gap-3">
                <FormField class="col-span-2" label="Archivo" v-model="form.archive" />
                <FormField class="col-span-2" label="Ubicación en archivo" v-model="form.archiveLocation" />
                <FormField label="Signatura" v-model="form.callNumber" />
                <FormField label="Idioma" v-model="form.language" placeholder="es, en, fr..." />
                <FormField class="col-span-2" label="Derechos" v-model="form.rights" />
            </div>
        </details>

        <!-- Note / Extra -->
        <div class="grid grid-cols-2 gap-3">
            <FormField class="col-span-2" label="Nota" v-model="form.note" />
            <FormField class="col-span-2" label="Extra" v-model="form.extra" type="textarea" :rows="2" />
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-1">
            <button type="button" @click="emit('cancel')"
                class="px-3 py-1.5 text-sm rounded border border-border hover:bg-surface-hover">
                Cancelar
            </button>
            <button type="submit"
                class="px-3 py-1.5 text-sm rounded bg-accent text-white hover:opacity-90">
                {{ entry ? 'Guardar cambios' : 'Añadir entrada' }}
            </button>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { BibliographyEntry, ZoteroCreator } from '../../types/Bibliography';
import FormField from '../ui/FormField.vue';

const props = defineProps<{
    entry?: BibliographyEntry | null;
    projectId?: number | null;
}>();

const emit = defineEmits<{
    'save': [data: Partial<BibliographyEntry>];
    'cancel': [];
}>();

// --- Item types grouped ---
const itemTypeGroups = [
    {
        label: 'Artículos',
        types: [
            { value: 'journalArticle', label: 'Artículo de revista' },
            { value: 'magazineArticle', label: 'Artículo de magazine' },
            { value: 'newspaperArticle', label: 'Artículo de periódico' },
        ],
    },
    {
        label: 'Libros',
        types: [
            { value: 'book', label: 'Libro' },
            { value: 'bookSection', label: 'Sección de libro' },
            { value: 'encyclopediaArticle', label: 'Artículo de enciclopedia' },
        ],
    },
    {
        label: 'Conferencias y actas',
        types: [
            { value: 'conferencePaper', label: 'Artículo de conferencia' },
            { value: 'presentation', label: 'Presentación' },
        ],
    },
    {
        label: 'Tesis e informes',
        types: [
            { value: 'thesis', label: 'Tesis' },
            { value: 'report', label: 'Informe' },
        ],
    },
    {
        label: 'Web y digital',
        types: [
            { value: 'webpage', label: 'Página web' },
            { value: 'blogPost', label: 'Entrada de blog' },
            { value: 'forumPost', label: 'Entrada de foro' },
            { value: 'dataset', label: 'Conjunto de datos' },
            { value: 'software', label: 'Software' },
        ],
    },
    {
        label: 'Otros',
        types: [
            { value: 'document', label: 'Documento' },
            { value: 'misc', label: 'Otros' },
        ],
    },
];

const allCreatorTypes = [
    { value: 'author', label: 'Autor' },
    { value: 'editor', label: 'Editor' },
    { value: 'translator', label: 'Traductor' },
    { value: 'seriesEditor', label: 'Editor de serie' },
    { value: 'contributor', label: 'Colaborador' },
    { value: 'reviewedAuthor', label: 'Autor reseñado' },
];

// Per-type default creator roles shown as quick-add buttons
const availableCreatorTypes = computed(() => {
    const t = form.value.entryType;
    if (t === 'book' || t === 'bookSection' || t === 'encyclopediaArticle') {
        return [
            { value: 'author', label: 'Autor' },
            { value: 'editor', label: 'Editor' },
            { value: 'translator', label: 'Trad.' },
        ];
    }
    if (t === 'thesis' || t === 'report') {
        return [{ value: 'author', label: 'Autor' }];
    }
    return [
        { value: 'author', label: 'Autor' },
        { value: 'editor', label: 'Editor' },
    ];
});

// --- Fields visible per type ---
type FieldKey =
    | 'shortTitle' | 'journal' | 'journalAbbreviation' | 'booktitle' | 'conferenceName'
    | 'volume' | 'number' | 'pages' | 'numberOfPages' | 'publisher' | 'place'
    | 'edition' | 'series' | 'numberOfVolumes' | 'institution' | 'university'
    | 'thesisType' | 'reportNumber' | 'reportType' | 'websiteTitle' | 'websiteType'
    | 'accessDate' | 'isbn' | 'issn';

const fieldsByType: Record<string, FieldKey[]> = {
    journalArticle: ['shortTitle', 'journal', 'journalAbbreviation', 'volume', 'number', 'pages', 'issn', 'place'],
    magazineArticle: ['journal', 'volume', 'number', 'pages', 'issn', 'place'],
    newspaperArticle: ['journal', 'place', 'pages', 'issn'],
    book: ['shortTitle', 'publisher', 'place', 'volume', 'numberOfVolumes', 'edition', 'series', 'isbn'],
    bookSection: ['booktitle', 'publisher', 'place', 'volume', 'numberOfVolumes', 'edition', 'series', 'pages', 'isbn'],
    encyclopediaArticle: ['booktitle', 'publisher', 'place', 'volume', 'edition', 'pages', 'isbn'],
    conferencePaper: ['booktitle', 'conferenceName', 'publisher', 'place', 'volume', 'pages'],
    presentation: ['conferenceName', 'place'],
    thesis: ['university', 'thesisType', 'place', 'numberOfPages'],
    report: ['institution', 'reportNumber', 'reportType', 'place'],
    webpage: ['websiteTitle', 'websiteType', 'accessDate'],
    blogPost: ['websiteTitle', 'accessDate'],
    forumPost: ['websiteTitle', 'accessDate'],
    dataset: ['publisher', 'place'],
    software: ['publisher', 'place', 'isbn'],
    document: ['publisher', 'place'],
    misc: ['publisher', 'place'],
};

function showField(field: FieldKey): boolean {
    const fields = fieldsByType[form.value.entryType ?? 'misc'] ?? fieldsByType['misc'];
    return fields.includes(field);
}

const journalPlaceholder = computed(() => {
    const t = form.value.entryType;
    if (t === 'magazineArticle') return 'Nombre del magazine';
    if (t === 'newspaperArticle') return 'Nombre del periódico';
    return 'Nombre de la revista';
});

const booktitleLabel = computed(() => {
    const t = form.value.entryType;
    if (t === 'bookSection' || t === 'encyclopediaArticle') return 'Título del libro';
    if (t === 'conferencePaper') return 'Título de las actas';
    return 'Libro / Actas';
});

const numberLabel = computed(() => {
    const t = form.value.entryType;
    if (t === 'journalArticle' || t === 'magazineArticle' || t === 'newspaperArticle') return 'Número';
    return 'Número';
});

const institutionLabel = computed(() => {
    const t = form.value.entryType;
    if (t === 'report') return 'Institución';
    return 'Institución';
});

// --- Form state ---
function emptyForm(): Partial<BibliographyEntry> {
    return {
        entryType: 'journalArticle',
        citeKey: null,
        title: null,
        shortTitle: null,
        creators: [],
        year: null,
        abstract: null,
        journal: null,
        journalAbbreviation: null,
        booktitle: null,
        conferenceName: null,
        volume: null,
        number: null,
        pages: null,
        numberOfPages: null,
        publisher: null,
        place: null,
        edition: null,
        series: null,
        seriesNumber: null,
        numberOfVolumes: null,
        doi: null,
        isbn: null,
        issn: null,
        url: null,
        accessDate: null,
        websiteTitle: null,
        websiteType: null,
        institution: null,
        university: null,
        thesisType: null,
        reportNumber: null,
        reportType: null,
        archive: null,
        archiveLocation: null,
        callNumber: null,
        language: null,
        rights: null,
        note: null,
        extra: null,
    };
}

const form = ref<Partial<BibliographyEntry>>(emptyForm());

watch(() => props.entry, (entry) => {
    if (entry) {
        form.value = {
            ...emptyForm(),
            ...entry,
            creators: entry.creators ? entry.creators.map((c) => ({ ...c })) : [],
        };
    } else {
        form.value = emptyForm();
    }
}, { immediate: true });

function addCreator(type: string) {
    if (!form.value.creators) form.value.creators = [];
    form.value.creators.push({ creatorType: type, firstName: '', lastName: '' });
}

function removeCreator(idx: number) {
    form.value.creators?.splice(idx, 1);
}

const handleSubmit = () => {
    const creators = (form.value.creators ?? []).filter(
        (c) => (c.lastName && c.lastName.trim()) || (c.firstName && c.firstName.trim()) || (c.name && c.name.trim())
    );
    const data: Partial<BibliographyEntry> = {
        ...form.value,
        creators: creators.length > 0 ? creators : null,
        project: props.projectId ? ({ id: props.projectId } as any) : null,
    };
    emit('save', data);
};
</script>
