<template>
    <div ref="scrollContainer" class="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        <div v-if="!store.activeAssistant" class="text-text-muted text-sm text-center py-12">
            Select a conversation to start.
        </div>

        <template v-else-if="store.activeMessages.length === 0">
            <div class="text-text-muted text-sm text-center py-12">
                <div class="text-2xl mb-2">{{ store.activeAssistant.icon || '◇' }}</div>
                <div class="font-medium text-text-secondary mb-1">{{ store.activeAssistant.name }}</div>
                <div class="text-xs">{{ store.activeAssistant.sub || 'Send a message to get started.' }}</div>
            </div>
        </template>

        <template v-else>
            <template v-for="msg in store.activeMessages" :key="msg.id">
                <!-- Inline event card (memory saved, tool executed, …) -->
                <div v-if="msg.role === 'event'" class="flex justify-center">
                    <div class="event-card"
                        :class="{
                            'event-card-running': isRunningTool(msg.event),
                            'event-card-pending': isPendingConfirmation(msg.event),
                        }">
                        <span class="event-icon">
                            <span v-if="isRunningTool(msg.event)" class="event-spinner"></span>
                            <template v-else>{{ eventIcon(msg.event) }}</template>
                        </span>
                        <div class="flex-1 min-w-0">
                            <div class="event-title">{{ eventTitle(msg) }}</div>
                            <div class="event-meta">{{ eventMeta(msg.event) }}</div>
                        </div>
                        <template v-if="isPendingConfirmation(msg.event)">
                            <button @click="confirmEvent(msg)"
                                class="event-action event-action-confirm"
                                :disabled="resolvingIds.has(msg.id)">
                                {{ resolvingIds.has(msg.id) ? '…' : (msg.event && (msg.event as any).tool?.confirmLabel || 'Confirm') }}
                            </button>
                            <button @click="cancelEvent(msg)"
                                class="event-action"
                                :disabled="resolvingIds.has(msg.id)">
                                {{ (msg.event && (msg.event as any).tool?.cancelLabel) || 'Cancel' }}
                            </button>
                        </template>
                        <button v-else-if="canDelete(msg.event) && !isEntityDeleted(msg.event)"
                            @click="deleteEntity(msg)"
                            class="event-action"
                            :disabled="deletingIds.has(msg.id)"
                            :title="`Delete ${entityKindLabel(msg.event)}`">
                            {{ deletingIds.has(msg.id) ? '…' : 'Delete' }}
                        </button>
                        <span v-else-if="isEntityDeleted(msg.event)" class="event-deleted">
                            Deleted
                        </span>
                    </div>
                </div>

                <!-- Regular chat bubble -->
                <div v-else class="flex"
                    :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                    <div :class="bubbleClass(msg.role)">
                        <div v-if="msg.error"
                            class="text-xs text-red-600 dark:text-red-400 mb-1 italic">⚠ {{ msg.error }}</div>
                        <!-- User messages are plain text; assistant replies may be markdown. -->
                        <MarkdownContent v-if="msg.role === 'assistant'" :text="msg.content" />
                        <div v-else class="whitespace-pre-wrap break-words text-sm leading-relaxed">{{ msg.content }}</div>
                    </div>
                </div>
            </template>

            <div v-if="store.isActivePending" class="flex justify-start">
                <div :class="bubbleClass('assistant')">
                    <div v-if="visibleStream" class="streaming-bubble">
                        <MarkdownContent :text="visibleStream" />
                        <span v-if="!store.activeStreamDone" class="stream-caret">▋</span>
                    </div>
                    <div v-else class="flex items-center gap-1.5 text-text-muted text-sm">
                        <span class="typing-dot"></span>
                        <span class="typing-dot" style="animation-delay: 0.15s"></span>
                        <span class="typing-dot" style="animation-delay: 0.3s"></span>
                        <span class="ml-1 text-xs">Thinking…</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { useAssistantStore } from '../../store/assistantStore';
import type { AssistantMessage, AssistantMessageEvent } from '../../types/Assistant';
import { MEMORY_TYPE_LABEL } from '../../types/AssistantMemory';
import MarkdownContent from './MarkdownContent.vue';
import apiClient from '../../services/api';
import { getConfirmHandler } from '../../services/assistantConfirmHandlers';

const store = useAssistantStore();
const scrollContainer = ref<HTMLElement | null>(null);

// Strip Qwen3 thinking blocks from the live stream the same way the worker
// does for the final reply, so the user never sees raw <think>…</think>
// internals if thinking is ever enabled. Also drops an unclosed leading
// <think> tag (mid-stream, the closing tag may not have arrived yet).
const THINK_BLOCK_RE = /<think>[\s\S]*?<\/think>/gi;
const UNCLOSED_THINK_RE = /<think>[\s\S]*/i;
const visibleStream = computed(() => {
    const raw = store.activeStreaming;
    if (!raw) return '';
    let cleaned = raw.replace(THINK_BLOCK_RE, '');
    // Mid-stream the closing </think> may not have arrived yet. Always drop
    // everything from an unclosed <think> tag — never show it as text.
    if (/<think>/i.test(cleaned)) {
        cleaned = cleaned.replace(UNCLOSED_THINK_RE, '');
    }
    return cleaned.trimStart();
});

function bubbleClass(role: 'user' | 'assistant' | 'system' | 'event'): string {
    if (role === 'user') {
        return 'max-w-[80%] rounded-2xl rounded-tr-md px-4 py-2.5 bg-accent text-white';
    }
    return 'max-w-[80%] rounded-2xl rounded-tl-md px-4 py-2.5 bg-surface-elevated border border-border-light text-text-primary';
}

function eventIcon(event: AssistantMessageEvent | null): string {
    if (!event) return '·';
    switch (event.kind) {
        case 'memory_saved':
            return '🧠';
        case 'memory_forgotten':
            return '🗑️';
        case 'tool_executed':
            return '🔍';
        default:
            return '◇';
    }
}

const TOOL_NAME_LABEL: Record<string, string> = {
    search_workspace: 'Workspace search',
    update_task: 'Update task',
    delete_task: 'Delete task',
};

function eventTitle(msg: AssistantMessage): string {
    const event = msg.event;
    if ((event?.kind === 'memory_saved' || event?.kind === 'memory_forgotten') && event.entry) {
        return event.entry.name;
    }
    if (event?.kind === 'tool_executed' && event.tool) {
        return event.tool.args || TOOL_NAME_LABEL[event.tool.name] || event.tool.name;
    }
    return msg.content;
}

function eventMeta(event: AssistantMessageEvent | null): string {
    if (!event) return '';
    if (event.kind === 'memory_saved' && event.entry) {
        const type = MEMORY_TYPE_LABEL[event.entry.type as keyof typeof MEMORY_TYPE_LABEL] || event.entry.type;
        return `Memory saved · ${type}`;
    }
    if (event.kind === 'memory_forgotten' && event.entry) {
        const type = MEMORY_TYPE_LABEL[event.entry.type as keyof typeof MEMORY_TYPE_LABEL] || event.entry.type;
        return `Memory forgotten · ${type}`;
    }
    if (event.kind === 'tool_executed' && event.tool) {
        const label = TOOL_NAME_LABEL[event.tool.name] || event.tool.name;
        if (event.tool.status === 'running') return `${label} · in progress…`;
        if (event.tool.status === 'pending_confirmation') return `${label} · waiting for your confirmation`;
        if (event.tool.status === 'cancelled') return `${label} · cancelled`;
        return event.tool.summary ? `${label} · ${event.tool.summary}` : label;
    }
    return '';
}

function isRunningTool(event: AssistantMessageEvent | null): boolean {
    return !!(event && event.kind === 'tool_executed' && event.tool?.status === 'running');
}

function isPendingConfirmation(event: AssistantMessageEvent | null): boolean {
    return !!(event && event.kind === 'tool_executed' && event.tool?.status === 'pending_confirmation');
}

function canDelete(event: AssistantMessageEvent | null): boolean {
    return !!(event && event.kind === 'tool_executed' && event.tool?.entity?.kind && event.tool.status !== 'running');
}

function isEntityDeleted(event: AssistantMessageEvent | null): boolean {
    return !!(event && event.kind === 'tool_executed' && event.tool?.entity?.deleted);
}

function entityKindLabel(event: AssistantMessageEvent | null): string {
    if (event?.kind !== 'tool_executed' || !event.tool?.entity) return '';
    return event.tool.entity.kind === 'note' ? 'note' : 'task';
}

const deletingIds = ref<Set<number>>(new Set());
const resolvingIds = ref<Set<number>>(new Set());

async function confirmEvent(msg: AssistantMessage) {
    if (msg.event?.kind !== 'tool_executed' || !msg.event.tool) return;
    const tool = msg.event.tool as any;
    const kind = tool.kind;
    const handler = getConfirmHandler(kind);
    if (!handler || !store.activeAssistant) return;
    resolvingIds.value.add(msg.id);
    try {
        const summary = await handler.execute({
            assistantId: store.activeAssistant.id,
            payload: tool.payload || {},
        });
        await apiClient.patch(
            `/assistants/${store.activeAssistant.id}/messages/${msg.id}/event-status`,
            { status: 'done', summary },
        );
        store.updateEventToolStatus(msg.id, 'done', summary);
    } catch (e: any) {
        alert(e?.response?.data?.message || e?.message || 'Could not perform the action');
    } finally {
        resolvingIds.value.delete(msg.id);
    }
}

async function cancelEvent(msg: AssistantMessage) {
    if (msg.event?.kind !== 'tool_executed' || !msg.event.tool || !store.activeAssistant) return;
    const tool = msg.event.tool as any;
    const handler = getConfirmHandler(tool.kind);
    const summary = handler?.cancelSummary
        ? handler.cancelSummary({ assistantId: store.activeAssistant.id, payload: tool.payload || {} })
        : 'Cancelled';
    resolvingIds.value.add(msg.id);
    try {
        await apiClient.patch(
            `/assistants/${store.activeAssistant.id}/messages/${msg.id}/event-status`,
            { status: 'cancelled', summary },
        );
        store.updateEventToolStatus(msg.id, 'cancelled', summary);
    } catch (e: any) {
        alert(e?.response?.data?.message || e?.message || 'Could not cancel');
    } finally {
        resolvingIds.value.delete(msg.id);
    }
}

async function deleteEntity(msg: AssistantMessage) {
    if (msg.event?.kind !== 'tool_executed' || !msg.event.tool?.entity) return;
    const entity = msg.event.tool.entity;
    if (entity.deleted) return;
    const path = entity.kind === 'note' ? `/notes/${entity.id}` : `/user-tasks/${entity.id}`;
    deletingIds.value.add(msg.id);
    try {
        await apiClient.delete(path);
        store.markEventEntityDeleted(msg.id);
    } catch (e: any) {
        alert(e?.response?.data?.message || e?.message || `Could not delete the ${entityKindLabel(msg.event)}`);
    } finally {
        deletingIds.value.delete(msg.id);
    }
}

async function scrollToBottom() {
    await nextTick();
    if (scrollContainer.value) {
        scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
}

watch(
    () => [store.activeMessages.length, store.isActivePending, store.activeId, visibleStream.value.length],
    () => {
        scrollToBottom();
    },
    { immediate: true },
);
</script>

<style scoped>
.typing-dot {
    width: 6px;
    height: 6px;
    background: currentColor;
    border-radius: 9999px;
    display: inline-block;
    opacity: 0.5;
    animation: typing-bounce 1s infinite ease-in-out;
}

@keyframes typing-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
    40% { transform: translateY(-3px); opacity: 1; }
}

.streaming-bubble {
    display: block;
}

.stream-caret {
    display: inline-block;
    margin-left: 1px;
    color: var(--color-accent);
    animation: stream-caret-blink 1s steps(2) infinite;
}

@keyframes stream-caret-blink {
    0%, 50% { opacity: 1; }
    50.01%, 100% { opacity: 0; }
}

.event-card {
    max-width: 80%;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.625rem;
    background-color: var(--color-surface);
    border: 1px dashed var(--color-border);
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    line-height: 1.3;
}

.event-card-running {
    border-style: solid;
    border-color: var(--color-accent);
    background-color: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
}

.event-card-pending {
    border-style: solid;
    border-color: rgb(217 119 6);
    background-color: color-mix(in srgb, rgb(217 119 6) 8%, var(--color-surface));
}

.event-action-confirm {
    color: rgb(220 38 38);
    border-color: rgb(220 38 38);
}
.event-action-confirm:hover:not(:disabled) {
    background-color: color-mix(in srgb, rgb(220 38 38) 12%, transparent);
}

.event-action {
    flex-shrink: 0;
    font-size: 0.6875rem;
    padding: 0.15rem 0.5rem;
    border-radius: 0.375rem;
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid var(--color-border);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background-color 0.15s;
}
.event-action:hover:not(:disabled) {
    color: rgb(220 38 38);
    border-color: rgb(220 38 38);
    background-color: color-mix(in srgb, rgb(220 38 38) 8%, transparent);
}
.event-action:disabled { opacity: 0.5; cursor: wait; }

.event-deleted {
    flex-shrink: 0;
    font-size: 0.6875rem;
    color: var(--color-text-muted);
    font-style: italic;
}

.event-spinner {
    display: inline-block;
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.event-icon {
    font-size: 1rem;
    line-height: 1;
    flex-shrink: 0;
}

.event-title {
    font-weight: 600;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.event-meta {
    color: var(--color-text-muted);
    font-size: 0.6875rem;
}
</style>
