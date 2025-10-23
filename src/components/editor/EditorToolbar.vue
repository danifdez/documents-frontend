<template>
  <div class="mb-2.5 flex items-center gap-1 bg-white p-2">
    <Button @click="editor?.chain().focus().toggleBold().run()" title="Bold" size="small"
      :active="editor?.isActive('bold')" borderless>
      <strong class="text-base font-bold">B</strong>
    </Button>
    <Button @click="editor?.chain().focus().toggleItalic().run()" title="Italic" size="small"
      :active="editor?.isActive('italic')" borderless>
      <em class="text-base font-semibold">I</em>
    </Button>
    <Button @click="editor?.chain().focus().toggleUnderline().run()" title="Underline" size="small"
      :active="editor?.isActive('underline')" borderless>
      <u class="text-base font-semibold">U</u>
    </Button>
    <Button @click="editor?.chain().focus().toggleStrike().run()" title="Strikethrough" size="small"
      :active="editor?.isActive('strike')" borderless>
      <s class="text-base font-semibold">S</s>
    </Button>
    <Button @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()" title="Heading 1" size="small"
      :active="editor?.isActive('heading', { level: 1 })" borderless>
      <span class="text-sm font-bold">H1</span>
    </Button>
    <Button @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()" title="Heading 2" size="small"
      :active="editor?.isActive('heading', { level: 2 })" borderless>
      <span class="text-sm font-bold">H2</span>
    </Button>
    <Button @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()" title="Heading 3" size="small"
      :active="editor?.isActive('heading', { level: 3 })" borderless>
      <span class="text-sm font-bold">H3</span>
    </Button>
    <div class="h-6 w-px bg-gray-300 mx-1"></div>
    <Button @click="editor?.chain().focus().setTextAlign('left').run()" title="Align Left" size="small"
      :active="editor?.isActive({ textAlign: 'left' })" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="12" height="2.5" rx="1" fill="currentColor" />
        <rect x="3" y="9" width="8" height="2.5" rx="1" fill="currentColor" />
        <rect x="3" y="14" width="12" height="2.5" rx="1" fill="currentColor" />
      </svg>
    </Button>
    <Button @click="editor?.chain().focus().setTextAlign('center').run()" title="Align Center" size="small"
      :active="editor?.isActive({ textAlign: 'center' })" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="16" height="2.5" rx="1" fill="currentColor" />
        <rect x="5" y="9" width="10" height="2.5" rx="1" fill="currentColor" />
        <rect x="2" y="14" width="16" height="2.5" rx="1" fill="currentColor" />
      </svg>
    </Button>
    <Button @click="editor?.chain().focus().setTextAlign('right').run()" title="Align Right" size="small"
      :active="editor?.isActive({ textAlign: 'right' })" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="4" width="12" height="2.5" rx="1" fill="currentColor" />
        <rect x="9" y="9" width="8" height="2.5" rx="1" fill="currentColor" />
        <rect x="5" y="14" width="12" height="2.5" rx="1" fill="currentColor" />
      </svg>
    </Button>
    <Button @click="editor?.chain().focus().setTextAlign('justify').run()" title="Justify" size="small"
      :active="editor?.isActive({ textAlign: 'justify' })" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="4" width="16" height="2.5" rx="1" fill="currentColor" />
        <rect x="2" y="9" width="16" height="2.5" rx="1" fill="currentColor" />
        <rect x="2" y="14" width="16" height="2.5" rx="1" fill="currentColor" />
      </svg>
    </Button>
    <div class="h-6 w-px bg-gray-300 mx-1"></div>
    <Button @click="editor?.chain().focus().toggleBlockquote().run()" title="Quote" size="small"
      :active="editor?.isActive('blockquote')" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 6L3 14L3.5 14C4.05228 14 4.5 13.5523 4.5 13L4.5 11C4.5 10.4477 4.94772 10 5.5 10L7.5 10C8.05228 10 8.5 9.55228 8.5 9L8.5 7C8.5 6.44772 8.05228 6 7.5 6L3 6Z"
          fill="currentColor" />
        <path
          d="M11.5 6L11.5 14L12 14C12.5523 14 13 13.5523 13 13L13 11C13 10.4477 13.4477 10 14 10L16 10C16.5523 10 17 9.55228 17 9L17 7C17 6.44772 16.5523 6 16 6L11.5 6Z"
          fill="currentColor" />
      </svg>
    </Button>
    <div class="h-6 w-px bg-gray-300 mx-1"></div>
    <Button @click="editor?.chain().focus().toggleOrderedList().run()" title="Ordered List" size="small"
      :active="editor?.isActive('orderedList')" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="3" width="3" height="3.5" rx="0.5" fill="currentColor" />
        <rect x="8" y="3.5" width="10" height="2.5" rx="1" fill="currentColor" />
        <rect x="2" y="8.5" width="3" height="3.5" rx="0.5" fill="currentColor" />
        <rect x="8" y="9" width="10" height="2.5" rx="1" fill="currentColor" />
        <rect x="2" y="14" width="3" height="3.5" rx="0.5" fill="currentColor" />
        <rect x="8" y="14.5" width="10" height="2.5" rx="1" fill="currentColor" />
      </svg>
    </Button>
    <Button @click="editor?.chain().focus().toggleBulletList().run()" title="Bullet List" size="small"
      :active="editor?.isActive('bulletList')" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="4" cy="4.5" r="2.5" fill="currentColor" />
        <rect x="8" y="3.5" width="10" height="2.5" rx="1" fill="currentColor" />
        <circle cx="4" cy="10" r="2.5" fill="currentColor" />
        <rect x="8" y="9" width="10" height="2.5" rx="1" fill="currentColor" />
        <circle cx="4" cy="15.5" r="2.5" fill="currentColor" />
        <rect x="8" y="14.5" width="10" height="2.5" rx="1" fill="currentColor" />
      </svg>
    </Button>
    <Button @click="toggleLinkForm" title="Insert Link" size="small" :active="editor?.isActive('link')" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 7H7C5.89543 7 5 7.89543 5 9V11C5 12.1046 5.89543 13 7 13H9" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" />
        <path d="M11 13H13C14.1046 13 15 12.1046 15 11V9C15 7.89543 14.1046 7 13 7H11" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" />
        <path d="M8 10L12 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </Button>
    <!-- Insert Table Button -->
    <div class="h-6 w-px bg-gray-300 mx-1"></div>
    <Button @click="insertTable" title="Insert Table" size="small" :active="editor?.isActive('table')" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="14" height="12" rx="1" stroke="currentColor" stroke-width="2" />
        <rect x="3" y="7.5" width="14" height="1.5" fill="currentColor" />
        <rect x="3" y="11" width="14" height="1.5" fill="currentColor" />
        <rect x="7.5" y="4" width="1.5" height="12" fill="currentColor" />
        <rect x="11" y="4" width="1.5" height="12" fill="currentColor" />
      </svg>
    </Button>
    <!-- Add Comment Button -->
    <div class="h-6 w-px bg-gray-300 mx-1"></div>
    <Button @click="handleAddComment" title="Add Comment" size="small" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M17 4H3C2.44772 4 2 4.44772 2 5V15C2 15.5523 2.44772 16 3 16H6V18.5L10 16H17C17.5523 16 18 15.5523 18 15V5C18 4.44772 17.5523 4 17 4Z"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="6" y="8" width="8" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="6" y="11.5" width="5" height="1.5" rx="0.75" fill="currentColor" />
      </svg>
    </Button>
    <!-- Add Mark Button -->
    <Button @click="handleAddMark" title="Add/Remove Highlight Mark" size="small" :active="isMarkActive" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="16" height="10" rx="1" stroke="currentColor" stroke-width="2" />
        <rect x="4" y="7" width="12" height="6" rx="1" fill="#FFC107" />
      </svg>
    </Button>
    <!-- Reference Button -->
    <Button @click="handleAddReference" title="Add Reference" size="small" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 8L14 3M14 3H10M14 3V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" />
        <path d="M11 12L6 17M6 17H10M6 17V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </Button>
    <!-- Toggle Comments Sidebar Button -->
    <Button @click="toggleComments" title="Toggle Comments Sidebar" size="small" :active="showComments" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M17 4H3C2.44772 4 2 4.44772 2 5V15C2 15.5523 2.44772 16 3 16H6V18.5L10 16H17C17.5523 16 18 15.5523 18 15V5C18 4.44772 17.5523 4 17 4Z"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="6" y="7.5" width="8" height="1.5" rx="0.75" fill="currentColor" />
        <rect x="6" y="11" width="6" height="1.5" rx="0.75" fill="currentColor" />
      </svg>
    </Button>
    <!-- Toggle TOC Sidebar Button -->
    <Button @click="toggleToc" title="Toggle Table of Contents" size="small" :active="showToc" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3.5" width="14" height="2.5" rx="1" fill="currentColor" />
        <rect x="3" y="7.5" width="10" height="2.5" rx="1" fill="currentColor" />
        <rect x="3" y="11.5" width="12" height="2.5" rx="1" fill="currentColor" />
        <rect x="3" y="15.5" width="8" height="2.5" rx="1" fill="currentColor" />
      </svg>
    </Button>
    <!-- Undo Button -->
    <Button @click="handleUndo" title="Undo" size="small" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 7L3 10L7 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" />
        <path d="M3 10H13C15.2091 10 17 11.7909 17 14C17 16.2091 15.2091 18 13 18H11" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </Button>
    <!-- Redo Button -->
    <Button @click="handleRedo" title="Redo" size="small" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 7L17 10L13 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" />
        <path d="M17 10H7C4.79086 10 3 11.7909 3 14C3 16.2091 4.79086 18 7 18H9" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </Button>
    <div class="mx-1"></div>
    <div class="ml-auto flex items-center">
      <span v-if="isSaving" class="ml-2 text-gray-500 text-sm">Saving...</span>
      <span v-if="savedSuccessfully" class="ml-2 text-green-600 text-sm">Saved</span>
    </div>

    <div v-if="showLinkForm"
      class="absolute top-10 left-0 w-64 border border-gray-300 rounded shadow-lg p-2 z-20 bg-white">
      <div class="text-sm font-medium mb-1">Insert Link</div>
      <div class="flex flex-col gap-2 mb-2">
        <input v-model="linkUrl" type="text" placeholder="https://example.com"
          class="w-full border border-gray-300 rounded px-2 py-1 text-sm" ref="linkUrlInput"
          @keydown.enter.prevent="insertLink" @keydown.esc="cancelLinkForm" />
      </div>
      <div class="flex justify-end gap-2">
        <Button @click="cancelLinkForm" class="text-xs py-1 px-2">Cancel</Button>
        <Button @click="insertLink" class="text-xs py-1 px-2">Insert</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, nextTick, defineEmits, watch, onMounted, onBeforeUnmount } from 'vue';
import Button from '../ui/Button.vue';

const props = defineProps({
  editor: {
    type: Object,
  },
  isSaving: {
    type: Boolean,
    default: false
  },
  savedSuccessfully: {
    type: Boolean,
    default: false
  },
  showComments: {
    type: Boolean,
    default: false
  },
  showToc: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle-comments', 'toggle-toc', 'add-comment', 'add-mark', 'remove-mark', 'add-reference']);

const showLinkForm = ref(false);
const linkUrl = ref('');
const linkUrlInput = ref(null);
const isMarkActive = ref(false);

const toggleComments = () => {
  emit('toggle-comments');
};

const toggleToc = () => {
  emit('toggle-toc');
};

const insertTable = () => {
  if (props.editor) {
    props.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }
};

const toggleLinkForm = () => {
  if (!showLinkForm.value) {
    if (props.editor?.isActive('link')) {
      linkUrl.value = props.editor?.getAttributes('link').href || '';
    } else {
      linkUrl.value = '';
    }
  }

  showLinkForm.value = !showLinkForm.value;

  if (showLinkForm.value) {
    nextTick(() => {
      if (linkUrlInput.value) {
        linkUrlInput.value.focus();
      }
    });
  }
};

const insertLink = () => {
  if (!props.editor) return;

  if (!linkUrl.value.trim()) {
    if (linkUrlInput.value) {
      linkUrlInput.value.focus();
    }
    return;
  }

  if (props.editor.isActive('link')) {
    props.editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: linkUrl.value, target: '_blank' })
      .run();
  } else {
    props.editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: linkUrl.value, target: '_blank' })
      .run();
  }

  showLinkForm.value = false;
};

const cancelLinkForm = () => {
  showLinkForm.value = false;
};

const handleAddComment = () => {
  if (!props.editor) return;

  const { from, to } = props.editor.state.selection;

  if (from === to) {
    alert('Please select some text to comment on');
    return;
  }

  const text = props.editor.state.doc.textBetween(from, to);

  emit('add-comment', {
    text,
    from,
    to
  });
};

const checkIfMarkActive = () => {
  if (!props.editor || !props.editor.state) return false;

  const isActive = props.editor.isActive('textMark');
  if (isActive) {
    const attrs = props.editor.getAttributes('textMark');
    return attrs && attrs.markId ? true : false;
  }

  return false;
};

const updateMarkActiveStatus = () => {
  try {
    isMarkActive.value = checkIfMarkActive();
  } catch (error) {
    console.error('Error checking mark active status:', error);
    isMarkActive.value = false;
  }
};

watch(() => props.editor?.state.selection, () => {
  updateMarkActiveStatus();
}, { deep: true });

onMounted(() => {
  if (props.editor) {
    props.editor.on('selectionUpdate', updateMarkActiveStatus);
    updateMarkActiveStatus();
  }
});

onBeforeUnmount(() => {
  if (props.editor) {
    props.editor.off('selectionUpdate', updateMarkActiveStatus);
  }
});

const handleAddMark = () => {
  if (!props.editor) return;

  if (isMarkActive.value) {
    const attrs = props.editor.getAttributes('textMark');
    if (attrs.markId) {
      emit('remove-mark', attrs.markId);
      return;
    }
  }

  const { from, to } = props.editor.state.selection;

  if (from === to) {
    alert('Please select some text to highlight');
    return;
  }

  const text = props.editor.state.doc.textBetween(from, to);

  emit('add-mark', {
    text,
    from,
    to
  });
};

const handleAddReference = () => {
  emit('add-reference');
};

const handleUndo = () => {
  if (props.editor && typeof props.editor.undo === 'function') {
    props.editor.undo();
  } else if (props.editor && props.editor.commands && typeof props.editor.commands.undo === 'function') {
    props.editor.commands.undo();
  }
};

const handleRedo = () => {
  if (props.editor && typeof props.editor.redo === 'function') {
    props.editor.redo();
  } else if (props.editor && props.editor.commands && typeof props.editor.commands.redo === 'function') {
    props.editor.commands.redo();
  }
};

defineExpose({
  showLinkForm
});
</script>