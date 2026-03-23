import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export type MarkerType = 'idea' | 'important' | 'review';

export interface MarkerOptions {
    HTMLAttributes: Record<string, any>;
    onMarkerClick?: (markerId: string, markerType: MarkerType) => void;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        marker: {
            setMarker: (markerId: string, markerType: MarkerType) => ReturnType;
            unsetMarker: () => ReturnType;
        };
    }
}

export const MARKER_CONFIG: Record<MarkerType, { icon: string; label: string; bg: string; border: string }> = {
    idea: {
        icon: '💡',
        label: 'Idea',
        bg: 'rgba(59, 130, 246, 0.12)',
        border: '#3B82F6',
    },
    important: {
        icon: '⚠️',
        label: 'Important',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: '#EF4444',
    },
    review: {
        icon: '🔍',
        label: 'Review',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: '#F59E0B',
    },
};

export const MarkerExtension = Mark.create<MarkerOptions>({
    name: 'marker',
    priority: 1000,

    addOptions() {
        return {
            HTMLAttributes: {},
            onMarkerClick: undefined,
        };
    },

    addAttributes() {
        return {
            markerId: {
                default: null,
                parseHTML: (element) => element.getAttribute('data-marker-id'),
                renderHTML: (attributes) => {
                    if (!attributes.markerId) return {};
                    return { 'data-marker-id': attributes.markerId };
                },
            },
            markerType: {
                default: 'idea',
                parseHTML: (element) => element.getAttribute('data-marker-type') || 'idea',
                renderHTML: (attributes) => {
                    return { 'data-marker-type': attributes.markerType || 'idea' };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-marker-id]',
                getAttrs: (element) => {
                    if (typeof element === 'string') return {};
                    return {
                        markerId: element.getAttribute('data-marker-id'),
                        markerType: element.getAttribute('data-marker-type') || 'idea',
                    };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const type = (HTMLAttributes['data-marker-type'] || 'idea') as MarkerType;
        const config = MARKER_CONFIG[type] || MARKER_CONFIG.idea;

        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: `marker-highlight marker-${type}`,
                style: `background:${config.bg};border-bottom:2px solid ${config.border};padding:1px 2px;border-radius:2px;cursor:pointer;`,
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setMarker:
                (markerId: string, markerType: MarkerType) =>
                ({ commands }) => {
                    return commands.setMark(this.name, { markerId, markerType });
                },
            unsetMarker:
                () =>
                ({ commands }) => {
                    return commands.unsetMark(this.name);
                },
        };
    },

    addKeyboardShortcuts() {
        return {
            'Mod-Alt-i': () => {
                const { from, to } = this.editor.state.selection;
                if (from === to) return false;
                return this.editor.commands.setMarker(generateMarkerId(), 'idea');
            },
            'Mod-Alt-w': () => {
                const { from, to } = this.editor.state.selection;
                if (from === to) return false;
                return this.editor.commands.setMarker(generateMarkerId(), 'important');
            },
            'Mod-Alt-r': () => {
                const { from, to } = this.editor.state.selection;
                if (from === to) return false;
                return this.editor.commands.setMarker(generateMarkerId(), 'review');
            },
        };
    },

    addProseMirrorPlugins() {
        const { onMarkerClick } = this.options;

        if (!onMarkerClick) return [];

        return [
            new Plugin({
                key: new PluginKey('marker-click'),
                props: {
                    handleClick(view, pos) {
                        const { doc } = view.state;
                        const $pos = doc.resolve(pos);
                        const markerMark = $pos.marks().find((m) => m.type.name === 'marker');

                        if (markerMark && markerMark.attrs.markerId) {
                            onMarkerClick(markerMark.attrs.markerId, markerMark.attrs.markerType);
                            return true;
                        }
                        return false;
                    },
                },
            }),
        ];
    },
});

export function generateMarkerId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default MarkerExtension;
