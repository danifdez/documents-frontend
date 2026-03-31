<template>
    <Teleport to="body">
        <!-- Backdrop -->
        <Transition name="fade">
            <div v-if="modelValue" class="fixed inset-0 z-40 bg-black/20" @click="close"></div>
        </Transition>

        <!-- Panel -->
        <Transition name="slide-up">
            <div v-if="modelValue"
                class="fixed bottom-8 right-8 z-50 w-[32rem] max-h-[40rem] flex flex-col bg-surface-elevated rounded-2xl border border-border shadow-2xl overflow-hidden">

                <!-- Header -->
                <div class="flex items-center justify-between px-6 py-5 border-b border-border">
                    <div class="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <h2 class="text-base font-semibold text-text-primary tracking-tight">Tasks</h2>
                        <span v-if="pendingCount > 0"
                            class="text-xs font-medium text-accent bg-accent/10 rounded-full px-2.5 py-0.5 leading-none">
                            {{ pendingCount }}
                        </span>
                    </div>
                    <button @click="close"
                        class="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Task list -->
                <div class="flex-1 overflow-y-auto px-4 py-4">
                    <!-- Pending tasks -->
                    <div v-for="(task, index) in pendingTasks" :key="task.id" class="rounded-xl">
                        <div
                            class="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-surface-hover transition-colors">
                            <button @click="toggleTask(task)"
                                class="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 cursor-pointer border-border-light hover:border-accent">
                            </button>
                            <input :ref="el => setInputRef(el, index)" :value="task.title" type="text"
                                class="flex-1 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-muted"
                                @focus="expandedTask = task.id" @blur="saveTitle(task, $event)"
                                @keydown.enter="handleEnter(index, $event)"
                                @keydown.backspace="handleBackspace(task, index, $event)"
                                @keydown.up.prevent="focusInput(index - 1)"
                                @keydown.down.prevent="focusInput(index + 1)" @keydown.esc="close" />
                            <button @click="removeTask(task)"
                                class="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <!-- Description (expanded) -->
                        <div v-if="expandedTask === task.id" class="pl-[52px] pr-4 pb-3">
                            <textarea :value="task.description || ''" rows="2" placeholder="Add a note..."
                                class="w-full bg-surface rounded-xl border border-border text-sm text-text-secondary outline-none px-4 py-2.5 resize-none placeholder:text-text-muted focus:ring-1 focus:ring-accent/20 focus:border-accent transition-all"
                                @blur="saveDescription(task, $event)" @keydown.esc="close"></textarea>
                        </div>
                    </div>

                    <!-- New task input -->
                    <div class="flex items-center gap-4 px-4 py-3 rounded-xl">
                        <div
                            class="shrink-0 w-5 h-5 rounded-md border-2 border-dashed border-border-light">
                        </div>
                        <input ref="newTaskInput" v-model="newTitle" type="text" placeholder="Add a task..."
                            class="flex-1 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-muted"
                            @keydown.enter="addTask" @keydown.up.prevent="focusInput(pendingTasks.length - 1)"
                            @keydown.esc="close" @focus="expandedTask = null" />
                    </div>

                    <!-- Completed section -->
                    <div v-if="completedTasks.length > 0" class="mt-4 pt-4 border-t border-border">
                        <div class="flex items-center justify-between">
                            <button @click="showCompleted = !showCompleted"
                                class="flex items-center gap-2.5 px-4 py-2 text-sm text-text-muted hover:text-text-secondary transition-colors cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform duration-200"
                                    :class="{ 'rotate-90': showCompleted }" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd"
                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                        clip-rule="evenodd" />
                                </svg>
                                Completed ({{ completedTasks.length }})
                            </button>
                            <button @click="clearCompleted"
                                class="px-3 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer">
                                Clear all
                            </button>
                        </div>
                        <template v-if="showCompleted">
                            <div v-for="task in completedTasks" :key="task.id"
                                class="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-surface-hover transition-colors">
                                <button @click="toggleTask(task)"
                                    class="shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 cursor-pointer border-emerald-500 bg-emerald-500 text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20"
                                        fill="currentColor">
                                        <path fill-rule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clip-rule="evenodd" />
                                    </svg>
                                </button>
                                <span class="flex-1 text-[15px] text-text-muted line-through truncate">{{ task.title
                                    }}</span>
                                <button @click="removeTask(task)"
                                    class="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useUserTasks } from '../../services/user-tasks/useUserTasks';
import type { UserTask } from '../../types/UserTask';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

const { tasks: allTasks, loadTasks, createTask, updateTask, deleteTask } = useUserTasks();

const newTitle = ref('');
const newTaskInput = ref<HTMLInputElement | null>(null);
const inputRefs = ref<(HTMLInputElement | null)[]>([]);
const showCompleted = ref(false);
const expandedTask = ref<number | null>(null);

const pendingTasks = computed(() => allTasks.value.filter(t => t.status !== 'completed'));
const completedTasks = computed(() => allTasks.value.filter(t => t.status === 'completed'));
const pendingCount = computed(() => pendingTasks.value.length);

const close = () => emit('update:modelValue', false);

watch(() => props.modelValue, async (open) => {
    if (open) {
        await loadTasks();
        await nextTick();
        newTaskInput.value?.focus();
    } else {
        expandedTask.value = null;
    }
});

const setInputRef = (el: any, index: number) => {
    inputRefs.value[index] = el;
};

const focusInput = (index: number) => {
    if (index < 0 || index >= pendingTasks.value.length) {
        newTaskInput.value?.focus();
        return;
    }
    inputRefs.value[index]?.focus();
};

const addTask = async () => {
    const title = newTitle.value.trim();
    if (!title) return;
    newTitle.value = '';
    await createTask({ title });
    await loadTasks();
    await nextTick();
    newTaskInput.value?.focus();
};

const saveTitle = async (task: UserTask, event: Event) => {
    const value = (event.target as HTMLInputElement).value.trim();
    if (!value) {
        await deleteTask(task.id);
        await loadTasks();
        return;
    }
    if (value !== task.title) {
        await updateTask(task.id, { title: value });
        await loadTasks();
    }
};

const saveDescription = async (task: UserTask, event: Event) => {
    const value = (event.target as HTMLTextAreaElement).value.trim();
    const current = task.description || '';
    if (value !== current) {
        await updateTask(task.id, { description: value || null });
        await loadTasks();
    }
};

const toggleTask = async (task: UserTask) => {
    const status = task.status === 'completed' ? 'pending' : 'completed';
    await updateTask(task.id, { status });
    await loadTasks();
};

const handleEnter = async (index: number, event: Event) => {
    (event.target as HTMLInputElement).blur();
    await nextTick();
    newTaskInput.value?.focus();
};

const handleBackspace = async (task: UserTask, index: number, event: KeyboardEvent) => {
    const input = event.target as HTMLInputElement;
    if (input.value === '') {
        event.preventDefault();
        await deleteTask(task.id);
        await loadTasks();
        await nextTick();
        focusInput(index - 1);
    }
};

const removeTask = async (task: UserTask) => {
    await deleteTask(task.id);
    await loadTasks();
};

const clearCompleted = async () => {
    for (const task of completedTasks.value) {
        await deleteTask(task.id);
    }
    await loadTasks();
};
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(1rem);
    opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
