<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
            <div class="flex items-center mb-4">
                <input v-model="term" @keydown.enter="performSearch" class="flex-1 border rounded px-3 py-2 mr-2"
                    type="text" placeholder="Search..." autofocus />
                <button @click="close" class="ml-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Close</button>
            </div>
            <div v-if="loading" class="text-gray-500">Searching...</div>
            <div v-else>
                <div v-if="results.length === 0" class="text-gray-500">No results found.</div>
                <ul v-else>
                    <li v-for="(result, i) in results" :key="i" class="border-b py-2">
                        <router-link :to="getResultLink(result)" class="block hover:bg-gray-50 rounded px-2 py-1"
                            @click.native="close">
                            <div class="text-xs text-gray-400 mb-1">{{ result.collection }}</div>
                            <div v-if="result.highlightedName" class="font-bold" v-html="result.highlightedName"></div>
                            <div v-if="result.highlightedTitle" class="font-bold" v-html="result.highlightedTitle">
                            </div>
                            <div v-if="result.highlightedContent" class="mt-1 text-sm"
                                v-html="result.highlightedContent"></div>
                        </router-link>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, defineExpose } from 'vue';
import apiClient from '../services/api';

const visible = ref(false);
const term = ref('');
const results = ref<any[]>([]);
const loading = ref(false);

function open() {
    visible.value = true;
    term.value = '';
    results.value = [];
}
function close() {
    visible.value = false;
}
async function performSearch() {
    if (!term.value) return;
    loading.value = true;
    try {
        const res = await apiClient.post('/search', { term: term.value });
        results.value = res.data;
    } catch (e) {
        results.value = [];
    } finally {
        loading.value = false;
    }
}

function getResultLink(result: any) {
    if (result.collection === 'docs') {
        return `/document/${result._id}`;
    }
    if (result.collection === 'resources') {
        return `/resource/${result._id}`;
    }
    return '#';
}

defineExpose({ open, close });
</script>
