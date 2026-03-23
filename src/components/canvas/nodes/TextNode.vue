<template>
  <div class="bg-surface-elevated border border-border rounded-lg shadow-sm p-3 h-full"
    :class="{ 'ring-2 ring-accent': selected }"
    :style="{ backgroundColor: node.data.color || undefined }">
    <NodeResizer :is-visible="selected" :min-width="120" :min-height="40" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="text" :data="node.data"
      @update="onToolbarUpdate" />
    <div class="flex flex-col h-full" :class="valignClass">
      <div v-if="!isEditing"
        class="whitespace-pre-wrap cursor-text text-text-primary w-full"
        :class="fontSizeClass"
        :style="{ textAlign: node.data.align || 'left' }"
        @dblclick="startEditing">
        {{ node.data.text || 'Double-click to edit...' }}
      </div>
      <textarea v-else ref="textareaRef" v-model="editText"
        class="w-full h-full text-text-primary bg-transparent border-0 outline-none resize-none nowheel nodrag"
        :class="fontSizeClass"
        :style="{ textAlign: node.data.align || 'left' }"
        @blur="finishEditing" @keydown.escape="finishEditing" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';

defineProps<{
  id: string;
  data: Record<string, any>;
  selected: boolean;
}>();

const { node } = useNode();

const isEditing = ref(false);
const editText = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const valignClass = computed(() => {
  switch (node.data.valign) {
    case 'middle': return 'justify-center';
    case 'bottom': return 'justify-end';
    default: return 'justify-start';
  }
});

const fontSizeClass = computed(() => {
  switch (node.data.fontSize) {
    case 'base': return 'text-base';
    case 'lg': return 'text-lg';
    default: return 'text-sm';
  }
});

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
