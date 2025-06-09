<template>
    <Teleport to="body">
        <div v-if="isVisible" class="fixed top-4 right-4 z-50" @click.stop>
            <div class="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 overflow-hidden animate-in slide-in-from-top-2 duration-200"
                @click.stop>
                <div class="flex items-center px-4 py-3 border-b border-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 mr-3" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input ref="searchInput" v-model="searchQuery" type="text" placeholder="Search..."
                        class="flex-1 outline-none text-lg text-gray-900 placeholder-gray-500"
                        @keydown.escape="closeSearch" @keydown.enter="handleEnterKey" @input="handleSearchInput" />
                    <div v-if="hasResults" class="flex items-center ml-2">
                        <span class="text-xs text-gray-500 mr-2">{{ currentResultIndex + 1 }}/{{ totalResults }}</span>
                        <button @click="previousResult"
                            class="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="totalResults === 0" title="Previous result (Shift+Enter)">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                        <button @click="nextResult"
                            class="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            :disabled="totalResults === 0" title="Next result (Enter)">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    <button @click="closeSearch" class="ml-3 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    activeContents: {
        type: Array,
        default: () => []
    },
});

const emit = defineEmits(['update:modelValue']);

const isVisible = ref(props.modelValue);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const hasResults = ref(false);
const currentResultIndex = ref(0);
const totalResults = ref(0);
const results = ref([]);
const searchTimeout = ref<NodeJS.Timeout | null>(null);
const matches = ref([]);

watch(() => props.modelValue, (newValue) => {
    isVisible.value = newValue;
    if (newValue) {
        searchQuery.value = '';
        nextTick(() => {
            searchInput.value?.focus();
        });
    }
});

watch(isVisible, (newValue) => {
    emit('update:modelValue', newValue);
});

const closeSearch = () => {
    isVisible.value = false;
    searchQuery.value = '';
    hasResults.value = false;
    currentResultIndex.value = 0;
    totalResults.value = 0;
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
    }
};

const performSearch = () => {
    totalResults.value = 0;
    results.value = [];
    props.activeContents.forEach((content, index) => {
        const numResults = content.content.value.search(searchQuery.value);
        if (numResults > 0) {
            hasResults.value = true;
        }
        totalResults.value += numResults;
        results.value.push(numResults);
        currentResultIndex.value = 0;
    });
    scrollToCurrent();
};

const handleEnterKey = (event: KeyboardEvent) => {
    event.preventDefault();
    if (hasResults.value && totalResults.value > 0) {
        if (event.shiftKey) {
            previousResult();
        } else {
            nextResult();
        }
    } else {
        handleSearchInput();
    }
};

const getCurrentResult = () => {
    if (totalResults.value === 0) return null;

    let remainingIndex = currentResultIndex.value;
    let contentIndex = 0;

    for (let i = 0; i < results.value.length; i++) {
        if (remainingIndex < results.value[i]) {
            contentIndex = i;
            break;
        }
        remainingIndex -= results.value[i];
    }

    return {
        contentIndex,
        indexInContent: remainingIndex
    };
};

const scrollToCurrent = () => {
    const currentResult = getCurrentResult();

    if (!currentResult || currentResult.contentIndex >= props.activeContents.length) {
        return;
    }

    const content = props.activeContents[currentResult.contentIndex];
    if (!content || !content.content || !content.content.value) {
        return;
    }

    if (typeof content.content.value.scrollTo !== 'function') {
        return;
    }

    content.content.value.scrollTo(currentResult.indexInContent);
};

const clearHighlights = () => {
    props.activeContents.forEach((content, index) => {
        // Clear existing highlights in the content
    });
};

const handleSearchInput = () => {
    if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
    }

    if (searchQuery.value.trim()) {
        searchTimeout.value = setTimeout(() => {
            performSearch();
        }, 300); // Debounce search
    } else {
        clearHighlights();
        hasResults.value = false;
        totalResults.value = 0;
        currentResultIndex.value = 0;
    }
};

const previousResult = () => {
    if (totalResults.value > 0) {
        if (currentResultIndex.value > 0) {
            currentResultIndex.value--;
        } else {
            currentResultIndex.value = totalResults.value - 1;
        }
        scrollToCurrent();
    }
};

const nextResult = () => {
    if (totalResults.value > 0) {
        if (currentResultIndex.value < totalResults.value - 1) {
            currentResultIndex.value++;
        } else {
            currentResultIndex.value = 0;
        }
        scrollToCurrent();
    }
};
</script>

<style scoped>
kbd {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.animate-in {
    animation: slideInFromTop 0.2s ease-out;
}

@keyframes slideInFromTop {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 480px) {
    .w-96 {
        width: calc(100vw - 2rem);
    }
}
</style>
