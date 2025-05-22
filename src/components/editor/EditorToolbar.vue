<template>
  <div class="mb-2.5 flex items-center gap-0.5 bg-white p-1 rounded-md">
    <Button @click="editor?.chain().focus().toggleBold().run()" title="Bold"
      :class="['w-9 h-9 border-0 flex items-center justify-center', { 'bg-gray-200': editor?.isActive('bold') }]">
      <strong>B</strong>
    </Button>
    <Button @click="editor?.chain().focus().toggleItalic().run()" title="Italic"
      :class="['w-9 h-9 border-0 flex items-center justify-center  hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('italic') }]">
      <em>I</em>
    </Button>
    <Button @click="editor?.chain().focus().toggleUnderline().run()" title="Underline"
      :class="['w-9 h-9 border-0 flex items-center justify-center  hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('underline') }]">
      <u>U</u>
    </Button>
    <Button @click="editor?.chain().focus().toggleStrike().run()" title="Strikethrough"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('strike') }]">
      <s>S</s>
    </Button>
    <Button @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()" title="Heading 1"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('heading', { level: 1 }) }]">
      H1
    </Button>
    <Button @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()" title="Heading 2"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('heading', { level: 2 }) }]">
      H2
    </Button>
    <Button @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()" title="Heading 3"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('heading', { level: 3 }) }]">
      H3
    </Button>
    <div class="mx-1"></div>
    <Button @click="editor?.chain().focus().setTextAlign('left').run()" title="Align Left"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive({ textAlign: 'left' }) }]">
      <div class="flex flex-col items-start space-y-0.5 text-gray-700">
        <div class="w-4 h-0.5 bg-gray-700"></div>
        <div class="w-3 h-0.5 bg-gray-700"></div>
        <div class="w-4 h-0.5 bg-gray-700"></div>
      </div>
    </Button>
    <Button @click="editor?.chain().focus().setTextAlign('center').run()" title="Align Center"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive({ textAlign: 'center' }) }]">
      <div class="flex flex-col items-center space-y-0.5 text-gray-700">
        <div class="w-4 h-0.5 bg-gray-700"></div>
        <div class="w-3 h-0.5 bg-gray-700"></div>
        <div class="w-4 h-0.5 bg-gray-700"></div>
      </div>
    </Button>
    <Button @click="editor?.chain().focus().setTextAlign('right').run()" title="Align Right"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive({ textAlign: 'right' }) }]">
      <div class="flex flex-col items-end space-y-0.5 text-gray-700">
        <div class="w-4 h-0.5 bg-gray-700"></div>
        <div class="w-3 h-0.5 bg-gray-700"></div>
        <div class="w-4 h-0.5 bg-gray-700"></div>
      </div>
    </Button>
    <Button @click="editor?.chain().focus().setTextAlign('justify').run()" title="Justify"
      :class="['w-9 h-9 border-0 flex items-center justify-center  hover:bg-gray-100', { 'bg-gray-200': editor?.isActive({ textAlign: 'justify' }) }]">
      <div class="flex flex-col items-center space-y-0.5 text-gray-700">
        <div class="w-4 h-0.5 bg-gray-700"></div>
        <div class="w-4 h-0.5 bg-gray-700"></div>
        <div class="w-4 h-0.5 bg-gray-700"></div>
      </div>
    </Button>
    <div class="mx-1"></div>
    <Button @click="editor?.chain().focus().toggleBlockquote().run()" title="Quote"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('blockquote') }]">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M8 6H4C3.44772 6 3 6.44772 3 7V11C3 11.5523 3.44772 12 4 12H6C6.55228 12 7 12.4477 7 13V14H4C3.44772 14 3 13.5523 3 13V12.5"
          stroke="#4B5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path
          d="M17 6H13C12.4477 6 12 6.44772 12 7V11C12 11.5523 12.4477 12 13 12H15C15.5523 12 16 12.4477 16 13V14H13C12.4477 14 12 13.5523 12 13V12.5"
          stroke="#4B5563" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </Button>
    <div class="mx-1"></div>
    <Button @click="editor?.chain().focus().toggleOrderedList().run()" title="Ordered List"
      :class="['w-9 h-9 border-0 flex items-center justify-center  hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('orderedList') }]">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="2.5" y="5" font-size="5" font-weight="bold" fill="#4B5563">1</text>
        <rect x="8" y="4.25" width="10" height="1.5" rx="0.75" fill="#4B5563" />
        <text x="2.5" y="10" font-size="5" font-weight="bold" fill="#4B5563">2</text>
        <rect x="8" y="9.25" width="10" height="1.5" rx="0.75" fill="#4B5563" />
        <text x="2.5" y="15" font-size="5" font-weight="bold" fill="#4B5563">3</text>
        <rect x="8" y="14.25" width="10" height="1.5" rx="0.75" fill="#4B5563" />
      </svg>
    </Button>
    <Button @click="editor?.chain().focus().toggleBulletList().run()" title="Bullet List"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('bulletList') }]">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="4" cy="5" r="2" fill="#4B5563" />
        <rect x="8" y="4.25" width="10" height="1.5" rx="0.75" fill="#4B5563" />
        <circle cx="4" cy="10" r="2" fill="#4B5563" />
        <rect x="8" y="9.25" width="10" height="1.5" rx="0.75" fill="#4B5563" />
        <circle cx="4" cy="15" r="2" fill="#4B5563" />
        <rect x="8" y="14.25" width="10" height="1.5" rx="0.75" fill="#4B5563" />
      </svg>
    </Button>
    <Button @click="toggleLinkForm" title="Insert Link"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('link') }]">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 7H7C5.89543 7 5 7.89543 5 9V11C5 12.1046 5.89543 13 7 13H9" stroke="#4B5563" stroke-width="1.5"
          stroke-linecap="round" />
        <path d="M11 13H13C14.1046 13 15 12.1046 15 11V9C15 7.89543 14.1046 7 13 7H11" stroke="#4B5563"
          stroke-width="1.5" stroke-linecap="round" />
        <path d="M8 10L12 10" stroke="#4B5563" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </Button>
    <Button @click="insertTable" title="Insert Table"
      :class="['w-9 h-9 border-0 flex items-center justify-center hover:bg-gray-100', { 'bg-gray-200': editor?.isActive('table') }]">
      <div class="w-5 h-5 border border-gray-700 rounded-sm grid grid-cols-2 grid-rows-2 gap-px overflow-hidden">
        <div class="bg-gray-700 w-full h-full"></div>
        <div class="bg-gray-700 w-full h-full"></div>
        <div class="bg-gray-700 w-full h-full"></div>
        <div class="bg-gray-700 w-full h-full"></div>
      </div>
    </Button>

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
    <span v-if="isSaving" class="ml-auto text-gray-500 text-sm">Saving...</span>
    <span v-if="savedSuccessfully" class="ml-auto text-green-600 text-sm">Saved</span>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, nextTick } from 'vue';
import Button from '../ui/Button.vue';

const props = defineProps({
  editor: {
    type: Object,
    required: true
  },
  isSaving: {
    type: Boolean,
    default: false
  },
  savedSuccessfully: {
    type: Boolean,
    default: false
  }
});

const showLinkForm = ref(false);
const linkUrl = ref('');
const linkUrlInput = ref(null);

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

defineExpose({
  showLinkForm
});
</script>