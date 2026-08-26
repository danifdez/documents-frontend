import { ref, nextTick, watch } from 'vue';
import type { AssistantMessageEvent } from '../types/Assistant';

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
    isActivePending: boolean;
    loadOlder(id: number): Promise<void>;
}

export interface UseChatViewOptions<TMsg extends ChatViewMessage> {
    store: ChatViewStore<TMsg>;
    /** Domain-specific event kinds (e.g. memory cards): return a value to
     *  short-circuit the shared tool-card rendering, null to fall through. */
    specialEventIcon?: (event: AssistantMessageEvent) => string | null;
    specialEventTitle?: (msg: TMsg) => string | null;
    specialEventMeta?: (event: AssistantMessageEvent) => string | null;
}

/**
 * Script core shared by AgentChat.vue and AssistantChat.vue: bubble/event-card
 * rendering and scroll bookkeeping.
 */
export function useChatView<TMsg extends ChatViewMessage>(options: UseChatViewOptions<TMsg>) {
    const { store } = options;

    const scrollContainer = ref<HTMLElement | null>(null);

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
        return '◇';
    }

    function eventTitle(msg: TMsg): string {
        const special = options.specialEventTitle?.(msg);
        if (special != null) return special;
        return msg.content;
    }

    function eventMeta(event: AssistantMessageEvent | null): string {
        if (!event) return '';
        const special = options.specialEventMeta?.(event);
        if (special != null) return special;
        return '';
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
        ],
        () => {
            scrollToBottom();
        },
        { immediate: true },
    );

    return {
        scrollContainer,
        bubbleClass,
        eventIcon,
        eventTitle,
        eventMeta,
        scrollToBottom,
        loadOlder,
    };
}
