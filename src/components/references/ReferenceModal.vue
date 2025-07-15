<template>
    <Modal v-model="isOpen" title="Add Reference">
        <div class="p-4">
            <input type="text" v-model="searchQuery" placeholder="Search for resources or marks..."
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

            <div class="mt-4 max-h-60 overflow-y-auto">
                <div v-if="isLoading" class="text-center">
                    <p>Loading...</p>
                </div>
                <ul v-else-if="results.length > 0">
                    <li v-for="item in results" :key="item._id" class="p-2 hover:bg-gray-100 cursor-pointer rounded-md"
                        @click="selectItem(item)">
                        <div class="font-semibold">{{ item.name || item.content }}</div>
                        <div class="text-sm text-gray-500">{{ item.type }}</div>
                    </li>
                </ul>
                <div v-else class="text-center text-gray-500">
                    <p>No results found.</p>
                </div>
            </div>
        </div>
    </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import Modal from '../ui/Modal/Modal.vue';
import apiClient from '../../services/api';
import { useNotification } from '../../composables/useNotification';

const props = defineProps({
    modelValue: {
        type: Boolean,
        required: true,
    },
});

const emit = defineEmits(['update:modelValue', 'select']);

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
});

const searchQuery = ref('');
const results = ref<any[]>([]);
const isLoading = ref(false);
const notification = useNotification();
let searchTimeout: NodeJS.Timeout | null = null;

const search = async () => {
    if (searchQuery.value.length < 2) {
        results.value = [];
        return;
    }

    isLoading.value = true;
    try {
        const response = await apiClient.get('/reference/search', {
            params: {
                q: searchQuery.value
            }
        });
        results.value = response.data;
    } catch (error) {
        notification.error('Failed to perform search.');
        results.value = [];
    } finally {
        isLoading.value = false;
    }
};

watch(searchQuery, () => {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
        search();
    }, 500);
});

const selectItem = (item: any) => {
    emit('select', item);
    isOpen.value = false;
};
</script>
