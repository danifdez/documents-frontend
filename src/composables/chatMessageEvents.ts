import type { AssistantMessageEvent } from '../types/Assistant';

// Structural core shared by AssistantMessage and AgentMessage —
// AgentMessage already reuses AssistantMessageEvent for `event`.
export interface ChatEventMessage {
    id: number;
    role: 'user' | 'assistant' | 'system' | 'event';
    event: AssistantMessageEvent | null;
}

export const FOLDER_MUTATING_TOOLS = new Set([
    'folder_write',
    'folder_delete',
    'folder_overwrite',
]);

/**
 * Force any tool card still marked `running` to `done`. Used both as
 * defensive cleanup when the final reply arrives (the model can't still
 * be searching) and to sanitize persisted messages on conversation load
 * (a card persisted as `running` is necessarily stale).
 */
export function coerceRunningToolsToDone<M extends ChatEventMessage>(
    msgs: M[],
): { messages: M[]; mutated: boolean } {
    let mutated = false;
    const messages = msgs.map((m) => {
        if (m.role === 'event' && m.event?.kind === 'tool_executed'
            && m.event.tool?.status === 'running') {
            mutated = true;
            return {
                ...m,
                event: {
                    ...m.event,
                    tool: { ...m.event.tool, status: 'done' as const },
                },
            } as M;
        }
        return m;
    });
    return { messages, mutated };
}

/**
 * Merge an incoming tool-event message into the chat: update in place on
 * id match (`running` → `done` transitions on the same id), otherwise
 * replace an earlier `running` card. Match on the tool NAME only (not
 * args) — assumes one tool runs at a time per turn (sequential
 * MAX_TOOL_ROUNDS model). Args match was too strict: tiny
 * encoding/whitespace differences left orphan spinners.
 */
export function mergeToolEventMessage<M extends ChatEventMessage>(arr: M[], incoming: M): M[] {
    const existingIdx = arr.findIndex((m) => m.id === incoming.id);
    if (existingIdx >= 0) {
        const next = [...arr];
        next[existingIdx] = incoming;
        return next;
    }
    const incomingTool = incoming.event?.kind === 'tool_executed' ? incoming.event.tool : undefined;
    const runningIdx = arr.findIndex((m) =>
        m.role === 'event'
        && m.event?.kind === 'tool_executed'
        && m.event.tool?.name === incomingTool?.name
        && m.event.tool?.status === 'running',
    );
    if (runningIdx >= 0 && incomingTool?.status === 'done') {
        const next = [...arr];
        next[runningIdx] = incoming;
        return next;
    }
    return [...arr, incoming];
}

/** Rebuild a tool_executed message with a new status (and optional summary). */
export function withToolStatus<M extends ChatEventMessage>(
    msg: M,
    status: 'done' | 'cancelled',
    summary?: string,
): M {
    if (msg.event?.kind !== 'tool_executed' || !msg.event.tool) return msg;
    return {
        ...msg,
        event: {
            ...msg.event,
            tool: {
                ...msg.event.tool,
                status,
                summary: summary ?? msg.event.tool.summary,
            },
        },
    } as M;
}

/** Rebuild a tool_executed message flagging its attached entity as deleted. */
export function withEntityDeleted<M extends ChatEventMessage>(msg: M): M {
    if (msg.event?.kind !== 'tool_executed' || !msg.event.tool?.entity) return msg;
    return {
        ...msg,
        event: {
            ...msg.event,
            tool: {
                ...msg.event.tool,
                entity: { ...msg.event.tool.entity, deleted: true },
            },
        },
    } as M;
}
