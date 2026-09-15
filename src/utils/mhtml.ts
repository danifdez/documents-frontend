interface MhtmlPart {
    headers: Record<string, string>;
    body: string;
}

function parseHeaders(source: string): Record<string, string> {
    const unfolded = source.replace(/\r?\n[ \t]+/g, ' ');
    return unfolded.split(/\r?\n/).reduce<Record<string, string>>((headers, line) => {
        const separator = line.indexOf(':');
        if (separator < 1) return headers;
        headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
        return headers;
    }, {});
}

function splitPart(source: string): MhtmlPart | null {
    const separator = source.search(/\r?\n\r?\n/);
    if (separator < 0) return null;
    const headerEnd = source[separator] === '\r' ? separator + 4 : separator + 2;
    return { headers: parseHeaders(source.slice(0, separator)), body: source.slice(headerEnd).replace(/\r?\n$/, '') };
}

function headerValue(value: string | undefined): string {
    return (value ?? '').split(';', 1)[0].trim().toLowerCase();
}

function headerParameter(value: string | undefined, name: string): string | null {
    const match = value?.match(new RegExp(`(?:^|;)\\s*${name}=(?:"([^"]+)"|([^;\\s]+))`, 'i'));
    return match ? (match[1] ?? match[2]).trim() : null;
}

function base64Bytes(source: string): Uint8Array {
    const binary = atob(source.replace(/\s/g, ''));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function quotedPrintableBytes(source: string): Uint8Array {
    const compact = source.replace(/=\r?\n/g, '');
    const bytes: number[] = [];
    for (let index = 0; index < compact.length; index += 1) {
        if (compact[index] === '=' && /^[0-9a-f]{2}$/i.test(compact.slice(index + 1, index + 3))) {
            bytes.push(parseInt(compact.slice(index + 1, index + 3), 16));
            index += 2;
        } else bytes.push(compact.charCodeAt(index));
    }
    return Uint8Array.from(bytes);
}

function contentBytes(part: MhtmlPart): Uint8Array {
    const encoding = headerValue(part.headers['content-transfer-encoding']);
    if (encoding === 'base64') return base64Bytes(part.body);
    if (encoding === 'quoted-printable') return quotedPrintableBytes(part.body);
    return new TextEncoder().encode(part.body);
}

function decodeText(part: MhtmlPart): string {
    const charset = headerParameter(part.headers['content-type'], 'charset') ?? 'utf-8';
    try { return new TextDecoder(charset).decode(contentBytes(part)); }
    catch { return new TextDecoder().decode(contentBytes(part)); }
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function normalizeReference(value: string | undefined): string | null {
    const normalized = value?.trim().replace(/^<|>$/g, '');
    return normalized || null;
}

function replaceEmbeddedResources(html: string, parts: MhtmlPart[]): string {
    const resources = new Map<string, string>();
    for (const part of parts) {
        const contentType = headerValue(part.headers['content-type']);
        if (!contentType || contentType === 'text/html') continue;
        const dataUrl = `data:${contentType};base64,${bytesToBase64(contentBytes(part))}`;
        for (const reference of [normalizeReference(part.headers['content-id']), normalizeReference(part.headers['content-location'])]) {
            if (!reference) continue;
            resources.set(reference, dataUrl);
            resources.set(`cid:${reference}`, dataUrl);
        }
    }
    return html.replace(/(?:cid:|https?:\/\/|file:\/\/)[^\s"')>]+/gi, (reference) => resources.get(reference) ?? reference);
}

export function extractMhtmlHtml(source: string): string | null {
    const root = splitPart(source);
    if (!root) return null;
    const boundary = headerParameter(root.headers['content-type'], 'boundary');
    if (!boundary) return null;
    const parts = source.split(`--${boundary}`).slice(1)
        .map((part) => part.replace(/^\r?\n/, '').replace(/\r?\n--\s*$/, ''))
        .filter((part) => part.trim() && !part.trim().startsWith('--'))
        .map(splitPart).filter((part): part is MhtmlPart => part !== null);
    const start = normalizeReference(headerParameter(root.headers['content-type'], 'start'));
    const htmlPart = (start ? parts.find((part) => start === normalizeReference(part.headers['content-id']) || start === normalizeReference(part.headers['content-location'])) : undefined)
        ?? parts.find((part) => headerValue(part.headers['content-type']) === 'text/html');
    return htmlPart ? replaceEmbeddedResources(decodeText(htmlPart), parts) : null;
}
