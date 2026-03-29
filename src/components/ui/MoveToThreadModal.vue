<template>
  <Modal v-model="showModal" title="Move to...">
    <div class="space-y-3">
      <p class="text-sm text-text-muted">
        Select where to move <span class="font-medium text-text-primary">{{ itemName }}</span>:
      </p>

      <div class="max-h-72 overflow-y-auto">
        <!-- Project root -->
        <button @click="selectTarget(null)"
          class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors w-full cursor-pointer"
          :class="selectedThreadId === null && confirmed ? 'bg-accent/10 text-accent' : 'hover:bg-surface-hover text-text-primary'">
          <div class="w-5 h-5 rounded flex items-center justify-center bg-accent-subtle text-accent shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <span class="text-sm font-medium">Project root</span>
          <span v-if="currentThreadId === null" class="text-[10px] text-text-muted ml-auto">(current)</span>
        </button>

        <!-- Tree -->
        <TreeNode
          v-for="node in tree" :key="node.id"
          :node="node"
          :depth="0"
          :selectedId="confirmed ? selectedThreadId : undefined"
          :currentId="currentThreadId"
          @select="selectTarget"
        />
      </div>

      <div class="flex justify-end gap-2.5 pt-2">
        <Button type="button" variant="secondary" @click="closeModal">Cancel</Button>
        <Button :disabled="!confirmed || isMoving" @click="handleMove">
          {{ isMoving ? 'Moving...' : 'Move' }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineComponent, h } from 'vue';
import Modal from './Modal/Modal.vue';
import Button from './Button.vue';

interface ThreadItem {
  id: number;
  name: string;
  parent?: { id: number } | null;
}

interface TreeNodeType {
  id: number;
  name: string;
  children: TreeNodeType[];
}

const props = defineProps<{
  modelValue: boolean;
  itemName: string;
  currentThreadId: number | null;
  threads: ThreadItem[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  move: [threadId: number | null];
}>();

const showModal = ref(false);
const selectedThreadId = ref<number | null>(null);
const confirmed = ref(false);
const isMoving = ref(false);

const tree = computed<TreeNodeType[]>(() => {
  const map = new Map<number, TreeNodeType>();
  const roots: TreeNodeType[] = [];

  for (const t of props.threads) {
    map.set(t.id, { id: t.id, name: t.name, children: [] });
  }

  for (const t of props.threads) {
    const node = map.get(t.id)!;
    const parentId = t.parent?.id;
    if (parentId && map.has(parentId)) {
      map.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
});

watch(() => props.modelValue, (v) => {
  showModal.value = v;
  if (v) {
    selectedThreadId.value = null;
    confirmed.value = false;
    isMoving.value = false;
  }
});
watch(showModal, (v) => emit('update:modelValue', v));

function selectTarget(threadId: number | null) {
  if (threadId === props.currentThreadId) return;
  selectedThreadId.value = threadId;
  confirmed.value = true;
}

function handleMove() {
  if (!confirmed.value) return;
  isMoving.value = true;
  emit('move', selectedThreadId.value);
}

function closeModal() {
  showModal.value = false;
  emit('update:modelValue', false);
}

const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    node: { type: Object, required: true },
    depth: { type: Number, default: 0 },
    selectedId: { type: Number, default: undefined },
    currentId: { type: Number, default: null },
  },
  emits: ['select'],
  setup(props, { emit }) {
    return () => {
      const isSelected = props.selectedId === props.node.id;
      const isCurrent = props.currentId === props.node.id;

      const button = h('button', {
        onClick: () => emit('select', props.node.id),
        class: [
          'flex items-center gap-2.5 py-2 rounded-lg text-left transition-colors w-full cursor-pointer',
          isSelected ? 'bg-accent/10 text-accent' : 'hover:bg-surface-hover text-text-primary',
        ],
        style: { paddingLeft: `${(props.depth + 1) * 1.25 + 0.75}rem`, paddingRight: '0.75rem' },
      }, [
        // Tree line indicator
        props.depth > 0
          ? h('span', { class: 'text-text-muted/40 text-xs shrink-0 select-none', style: { width: '0.75rem' } }, '└')
          : null,
        // Icon
        h('div', { class: 'w-5 h-5 rounded flex items-center justify-center bg-violet-100 text-violet-600 shrink-0' }, [
          h('svg', {
            xmlns: 'http://www.w3.org/2000/svg',
            class: 'h-3 w-3',
            fill: 'none',
            viewBox: '0 0 24 24',
            stroke: 'currentColor',
            'stroke-width': '2',
          }, [
            h('path', {
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              d: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z',
            }),
          ]),
        ]),
        // Name
        h('span', { class: 'text-sm truncate' }, props.node.name),
        // Current badge
        isCurrent
          ? h('span', { class: 'text-[10px] text-text-muted ml-auto shrink-0' }, '(current)')
          : null,
      ]);

      const children = (props.node.children || []).map((child: TreeNodeType) =>
        h(TreeNode, {
          node: child,
          depth: props.depth + 1,
          selectedId: props.selectedId,
          currentId: props.currentId,
          onSelect: (id: number) => emit('select', id),
        })
      );

      return h('div', {}, [button, ...children]);
    };
  },
});
</script>
