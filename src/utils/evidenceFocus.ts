export type EvidenceSegment<T> = {
    target: T;
    text: string;
};

export type EvidenceFragment<T> = {
    target: T;
    from: number;
    to: number;
};

type CharacterRef<T> = {
    target: T;
    offset: number;
};

const normalizeEvidence = (text: string) => text.replace(/\s+/g, ' ').trim();

const locate = <T>(
    segments: EvidenceSegment<T>[],
    needle: string,
    keepWhitespace: boolean,
): EvidenceFragment<T>[] => {
    const characters: string[] = [];
    const references: Array<CharacterRef<T> | null> = [];
    let previousWasWhitespace = false;

    for (const segment of segments) {
        for (let offset = 0; offset < segment.text.length; offset++) {
            const character = segment.text[offset];
            if (/\s/.test(character)) {
                if (keepWhitespace && !previousWasWhitespace) {
                    characters.push(' ');
                    references.push({ target: segment.target, offset });
                }
                previousWasWhitespace = true;
                continue;
            }
            characters.push(character);
            references.push({ target: segment.target, offset });
            previousWasWhitespace = false;
        }
    }

    const haystack = characters.join('');
    let start = haystack.indexOf(needle);
    if (start < 0) {
        start = haystack.toLowerCase().indexOf(needle.toLowerCase());
    }
    if (start < 0) {
        return [];
    }

    const fragments: EvidenceFragment<T>[] = [];
    for (let index = start; index < start + needle.length; index++) {
        const reference = references[index];
        if (!reference) {
            continue;
        }
        const previous = fragments[fragments.length - 1];
        if (previous && previous.target === reference.target &&
            previous.to <= reference.offset) {
            previous.to = reference.offset + 1;
            continue;
        }
        fragments.push({
            target: reference.target,
            from: reference.offset,
            to: reference.offset + 1,
        });
    }
    return fragments;
};

export const findEvidenceFragments = <T>(
    segments: EvidenceSegment<T>[],
    quote: string,
): EvidenceFragment<T>[] => {
    const needle = normalizeEvidence(quote);
    if (!needle) {
        return [];
    }
    const spaced = locate(segments, needle, true);
    if (spaced.length) {
        return spaced;
    }
    return locate(segments, needle.replace(/\s/g, ''), false);
};
