<template>
  <div class="bg-surface-elevated border border-border rounded-lg shadow-sm p-3 h-full hover:border-accent transition-colors"
    :class="{ 'ring-2 ring-accent': selected }">
    <NodeResizer :is-visible="selected" :min-width="140" :min-height="40" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="docRef" :data="node.data"
      @update="onToolbarUpdate" />
    <div class="flex items-start gap-2 h-full">
      <div class="p-0.5 rounded bg-accent/10 cursor-pointer hover:bg-accent/20 transition-colors shrink-0 mt-0.5"
        @click="navigateToDoc" :title="node.data.sourceName || 'Open document'">
        <svg class="h-3 w-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <textarea v-if="isEditing" ref="inputRef" v-model="editText"
          class="w-full h-full text-sm text-text-primary bg-transparent border-0 outline-none resize-none nowheel nodrag"
          @blur="finishEditing" @keydown.escape="finishEditing" />
        <div v-else class="text-sm text-text-primary cursor-text whitespace-pre-wrap" @dblclick="startEditing">
          {{ node.data.title || 'Untitled' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import { useRouter } from 'vue-router';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';

defineProps<{
  id: string;
  data: Record<string, any>;
  selected: boolean;
}>();

const router = useRouter();
const { node } = useNode();

const isEditing = ref(false);
const editText = ref('');
const inputRef = ref<HTMLTextAreaElement | null>(null);

const navigateToDoc = () => {
  if (node.data.docId) router.push(`/document/${node.data.docId}`);
};

const startEditing = () => {
  editText.value = node.data.title || '';
  isEditing.value = true;
  nextTick(() => inputRef.value?.focus());
};

const finishEditing = () => {
  isEditing.value = false;
  node.data = { ...node.data, title: editText.value };
};

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
