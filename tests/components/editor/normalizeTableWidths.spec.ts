import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { normalizeTableWidths } from '../../../src/components/editor/utils/normalizeTableWidths';

const PASTED_TABLE = `
    <table style="width: 330px; border: 1px solid red">
        <colgroup><col width="120"><col width="80"></colgroup>
        <tbody>
            <tr><th width="120" style="text-align: center">A</th><th colwidth="80">B</th></tr>
            <tr><td width="120">1</td><td width="80">2</td></tr>
        </tbody>
    </table>`;

describe('normalizeTableWidths', () => {
    const editors: Editor[] = [];

    afterEach(() => {
        editors.forEach((editor) => editor.destroy());
        editors.length = 0;
    });

    const buildEditor = (content: string) => {
        const element = document.createElement('div');
        document.body.appendChild(element);
        const editor = new Editor({
            element,
            extensions: [
                StarterKit,
                Table.configure({ resizable: true, HTMLAttributes: { class: 'w-full' } }),
                TableRow,
                TableHeader,
                TableCell,
            ],
            content,
        });
        editors.push(editor);
        return editor;
    };

    it('strips column widths from cells, columns and the table while keeping other styles', () => {
        const normalized = normalizeTableWidths(PASTED_TABLE);

        expect(normalized).not.toContain('colwidth');
        expect(normalized).not.toContain('width="120"');
        expect(normalized).not.toContain('width: 330px');
        expect(normalized).not.toContain('width:');
        expect(normalized).toContain('border: 1px solid red');
        expect(normalized).toContain('text-align: center');
    });

    it('returns non-table HTML untouched', () => {
        const html = '<p style="width: 100px">Hello</p>';
        expect(normalizeTableWidths(html)).toBe(html);
    });

    it('produces a full-width table with no inline pixel width when parsed by the editor', () => {
        const html = buildEditor(normalizeTableWidths(PASTED_TABLE)).getHTML();

        expect(html).not.toMatch(/<table[^>]*style="width:/);
        expect(html).toContain('min-width');
    });
});
