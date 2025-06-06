<template>
    <div class="space-y-6 md:col-span-1">
        <div v-if="resource.description" class="bg-white p-4 shadow rounded-lg">
            <h2 class="text-xl font-semibold mb-2">Description</h2>
            <p class="text-gray-700">{{ resource.description }}</p>
        </div>
        <div class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Source</strong>
            <br />
            <div class="mt-1">
                <input v-if="isEditingSource" v-model="editResourceSource" @input="handleResourceSourceChange"
                    @keyup.enter="saveResourceSource" @keyup.escape="cancelSourceEdit" @blur="handleSourceBlur"
                    type="text"
                    class="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter source..." ref="sourceInput" />
                <div v-else @dblclick="startSourceEdit"
                    class="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px]"
                    title="Double-click to edit">
                    <a v-if="resource.type?.abbreviation === 'WEB' && resource.source" :href="resource.source"
                        target="_blank" rel="noopener noreferrer"
                        class="text-blue-600 hover:text-blue-800 hover:underline">
                        {{ resource.source }}
                    </a>
                    <span v-else-if="resource.source">{{ resource.source }}</span>
                    <span v-else class="text-gray-400 italic">No source</span>
                </div>
            </div>
        </div>
        <div v-if="resource?.language || isEditingLanguage" class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Language</strong>
            <br />
            <div class="mt-1">
                <select v-if="isEditingLanguage" v-model="editResourceLanguage" @change="handleLanguageChange"
                    @keyup.escape="cancelLanguageEdit"
                    class="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    ref="languageDropdown">
                    <option value="">Select a language...</option>
                    <option v-for="(name, code) in languageMap" :key="code" :value="code">
                        {{ name }}
                    </option>
                </select>
                <div v-else @dblclick="startLanguageEdit"
                    class="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px]"
                    title="Double-click to edit">
                    <span v-if="resource.language">{{ getLanguageName(resource.language) }}</span>
                    <span v-else class="text-gray-400 italic">No language</span>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Type</strong>
            <br />
            <div class="mt-1">
                <select v-if="isEditingType" v-model="editResourceType" @change="handleTypeChange"
                    @keyup.escape="cancelTypeEdit"
                    class="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    ref="typeDropdown">
                    <option value="">Select a type...</option>
                    <option v-for="resourceType in resourceTypes" :key="resourceType._id" :value="resourceType._id">
                        {{ resourceType.name }}
                    </option>
                </select>
                <div v-else @dblclick="startTypeEdit"
                    class="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px]"
                    title="Double-click to edit">
                    <span v-if="resource.type">{{ getResourceTypeName(resource.type._id || resource.type)
                    }}</span>
                    <span v-else class="text-gray-400 italic">No type</span>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Original name</strong>
            <br />
            {{ resource.originalName }}
        </div>
        <div class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Upload date</strong>
            <br />
            {{ resource.uploadDate ? new Date(resource.uploadDate).toLocaleString() : '' }}
        </div>
        <div class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Size</strong>
            <br />
            {{ formatFileSize(resource.fileSize) }}
        </div>
        <div v-if="resource.metadata" class="bg-white p-4 shadow rounded-lg">
            <h2 class="text-xl font-semibold mb-3">Metadata</h2>
            <div class="space-y-3">
                <div v-for="(value, key) in resource.metadata" :key="key" class="bg-gray-50 rounded-md">
                    <strong class="text-gray-700">{{ formatKey(key) }}</strong><br />{{ value }}
                </div>
            </div>
        </div>
        <div v-if="resource.entities && resource.entities.length > 0" class="bg-white p-4 shadow rounded-lg">
            <h2 class="text-xl font-semibold mb-3">Entities</h2>
            <div class="space-y-3">
                <div v-for="(value, key) in resource.entities" :key="key" class="bg-gray-50 rounded-md">
                    <strong class="text-gray-700">{{ value.entity }}</strong><br />{{ value.word }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useResourceType } from '../../services/resources/useResourceType';
import { useResource } from '../../services/resources/useResource';

const { loadResourceTypes, getResourceTypeName, resourceTypes } = useResourceType();
const { updateResource } = useResource();

const isEditingType = ref(false);
const editResourceType = ref('');
const typeDropdown = ref<HTMLSelectElement | null>(null);
const typeSaveTimeout = ref<NodeJS.Timeout | null>(null);
const isEditingLanguage = ref(false);
const editResourceLanguage = ref('');
const languageSavedSuccessfully = ref(false);
const languageDropdown = ref<HTMLSelectElement | null>(null);
const isTypeSaving = ref(false);
const isCancelingLanguageEdit = ref(false);
const languageSaveTimeout = ref<NodeJS.Timeout | null>(null);
const isLanguageSaving = ref(false);
const isEditingSource = ref(false);
const editResourceSource = ref('');
const sourceSavedSuccessfully = ref(false);
const sourceInput = ref<HTMLInputElement | null>(null);
const isSourceSaving = ref(false);
const sourceSaveTimeout = ref<NodeJS.Timeout | null>(null);
const isCancelingSourceEdit = ref(false);

const typeSavedSuccessfully = ref(false);
const isCancelingTypeEdit = ref(false);

const props = defineProps({
    resource: {
        type: Object,
        default: () => ({})
    }
});

const getLanguageName = (code: string): string => {
    return languageMap[code as keyof typeof languageMap] || code;
};

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

const formatKey = (key: string | number): string => {
    const strKey = String(key);
    return strKey.charAt(0).toUpperCase() + strKey.slice(1).replace(/([A-Z])/g, ' $1');
};

const startTypeEdit = () => {
    isEditingType.value = true;
    editResourceType.value = props.resource.type?._id || props.resource.type || '';
    typeSavedSuccessfully.value = false;

    setTimeout(() => {
        typeDropdown.value?.focus();
    }, 50);
};

const cancelTypeEdit = () => {
    isCancelingTypeEdit.value = true;
    isEditingType.value = false;
    editResourceType.value = '';
    typeSavedSuccessfully.value = false;

    if (typeSaveTimeout.value) {
        clearTimeout(typeSaveTimeout.value);
    }

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

const startLanguageEdit = () => {
    isEditingLanguage.value = true;
    editResourceLanguage.value = props.resource.language || '';
    languageSavedSuccessfully.value = false;

    setTimeout(() => {
        languageDropdown.value?.focus();
    }, 50);
};

const saveResourceType = async () => {
    if (isCancelingTypeEdit.value) {
        return;
    }

    const currentTypeId = props.resource.type?._id || props.resource.type || '';
    if (editResourceType.value === currentTypeId) {
        isEditingType.value = false;
        return;
    }

    if (typeSaveTimeout.value) {
        clearTimeout(typeSaveTimeout.value);
    }

    isTypeSaving.value = true;
    typeSavedSuccessfully.value = false;

    try {
        await updateResource(props.resource._id, {
            type: editResourceType.value || null
        });

        if (editResourceType.value) {
            const selectedType = resourceTypes.value.find(rt => rt._id === editResourceType.value);
            props.resource.type = selectedType || editResourceType.value;
        } else {
            props.resource.type = null;
        }

        typeSavedSuccessfully.value = true;

        setTimeout(() => {
            typeSavedSuccessfully.value = false;
            isEditingType.value = false;
        }, 1500);

        const typeName = editResourceType.value ? getResourceTypeName(editResourceType.value) : 'No type';
    } catch (error) {
        isEditingType.value = false;
    } finally {
        isTypeSaving.value = false;
    }
};

const cancelLanguageEdit = () => {
    isCancelingLanguageEdit.value = true;
    isEditingLanguage.value = false;
    editResourceLanguage.value = '';
    languageSavedSuccessfully.value = false;

    if (languageSaveTimeout.value) {
        clearTimeout(languageSaveTimeout.value);
    }

    setTimeout(() => {
        isCancelingLanguageEdit.value = false;
    }, 100);
};

const handleLanguageChange = async () => {
    if (isCancelingLanguageEdit.value) {
        return;
    }

    await saveResourceLanguage();
};


const saveResourceLanguage = async () => {
    if (isCancelingLanguageEdit.value) {
        return;
    }

    if (editResourceLanguage.value === props.resource.language) {
        isEditingLanguage.value = false;
        return;
    }

    if (languageSaveTimeout.value) {
        clearTimeout(languageSaveTimeout.value);
    }

    isLanguageSaving.value = true;
    languageSavedSuccessfully.value = false;

    try {
        await updateResource(props.resource._id, {
            language: editResourceLanguage.value || null
        });

        props.resource.language = editResourceLanguage.value || null;

        languageSavedSuccessfully.value = true;

        setTimeout(() => {
            languageSavedSuccessfully.value = false;
            isEditingLanguage.value = false;
        }, 1500);

        const languageName = editResourceLanguage.value ? getLanguageName(editResourceLanguage.value) : 'No language';
    } catch (error) {
        isEditingLanguage.value = false;
    } finally {
        isLanguageSaving.value = false;
    }
};

const startSourceEdit = () => {
    console.log(props.resource);
    isEditingSource.value = true;
    editResourceSource.value = props.resource.source || '';
    sourceSavedSuccessfully.value = false;

    setTimeout(() => {
        sourceInput.value?.focus();
        sourceInput.value?.select();
    }, 50);
};

const saveResourceSource = async () => {
    if (isCancelingSourceEdit.value) {
        return;
    }

    const trimmedSource = editResourceSource.value.trim();

    if (trimmedSource === (props.resource.source || '')) {
        isEditingSource.value = false;
        return;
    }

    if (sourceSaveTimeout.value) {
        clearTimeout(sourceSaveTimeout.value);
    }

    isSourceSaving.value = true;
    sourceSavedSuccessfully.value = false;

    try {
        const updatedResource = await updateResource(props.resource._id, {
            source: trimmedSource
        });

        props.resource.source = trimmedSource;
        sourceSavedSuccessfully.value = true;

        setTimeout(() => {
            sourceSavedSuccessfully.value = false;
            isEditingSource.value = false;
        }, 1500);
    } catch (error) {
        isEditingSource.value = false;
    } finally {
        isSourceSaving.value = false;
    }
};

const cancelSourceEdit = () => {
    isCancelingSourceEdit.value = true;
    isEditingSource.value = false;
    editResourceSource.value = '';
    sourceSavedSuccessfully.value = false;

    if (sourceSaveTimeout.value) {
        clearTimeout(sourceSaveTimeout.value);
    }

    setTimeout(() => {
        isCancelingSourceEdit.value = false;
    }, 100);
};

const handleSourceBlur = () => {
    if (!isCancelingSourceEdit.value) {
        saveResourceSource();
    }
};

const handleResourceSourceChange = () => {
    if (sourceSaveTimeout.value) {
        clearTimeout(sourceSaveTimeout.value);
    }

    sourceSavedSuccessfully.value = false;
};

onMounted(async () => {
    await loadResourceTypes();
});
</script>