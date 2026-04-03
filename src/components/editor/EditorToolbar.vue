<template>
  <div class="mb-2.5 flex flex-wrap items-center gap-1 bg-surface-elevated p-2 relative">
    <!-- Text Color & BG Color (not in summary or knowledge mode) -->
    <template v-if="context !== 'summary' && context !== 'knowledge'">
      <div class="relative">
        <Button @click="toggleDropdown('textColor')" title="Text Color" size="small" borderless>
          <span class="text-base font-bold" :style="{ color: currentTextColor || '#000' }">A</span>
          <span class="block h-0.5 w-4 rounded" :style="{ background: currentTextColor || '#000' }"></span>
        </Button>
        <div v-if="activeDropdown === 'textColor'"
          class="absolute top-9 left-0 z-30 bg-surface-elevated border border-border rounded-lg shadow-lg p-2 w-40">
          <div class="text-xs text-text-muted mb-1.5 font-medium">Text Color</div>
          <div class="grid grid-cols-5 gap-1">
            <button v-for="color in textColors" :key="color.value" @click="setTextColor(color.value)"
              class="w-6 h-6 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
              :style="{ background: color.value }" :title="color.label" />
          </div>
          <button @click="removeTextColor"
            class="mt-1.5 w-full text-xs text-text-muted hover:text-text-secondary py-1 hover:bg-surface-hover rounded">
            Remove color
          </button>
        </div>
      </div>
      <div class="relative">
        <Button @click="toggleDropdown('bgColor')" title="Background Color" size="small" borderless>
          <span class="text-base font-bold px-0.5 rounded"
            :style="{ background: currentBgColor || '#FEF08A', color: '#333' }">A</span>
        </Button>
        <div v-if="activeDropdown === 'bgColor'"
          class="absolute top-9 left-0 z-30 bg-surface-elevated border border-border rounded-lg shadow-lg p-2 w-40">
          <div class="text-xs text-text-muted mb-1.5 font-medium">Background Color</div>
          <div class="grid grid-cols-5 gap-1">
            <button v-for="color in bgColors" :key="color.value" @click="setBgColor(color.value)"
              class="w-6 h-6 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
              :style="{ background: color.value }" :title="color.label" />
          </div>
          <button @click="removeBgColor"
            class="mt-1.5 w-full text-xs text-text-muted hover:text-text-secondary py-1 hover:bg-surface-hover rounded">
            Remove highlight
          </button>
        </div>
      </div>
      <div class="h-6 w-px bg-border mx-0.5"></div>
    </template>

    <!-- Basic formatting: Bold, Italic, Underline, Strikethrough -->
    <Button @click="editor?.chain().focus().toggleBold().run()" title="Bold (Ctrl+B)" size="small"
      :active="editor?.isActive('bold')" borderless>
      <strong class="text-base font-bold">B</strong>
    </Button>
    <Button @click="editor?.chain().focus().toggleItalic().run()" title="Italic (Ctrl+I)" size="small"
      :active="editor?.isActive('italic')" borderless>
      <em class="text-base font-semibold">I</em>
    </Button>
    <Button @click="editor?.chain().focus().toggleUnderline().run()" title="Underline (Ctrl+U)" size="small"
      :active="editor?.isActive('underline')" borderless>
      <u class="text-base font-semibold">U</u>
    </Button>
    <Button @click="editor?.chain().focus().toggleStrike().run()" title="Strikethrough (Ctrl+Shift+X)" size="small"
      :active="editor?.isActive('strike')" borderless>
      <s class="text-base font-semibold">S</s>
    </Button>
    <!-- Inline Code (not summary) -->
    <Button v-if="context !== 'summary'" @click="editor?.chain().focus().toggleCode().run()"
      title="Inline Code (Ctrl+E)" size="small" :active="editor?.isActive('code')" borderless>
      <span class="text-sm font-mono">&lt;/&gt;</span>
    </Button>

    <div class="h-6 w-px bg-border mx-0.5"></div>

    <!-- Headings -->
    <Button @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()" title="Heading 1 (Ctrl+Alt+1)"
      size="small" :active="editor?.isActive('heading', { level: 1 })" borderless>
      <span class="text-sm font-bold">H1</span>
    </Button>
    <Button @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()" title="Heading 2 (Ctrl+Alt+2)"
      size="small" :active="editor?.isActive('heading', { level: 2 })" borderless>
      <span class="text-sm font-bold">H2</span>
    </Button>
    <Button @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()" title="Heading 3 (Ctrl+Alt+3)"
      size="small" :active="editor?.isActive('heading', { level: 3 })" borderless>
      <span class="text-sm font-bold">H3</span>
    </Button>

    <!-- Alignment (not summary) -->
    <template v-if="context !== 'summary'">
      <div class="h-6 w-px bg-border mx-0.5"></div>
      <Button @click="editor?.chain().focus().setTextAlign('left').run()" title="Align Left (Ctrl+Shift+L)"
        size="small" :active="editor?.isActive({ textAlign: 'left' })" borderless>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="12" height="2.5" rx="1" fill="currentColor" />
          <rect x="3" y="9" width="8" height="2.5" rx="1" fill="currentColor" />
          <rect x="3" y="14" width="12" height="2.5" rx="1" fill="currentColor" />
        </svg>
      </Button>
      <Button @click="editor?.chain().focus().setTextAlign('center').run()" title="Align Center (Ctrl+Shift+E)"
        size="small" :active="editor?.isActive({ textAlign: 'center' })" borderless>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="2.5" rx="1" fill="currentColor" />
          <rect x="5" y="9" width="10" height="2.5" rx="1" fill="currentColor" />
          <rect x="2" y="14" width="16" height="2.5" rx="1" fill="currentColor" />
        </svg>
      </Button>
      <Button @click="editor?.chain().focus().setTextAlign('right').run()" title="Align Right (Ctrl+Shift+R)"
        size="small" :active="editor?.isActive({ textAlign: 'right' })" borderless>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="5" y="4" width="12" height="2.5" rx="1" fill="currentColor" />
          <rect x="9" y="9" width="8" height="2.5" rx="1" fill="currentColor" />
          <rect x="5" y="14" width="12" height="2.5" rx="1" fill="currentColor" />
        </svg>
      </Button>
      <Button @click="editor?.chain().focus().setTextAlign('justify').run()" title="Justify (Ctrl+Shift+J)"
        size="small" :active="editor?.isActive({ textAlign: 'justify' })" borderless>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="2.5" rx="1" fill="currentColor" />
          <rect x="2" y="9" width="16" height="2.5" rx="1" fill="currentColor" />
          <rect x="2" y="14" width="16" height="2.5" rx="1" fill="currentColor" />
        </svg>
      </Button>
    </template>

    <div class="h-6 w-px bg-border mx-0.5"></div>

    <!-- Lists & Quote -->
    <Button @click="editor?.chain().focus().toggleOrderedList().run()" title="Numbered List (Ctrl+Shift+7)"
      size="small" :active="editor?.isActive('orderedList')" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="3" width="3" height="3.5" rx="0.5" fill="currentColor" />
        <rect x="8" y="3.5" width="10" height="2.5" rx="1" fill="currentColor" />
        <rect x="2" y="8.5" width="3" height="3.5" rx="0.5" fill="currentColor" />
        <rect x="8" y="9" width="10" height="2.5" rx="1" fill="currentColor" />
        <rect x="2" y="14" width="3" height="3.5" rx="0.5" fill="currentColor" />
        <rect x="8" y="14.5" width="10" height="2.5" rx="1" fill="currentColor" />
      </svg>
    </Button>
    <Button @click="editor?.chain().focus().toggleBulletList().run()" title="Bullet List (Ctrl+Shift+8)" size="small"
      :active="editor?.isActive('bulletList')" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="4" cy="4.5" r="2.5" fill="currentColor" />
        <rect x="8" y="3.5" width="10" height="2.5" rx="1" fill="currentColor" />
        <circle cx="4" cy="10" r="2.5" fill="currentColor" />
        <rect x="8" y="9" width="10" height="2.5" rx="1" fill="currentColor" />
        <circle cx="4" cy="15.5" r="2.5" fill="currentColor" />
        <rect x="8" y="14.5" width="10" height="2.5" rx="1" fill="currentColor" />
      </svg>
    </Button>
    <Button @click="editor?.chain().focus().toggleBlockquote().run()" title="Quote (Ctrl+Shift+B)" size="small"
      :active="editor?.isActive('blockquote')" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path
          d="M3 6L3 14L3.5 14C4.05228 14 4.5 13.5523 4.5 13L4.5 11C4.5 10.4477 4.94772 10 5.5 10L7.5 10C8.05228 10 8.5 9.55228 8.5 9L8.5 7C8.5 6.44772 8.05228 6 7.5 6L3 6Z"
          fill="currentColor" />
        <path
          d="M11.5 6L11.5 14L12 14C12.5523 14 13 13.5523 13 13L13 11C13 10.4477 13.4477 10 14 10L16 10C16.5523 10 17 9.55228 17 9L17 7C17 6.44772 16.5523 6 16 6L11.5 6Z"
          fill="currentColor" />
      </svg>
    </Button>

    <!-- Advanced features (not summary) -->
    <template v-if="context !== 'summary'">
      <!-- Code Block with language -->
      <div class="relative">
        <Button @click="handleCodeBlock" title="Code Block (Ctrl+Alt+C)" size="small"
          :active="editor?.isActive('codeBlock')" borderless>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" />
            <path d="M7 7L4 10L7 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
              stroke-linejoin="round" />
            <path d="M13 7L16 10L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
        </Button>
        <div v-if="activeDropdown === 'codeLanguage'"
          class="absolute top-9 left-0 z-30 bg-surface-elevated border border-border rounded-lg shadow-lg p-2 w-44 max-h-60 overflow-y-auto">
          <div class="text-xs text-text-muted mb-1.5 font-medium">Language</div>
          <button v-for="lang in codeLanguages" :key="lang.value"
            @click="insertCodeBlockWithLanguage(lang.value)"
            class="w-full text-left text-sm px-2 py-1 rounded hover:bg-surface-hover cursor-pointer transition-colors">
            {{ lang.label }}
          </button>
        </div>
      </div>

      <div class="h-6 w-px bg-border mx-0.5"></div>

      <!-- Link -->
      <div class="relative">
        <Button @click="toggleDropdown('link')" title="Insert/Edit Link (Ctrl+K)" size="small"
          :active="editor?.isActive('link')" borderless>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M9 7H7C5.89543 7 5 7.89543 5 9V11C5 12.1046 5.89543 13 7 13H9" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" />
            <path d="M11 13H13C14.1046 13 15 12.1046 15 11V9C15 7.89543 14.1046 7 13 7H11" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" />
            <path d="M8 10L12 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        </Button>
        <div v-if="activeDropdown === 'link'"
          class="absolute top-9 left-0 w-72 border border-border rounded-lg shadow-lg p-3 z-30 bg-surface-elevated">
          <div class="text-sm font-medium mb-2">Insert / Edit Link</div>
          <input v-model="linkUrl" type="text" placeholder="https://example.com"
            class="w-full border border-border rounded px-2 py-1.5 text-sm mb-1" ref="linkUrlInput"
            @keydown.enter.prevent="insertLink" @keydown.esc="closeDropdown" />
          <input v-model="linkText" type="text" placeholder="Link text (optional)"
            class="w-full border border-border rounded px-2 py-1.5 text-sm mb-2" @keydown.enter.prevent="insertLink"
            @keydown.esc="closeDropdown" />
          <div class="flex justify-between">
            <Button v-if="editor?.isActive('link')" @click="removeLink" variant="danger" size="small">Remove</Button>
            <span v-else></span>
            <div class="flex gap-2">
              <Button @click="closeDropdown" size="small">Cancel</Button>
              <Button @click="insertLink" variant="info" size="small">Apply</Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Math -->
      <div class="relative">
        <Button @click="toggleDropdown('math')" title="Math Formula (Ctrl+Shift+M)" size="small" borderless>
          <span class="text-sm font-serif italic font-bold">∑</span>
        </Button>
        <div v-if="activeDropdown === 'math'"
          class="absolute top-9 left-0 w-72 border border-border rounded-lg shadow-lg p-3 z-30 bg-surface-elevated">
          <div class="text-sm font-medium mb-2">Math Formula (LaTeX)</div>
          <input v-model="mathFormula" type="text" placeholder="E = mc^2"
            class="w-full border border-border rounded px-2 py-1.5 text-sm font-mono mb-2" ref="mathInput"
            @keydown.enter.prevent="confirmInsertMath" @keydown.esc="closeDropdown" />
          <div class="text-xs text-text-muted mb-2">e.g. \frac{a}{b}, \sqrt{x}, \sum_{i=0}^n</div>
          <div class="flex justify-end gap-2">
            <Button @click="closeDropdown" size="small">Cancel</Button>
            <Button @click="confirmInsertMath" variant="info" size="small">Insert</Button>
          </div>
        </div>
      </div>

      <!-- Image -->
      <Button @click="insertImage" title="Insert Image (Ctrl+Shift+I)" size="small" borderless>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" />
          <circle cx="7" cy="7.5" r="1.5" fill="currentColor" />
          <path d="M2 14L6 10L9 13L13 8L18 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
      </Button>

      <!-- Video -->
      <div class="relative">
        <Button @click="toggleDropdown('video')" title="Insert Video (Ctrl+Shift+V)" size="small" borderless>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none" />
            <path d="M8 7.5V12.5L13 10L8 7.5Z" fill="currentColor" />
          </svg>
        </Button>
        <div v-if="activeDropdown === 'video'"
          class="absolute top-9 right-0 w-72 border border-border rounded-lg shadow-lg p-3 z-30 bg-surface-elevated">
          <div class="text-sm font-medium mb-2">Insert Video</div>
          <input v-model="videoUrl" type="text" placeholder="YouTube, Vimeo or video URL"
            class="w-full border border-border rounded px-2 py-1.5 text-sm mb-2" ref="videoUrlInput"
            @keydown.enter.prevent="confirmInsertVideo" @keydown.esc="closeDropdown" />
          <div class="flex justify-end gap-2">
            <Button @click="closeDropdown" size="small">Cancel</Button>
            <Button @click="confirmInsertVideo" variant="info" size="small">Insert</Button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <Button @click="insertTable" title="Insert Table" size="small" :active="editor?.isActive('table')" borderless>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="4" width="14" height="12" rx="1" stroke="currentColor" stroke-width="2" />
          <rect x="3" y="7.5" width="14" height="1.5" fill="currentColor" />
          <rect x="3" y="11" width="14" height="1.5" fill="currentColor" />
          <rect x="7.5" y="4" width="1.5" height="12" fill="currentColor" />
          <rect x="11" y="4" width="1.5" height="12" fill="currentColor" />
        </svg>
      </Button>

      <!-- Convert Table to Dataset -->
      <Button v-if="editor?.isActive('table')" @click="emit('convert-table-to-dataset')"
        title="Convert Table to Dataset" size="small" borderless>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
        </svg>
      </Button>

    </template>

    <!-- Markers (not summary, not knowledge) -->
    <template v-if="context !== 'summary' && context !== 'knowledge'">
      <div class="h-6 w-px bg-border mx-0.5"></div>
      <Button @click="applyMarker('idea')" title="Idea Marker (Ctrl+Alt+I)" size="small"
        :active="activeMarkerType === 'idea'" borderless>
        <span class="text-sm">💡</span>
      </Button>
      <Button @click="applyMarker('important')" title="Important Marker (Ctrl+Alt+W)" size="small"
        :active="activeMarkerType === 'important'" borderless>
        <span class="text-sm">⚠️</span>
      </Button>
      <Button @click="applyMarker('review')" title="Review Marker (Ctrl+Alt+R)" size="small"
        :active="activeMarkerType === 'review'" borderless>
        <span class="text-sm">🔍</span>
      </Button>
    </template>

    <!-- Document-only: Comments, Marks, References -->
    <template v-if="context === 'document'">
      <div class="h-6 w-px bg-border mx-0.5"></div>
      <Button @click="handleAddComment" title="Add Comment (Ctrl+Alt+C)" size="small" borderless>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path
            d="M17 4H3C2.44772 4 2 4.44772 2 5V15C2 15.5523 2.44772 16 3 16H6V18.5L10 16H17C17.5523 16 18 15.5523 18 15V5C18 4.44772 17.5523 4 17 4Z"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <rect x="6" y="8" width="8" height="1.5" rx="0.75" fill="currentColor" />
          <rect x="6" y="11.5" width="5" height="1.5" rx="0.75" fill="currentColor" />
        </svg>
      </Button>
      <Button @click="handleAddMark" title="Add/Remove Highlight Mark" size="small" :active="isMarkActive" borderless>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="5" width="16" height="10" rx="1" stroke="currentColor" stroke-width="2" />
          <rect x="4" y="7" width="12" height="6" rx="1" fill="#FFC107" />
        </svg>
      </Button>
      <Button @click="handleAddReference" title="Add Reference" size="small" borderless>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M9 8L14 3M14 3H10M14 3V7" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" />
          <path d="M11 12L6 17M6 17H10M6 17V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
      </Button>
    </template>

    <!-- Citations (document + knowledge) -->
    <template v-if="context === 'document' || context === 'knowledge'">
      <div v-if="context === 'knowledge'" class="h-6 w-px bg-border mx-0.5"></div>
      <Button @click="emit('add-citation')" title="Insertar cita bibliográfica" size="small" borderless>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M4 4H16C16.5523 4 17 4.44772 17 5V15C17 15.5523 16.5523 16 16 16H4C3.44772 16 3 15.5523 3 15V5C3 4.44772 3.44772 4 4 4Z" stroke="currentColor" stroke-width="1.5" fill="none" />
          <path d="M6 8L8 7V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M12 8C12 8 14 8.5 14 10C14 11.5 12 12 12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <path d="M6 13H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </Button>
    </template>

    <!-- Dataset view (document-only) -->
    <template v-if="context === 'document'">
      <Button @click="emit('add-dataset-view')" title="Insert Dataset View" size="small" borderless>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7" />
          <path d="M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4" />
          <path d="M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          <path d="M4 12c0 2.21 3.582 4 8 4s8-1.79 8-4" />
        </svg>
      </Button>
      <Button @click="emit('add-dataset-chart')" title="Insert Dataset Chart" size="small" borderless>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4v16h16" />
          <path d="M8 16V9" />
          <path d="M12 16V4" />
          <path d="M16 16v-5" />
        </svg>
      </Button>
    </template>

    <div class="h-6 w-px bg-border mx-0.5"></div>

    <!-- Undo/Redo (all contexts) -->
    <Button @click="editor?.chain().focus().undo().run()" title="Undo (Ctrl+Z)" size="small" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M7 7L3 10L7 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" />
        <path d="M3 10H13C15.2091 10 17 11.7909 17 14C17 16.2091 15.2091 18 13 18H11" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </Button>
    <Button @click="editor?.chain().focus().redo().run()" title="Redo (Ctrl+Shift+Z)" size="small" borderless>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <path d="M13 7L17 10L13 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" />
        <path d="M17 10H7C4.79086 10 3 11.7909 3 14C3 16.2091 4.79086 18 7 18H9" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </Button>

    <!-- Save status -->
    <div class="ml-auto flex items-center">
      <span v-if="isSaving" class="ml-2 text-text-muted text-sm">Saving...</span>
      <span v-if="savedSuccessfully" class="ml-2 text-green-600 text-sm">Saved</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import Button from '../ui/Button.vue';
import { generateMarkerId } from './extensions/CalloutExtension';
import type { MarkerType } from './extensions/CalloutExtension';

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
  },
  context: {
    type: String,
    default: 'document'
  }
});

const emit = defineEmits(['add-comment', 'add-mark', 'remove-mark', 'add-reference', 'add-dataset-view', 'add-dataset-chart', 'add-citation', 'marker-applied', 'convert-table-to-dataset']);

// -- Unified dropdown state --
const activeDropdown = ref<string | null>(null);

const toggleDropdown = (name: string) => {
  if (activeDropdown.value === name) {
    activeDropdown.value = null;
    return;
  }
  activeDropdown.value = name;

  if (name === 'link') {
    nextTick(() => {
      if (props.editor?.isActive('link')) {
        linkUrl.value = props.editor?.getAttributes('link').href || '';
        const { from, to } = props.editor.state.selection;
        linkText.value = props.editor.state.doc.textBetween(from, to) || '';
      } else {
        const { from, to } = props.editor?.state.selection || {};
        linkUrl.value = '';
        linkText.value = from !== to ? props.editor?.state.doc.textBetween(from, to) || '' : '';
      }
      nextTick(() => linkUrlInput.value?.focus());
    });
  } else if (name === 'math') {
    mathFormula.value = '';
    nextTick(() => mathInput.value?.focus());
  } else if (name === 'video') {
    videoUrl.value = '';
    nextTick(() => videoUrlInput.value?.focus());
  }
};

const closeDropdown = () => {
  activeDropdown.value = null;
};

// -- Color pickers --
const textColors = [
  { label: 'Black', value: '#000000' },
  { label: 'Dark Gray', value: '#4B5563' },
  { label: 'Red', value: '#EF4444' },
  { label: 'Orange', value: '#F97316' },
  { label: 'Yellow', value: '#EAB308' },
  { label: 'Green', value: '#22C55E' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Purple', value: '#8B5CF6' },
  { label: 'Pink', value: '#EC4899' },
  { label: 'Teal', value: '#14B8A6' },
];

const bgColors = [
  { label: 'Light Yellow', value: '#FEF9C3' },
  { label: 'Light Green', value: '#DCFCE7' },
  { label: 'Light Blue', value: '#DBEAFE' },
  { label: 'Light Purple', value: '#EDE9FE' },
  { label: 'Light Red', value: '#FEE2E2' },
  { label: 'Light Orange', value: '#FFEDD5' },
  { label: 'Light Pink', value: '#FCE7F3' },
  { label: 'Light Teal', value: '#CCFBF1' },
  { label: 'Light Gray', value: '#F3F4F6' },
  { label: 'White', value: '#FFFFFF' },
];

const currentTextColor = ref('#000000');
const currentBgColor = ref('');

const setTextColor = (color: string) => {
  if (!props.editor) return;
  props.editor.chain().focus().setColor(color).run();
  currentTextColor.value = color;
  closeDropdown();
};

const removeTextColor = () => {
  if (!props.editor) return;
  props.editor.chain().focus().unsetColor().run();
  currentTextColor.value = '#000000';
  closeDropdown();
};

const setBgColor = (color: string) => {
  if (!props.editor) return;
  props.editor.chain().focus().toggleHighlight({ color }).run();
  currentBgColor.value = color;
  closeDropdown();
};

const removeBgColor = () => {
  if (!props.editor) return;
  props.editor.chain().focus().unsetHighlight().run();
  currentBgColor.value = '';
  closeDropdown();
};

// -- Link --
const linkUrl = ref('');
const linkText = ref('');
const linkUrlInput = ref<HTMLInputElement | null>(null);

const insertLink = () => {
  if (!props.editor) return;
  const url = linkUrl.value.trim();
  if (!url) { linkUrlInput.value?.focus(); return; }

  let href = url;
  if (!/^https?:\/\//i.test(href) && !href.startsWith('#') && !href.startsWith('mailto:')) {
    href = 'https://' + href;
  }

  const { from, to } = props.editor.state.selection;
  if (from !== to) {
    props.editor.chain().focus().extendMarkRange('link').setLink({ href, target: '_blank' }).run();
  } else if (linkText.value.trim()) {
    props.editor.chain().focus().insertContent(`<a href="${href}" target="_blank">${linkText.value.trim()}</a>`).run();
  } else {
    props.editor.chain().focus().insertContent(`<a href="${href}" target="_blank">${href}</a>`).run();
  }
  closeDropdown();
};

const removeLink = () => {
  if (!props.editor) return;
  props.editor.chain().focus().extendMarkRange('link').unsetLink().run();
  closeDropdown();
};

// -- Table --
const insertTable = () => {
  props.editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
};

// -- Math --
const mathFormula = ref('');
const mathInput = ref<HTMLInputElement | null>(null);

const confirmInsertMath = () => {
  if (!props.editor || !mathFormula.value.trim()) return;
  props.editor.chain().focus().insertMath(mathFormula.value.trim()).run();
  closeDropdown();
};

// -- Image --
const insertImage = () => {
  if (!props.editor) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      props.editor?.chain().focus().setImage({ src: reader.result as string }).run();
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

// -- Video --
const videoUrl = ref('');
const videoUrlInput = ref<HTMLInputElement | null>(null);

const confirmInsertVideo = () => {
  if (!props.editor || !videoUrl.value.trim()) return;
  props.editor.chain().focus().insertVideo(videoUrl.value.trim()).run();
  closeDropdown();
};

// -- Code block with language --
const codeLanguages = [
  { label: 'Plain text', value: '' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' },
  { label: 'SQL', value: 'sql' },
  { label: 'Bash / Shell', value: 'bash' },
  { label: 'Java', value: 'java' },
  { label: 'C / C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'XML', value: 'xml' },
];

const handleCodeBlock = () => {
  if (!props.editor) return;
  if (props.editor.isActive('codeBlock')) {
    props.editor.chain().focus().toggleCodeBlock().run();
    closeDropdown();
  } else {
    toggleDropdown('codeLanguage');
  }
};

const insertCodeBlockWithLanguage = (language: string) => {
  if (!props.editor) return;
  props.editor.chain().focus().toggleCodeBlock().run();
  if (language) {
    props.editor.chain().focus().updateAttributes('codeBlock', { language }).run();
  }
  closeDropdown();
};

// -- Markers --
const activeMarkerType = ref<string | null>(null);

const applyMarker = (type: MarkerType) => {
  if (!props.editor) return;
  const { from, to } = props.editor.state.selection;

  const existingMarker = props.editor.isActive('marker', { markerType: type });
  if (existingMarker) {
    props.editor.chain().focus().unsetMarker().run();
    emit('marker-applied');
    return;
  }

  if (from === to) {
    alert('Select text first to apply a marker');
    return;
  }

  const id = generateMarkerId();
  props.editor.chain().focus().setMarker(id, type).run();
  emit('marker-applied');
};

// -- Comments --
const handleAddComment = () => {
  if (!props.editor) return;
  const { from, to } = props.editor.state.selection;
  if (from === to) { alert('Please select some text to comment on'); return; }
  const text = props.editor.state.doc.textBetween(from, to);
  emit('add-comment', { text, from, to });
};

// -- Marks --
const isMarkActive = ref(false);

const checkIfMarkActive = () => {
  if (!props.editor || !props.editor.state) return false;
  if (props.editor.isActive('textMark')) {
    const attrs = props.editor.getAttributes('textMark');
    return !!(attrs && attrs.markId);
  }
  return false;
};

const updateStatus = () => {
  try {
    isMarkActive.value = checkIfMarkActive();

    if (props.editor?.isActive('marker')) {
      const attrs = props.editor.getAttributes('marker');
      activeMarkerType.value = attrs?.markerType || null;
    } else {
      activeMarkerType.value = null;
    }

    if (props.editor) {
      const colorAttr = props.editor.getAttributes('textStyle')?.color;
      if (colorAttr) currentTextColor.value = colorAttr;
      const highlightAttr = props.editor.getAttributes('highlight')?.color;
      if (highlightAttr) currentBgColor.value = highlightAttr;
    }
  } catch {
    isMarkActive.value = false;
    activeMarkerType.value = null;
  }
};

watch(() => props.editor?.state.selection, () => updateStatus(), { deep: true });

onMounted(() => {
  if (props.editor) {
    props.editor.on('selectionUpdate', updateStatus);
    updateStatus();
  }
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  if (props.editor) {
    props.editor.off('selectionUpdate', updateStatus);
  }
  document.removeEventListener('click', handleClickOutside);
});

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.relative')) {
    closeDropdown();
  }
};

const handleAddMark = () => {
  if (!props.editor) return;
  if (isMarkActive.value) {
    const attrs = props.editor.getAttributes('textMark');
    if (attrs.markId) { emit('remove-mark', attrs.markId); return; }
  }
  const { from, to } = props.editor.state.selection;
  if (from === to) { alert('Please select some text to highlight'); return; }
  const text = props.editor.state.doc.textBetween(from, to);
  emit('add-mark', { text, from, to });
};

const handleAddReference = () => {
  emit('add-reference');
};

defineExpose({ activeDropdown });
</script>
