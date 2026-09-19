// Anclaje y reubicación de marcas de lectura y puntos de libro, portados del
// navegador (page_point_dom.cc). Un punto guarda el texto exacto, su contexto
// (prefix/suffix), una posición en el texto normalizado y el avance de scroll
// como último recurso. Con eso se vuelve a localizar aunque la maqueta cambie.

export interface ReadingPointAnchor {
  fragmentId?: string;
  exact?: string;
  prefix?: string;
  suffix?: string;
  position?: number;
  ratio?: number;
}

export interface LocatedPoint {
  top: number;
  bottom: number;
}

const BLOCK_SELECTOR =
  'p,li,h1,h2,h3,h4,h5,h6,td,th,dd,dt,blockquote,pre,figcaption,caption,div,section,article,header,footer';
const EXCLUDED_SELECTOR =
  'script,style,noscript,template,textarea,input,select,option,[data-reading-point-ui]';
const MAX_EXACT = 160;
const MAX_CONTEXT = 120;

interface MapEntry {
  node: Text;
  off: number;
}

export function normalizeText(text: string): string {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function collapsedText(raw: string): { value: string; offsets: number[] } {
  let value = '';
  const offsets: number[] = [];
  let space = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (/\s/.test(ch)) {
      if (!space && value.length > 0) {
        value += ' ';
        offsets.push(i);
        space = true;
      }
    } else {
      value += ch;
      offsets.push(i);
      space = false;
    }
  }
  return { value, offsets };
}

// Texto normalizado del contenido y mapa carácter → nodo del DOM.
export function buildTextMap(root: HTMLElement): { text: string; map: (MapEntry | null)[] } {
  const map: (MapEntry | null)[] = [];
  let text = '';
  let lastBlock: Element | null = null;

  const accept = (node: Node): number => {
    const parent = (node as Text).parentElement;
    if (!parent) return NodeFilter.FILTER_REJECT;
    if (parent.closest(EXCLUDED_SELECTOR)) return NodeFilter.FILTER_REJECT;
    if (!parent.getClientRects().length) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: accept });
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent) continue;
    const block: Element = parent.closest(BLOCK_SELECTOR) || parent;
    if (text.length > 0 && lastBlock && block !== lastBlock) {
      text += ' ';
      map.push(null);
    }
    lastBlock = block;
    const { value, offsets } = collapsedText(node.data);
    for (let i = 0; i < value.length; i++) {
      text += value[i];
      map.push({ node, off: offsets[i] });
    }
  }

  // Sin espacios finales para que el índice coincida al reubicar.
  while (text.endsWith(' ')) {
    text = text.slice(0, -1);
    map.pop();
  }
  return { text: normalizeText(text), map };
}

function occurrences(haystack: string, needle: string): number[] {
  const places: number[] = [];
  if (!needle) return places;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    places.push(at);
    at = haystack.indexOf(needle, at + 1);
  }
  return places;
}

// Busca la cita por el texto completo y, si no aparece, por sus primeros 60 o
// 30 caracteres, primero sensible a mayúsculas y luego no.
function locatePlaces(text: string, quote: string): { places: number[]; length: number } {
  if (!quote) return { places: [], length: 0 };
  const candidates = [quote];
  if (quote.length > 60) candidates.push(quote.slice(0, 60));
  if (quote.length > 30) candidates.push(quote.slice(0, 30));
  for (const candidate of candidates) {
    let places = occurrences(text, candidate);
    if (places.length === 0) places = occurrences(text.toLowerCase(), candidate.toLowerCase());
    if (places.length > 0) return { places, length: candidate.length };
  }
  return { places: [], length: 0 };
}

function rangeFromIndices(
  map: (MapEntry | null)[],
  start: number,
  length: number,
): Range | null {
  let first = start;
  let last = start + length - 1;
  while (first <= last && !map[first]) first++;
  while (last >= first && !map[last]) last--;
  if (first > last) return null;
  const from = map[first];
  const to = map[last];
  if (!from || !to) return null;
  const range = document.createRange();
  try {
    range.setStart(from.node, from.off);
    range.setEnd(to.node, to.off + 1);
  } catch {
    return null;
  }
  return range;
}

// Reubica un punto por su texto; ante citas repetidas elige la más cercana a la
// posición guardada.
export function rangeForPoint(root: HTMLElement, point: ReadingPointAnchor): Range | null {
  if (!point.exact) return null;
  const { text, map } = buildTextMap(root);
  const { places, length } = locatePlaces(text, point.exact);
  if (places.length === 0 || length === 0) return null;
  let best = places[0];
  let bestDistance = Math.abs(places[0] - (point.position ?? places[0]));
  for (const place of places) {
    const distance = Math.abs(place - (point.position ?? place));
    if (distance < bestDistance) {
      best = place;
      bestDistance = distance;
    }
  }
  return rangeFromIndices(map, best, length);
}

function ratioOf(root: HTMLElement): number {
  const scroller = scrollerFor(root);
  const max = scroller.scrollHeight - scroller.clientHeight;
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, scroller.scrollTop / max));
}

// El elemento que realmente desplaza el contenido: el propio contenedor o la
// ventana, según dónde viva el artículo.
export function scrollerFor(root: HTMLElement): HTMLElement {
  let element: HTMLElement | null = root;
  while (element && element !== document.body) {
    const style = window.getComputedStyle(element);
    if (/(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 4) {
      return element;
    }
    element = element.parentElement;
  }
  return (document.scrollingElement as HTMLElement) || document.documentElement;
}

function blockId(parent: Element, anchorTop: number): string | undefined {
  let element: Element | null = parent.closest(BLOCK_SELECTOR) || parent;
  while (element && element !== document.body) {
    const id = element.getAttribute('id');
    if (id) {
      const isHeading = /^H[1-6]$/.test(element.tagName);
      if (isHeading || element.getBoundingClientRect().top >= anchorTop - 120) {
        return id;
      }
    }
    element = element.parentElement;
  }
  return undefined;
}

function anchorFromIndex(root: HTMLElement, index: number): ReadingPointAnchor {
  const { text, map } = buildTextMap(root);
  if (map.length === 0) return { ratio: ratioOf(root) };
  const at = Math.min(Math.max(0, index), map.length - 1);
  const entry = map[at];
  const parent = entry?.node.parentElement;
  const exact = normalizeText(text.slice(at, at + MAX_EXACT));
  const prefix = normalizeText(text.slice(Math.max(0, at - MAX_CONTEXT), at));
  const suffix = normalizeText(text.slice(at + exact.length, at + exact.length + MAX_CONTEXT));
  const anchorTop = entry
    ? entry.node.parentElement?.getBoundingClientRect().top ?? 0
    : 0;
  return {
    exact,
    prefix,
    suffix,
    position: at,
    ratio: ratioOf(root),
    fragmentId: parent ? blockId(parent, anchorTop) : undefined,
  };
}

function nodeIndexAtPoint(root: HTMLElement, x: number, y: number): number | null {
  const doc = document as any;
  let range: Range | null = null;
  if (typeof doc.caretRangeFromPoint === 'function') {
    range = doc.caretRangeFromPoint(x, y) as Range | null;
  } else if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) {
      range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
    }
  }
  if (!range || !root.contains(range.startContainer)) return null;

  const { map } = buildTextMap(root);
  const container = range.startContainer;
  const offset = range.startOffset;
  let firstForNode = -1;
  let lastForNode = -1;
  for (let i = 0; i < map.length; i++) {
    const entry = map[i];
    if (entry && entry.node === container) {
      if (firstForNode === -1) firstForNode = i;
      lastForNode = i;
    }
  }
  if (firstForNode === -1) return null;
  for (let i = firstForNode; i <= lastForNode; i++) {
    const entry = map[i];
    if (entry && entry.off >= offset) return i;
  }
  return lastForNode;
}

// Ancla bajo el cursor, como el clic derecho del navegador.
export function captureAtPoint(
  root: HTMLElement,
  x: number,
  y: number,
): ReadingPointAnchor {
  const index = nodeIndexAtPoint(root, x, y);
  if (index === null) return { ...captureAtTop(root), ratio: ratioOf(root) };
  return anchorFromIndex(root, index);
}

// Ancla al primer texto visible desde arriba de la ventana: donde estamos
// leyendo cuando no hay un punto señalado.
export function captureAtTop(root: HTMLElement): ReadingPointAnchor {
  const { map } = buildTextMap(root);
  if (map.length === 0) return { ratio: ratioOf(root) };
  const readingTop = Math.max(0, root.getBoundingClientRect().top);
  for (let i = 0; i < map.length; i++) {
    const entry = map[i];
    const parent = entry?.node.parentElement;
    if (!entry || !parent) continue;
    const style = window.getComputedStyle(parent);
    if (style.position === 'fixed' || style.position === 'sticky') continue;
    const rect = parent.getBoundingClientRect();
    if (rect.bottom > readingTop && rect.top >= readingTop) {
      return anchorFromIndex(root, i);
    }
  }
  for (let i = map.length - 1; i >= 0; i--) {
    if (map[i]) return anchorFromIndex(root, i);
  }
  return { ratio: ratioOf(root) };
}

// Posición actual del punto dentro del viewport. Primero el texto, luego un
// encabezado con id y, por último, el avance de scroll.
export function locatePoint(root: HTMLElement, point: ReadingPointAnchor): LocatedPoint | null {
  const range = rangeForPoint(root, point);
  if (range) {
    const rect = range.getBoundingClientRect();
    if (rect && (rect.height > 0 || rect.width > 0)) {
      return { top: rect.top, bottom: rect.bottom };
    }
  }
  if (point.fragmentId) {
    const element = document.getElementById(point.fragmentId);
    if (element) {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    }
  }
  if (typeof point.ratio === 'number' && point.ratio > 0) {
    const scroller = scrollerFor(root);
    const max = scroller.scrollHeight - scroller.clientHeight;
    const contentOffset = point.ratio * max;
    const top = viewportTopFor(scroller, contentOffset);
    return { top, bottom: top };
  }
  return null;
}

// Desplaza la vista al punto dejando un poco de contexto por arriba, como el
// navegador, para que no quede pegado al borde ni bajo una cabecera fija.
export function scrollToPoint(root: HTMLElement, point: ReadingPointAnchor): boolean {
  const target = rangeForPoint(root, point);
  const element = target?.startContainer.parentElement;
  if (element) {
    scrollElement(root, element);
    return true;
  }
  if (point.fragmentId) {
    const anchor = document.getElementById(point.fragmentId);
    if (anchor) {
      scrollElement(root, anchor);
      return true;
    }
  }
  if (typeof point.ratio === 'number' && point.ratio > 0) {
    const scroller = scrollerFor(root);
    const max = scroller.scrollHeight - scroller.clientHeight;
    scroller.scrollTo({ top: Math.max(0, point.ratio * max - scrollMargin()), behavior: 'smooth' });
    return true;
  }
  return false;
}

function viewportTopFor(scroller: HTMLElement, contentOffset: number): number {
  const isDocument =
    scroller === document.scrollingElement || scroller === document.documentElement;
  if (isDocument) return contentOffset - (window.scrollY || scroller.scrollTop);
  return scroller.getBoundingClientRect().top + contentOffset - scroller.scrollTop;
}

function readingAreaTop(scroller: HTMLElement): number {
  const isDocument =
    scroller === document.scrollingElement || scroller === document.documentElement;
  return isDocument ? 0 : scroller.getBoundingClientRect().top;
}

function scrollMargin(): number {
  return Math.min(160, Math.max(60, Math.round(window.innerHeight * 0.2)));
}

function scrollElement(root: HTMLElement, element: HTMLElement): void {
  const scroller = scrollerFor(root);
  const delta =
    element.getBoundingClientRect().top - (readingAreaTop(scroller) + scrollMargin());
  scroller.scrollTo({ top: Math.max(0, scroller.scrollTop + delta), behavior: 'smooth' });
}
