<template>
    <div class="space-y-6 md:col-span-1">
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
            <strong class="text-gray-700">Title</strong>
            <br />
            <div class="mt-1">
                <input v-if="isEditingTitle" v-model="editResourceTitle" @blur="handleTitleChange"
                    @keyup.enter="handleTitleChange" @keyup.escape="cancelTitleEdit"
                    class="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    ref="titleInput" type="text" placeholder="Enter title...">
                <div v-else @dblclick="startTitleEdit"
                    class="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px]"
                    title="Double-click to edit">
                    <span v-if="resource.title" class="text-gray-700">{{ resource.title }}</span>
                    <span v-else class="text-gray-400 italic">No title</span>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Author</strong>
            <br />
            <div class="mt-1">
                <input v-if="isEditingAuthor" v-model="editResourceAuthor" @blur="handleAuthorChange"
                    @keyup.enter="handleAuthorChange" @keyup.escape="cancelAuthorEdit"
                    class="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    ref="authorInput" type="text" placeholder="Enter author...">
                <div v-else @dblclick="startAuthorEdit"
                    class="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px]"
                    title="Double-click to edit">
                    <span v-if="resource.author" class="text-gray-700">{{ resource.author }}</span>
                    <span v-else class="text-gray-400 italic">No author</span>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 rounded-md">
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
            <strong class="text-gray-700">URL</strong>
            <br />
            <div class="mt-1">
                <input v-if="isEditingUrl" v-model="editResourceUrl" @blur="handleUrlChange"
                    @keyup.enter="handleUrlChange" @keyup.escape="cancelUrlEdit"
                    class="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    ref="urlInput" type="url" placeholder="Enter URL...">
                <div v-else @dblclick="startUrlEdit"
                    class="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px]"
                    title="Double-click to edit">
                    <a v-if="resource.url" :href="resource.url" target="_blank" rel="noopener noreferrer"
                        class="text-blue-600 hover:text-blue-800 underline break-all">
                        {{ resource.url }}
                    </a>
                    <span v-else class="text-gray-400 italic">No URL</span>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Publication Date</strong>
            <br />
            <div class="mt-1">
                <input v-if="isEditingPublicationDate" v-model="editResourcePublicationDate"
                    @blur="handlePublicationDateChange" @keyup.enter="handlePublicationDateChange"
                    @keyup.escape="cancelPublicationDateEdit"
                    class="w-full bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    ref="publicationDateInput" type="datetime-local" placeholder="Enter publication date...">
                <div v-else @dblclick="startPublicationDateEdit"
                    class="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[24px]"
                    title="Double-click to edit">
                    <span v-if="resource.publicationDate" class="text-gray-700">{{ new
                        Date(resource.publicationDate).toLocaleString() }}</span>
                    <span v-else class="text-gray-400 italic">No publication date</span>
                </div>
            </div>
        </div>
        <div class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Size</strong>
            <br />
            {{ formatFileSize(resource.fileSize) }}
        </div>
        <div class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Upload date</strong>
            <br />
            {{ resource.uploadDate ? new Date(resource.uploadDate).toLocaleString() : '' }}
        </div>
        <div class="bg-gray-50 rounded-md">
            <strong class="text-gray-700">Original name</strong>
            <br />
            {{ resource.originalName }}
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

const typeSavedSuccessfully = ref(false);
const isCancelingTypeEdit = ref(false);

const isEditingUrl = ref(false);
const editResourceUrl = ref('');
const urlInput = ref<HTMLInputElement | null>(null);
const urlSaveTimeout = ref<NodeJS.Timeout | null>(null);
const urlSavedSuccessfully = ref(false);
const isCancelingUrlEdit = ref(false);
const isUrlSaving = ref(false);

const isEditingTitle = ref(false);
const editResourceTitle = ref('');
const titleInput = ref<HTMLInputElement | null>(null);
const titleSaveTimeout = ref<NodeJS.Timeout | null>(null);
const titleSavedSuccessfully = ref(false);
const isCancelingTitleEdit = ref(false);
const isTitleSaving = ref(false);

const isEditingAuthor = ref(false);
const editResourceAuthor = ref('');
const authorInput = ref<HTMLInputElement | null>(null);
const authorSaveTimeout = ref<NodeJS.Timeout | null>(null);
const authorSavedSuccessfully = ref(false);
const isCancelingAuthorEdit = ref(false);
const isAuthorSaving = ref(false);

const isEditingPublicationDate = ref(false);
const editResourcePublicationDate = ref('');
const publicationDateInput = ref<HTMLInputElement | null>(null);
const publicationDateSaveTimeout = ref<NodeJS.Timeout | null>(null);
const publicationDateSavedSuccessfully = ref(false);
const isCancelingPublicationDateEdit = ref(false);
const isPublicationDateSaving = ref(false);

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

const startUrlEdit = () => {
    isEditingUrl.value = true;
    editResourceUrl.value = props.resource.url || '';
    urlSavedSuccessfully.value = false;

    setTimeout(() => {
        urlInput.value?.focus();
    }, 50);
};

const cancelUrlEdit = () => {
    isCancelingUrlEdit.value = true;
    isEditingUrl.value = false;
    editResourceUrl.value = '';
    urlSavedSuccessfully.value = false;

    if (urlSaveTimeout.value) {
        clearTimeout(urlSaveTimeout.value);
    }

    setTimeout(() => {
        isCancelingUrlEdit.value = false;
    }, 100);
};

const handleUrlChange = async () => {
    if (isCancelingUrlEdit.value) {
        return;
    }

    await saveResourceUrl();
};

const saveResourceUrl = async () => {
    if (isCancelingUrlEdit.value) {
        return;
    }

    if (editResourceUrl.value === props.resource.url) {
        isEditingUrl.value = false;
        return;
    }

    if (urlSaveTimeout.value) {
        clearTimeout(urlSaveTimeout.value);
    }

    isUrlSaving.value = true;
    urlSavedSuccessfully.value = false;

    try {
        await updateResource(props.resource._id, {
            url: editResourceUrl.value || null
        });

        props.resource.url = editResourceUrl.value || null;

        urlSavedSuccessfully.value = true;

        setTimeout(() => {
            urlSavedSuccessfully.value = false;
            isEditingUrl.value = false;
        }, 1500);
    } catch (error) {
        isEditingUrl.value = false;
    } finally {
        isUrlSaving.value = false;
    }
};

const startTitleEdit = () => {
    isEditingTitle.value = true;
    editResourceTitle.value = props.resource.title || '';
    titleSavedSuccessfully.value = false;

    setTimeout(() => {
        titleInput.value?.focus();
    }, 50);
};

const cancelTitleEdit = () => {
    isCancelingTitleEdit.value = true;
    isEditingTitle.value = false;
    editResourceTitle.value = '';
    titleSavedSuccessfully.value = false;

    if (titleSaveTimeout.value) {
        clearTimeout(titleSaveTimeout.value);
    }

    setTimeout(() => {
        isCancelingTitleEdit.value = false;
    }, 100);
};

const handleTitleChange = async () => {
    if (isCancelingTitleEdit.value) {
        return;
    }

    await saveResourceTitle();
};

const saveResourceTitle = async () => {
    if (isCancelingTitleEdit.value) {
        return;
    }

    if (editResourceTitle.value === props.resource.title) {
        isEditingTitle.value = false;
        return;
    }

    if (titleSaveTimeout.value) {
        clearTimeout(titleSaveTimeout.value);
    }

    isTitleSaving.value = true;
    titleSavedSuccessfully.value = false;

    try {
        await updateResource(props.resource._id, {
            title: editResourceTitle.value || null
        });

        props.resource.title = editResourceTitle.value || null;

        titleSavedSuccessfully.value = true;

        setTimeout(() => {
            titleSavedSuccessfully.value = false;
            isEditingTitle.value = false;
        }, 1500);
    } catch (error) {
        isEditingTitle.value = false;
    } finally {
        isTitleSaving.value = false;
    }
};

const startAuthorEdit = () => {
    isEditingAuthor.value = true;
    editResourceAuthor.value = props.resource.author || '';
    authorSavedSuccessfully.value = false;

    setTimeout(() => {
        authorInput.value?.focus();
    }, 50);
};

const cancelAuthorEdit = () => {
    isCancelingAuthorEdit.value = true;
    isEditingAuthor.value = false;
    editResourceAuthor.value = '';
    authorSavedSuccessfully.value = false;

    if (authorSaveTimeout.value) {
        clearTimeout(authorSaveTimeout.value);
    }

    setTimeout(() => {
        isCancelingAuthorEdit.value = false;
    }, 100);
};

const handleAuthorChange = async () => {
    if (isCancelingAuthorEdit.value) {
        return;
    }

    await saveResourceAuthor();
};

const saveResourceAuthor = async () => {
    if (isCancelingAuthorEdit.value) {
        return;
    }

    if (editResourceAuthor.value === props.resource.author) {
        isEditingAuthor.value = false;
        return;
    }

    if (authorSaveTimeout.value) {
        clearTimeout(authorSaveTimeout.value);
    }

    isAuthorSaving.value = true;
    authorSavedSuccessfully.value = false;

    try {
        await updateResource(props.resource._id, {
            author: editResourceAuthor.value || null
        });

        props.resource.author = editResourceAuthor.value || null;

        authorSavedSuccessfully.value = true;

        setTimeout(() => {
            authorSavedSuccessfully.value = false;
            isEditingAuthor.value = false;
        }, 1500);
    } catch (error) {
        isEditingAuthor.value = false;
    } finally {
        isAuthorSaving.value = false;
    }
};

const startPublicationDateEdit = () => {
    isEditingPublicationDate.value = true;
    if (props.resource.publicationDate) {
        const date = new Date(props.resource.publicationDate);
        editResourcePublicationDate.value = date.toISOString().slice(0, 16);
    } else {
        editResourcePublicationDate.value = '';
    }
    publicationDateSavedSuccessfully.value = false;

    setTimeout(() => {
        publicationDateInput.value?.focus();
    }, 50);
};

const cancelPublicationDateEdit = () => {
    isCancelingPublicationDateEdit.value = true;
    isEditingPublicationDate.value = false;
    editResourcePublicationDate.value = '';
    publicationDateSavedSuccessfully.value = false;

    if (publicationDateSaveTimeout.value) {
        clearTimeout(publicationDateSaveTimeout.value);
    }

    setTimeout(() => {
        isCancelingPublicationDateEdit.value = false;
    }, 100);
};

const handlePublicationDateChange = async () => {
    if (isCancelingPublicationDateEdit.value) {
        return;
    }

    await saveResourcePublicationDate();
};

const saveResourcePublicationDate = async () => {
    if (isCancelingPublicationDateEdit.value) {
        return;
    }

    const currentDate = props.resource.publicationDate ? new Date(props.resource.publicationDate).toISOString().slice(0, 16) : '';
    if (editResourcePublicationDate.value === currentDate) {
        isEditingPublicationDate.value = false;
        return;
    }

    if (publicationDateSaveTimeout.value) {
        clearTimeout(publicationDateSaveTimeout.value);
    }

    isPublicationDateSaving.value = true;
    publicationDateSavedSuccessfully.value = false;

    try {
        const dateValue = editResourcePublicationDate.value ? new Date(editResourcePublicationDate.value).toISOString() : null;

        await updateResource(props.resource._id, {
            publicationDate: dateValue
        });

        props.resource.publicationDate = dateValue;

        publicationDateSavedSuccessfully.value = true;

        setTimeout(() => {
            publicationDateSavedSuccessfully.value = false;
            isEditingPublicationDate.value = false;
        }, 1500);
    } catch (error) {
        isEditingPublicationDate.value = false;
    } finally {
        isPublicationDateSaving.value = false;
    }
};

onMounted(async () => {
    await loadResourceTypes();
});
</script>