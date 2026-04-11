<template>
  <div class="flex items-center justify-center w-full h-full">
    <NodeResizer :is-visible="selected" :min-width="80" :min-height="36" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="bubble" :data="node.data"
      @update="onToolbarUpdate" />
    <div class="w-full h-full flex items-center justify-center rounded-full border-2 px-3 py-1 overflow-hidden"
      :style="{ backgroundColor: node.data.color || '#DBEAFE', borderColor: node.data.borderColor || '#3B82F6' }">
      <div v-if="!isEditing"
        class="whitespace-pre-wrap cursor-text text-center w-full truncate"
        :class="[fontSizeClass, node.data.bold ? 'font-semibold' : '']"
        :style="{ color: node.data.textColor || '#1E3A5F' }"
        @dblclick="startEditing">
        {{ node.data.text || 'Double-click...' }}
      </div>
      <textarea v-else ref="textareaRef" v-model="editText"
        class="w-full h-full bg-transparent border-0 outline-none resize-none text-center nowheel nodrag"
        :class="[fontSizeClass, node.data.bold ? 'font-semibold' : '']"
        :style="{ color: node.data.textColor || '#1E3A5F' }"
        @blur="finishEditing" @keydown.escape="finishEditing" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';

defineProps<{ id: string; data: Record<string, any>; selected: boolean }>();

const { node } = useNode();
const isEditing = ref(false);
const editText = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const fontSizeClass = computed(() => {
  switch (node.data.fontSize) {
    case 'lg': return 'text-lg';
    case 'base': return 'text-base';
    default: return 'text-sm';
  }
});

watch(editText, (val) => {
  if (isEditing.value) node.data = { ...node.data, text: val };
});

const startEditing = () => {
  editText.value = node.data.text || '';
  isEditing.value = true;
  nextTick(() => textareaRef.value?.focus());
};

const finishEditing = () => { isEditing.value = false; };

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
