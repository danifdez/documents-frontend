import { ref, computed, nextTick, watch } from 'vue';
import type { AssistantMessageEvent } from '../types/Assistant';
import { getConfirmHandler } from '../services/assistantConfirmHandlers';
import { useChatEventApi } from '../services/chat/useChatEventApi';
import type { ChatOwnerSegment } from '../services/chat/useChatEventApi';

/** Structural core of AgentMessage / AssistantMessage the chat view needs. */
export interface ChatViewMessage {
    id: number;
    role: 'user' | 'assistant' | 'system' | 'event';
    content: string;
    event: AssistantMessageEvent | null;
}

/** Slice of the agent/assistant store the chat view consumes. */
export interface ChatViewStore<TMsg extends ChatViewMessage> {
    activeId: number | null;
    activeMessages: TMsg[];
    activeStreaming: string;
    isActivePending: boolean;
    loadOlder(id: number): Promise<void>;
    updateEventToolStatus(messageId: number, status: 'done' | 'cancelled', summary?: string): void;
}

export interface UseChatViewOptions<TMsg extends ChatViewMessage> {
    store: ChatViewStore<TMsg>;
    /** URL segment for the event-status PATCH (`agents` / `assistants`). */
    ownerSegment: ChatOwnerSegment;
    /** Human labels for tool names shown on event cards. */
    toolNameLabel: Record<string, string>;
    /** Active conversation owner — source of the id used in event-card calls. */
    activeOwner: () => { id: number } | null;
    /**
     * Execute the action behind a confirmed pending card and return the
     * summary the card should display. Only called once a confirm handler is
     * registered for `kind` and there is an active owner.
     */
    executeConfirm: (kind: string, ownerId: number, tool: any) => Promise<string>;
    /** Summary for a cancelled pending card. Defaults to 'Cancelled'. */
    cancelSummary?: (tool: any, ownerId: number) => string;
    /** Domain-specific event kinds (e.g. memory cards): return a value to
     *  short-circuit the shared tool-card rendering, null to fall through. */
    specialEventIcon?: (event: AssistantMessageEvent) => string | null;
    specialEventTitle?: (msg: TMsg) => string | null;
    specialEventMeta?: (event: AssistantMessageEvent) => string | null;
}

/**
 * Script core shared by AgentChat.vue and AssistantChat.vue: live-stream
 * cleanup, bubble/event-card rendering helpers, pending-confirmation
 * resolution and the scroll bookkeeping (auto-scroll on append, anchored
 * prepend on "load older"). Each component keeps its own template and the
 * genuinely domain-specific members, injected through the options.
 */
export function useChatView<TMsg extends ChatViewMessage>(options: UseChatViewOptions<TMsg>) {
    const { store, ownerSegment, toolNameLabel } = options;
    const chatEventApi = useChatEventApi();

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
        const special = options.specialEventIcon?.(event);
        if (special != null) return special;
        if (event.kind === 'tool_executed') return '🔍';
        return '◇';
    }

    function eventTitle(msg: TMsg): string {
        const special = options.specialEventTitle?.(msg);
        if (special != null) return special;
        const event = msg.event;
        if (event?.kind === 'tool_executed' && event.tool) {
            return event.tool.args || toolNameLabel[event.tool.name] || event.tool.name;
        }
        return msg.content;
    }

    function eventMeta(event: AssistantMessageEvent | null): string {
        if (!event) return '';
        const special = options.specialEventMeta?.(event);
        if (special != null) return special;
        if (event.kind === 'tool_executed' && event.tool) {
            const label = toolNameLabel[event.tool.name] || event.tool.name;
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

    const resolvingIds = ref<Set<number>>(new Set());

    async function confirmEvent(msg: TMsg) {
        if (msg.event?.kind !== 'tool_executed' || !msg.event.tool) return;
        const tool = msg.event.tool as any;
        const kind = tool.kind;
        const handler = getConfirmHandler(kind);
        const owner = options.activeOwner();
        if (!handler || !owner) return;
        resolvingIds.value.add(msg.id);
        try {
            const summary = await options.executeConfirm(kind, owner.id, tool);
            await chatEventApi.patchMessageEventStatus(ownerSegment, owner.id, msg.id, 'done', summary);
            store.updateEventToolStatus(msg.id, 'done', summary);
        } catch (e: any) {
            alert(e?.response?.data?.message || e?.message || 'Could not perform the action');
        } finally {
            resolvingIds.value.delete(msg.id);
        }
    }

    async function cancelEvent(msg: TMsg) {
        if (msg.event?.kind !== 'tool_executed' || !msg.event.tool) return;
        const owner = options.activeOwner();
        if (!owner) return;
        const tool = msg.event.tool as any;
        const summary = options.cancelSummary
            ? options.cancelSummary(tool, owner.id)
            : 'Cancelled';
        resolvingIds.value.add(msg.id);
        try {
            await chatEventApi.patchMessageEventStatus(ownerSegment, owner.id, msg.id, 'cancelled', summary);
            store.updateEventToolStatus(msg.id, 'cancelled', summary);
        } catch (e: any) {
            alert(e?.response?.data?.message || e?.message || 'Could not cancel');
        } finally {
            resolvingIds.value.delete(msg.id);
        }
    }

    async function scrollToBottom() {
        await nextTick();
        if (scrollContainer.value) {
            scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
        }
    }

    // Prepend older messages while keeping the viewport anchored on the same
    // message: restore scrollTop by the height delta the new rows added on top.
    async function loadOlder() {
        const id = store.activeId;
        if (id == null) return;
        const el = scrollContainer.value;
        const prevHeight = el?.scrollHeight ?? 0;
        const prevTop = el?.scrollTop ?? 0;
        await store.loadOlder(id);
        await nextTick();
        if (el) {
            el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
        }
    }

    // Auto-scroll to the bottom only on append or conversation switch — keyed on
    // the last message id (not length), so a prepend from loadOlder never yanks
    // the view down.
    watch(
        () => [
            store.activeMessages[store.activeMessages.length - 1]?.id,
            store.isActivePending,
            store.activeId,
            visibleStream.value.length,
        ],
        () => {
            scrollToBottom();
        },
        { immediate: true },
    );

    return {
        scrollContainer,
        visibleStream,
        bubbleClass,
        eventIcon,
        eventTitle,
        eventMeta,
        isRunningTool,
        isPendingConfirmation,
        resolvingIds,
        confirmEvent,
        cancelEvent,
        scrollToBottom,
        loadOlder,
    };
}
