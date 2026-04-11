<template>
  <div class="w-full h-full flex flex-col rounded-lg border overflow-hidden shadow-sm"
    :style="{ borderColor: node.data.accent || '#6366F1' }">
    <NodeResizer :is-visible="selected" :min-width="140" :min-height="60" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="card" :data="node.data"
      @update="onToolbarUpdate" />
    <div class="h-1.5 shrink-0" :style="{ backgroundColor: node.data.accent || '#6366F1' }"></div>
    <div class="flex-1 bg-white p-2.5 flex flex-col gap-0.5 min-h-0">
      <div v-if="!isEditingTitle"
        class="font-semibold text-sm text-text-primary truncate cursor-text"
        @dblclick="startEditTitle">
        {{ node.data.title || 'Title' }}
      </div>
      <input v-else ref="titleRef" v-model="editTitle"
        class="font-semibold text-sm text-text-primary bg-transparent border-0 outline-none w-full nowheel nodrag"
        @blur="finishEditTitle" @keydown.enter="finishEditTitle" @keydown.escape="finishEditTitle" />
      <div v-if="!isEditingSubtitle"
        class="text-xs text-text-muted truncate cursor-text"
        @dblclick="startEditSubtitle">
        {{ node.data.subtitle || 'Subtitle' }}
      </div>
      <input v-else ref="subtitleRef" v-model="editSubtitle"
        class="text-xs text-text-muted bg-transparent border-0 outline-none w-full nowheel nodrag"
        @blur="finishEditSubtitle" @keydown.enter="finishEditSubtitle" @keydown.escape="finishEditSubtitle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';

defineProps<{ id: string; data: Record<string, any>; selected: boolean }>();

const { node } = useNode();

const isEditingTitle = ref(false);
const isEditingSubtitle = ref(false);
const editTitle = ref('');
const editSubtitle = ref('');
const titleRef = ref<HTMLInputElement | null>(null);
const subtitleRef = ref<HTMLInputElement | null>(null);

watch(editTitle, (val) => {
  if (isEditingTitle.value) node.data = { ...node.data, title: val };
});
watch(editSubtitle, (val) => {
  if (isEditingSubtitle.value) node.data = { ...node.data, subtitle: val };
});

const startEditTitle = () => {
  editTitle.value = node.data.title || '';
  isEditingTitle.value = true;
  nextTick(() => titleRef.value?.focus());
};
const finishEditTitle = () => { isEditingTitle.value = false; };

const startEditSubtitle = () => {
  editSubtitle.value = node.data.subtitle || '';
  isEditingSubtitle.value = true;
  nextTick(() => subtitleRef.value?.focus());
};
const finishEditSubtitle = () => { isEditingSubtitle.value = false; };

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
