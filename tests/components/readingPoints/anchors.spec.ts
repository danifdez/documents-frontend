import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildTextMap, captureAtPoint, captureAtTop, locatePoint, normalizeText, rangeForPoint, scrollerFor, scrollToPoint,
} from '@/components/readingPoints/useReadingPointAnchors';

function rect(top: number, height = 24) {
  return new DOMRect(0, top, 320, height);
}

function setGeometry(element: Element, top: number) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect(top));
  vi.spyOn(element, 'getClientRects').mockReturnValue([rect(top)] as unknown as DOMRectList);
}

function setScrolling(element: HTMLElement, scrollHeight: number, clientHeight: number, scrollTop: number) {
  for (const [key, value] of Object.entries({ scrollHeight, clientHeight })) {
    Object.defineProperty(element, key, { value, configurable: true });
  }
  element.scrollTop = scrollTop;
  return vi.spyOn(element, 'scrollTo').mockImplementation(() => {});
}

let container: HTMLElement;
let root: HTMLElement;
let caretRange: ReturnType<typeof vi.fn>;
let caretPosition: ReturnType<typeof vi.fn>;
let caretDescriptors: [PropertyDescriptor | undefined, PropertyDescriptor | undefined];

function article(html: string) {
  root.innerHTML = html;
  [...root.querySelectorAll('*')].forEach((element, index) => setGeometry(element, 122 + 35 * index));
}

function placeCaret(selector: string, offset: number) {
  const node = root.querySelector(selector)!.firstChild!;
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  caretRange.mockReturnValue(range);
  return node;
}

beforeEach(() => {
  container = document.createElement('main');
  container.style.overflowY = 'auto';
  root = document.createElement('article');
  container.append(root);
  document.body.append(container);
  setGeometry(container, 40);
  setGeometry(root, 50);
  caretRange = vi.fn().mockReturnValue(null);
  caretPosition = vi.fn().mockReturnValue(null);
  caretDescriptors = [
    Object.getOwnPropertyDescriptor(document, 'caretRangeFromPoint'),
    Object.getOwnPropertyDescriptor(document, 'caretPositionFromPoint'),
  ];
  Object.defineProperty(document, 'caretRangeFromPoint', { value: caretRange, configurable: true });
  Object.defineProperty(document, 'caretPositionFromPoint', { value: caretPosition, configurable: true });
});

afterEach(() => {
  container.remove();
  const keys = ['caretRangeFromPoint', 'caretPositionFromPoint'] as const;
  keys.forEach((key, i) => {
    const descriptor = caretDescriptors[i];
    if (descriptor) Object.defineProperty(document, key, descriptor);
    else Reflect.deleteProperty(document, key);
  });
  vi.restoreAllMocks();
});

describe('reading point anchors', () => {
  it('normalizes visible text and retains the original DOM character offsets', () => {
    article('<p>  First\tline</p><p>\nNext <script>ignore()</script><span data-reading-point-ui>Controls</span></p><p hidden>Hidden</p>');
    vi.mocked(root.querySelector('[hidden]')!.getClientRects).mockReturnValue([] as unknown as DOMRectList);
    const { text, map } = buildTextMap(root);
    expect(normalizeText('\t A \n B ')).toBe('A B');
    expect(text).toBe('First line Next');
    expect(map[0]).toEqual({ node: root.querySelector('p')!.firstChild, off: 2 });
    expect(map[text.indexOf('Next') - 1]).toBeNull();
    expect(map[text.indexOf('Next')]).toMatchObject({ off: 1 });
    expect(map).toHaveLength(text.length);
  });

  it('uses the saved position to distinguish repeated quotes across blocks', () => {
    article('<p id="first">Old inventory shelf</p><p id="second">Revised inventory shelf</p>');
    const result = rangeForPoint(root, { exact: 'inventory shelf', position: 29 });
    expect(result?.startContainer.parentElement?.id).toBe('second');
    expect(result?.toString()).toBe('inventory shelf');
    expect(rangeForPoint(root, { exact: 'inventory shelf' })?.startContainer.parentElement?.id).toBe('first');
    expect(rangeForPoint(root, { ratio: 0.2 })).toBeNull();
  });

  it('can restore a quote after case changes and after edits to its ending', () => {
    const prefix = 'The catalog lists maps dated 1871 through 1899 with sources.';
    article(`<p>${prefix.toUpperCase()} Revised later.</p>`);
    const shorter = rangeForPoint(root, { exact: `${prefix.slice(0, 30)} Edited ending that no longer appears in the inventory at all` });
    expect(shorter?.toString()).toBe(prefix.slice(0, 30).toUpperCase());
    const long = prefix + ' Maps.';
    article(`<p>${long} Revised afterward.</p>`);
    expect(rangeForPoint(root, { exact: `${long} Original ending.` })?.toString()).toBe(long.slice(0, 60));
    expect(rangeForPoint(root, { exact: 'This quote does not appear' })).toBeNull();
  });

  it('records the quote, preceding text, scroll ratio and nearest fragment from a caret', () => {
    article('<h2>Catalogue</h2><p id="shipment">Work began at noon.</p>');
    setScrolling(container, 500, 100, 150);
    placeCaret('#shipment', 5);
    const anchor = captureAtPoint(root, 201, 160);
    expect(caretRange).toHaveBeenCalledWith(201, 160);
    expect(anchor).toEqual({
      exact: 'began at noon.', prefix: 'Catalogue Work', suffix: '',
      position: 15, ratio: 0.375, fragmentId: 'shipment',
    });
  });

  it('uses caret position when the range API is unavailable and clamps end-of-node offsets', () => {
    article('<p id="last">Letters</p>');
    Object.defineProperty(document, 'caretRangeFromPoint', { value: undefined, configurable: true });
    caretPosition.mockReturnValue({ offsetNode: root.querySelector('p')!.firstChild, offset: 7 });
    expect(captureAtPoint(root, 2, 3)).toMatchObject({ exact: 's', position: 6, fragmentId: 'last' });
    expect(caretPosition).toHaveBeenCalledWith(2, 3);
  });

  it('falls back to the first visible non-sticky block for a caret outside the content', () => {
    article('<h2 style="position:sticky">Stuck header</h2><p id="current">The reading position</p>');
    const external = document.createRange();
    external.setStart(document.body, 0);
    caretRange.mockReturnValue(external);
    setScrolling(container, 500, 100, 510);
    expect(captureAtPoint(root, 0, 0)).toMatchObject({ exact: 'The reading position', fragmentId: 'current', ratio: 1 });
  });

  it('uses the final text character when all text is above the reading area, and ratio only on empty content', () => {
    article('<p id="previous">Earlier material</p>');
    vi.mocked(root.querySelector('p')!.getBoundingClientRect).mockReturnValue(rect(-40));
    expect(captureAtTop(root)).toMatchObject({ exact: 'l', fragmentId: 'previous', ratio: 0 });
    article('');
    setScrolling(container, 420, 120, 75);
    expect(captureAtTop(root)).toEqual({ ratio: 0.25 });
  });

  it('prefers quote geometry, then a fragment location, then the scroll ratio', () => {
    article('<h2 id="heading">Reference List</h2><p>Reference letters</p>');
    setScrolling(container, 500, 100, 100);
    const range = vi.spyOn(Range.prototype, 'getBoundingClientRect').mockReturnValue(rect(180, 32));
    expect(locatePoint(root, { exact: 'Reference letters', fragmentId: 'heading', ratio: 0.5 })).toEqual({ top: 180, bottom: 212 });
    range.mockReturnValue(new DOMRect());
    expect(locatePoint(root, { exact: 'Reference letters', fragmentId: 'heading', ratio: 0.5 })).toEqual({ top: 122, bottom: 146 });
    expect(locatePoint(root, { fragmentId: 'missing', ratio: 0.5 })).toEqual({ top: 140, bottom: 140 });
    expect(locatePoint(root, { fragmentId: 'missing', ratio: 0 })).toBeNull();
  });

  it('scrolls the nearest scrollable ancestor and leaves reading context above the anchor', () => {
    article('<h2 id="heading">Reference List</h2><p>Reference letters</p>');
    const scroll = setScrolling(container, 850, 350, 150);
    const margin = Math.min(160, Math.max(60, Math.round(window.innerHeight * 0.2)));
    expect(scrollerFor(root)).toBe(container);
    expect(scrollToPoint(root, { exact: 'Reference letters', fragmentId: 'heading' })).toBe(true);
    expect(scroll).toHaveBeenLastCalledWith({ behavior: 'smooth', top: 150 + 157 - 40 - margin });
    expect(scrollToPoint(root, { exact: 'Missing quote', fragmentId: 'heading' })).toBe(true);
    expect(scroll).toHaveBeenLastCalledWith({ behavior: 'smooth', top: 150 + 122 - 40 - margin });
    expect(scrollToPoint(root, { ratio: 0.02 })).toBe(true);
    expect(scroll).toHaveBeenLastCalledWith({ behavior: 'smooth', top: 0 });
    expect(scrollToPoint(root, { fragmentId: 'missing' })).toBe(false);
  });

  it('ignores overflow containers without meaningful scroll and uses the document viewport', () => {
    setScrolling(container, 103, 100, 0);
    const scroller = (document.scrollingElement || document.documentElement) as HTMLElement;
    const sizes = ['scrollHeight', 'clientHeight'] as const;
    const descriptors = sizes.map((key) => Object.getOwnPropertyDescriptor(scroller, key));
    setScrolling(scroller, 1100, 300, 10);
    try {
      expect(scrollerFor(root)).toBe(scroller);
      expect(locatePoint(root, { ratio: 0.5 })).toEqual({ top: 390, bottom: 390 });
    } finally {
      scroller.scrollTop = 0;
      sizes.forEach((key, i) => {
        const descriptor = descriptors[i];
        if (descriptor) Object.defineProperty(scroller, key, descriptor);
        else Reflect.deleteProperty(scroller, key);
      });
    }
  });
});
