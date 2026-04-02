/**
 * Builds a JavaScript string to be injected into the webview that segments
 * the page into semantic blocks (paragraphs, sections, headings, etc.)
 * and returns a JSON array describing each block.
 */
export function buildSegmentationScript(): string {
  return `
(function() {
  try {
    // Find the main content area
    const root = document.querySelector('main, article, [role="main"]') || document.body;

    // Block-level selectors ordered by specificity
    const blockSelectors = 'p, blockquote, li, td, figcaption, h1, h2, h3, h4, h5, h6, pre';
    const candidates = root.querySelectorAll(blockSelectors);

    // Selectors for elements we should skip
    const skipSelectors = [
      'nav', 'header', 'footer', 'aside',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '.nav', '.navbar', '.header', '.footer', '.sidebar', '.menu',
      '.cookie', '.banner', '.ad', '.ads', '.advertisement',
      '.popup', '.modal', '.overlay', '.toast',
      '#cookie', '#nav', '#header', '#footer', '#sidebar', '#menu'
    ].join(',');

    const blocks = [];
    let blockIndex = 0;

    for (const el of candidates) {
      if (blockIndex >= 30) break;

      // Skip elements inside nav/header/footer/etc
      if (el.closest(skipSelectors)) continue;

      // Skip hidden elements
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      const text = el.innerText?.trim();
      if (!text || text.length < 30) continue;

      const blockId = 'doc-aug-block-' + blockIndex;
      el.setAttribute('data-block-id', blockId);

      const rect = el.getBoundingClientRect();
      blocks.push({
        blockId: blockId,
        text: text.slice(0, 500),
        tagName: el.tagName.toLowerCase(),
        rect: {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        }
      });

      blockIndex++;
    }

    return JSON.stringify(blocks);
  } catch(e) {
    return JSON.stringify([]);
  }
})()
`;
}
