<template>
    <div class="divide-y divide-border-light">
        <!-- Editable properties -->
        <div class="grid grid-cols-[6rem_1fr] items-start gap-x-2 px-3 py-2">
            <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider pt-1">Project</span>
            <div>
                <select v-if="isEditingProject" v-model="editProjectId" @change="handleProjectChange"
                    @keyup.escape="cancelProjectEdit"
                    class="w-full bg-surface border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    ref="projectDropdown">
                    <option value="">No project (pending)</option>
                    <option v-for="project in allProjects" :key="project.id" :value="String(project.id)">
                        {{ project.name }}
                    </option>
                </select>
                <div v-else @dblclick="startProjectEdit" class="cursor-pointer hover:bg-surface-hover px-2 py-1 rounded text-sm min-h-[24px]" title="Double-click to edit">
                    <span v-if="resource.project && resource.project.name" class="text-text-primary">{{ resource.project.name }}</span>
                    <span v-else class="text-amber-500 italic text-xs">Pending (unassigned)</span>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-[6rem_1fr] items-start gap-x-2 px-3 py-2">
            <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider pt-1">Type</span>
            <div>
                <select v-if="isEditingType" v-model="editResourceType" @change="handleTypeChange"
                    @keyup.escape="cancelTypeEdit"
                    class="w-full bg-surface border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    ref="typeDropdown">
                    <option value="">Select...</option>
                    <option v-for="resourceType in resourceTypes" :key="resourceType.id" :value="String(resourceType.id)">
                        {{ resourceType.name }}
                    </option>
                </select>
                <div v-else @dblclick="startTypeEdit" class="cursor-pointer hover:bg-surface-hover px-2 py-1 rounded text-sm min-h-[24px]" title="Double-click to edit">
                    <span v-if="resource.type" class="text-text-primary">{{ displayTypeName }}</span>
                    <span v-else class="text-text-muted italic text-xs">--</span>
                </div>
            </div>
        </div>

        <PropertyRow label="Title" :modelValue="resource.title" placeholder="Enter title..."
            @update:modelValue="handleFieldUpdate('title', $event)" />

        <div class="grid grid-cols-[6rem_1fr] items-start gap-x-2 px-3 py-2">
            <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider pt-1">Authors</span>
            <div>
                <div v-if="isEditingAuthors" class="relative">
                    <input v-model="editResourceAuthors" @input="handleAuthorInput" @blur="handleAuthorsBlur"
                        @keydown.enter="handleAuthorsEnter" @keyup.escape="cancelAuthorsEdit"
                        @keydown.down.prevent="navigateAuthorSuggestions(1)"
                        @keydown.up.prevent="navigateAuthorSuggestions(-1)"
                        class="w-full bg-surface border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        ref="authorsInput" type="text" placeholder="Comma-separated...">
                    <div v-if="showAuthorSuggestions && filteredAuthorSuggestions.length > 0"
                        class="absolute z-10 w-full mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        <div v-for="(suggestion, index) in filteredAuthorSuggestions" :key="suggestion.id"
                            @mousedown="(e) => { e.preventDefault(); selectAuthorSuggestion(suggestion); }"
                            @click="(e) => { e.preventDefault(); selectAuthorSuggestion(suggestion); }"
                            :class="['px-3 py-1.5 cursor-pointer text-sm', index === selectedSuggestionIndex ? 'bg-accent-subtle' : 'hover:bg-surface-hover']">
                            {{ suggestion.name }}
                        </div>
                    </div>
                </div>
                <div v-else @dblclick="startAuthorsEdit" class="cursor-pointer hover:bg-surface-hover px-2 py-1 rounded text-sm min-h-[24px]" title="Double-click to edit">
                    <span v-if="resource.authors && resource.authors.length > 0" class="text-text-primary">
                        {{ resource.authors.map((a: any) => a.name).join(', ') }}
                    </span>
                    <span v-else class="text-text-muted italic text-xs">--</span>
                </div>
            </div>
        </div>

        <PropertyRow label="Language" :modelValue="resource.language" type="select"
            :options="languageOptions" :displayFormat="(v) => v ? getLanguageName(String(v)) : ''"
            @update:modelValue="handleFieldUpdate('language', $event)" />

        <PropertyRow label="License" :modelValue="resource.license" placeholder="Enter license..."
            @update:modelValue="handleFieldUpdate('license', $event)" />

        <PropertyRow label="URL" :modelValue="resource.url" placeholder="Enter URL..."
            @update:modelValue="handleFieldUpdate('url', $event)" />

        <PropertyRow label="Published" :modelValue="resource.publicationDate" type="date"
            :displayFormat="(v) => v ? new Date(String(v)).toLocaleDateString() : ''"
            @update:modelValue="handleFieldUpdate('publicationDate', $event)" />

        <!-- Read-only properties -->
        <div class="grid grid-cols-[6rem_1fr] items-center gap-x-2 px-3 py-2">
            <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider">Size</span>
            <span class="text-sm text-text-secondary px-2">{{ formatFileSize(resource.fileSize) }}</span>
        </div>

        <div v-if="resource.pages" class="grid grid-cols-[6rem_1fr] items-center gap-x-2 px-3 py-2">
            <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider">Pages</span>
            <span class="text-sm text-text-secondary px-2">{{ resource.pages }}</span>
        </div>

        <div class="grid grid-cols-[6rem_1fr] items-center gap-x-2 px-3 py-2">
            <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider">Uploaded</span>
            <span class="text-sm text-text-secondary px-2">{{ resource.uploadDate ? new Date(resource.uploadDate).toLocaleDateString() : '' }}</span>
        </div>

        <div class="grid grid-cols-[6rem_1fr] items-start gap-x-2 px-3 py-2">
            <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider pt-1">File</span>
            <span class="text-xs text-text-muted px-2 break-all">{{ resource.originalName }}</span>
        </div>

        <div class="grid grid-cols-[6rem_1fr] items-center gap-x-2 px-3 py-2">
            <span class="text-[11px] font-medium text-text-muted uppercase tracking-wider">Related</span>
            <div class="px-2">
                <router-link v-if="resource.relatedTo" :to="`/resource/${resource.relatedTo}`"
                    class="text-accent hover:text-accent-dark underline underline-offset-2 text-sm">
                    {{ resource.relatedTo }}
                </router-link>
                <span v-else class="text-text-muted italic text-xs">--</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useResourceType } from '../../services/resources/useResourceType';
import { useResource } from '../../services/resources/useResource';
import { useAuthor, type Author } from '../../services/author/useAuthor';
import { useResourceList } from '../../services/resources/useResourceList';
import { useProjectList } from '../../services/projects/useProjectList';
import PropertyRow from './PropertyRow.vue';

const { loadResourceTypes, resourceTypes } = useResourceType();
const { updateResource } = useResource();

// Generic field update for PropertyRow components
const handleFieldUpdate = async (field: string, value: string | number) => {
    try {
        await updateResource(props.resource.id, { [field]: value || null });
        props.resource[field] = value || null;
    } catch (err) {
        console.error(`Failed to update ${field}:`, err);
    }
};
const { updateResourceAuthors, loadAuthors } = useAuthor();
const { assignResourceToProject } = useResourceList();
const { projects: allProjects, loadProjects } = useProjectList();

const isEditingProject = ref(false);
const editProjectId = ref('');
const projectDropdown = ref<HTMLSelectElement | null>(null);

const isEditingType = ref(false);
const editResourceType = ref('');
const typeDropdown = ref<HTMLSelectElement | null>(null);
const isCancelingTypeEdit = ref(false);

const isEditingAuthors = ref(false);
const editResourceAuthors = ref('');
const authorsInput = ref<HTMLInputElement | null>(null);
const isCancelingAuthorsEdit = ref(false);

// Autocomplete state for authors
const allAuthors = ref<Author[]>([]);
const showAuthorSuggestions = ref(false);
const filteredAuthorSuggestions = ref<Author[]>([]);
const selectedSuggestionIndex = ref(-1);

const props = defineProps({
    resource: {
        type: Object,
        default: () => ({})
    }
});

// Computed property to get the type name reactively
const displayTypeName = computed(() => {
    if (!props.resource.type) return null;
    const typeId = typeof props.resource.type === 'object' ? props.resource.type.id : props.resource.type;
    const typeIdNum = typeof typeId === 'string' ? parseInt(typeId, 10) : typeId;
    const resourceType = resourceTypes.value.find(rt => rt.id === typeIdNum);
    return resourceType ? resourceType.name : typeId;
});

const getLanguageName = (code: string): string => {
    return languageMap[code as keyof typeof languageMap] || code;
};

const languageOptions = computed(() =>
    Object.entries(languageMap).map(([code, name]) => ({ label: name, value: code }))
);

const languageMap = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'pl': 'Polish',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
    'tr': 'Turkish',
    'he': 'Hebrew',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'ms': 'Malay',
    'tl': 'Filipino',
    'uk': 'Ukrainian',
    'ro': 'Romanian',
    'hu': 'Hungarian',
    'cs': 'Czech',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'hr': 'Croatian',
    'sr': 'Serbian',
    'bg': 'Bulgarian',
    'lt': 'Lithuanian',
    'lv': 'Latvian',
    'et': 'Estonian',
    'mt': 'Maltese',
    'ga': 'Irish',
    'cy': 'Welsh',
    'eu': 'Basque',
    'ca': 'Catalan',
    'gl': 'Galician',
    'is': 'Icelandic',
    'fa': 'Persian',
    'ur': 'Urdu',
    'bn': 'Bengali',
    'ta': 'Tamil',
    'te': 'Telugu',
    'ml': 'Malayalam',
    'kn': 'Kannada',
    'gu': 'Gujarati',
    'pa': 'Punjabi',
    'mr': 'Marathi',
    'or': 'Odia',
    'as': 'Assamese',
    'ne': 'Nepali',
    'si': 'Sinhala',
    'my': 'Myanmar',
    'km': 'Khmer',
    'lo': 'Lao',
    'ka': 'Georgian',
    'am': 'Amharic',
    'sw': 'Swahili',
    'zu': 'Zulu',
    'af': 'Afrikaans',
    'sq': 'Albanian',
    'az': 'Azerbaijani',
    'be': 'Belarusian',
    'bs': 'Bosnian',
    'mk': 'Macedonian',
    'mn': 'Mongolian',
    'kk': 'Kazakh',
    'ky': 'Kyrgyz',
    'tg': 'Tajik',
    'tk': 'Turkmen',
    'uz': 'Uzbek'
};

const formatFileSize = (bytes: number | string | undefined): string => {
    if (bytes === undefined || bytes === null) return '';

    const sizeInBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(sizeInBytes)) return '';

    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];

    let size = sizeInBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return unitIndex === 0
        ? `${size} ${units[unitIndex]}`
        : `${size.toFixed(2).replace(/\.00$/, '')} ${units[unitIndex]}`;
};

const startTypeEdit = () => {
    isEditingType.value = true;
    const currentType = props.resource.type;

    if (typeof currentType === 'object' && currentType !== null) {
        editResourceType.value = String(currentType.id);
    } else if (currentType) {
        editResourceType.value = String(currentType);
    } else {
        editResourceType.value = '';
    }

    setTimeout(() => {
        typeDropdown.value?.focus();
    }, 50);
};

const cancelTypeEdit = () => {
    isCancelingTypeEdit.value = true;
    isEditingType.value = false;
    editResourceType.value = '';

    setTimeout(() => {
        isCancelingTypeEdit.value = false;
    }, 100);
};

const handleTypeChange = async () => {
    if (isCancelingTypeEdit.value) {
        return;
    }

    await saveResourceType();
};

const saveResourceType = async () => {
    if (isCancelingTypeEdit.value) {
        return;
    }

    // Normalize current type for comparison
    const currentType = props.resource.type;
    const currentTypeId = (typeof currentType === 'object' && currentType !== null)
        ? String(currentType.id)
        : String(currentType || '');

    if (editResourceType.value === currentTypeId) {
        isEditingType.value = false;
        return;
    }

    try {
        await updateResource(props.resource.id, {
            type: editResourceType.value || null
        });

        props.resource.type = editResourceType.value || null;

        setTimeout(() => {
            isEditingType.value = false;
        }, 1500);
    } catch (error) {
        isEditingType.value = false;
    }
};

const startAuthorsEdit = async () => {
    isEditingAuthors.value = true;
    // Convert authors array to comma-separated string
    const authorNames = props.resource.authors?.map((a: Author) => a.name).join(', ') || '';
    editResourceAuthors.value = authorNames;

    // Load all authors for autocomplete
    try {
        allAuthors.value = await loadAuthors();
    } catch (error) {
        console.error('Failed to load authors for autocomplete:', error);
    }

    setTimeout(() => {
        authorsInput.value?.focus();
    }, 50);
};

// Handle author input for autocomplete
const handleAuthorInput = () => {
    const inputValue = editResourceAuthors.value;

    // Get the current word being typed (after last comma)
    const parts = inputValue.split(',');
    const currentPart = parts[parts.length - 1].trim();

    if (currentPart.length > 0) {
        // Filter authors by current input (case-insensitive)
        filteredAuthorSuggestions.value = allAuthors.value.filter(author =>
            author.name.toLowerCase().includes(currentPart.toLowerCase())
        ).slice(0, 10); // Limit to 10 suggestions

        showAuthorSuggestions.value = filteredAuthorSuggestions.value.length > 0;
        selectedSuggestionIndex.value = -1;
    } else {
        showAuthorSuggestions.value = false;
        filteredAuthorSuggestions.value = [];
    }
};

// Navigate through suggestions with arrow keys
const navigateAuthorSuggestions = (direction: number) => {
    if (filteredAuthorSuggestions.value.length === 0) return;

    selectedSuggestionIndex.value += direction;

    if (selectedSuggestionIndex.value < 0) {
        selectedSuggestionIndex.value = filteredAuthorSuggestions.value.length - 1;
    } else if (selectedSuggestionIndex.value >= filteredAuthorSuggestions.value.length) {
        selectedSuggestionIndex.value = 0;
    }
};

// Handle Enter key - select suggestion if one is highlighted, otherwise save
const handleAuthorsEnter = (event: KeyboardEvent) => {
    if (showAuthorSuggestions.value && selectedSuggestionIndex.value >= 0) {
        // Select the highlighted suggestion
        event.preventDefault();
        const suggestion = filteredAuthorSuggestions.value[selectedSuggestionIndex.value];
        selectAuthorSuggestion(suggestion);
    } else if (showAuthorSuggestions.value && filteredAuthorSuggestions.value.length > 0) {
        // Select the first suggestion if dropdown is open but nothing highlighted
        event.preventDefault();
        selectAuthorSuggestion(filteredAuthorSuggestions.value[0]);
    } else {
        // No suggestions, save the changes
        event.preventDefault();
        handleAuthorsChange();
    }
};

// Select a suggestion from autocomplete
const selectAuthorSuggestion = (suggestion: Author) => {
    const parts = editResourceAuthors.value.split(',');
    const beforeLast = parts.slice(0, -1).join(',');
    const lastPart = ' ' + suggestion.name;

    if (beforeLast) {
        editResourceAuthors.value = beforeLast + ',' + lastPart;
    } else {
        editResourceAuthors.value = suggestion.name;
    }

    showAuthorSuggestions.value = false;
    filteredAuthorSuggestions.value = [];
    selectedSuggestionIndex.value = -1;

    // Focus back on input and move cursor to end
    setTimeout(() => {
        if (authorsInput.value) {
            authorsInput.value.focus();
            authorsInput.value.setSelectionRange(
                editResourceAuthors.value.length,
                editResourceAuthors.value.length
            );
        }
    }, 10);
};

// Handle blur with delay to allow clicking suggestions
const handleAuthorsBlur = () => {
    // Longer delay to ensure mousedown event fires first
    setTimeout(() => {
        if (showAuthorSuggestions.value) {
            showAuthorSuggestions.value = false;
        }
        if (isEditingAuthors.value) {
            handleAuthorsChange();
        }
    }, 250);
};

const cancelAuthorsEdit = () => {
    isCancelingAuthorsEdit.value = true;
    isEditingAuthors.value = false;
    editResourceAuthors.value = '';
    showAuthorSuggestions.value = false;
    filteredAuthorSuggestions.value = [];

    setTimeout(() => {
        isCancelingAuthorsEdit.value = false;
    }, 100);
};

const handleAuthorsChange = async () => {
    if (isCancelingAuthorsEdit.value) {
        return;
    }

    await saveResourceAuthors();
};

const saveResourceAuthors = async () => {
    if (isCancelingAuthorsEdit.value) {
        return;
    }

    // Convert comma-separated string to array
    const newAuthorNames = editResourceAuthors.value
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);

    // Check if authors have changed
    const currentAuthorNames = props.resource.authors?.map((a: Author) => a.name) || [];
    const authorsChanged = JSON.stringify(newAuthorNames.sort()) !== JSON.stringify(currentAuthorNames.sort());

    if (!authorsChanged) {
        isEditingAuthors.value = false;
        return;
    }

    try {
        const updatedAuthors = await updateResourceAuthors(props.resource.id, newAuthorNames);
        props.resource.authors = updatedAuthors;

        setTimeout(() => {
            isEditingAuthors.value = false;
        }, 1500);
    } catch (error) {
        isEditingAuthors.value = false;
    }
};

const emit = defineEmits(['project:assigned']);

const startProjectEdit = async () => {
    isEditingProject.value = true;
    editProjectId.value = props.resource.project?.id ? String(props.resource.project.id) : '';
    if (allProjects.value.length === 0) {
        await loadProjects();
    }
    setTimeout(() => {
        projectDropdown.value?.focus();
    }, 50);
};

const cancelProjectEdit = () => {
    isEditingProject.value = false;
    editProjectId.value = '';
};

const handleProjectChange = async () => {
    const currentProjectId = props.resource.project?.id ? String(props.resource.project.id) : '';
    if (editProjectId.value === currentProjectId) {
        isEditingProject.value = false;
        return;
    }

    try {
        if (editProjectId.value) {
            await assignResourceToProject(props.resource.id, editProjectId.value);
            const project = allProjects.value.find((p: any) => String(p.id) === editProjectId.value);
            props.resource.project = project ? { id: project.id, name: project.name } : null;
        } else {
            await updateResource(props.resource.id, { project: null });
            props.resource.project = null;
        }
        emit('project:assigned', props.resource);
        isEditingProject.value = false;
    } catch (error) {
        isEditingProject.value = false;
    }
};

onMounted(async () => {
    await loadResourceTypes();
});
</script>