import { describe, expect, it } from 'vitest';
import { extractMhtmlHtml } from '@/utils/mhtml';

describe('extractMhtmlHtml', () => {
    it('returns the root HTML and resolves embedded content IDs', () => {
        const source = [
            'Content-Type: multipart/related; boundary="part"; start="<root>"', '', '--part',
            'Content-Type: text/html; charset=utf-8', 'Content-ID: <root>', 'Content-Transfer-Encoding: quoted-printable', '',
            '<html><body><h1>P=C3=A1gina</h1><img src=3D"cid:image"></body></html>', '--part',
            'Content-Type: image/png', 'Content-ID: <image>', 'Content-Transfer-Encoding: base64', '', 'aW1hZ2U=', '--part--',
        ].join('\r\n');
        const html = extractMhtmlHtml(source);
        expect(html).toContain('<h1>Página</h1>');
        expect(html).toContain('src="data:image/png;base64,aW1hZ2U="');
    });

    it('uses the HTML part when Blink omits the start parameter', () => {
        const source = [
            'Content-Type: multipart/related; boundary="part"', '', '--part',
            'Content-Type: text/html', '', '<html><body>Document</body></html>', '--part',
            'Content-Type: text/css', '', 'body { color: red; }', '--part--',
        ].join('\r\n');

        expect(extractMhtmlHtml(source)).toContain('<body>Document</body>');
    });
});
