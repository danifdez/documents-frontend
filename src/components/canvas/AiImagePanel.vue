<template>
  <div class="w-[350px] shrink-0 border-l border-border bg-surface-elevated flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <h3 class="text-sm font-semibold text-text-primary">AI Image</h3>
      <button @click="$emit('close')"
        class="p-1 rounded hover:bg-surface-hover transition-colors cursor-pointer text-text-muted hover:text-text-secondary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b border-border shrink-0">
      <button @click="activeTab = 'generate'"
        class="flex-1 px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer"
        :class="activeTab === 'generate'
          ? 'text-accent border-b-2 border-accent'
          : 'text-text-muted hover:text-text-secondary'">
        Generate
      </button>
      <button @click="activeTab = 'edit'"
        class="flex-1 px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer"
        :class="activeTab === 'edit'
          ? 'text-accent border-b-2 border-accent'
          : 'text-text-muted hover:text-text-secondary'">
        Edit
      </button>
      <button @click="activeTab = 'history'"
        class="flex-1 px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer"
        :class="activeTab === 'history'
          ? 'text-accent border-b-2 border-accent'
          : 'text-text-muted hover:text-text-secondary'">
        History
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">

      <!-- Generate Tab -->
      <div v-if="activeTab === 'generate'" class="flex flex-col gap-3">
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">Prompt</label>
          <textarea v-model="generatePrompt" rows="3" placeholder="Describe the image you want to create..."
            class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
            @keydown.ctrl.enter="handleGenerate" />
        </div>

        <!-- Advanced settings toggle -->
        <button @click="showAdvanced = !showAdvanced"
          class="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary cursor-pointer transition-colors">
          <svg class="h-3 w-3 transition-transform" :class="{ 'rotate-90': showAdvanced }" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Advanced settings
        </button>

        <div v-if="showAdvanced" class="flex flex-col gap-3 pl-2 border-l-2 border-border">
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Negative prompt</label>
            <textarea v-model="negativePrompt" rows="2" placeholder="What to avoid..."
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none" />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Width</label>
              <select v-model.number="genWidth"
                class="w-full px-2 py-1.5 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent cursor-pointer">
                <option :value="512">512</option>
                <option :value="768">768</option>
                <option :value="1024">1024</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Height</label>
              <select v-model.number="genHeight"
                class="w-full px-2 py-1.5 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent cursor-pointer">
                <option :value="512">512</option>
                <option :value="768">768</option>
                <option :value="1024">1024</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">
              Steps: {{ genSteps }}
            </label>
            <input type="range" v-model.number="genSteps" min="10" max="50" step="1"
              class="w-full accent-accent" />
          </div>

          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">
              Guidance scale: {{ genGuidance }}
            </label>
            <input type="range" v-model.number="genGuidance" min="1" max="20" step="0.5"
              class="w-full accent-accent" />
          </div>

          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Seed (optional)</label>
            <input v-model.number="genSeed" type="number" placeholder="Random"
              class="w-full px-2 py-1.5 rounded-lg border border-border bg-surface-base text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors" />
          </div>
        </div>

        <Button @click="handleGenerate" :disabled="!generatePrompt.trim() || isGenerating" class="w-full">
          <template v-if="isGenerating">
            <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating...
          </template>
          <template v-else>Generate Image</template>
        </Button>

        <!-- Error -->
        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

        <!-- Last generated preview -->
        <div v-if="lastGenerated" class="rounded-lg border border-border overflow-hidden">
          <img :src="lastGenerated.url" alt="Generated" class="w-full object-contain max-h-48"
            @click="$emit('add-to-canvas', lastGenerated)" />
          <div class="p-2 flex items-center justify-between">
            <p class="text-xs text-text-muted truncate flex-1">{{ lastGenerated.prompt }}</p>
            <button @click="$emit('add-to-canvas', lastGenerated)"
              class="shrink-0 ml-2 text-xs text-accent hover:underline cursor-pointer">
              Add to canvas
            </button>
          </div>
        </div>
      </div>

      <!-- Edit Tab -->
      <div v-if="activeTab === 'edit'" class="flex flex-col gap-3">
        <div v-if="!selectedImageNode"
          class="py-8 text-center text-sm text-text-muted flex flex-col items-center gap-2">
          <svg class="h-8 w-8 text-text-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"
            stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>Select an image node on the canvas to edit it with AI</p>
        </div>

        <template v-else>
          <!-- Source image preview -->
          <div class="rounded-lg border border-border overflow-hidden">
            <img :src="selectedImageNode.data.src" alt="Source" class="w-full object-contain max-h-36" />
          </div>

          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Edit prompt</label>
            <textarea v-model="editPrompt" rows="3"
              placeholder="Describe how you want to modify this image..."
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
              @keydown.ctrl.enter="handleEdit" />
          </div>

          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">
              Strength: {{ editStrength }} <span class="text-text-muted font-normal">(higher = more change)</span>
            </label>
            <input type="range" v-model.number="editStrength" min="0.1" max="1" step="0.05"
              class="w-full accent-accent" />
          </div>

          <Button @click="handleEdit" :disabled="!editPrompt.trim() || isEditing" class="w-full">
            <template v-if="isEditing">
              <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Editing...
            </template>
            <template v-else>Apply Edit</template>
          </Button>

          <!-- Error -->
          <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

          <!-- Edited result preview -->
          <div v-if="lastEdited" class="rounded-lg border border-border overflow-hidden">
            <img :src="lastEdited.url" alt="Edited" class="w-full object-contain max-h-48" />
            <div class="p-2 flex gap-2">
              <button @click="$emit('add-to-canvas', lastEdited)"
                class="text-xs text-accent hover:underline cursor-pointer">
                Add as new
              </button>
              <button @click="$emit('replace-image', selectedImageNode.id, lastEdited)"
                class="text-xs text-accent hover:underline cursor-pointer">
                Replace original
              </button>
            </div>
          </div>
        </template>
      </div>

      <!-- History Tab -->
      <div v-if="activeTab === 'history'">
        <div v-if="generationHistory.length === 0"
          class="py-8 text-center text-sm text-text-muted">
          No images generated yet
        </div>
        <div v-else class="grid grid-cols-2 gap-2">
          <div v-for="(item, i) in generationHistory" :key="i"
            class="rounded-lg border border-border overflow-hidden hover:border-accent transition-colors cursor-pointer group"
            @click="$emit('add-to-canvas', item)">
            <img :src="item.url" :alt="item.prompt" class="w-full aspect-square object-cover" />
            <div class="p-1.5">
              <p class="text-[10px] text-text-muted truncate">{{ item.prompt }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from '../ui/Button.vue';
import { useImageGeneration, type GeneratedImage } from '../../services/canvas/useImageGeneration';

const props = defineProps<{
  canvasId?: number;
  projectId?: number;
  selectedImageNode: { id: string; data: Record<string, any> } | null;
}>();

const emit = defineEmits<{
  'close': [];
  'add-to-canvas': [image: GeneratedImage];
  'replace-image': [nodeId: string, image: GeneratedImage];
}>();

const {
  generate,
  edit,
  isGenerating,
  isEditing,
  error,
  generationHistory,
  lastGenerated,
  lastEdited,
  loadHistory,
} = useImageGeneration();

const activeTab = ref<'generate' | 'edit' | 'history'>('generate');
const showAdvanced = ref(false);

// Generate form
const generatePrompt = ref('');
const negativePrompt = ref('');
const genWidth = ref(1024);
const genHeight = ref(1024);
const genSteps = ref(30);
const genGuidance = ref(7.5);
const genSeed = ref<number | undefined>(undefined);

// Edit form
const editPrompt = ref('');
const editStrength = ref(0.75);

// Load history when canvas ID changes
watch(() => props.canvasId, (id) => {
  if (id) loadHistory(id);
}, { immediate: true });

// Switch to edit tab when an image node is selected
watch(() => props.selectedImageNode, (node) => {
  if (node) activeTab.value = 'edit';
});

const handleGenerate = async () => {
  if (!generatePrompt.value.trim() || isGenerating.value) return;

  await generate({
    prompt: generatePrompt.value.trim(),
    negativePrompt: negativePrompt.value.trim() || undefined,
    width: genWidth.value,
    height: genHeight.value,
    steps: genSteps.value,
    guidanceScale: genGuidance.value,
    seed: genSeed.value || undefined,
    canvasId: props.canvasId,
    projectId: props.projectId,
  });
};

const handleEdit = async () => {
  if (!editPrompt.value.trim() || isEditing.value || !props.selectedImageNode) return;

  // Extract resourceId from the image URL if it's a resource URL
  const src = props.selectedImageNode.data.src || '';
  const resourceMatch = src.match(/\/resources\/(\d+)\/view/);
  if (!resourceMatch) {
    error.value = 'This image is not a stored resource and cannot be edited with AI. Add it to the project first.';
    return;
  }

  await edit({
    resourceId: parseInt(resourceMatch[1]),
    prompt: editPrompt.value.trim(),
    strength: editStrength.value,
    canvasId: props.canvasId,
    projectId: props.projectId,
  });
};
</script>
