<template>
  <div class="rounded-xl shadow-sm h-full flex flex-col p-4 border-l-4"
    :class="{ 'ring-2 ring-accent': selected }"
    :style="{
      backgroundColor: node.data.color || '#FEFCE8',
      borderLeftColor: node.data.accentColor || '#F59E0B',
    }">
    <NodeResizer :is-visible="selected" :min-width="160" :min-height="80" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="quoteCard" :data="node.data"
      @update="onToolbarUpdate" />

    <svg class="w-5 h-5 text-text-muted/40 mb-1 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.3 2.9C7 4.1 4.2 7.4 4.2 12c0 3.3 2.1 6 5.3 6 2 0 3.5-1.5 3.5-3.5S11.5 11 9.5 11c-.5 0-1 .1-1.4.3.5-2.1 2.2-4.1 4.4-5L11.3 2.9zM22.3 2.9C18 4.1 15.2 7.4 15.2 12c0 3.3 2.1 6 5.3 6 2 0 3.5-1.5 3.5-3.5S22.5 11 20.5 11c-.5 0-1 .1-1.4.3.5-2.1 2.2-4.1 4.4-5L22.3 2.9z"/>
    </svg>

    <div v-if="!isEditing" class="flex-1 text-sm text-text-primary italic leading-relaxed cursor-text"
      @dblclick="startEditing">
      {{ node.data.text || 'Double-click to edit...' }}
    </div>
    <textarea v-else ref="textareaRef" v-model="editText"
      class="flex-1 w-full text-sm text-text-primary italic bg-transparent border-0 outline-none resize-none nowheel nodrag leading-relaxed"
      @blur="finishEditing" @keydown.escape="finishEditing" />

    <div v-if="node.data.source" class="text-[10px] text-text-muted mt-2 text-right font-medium">
      — {{ node.data.source }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';

defineProps<{ id: string; data: Record<string, any>; selected: boolean }>();
const { node } = useNode();

const isEditing = ref(false);
const editText = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const startEditing = () => {
  editText.value = node.data.text || '';
  isEditing.value = true;
  nextTick(() => textareaRef.value?.focus());
};

const finishEditing = () => {
  isEditing.value = false;
  node.data = { ...node.data, text: editText.value };
};

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
