<template>
    <div class="p-8 max-w-2xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">App Settings</h1>
        <div class="space-y-6">
            <div class="bg-white rounded shadow p-6">
                <h2 class="text-lg font-semibold mb-2">Editor Appearance</h2>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Font Size</label>
                    <select v-model="fontSize" @change="saveSettings" class="border rounded px-2 py-1">
                        <option v-for="size in fontSizes" :key="size" :value="size">{{ size }} px</option>
                    </select>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Font Family</label>
                    <select v-model="fontFamily" @change="saveSettings" class="border rounded px-2 py-1">
                        <option v-for="family in fontFamilies" :key="family.value" :value="family.value">{{ family.label
                        }}</option>
                    </select>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Paragraph Spacing</label>
                    <input type="range" min="1" max="3" step="0.1" v-model.number="paragraphSpacing"
                        @change="saveSettings" class="w-full" />
                    <span class="ml-2">{{ paragraphSpacing }}</span>
                </div>
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-1">Language</label>
                    <select v-model="language" @change="saveSettings" class="border rounded px-2 py-1">
                        <option v-for="lang in languages" :key="lang.code" :value="lang.code">{{ lang.label }}</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const fontSizes = [12, 14, 16, 18, 20, 22, 24];
const fontFamilies = [
    { label: 'Sans Serif', value: 'sans-serif' },
    { label: 'Serif', value: 'serif' },
    { label: 'Monospace', value: 'monospace' },
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
];

const languages = [
    { label: 'English', code: 'en' },
    { label: 'Spanish', code: 'es' },
    { label: 'Italian', code: 'it' },
    { label: 'Portuguese', code: 'pt' },
    { label: 'German', code: 'de' },
    { label: 'French', code: 'fr' },
];

const fontSize = ref(16);
const fontFamily = ref('sans-serif');
const paragraphSpacing = ref(1.5);
const language = ref('en');

const loadSettings = async () => {
    if (window.electronAPI && window.electronAPI.getSettings) {
        const settings = await window.electronAPI.getSettings();
        if (settings) {
            fontSize.value = settings.fontSize || 16;
            fontFamily.value = settings.fontFamily || 'sans-serif';
            paragraphSpacing.value = settings.paragraphSpacing || 1.5;
            language.value = settings.language || 'en';
        }
    }
};

const saveSettings = () => {
    if (window.electronAPI && window.electronAPI.setSettings) {
        window.electronAPI.setSettings({
            fontSize: fontSize.value,
            fontFamily: fontFamily.value,
            paragraphSpacing: paragraphSpacing.value,
            language: language.value,
        });
    }
};

onMounted(() => {
    loadSettings();
});
</script>
