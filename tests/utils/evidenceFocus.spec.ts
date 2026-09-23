import { describe, expect, it } from 'vitest';
import { findEvidenceFragments } from '@/utils/evidenceFocus';

describe('findEvidenceFragments', () => {
    it('finds a quote across text nodes while normalizing whitespace', () => {
        const fragments = findEvidenceFragments([
            { target: 'first', text: 'The   AI' },
            { target: 'second', text: ' Act applies.' },
        ], 'The AI Act');

        expect(fragments).toEqual([
            { target: 'first', from: 0, to: 8 },
            { target: 'second', from: 0, to: 4 },
        ]);
    });

    it('falls back to a case-insensitive literal match', () => {
        const fragments = findEvidenceFragments([
            { target: 'content', text: 'The regulation entered into force.' },
        ], 'the regulation entered into force');

        expect(fragments).toEqual([
            { target: 'content', from: 0, to: 33 },
        ]);
    });

    it('finds evidence when the rendered nodes omit a structural space', () => {
        const fragments = findEvidenceFragments([
            { target: 'one', text: 'Regulation' },
            { target: 'two', text: 'applies' },
        ], 'Regulation applies');

        expect(fragments).toEqual([
            { target: 'one', from: 0, to: 10 },
            { target: 'two', from: 0, to: 7 },
        ]);
    });

    it('does not match an empty or unrelated quote', () => {
        const segments = [{ target: 'content', text: 'Known evidence' }];

        expect(findEvidenceFragments(segments, '   ')).toEqual([]);
        expect(findEvidenceFragments(segments, 'Missing')).toEqual([]);
    });
});
