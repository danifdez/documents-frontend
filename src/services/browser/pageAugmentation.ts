export interface EntityMatch {
  id: number;
  name: string;
  type: string;
  description: string | null;
  matchedTerms: string[];
}

export interface BlockResult {
  blockId: string;
  results: {
    id: number;
    name: string;
    collection: string;
    highlightedContent?: string;
    score: number;
  }[];
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  Person: '#6366f1',
  Organization: '#0891b2',
  Location: '#d97706',
  Event: '#e11d48',
  default: '#8b5cf6',
};

function getEntityColor(type: string): string {
  return ENTITY_TYPE_COLORS[type] || ENTITY_TYPE_COLORS.default;
}

/**
 * Builds a JS script to inject into the webview that highlights entity names
 * in the page text with subtle underlines and hover tooltips.
 */
export function buildEntityHighlightScript(matches: EntityMatch[]): string {
  if (matches.length === 0) return '';

  const matchesJson = JSON.stringify(matches.map(m => ({
    id: m.id,
    name: m.name,
    type: m.type,
    description: m.description?.slice(0, 200) || '',
    matchedTerms: m.matchedTerms,
    color: getEntityColor(m.type),
  })));

  return `
(function() {
  try {
    // Cleanup previous augmentation
    if (window.__documentsAugmentCleanup) window.__documentsAugmentCleanup();

    const matches = ${matchesJson};
    if (!matches.length) return 0;

    // Inject styles
    const style = document.createElement('style');
    style.setAttribute('data-documents-augment', 'styles');
    style.textContent = \`
      [data-documents-augment] {
        border-bottom: 2px solid var(--doc-aug-color, #8b5cf6);
        cursor: pointer;
        transition: background-color 0.15s ease;
      }
      [data-documents-augment]:hover {
        background-color: color-mix(in srgb, var(--doc-aug-color, #8b5cf6) 15%, transparent);
      }
      #doc-aug-tooltip {
        position: fixed;
        z-index: 2147483647;
        background: #1a1a2e;
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 10px 14px;
        max-width: 320px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        pointer-events: auto;
        display: none;
      }
      #doc-aug-tooltip .doc-aug-type {
        display: inline-block;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 2px 6px;
        border-radius: 4px;
        margin-bottom: 6px;
      }
      #doc-aug-tooltip .doc-aug-name {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
        color: #fff;
      }
      #doc-aug-tooltip .doc-aug-desc {
        color: #aaa;
        font-size: 12px;
        margin-bottom: 8px;
      }
      #doc-aug-tooltip .doc-aug-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #818cf8;
        font-size: 12px;
        text-decoration: none;
        cursor: pointer;
      }
      #doc-aug-tooltip .doc-aug-link:hover {
        text-decoration: underline;
      }
    \`;
    document.head.appendChild(style);

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.id = 'doc-aug-tooltip';
    tooltip.setAttribute('data-documents-augment', 'tooltip');
    document.body.appendChild(tooltip);

    // Build a map for quick lookup: term -> entity
    const termMap = new Map();
    for (const m of matches) {
      for (const term of m.matchedTerms) {
        termMap.set(term.toLowerCase(), m);
      }
    }

    // Build regex from all matched terms, longest first to avoid partial matches
    const allTerms = [];
    for (const m of matches) {
      for (const t of m.matchedTerms) allTerms.push(t);
    }
    allTerms.sort((a, b) => b.length - a.length);
    const escaped = allTerms.map(t => t.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'));
    const regex = new RegExp('\\\\b(' + escaped.join('|') + ')\\\\b', 'gi');

    // Walk text nodes and wrap matches
    const root = document.querySelector('main, article, [role="main"]') || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    let nodeCount = 0;
    while (walker.nextNode() && nodeCount < 10000) {
      const node = walker.currentNode;
      // Skip script/style/already-augmented content
      const parent = node.parentElement;
      if (!parent) continue;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA' || tag === 'INPUT') continue;
      if (parent.hasAttribute('data-documents-augment')) continue;
      if (node.textContent && regex.test(node.textContent)) {
        textNodes.push(node);
      }
      regex.lastIndex = 0;
      nodeCount++;
    }

    let highlightCount = 0;
    for (const node of textNodes) {
      const text = node.textContent;
      if (!text) continue;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      regex.lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }

        // Create highlighted span
        const entity = termMap.get(match[1].toLowerCase());
        if (entity) {
          const span = document.createElement('span');
          span.setAttribute('data-documents-augment', 'entity');
          span.setAttribute('data-entity-id', String(entity.id));
          span.setAttribute('data-entity-type', entity.type);
          span.style.setProperty('--doc-aug-color', entity.color);
          span.textContent = match[0];
          fragment.appendChild(span);
          highlightCount++;
        } else {
          fragment.appendChild(document.createTextNode(match[0]));
        }

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      if (fragment.childNodes.length > 0) {
        node.parentNode.replaceChild(fragment, node);
      }
    }

    // Tooltip interaction
    let hideTimeout;
    const showTooltip = (el) => {
      clearTimeout(hideTimeout);
      const entityId = el.getAttribute('data-entity-id');
      const entity = matches.find(m => String(m.id) === entityId);
      if (!entity) return;

      tooltip.innerHTML = \`
        <div class="doc-aug-type" style="background: \${entity.color}22; color: \${entity.color}">\${entity.type}</div>
        <div class="doc-aug-name">\${entity.name}</div>
        \${entity.description ? '<div class="doc-aug-desc">' + entity.description + '</div>' : ''}
        <a class="doc-aug-link" data-href="documents-app://entity/\${entity.id}">
          Open in Documents
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
        </a>
      \`;

      const rect = el.getBoundingClientRect();
      tooltip.style.display = 'block';

      // Position above the element
      let top = rect.top - tooltip.offsetHeight - 8;
      let left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;

      // If above goes off-screen, show below
      if (top < 8) top = rect.bottom + 8;
      // Keep within horizontal bounds
      left = Math.max(8, Math.min(left, window.innerWidth - tooltip.offsetWidth - 8));

      tooltip.style.top = top + 'px';
      tooltip.style.left = left + 'px';
    };

    const hideTooltip = () => {
      hideTimeout = setTimeout(() => { tooltip.style.display = 'none'; }, 200);
    };

    document.body.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-documents-augment="entity"]');
      if (el) showTooltip(el);
    });
    document.body.addEventListener('mouseout', (e) => {
      const el = e.target.closest('[data-documents-augment="entity"]');
      if (el) hideTooltip();
    });
    tooltip.addEventListener('mouseover', () => clearTimeout(hideTimeout));
    tooltip.addEventListener('mouseout', hideTooltip);

    // Handle "Open in Documents" clicks
    tooltip.addEventListener('click', (e) => {
      const link = e.target.closest('[data-href]');
      if (link) {
        var href = link.getAttribute('data-href');
        document.__docAugOrigTitle = document.title;
        document.title = '__DOCS_NAV__:' + href;
        console.log('__DOCS_NAV__:' + href);
      }
    });

    // Cleanup function
    window.__documentsAugmentCleanup = function() {
      // Remove highlights by replacing spans with their text content
      document.querySelectorAll('[data-documents-augment="entity"]').forEach(el => {
        const textNode = document.createTextNode(el.textContent || '');
        el.parentNode.replaceChild(textNode, el);
      });
      // Remove tooltip and styles
      document.querySelectorAll('[data-documents-augment]').forEach(el => el.remove());
      delete window.__documentsAugmentCleanup;
    };

    return highlightCount;
  } catch(e) {
    console.warn('[Documents Augment] Entity highlight error:', e);
    return 0;
  }
})()
`;
}

/**
 * Builds a JS script to inject block-level result indicators into the page.
 * Each block with results gets a small badge. Clicking it opens a fixed panel
 * on the body (not nested inside the badge) so it can't be clipped or lost.
 */
export function buildBlockIndicatorScript(blockResults: BlockResult[]): string {
  if (blockResults.length === 0) return '';

  const resultsJson = JSON.stringify(blockResults);

  return `
(function() {
  try {
    const blockResults = ${resultsJson};
    if (!blockResults.length) return 0;

    // Inject styles once
    if (!document.querySelector('[data-documents-augment="block-styles"]')) {
      const style = document.createElement('style');
      style.setAttribute('data-documents-augment', 'block-styles');
      style.textContent = \`
        .doc-aug-block-badge {
          position: absolute;
          right: -12px;
          top: 4px;
          z-index: 2147483640;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: #312e81;
          color: #c7d2fe;
          border: 1px solid #4338ca;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          user-select: none;
        }
        .doc-aug-block-badge:hover {
          background: #3730a3;
          border-color: #6366f1;
          transform: scale(1.05);
        }
        .doc-aug-block-badge.doc-aug-active {
          background: #4338ca;
          border-color: #818cf8;
        }
        .doc-aug-block-badge svg {
          width: 12px;
          height: 12px;
        }
        #doc-aug-block-panel {
          position: fixed;
          z-index: 2147483647;
          background: #1a1a2e;
          border: 1px solid #444;
          border-radius: 10px;
          width: 340px;
          max-height: 320px;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
          display: none;
        }
        #doc-aug-block-panel .doc-aug-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          border-bottom: 1px solid #333;
          font-size: 11px;
          color: #888;
        }
        #doc-aug-block-panel .doc-aug-panel-close {
          cursor: pointer;
          color: #666;
          padding: 2px;
          border-radius: 4px;
          line-height: 1;
        }
        #doc-aug-block-panel .doc-aug-panel-close:hover {
          color: #ccc;
          background: #333;
        }
        .doc-aug-block-panel-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid #2a2a3e;
          cursor: pointer;
          transition: background 0.1s;
        }
        .doc-aug-block-panel-item:last-child {
          border-bottom: none;
        }
        .doc-aug-block-panel-item:hover {
          background: #252540;
        }
        .doc-aug-block-panel-tag {
          display: inline-block;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 5px;
          border-radius: 3px;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .doc-aug-block-panel-name {
          font-size: 12px;
          font-weight: 500;
          color: #e0e0e0;
          line-height: 1.4;
        }
        .doc-aug-block-panel-preview {
          font-size: 11px;
          color: #888;
          line-height: 1.3;
          margin-top: 3px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      \`;
      document.head.appendChild(style);
    }

    const collectionColors = {
      docs: { bg: '#1e3a5f', color: '#60a5fa' },
      resources: { bg: '#1a3a2a', color: '#6ee7b7' },
      knowledge: { bg: '#2d1b4e', color: '#c084fc' },
      entities: { bg: '#3d2b10', color: '#fbbf24' },
      notes: { bg: '#3b1929', color: '#fb7185' },
      canvases: { bg: '#0d3340', color: '#22d3ee' },
      events: { bg: '#3b2010', color: '#fb923c' },
      datasets: { bg: '#0d3330', color: '#2dd4bf' },
    };

    // Create single shared panel on body
    let panel = document.getElementById('doc-aug-block-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'doc-aug-block-panel';
      panel.setAttribute('data-documents-augment', 'block-panel');
      document.body.appendChild(panel);
    }

    // Store results by blockId for lookup
    const blockMap = {};
    for (const b of blockResults) { blockMap[b.blockId] = b; }

    let activeBadge = null;

    const showPanel = (badge, blockId) => {
      const block = blockMap[blockId];
      if (!block) return;

      // Deactivate previous
      if (activeBadge) activeBadge.classList.remove('doc-aug-active');
      activeBadge = badge;
      badge.classList.add('doc-aug-active');

      panel.innerHTML =
        '<div class="doc-aug-panel-header">' +
          '<span>' + block.results.length + ' related item' + (block.results.length !== 1 ? 's' : '') + '</span>' +
          '<span class="doc-aug-panel-close" id="doc-aug-panel-close-btn">&times;</span>' +
        '</div>' +
        block.results.map(function(r) {
          var colors = collectionColors[r.collection] || collectionColors.docs;
          var preview = r.highlightedContent
            ? r.highlightedContent.replace(/<[^>]*>/g, '').slice(0, 140)
            : '';
          return '<div class="doc-aug-block-panel-item" data-nav="documents-app://' + r.collection + '/' + r.id + '">' +
            '<span class="doc-aug-block-panel-tag" style="background:' + colors.bg + ';color:' + colors.color + '">' + r.collection + '</span>' +
            '<div>' +
              '<div class="doc-aug-block-panel-name">' + (r.name || 'Untitled') + '</div>' +
              (preview ? '<div class="doc-aug-block-panel-preview">' + preview + '</div>' : '') +
            '</div>' +
          '</div>';
        }).join('');

      // Position panel next to badge
      var rect = badge.getBoundingClientRect();
      panel.style.display = 'block';

      // Try to show to the left of the badge
      var panelWidth = 340;
      var left = rect.left - panelWidth - 8;
      if (left < 8) left = rect.right + 8;
      // Keep within viewport
      left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));

      var top = rect.top;
      // If panel would go below viewport, push up
      var panelHeight = Math.min(panel.scrollHeight, 320);
      if (top + panelHeight > window.innerHeight - 8) {
        top = window.innerHeight - panelHeight - 8;
      }
      top = Math.max(8, top);

      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
    };

    const hidePanel = () => {
      panel.style.display = 'none';
      if (activeBadge) {
        activeBadge.classList.remove('doc-aug-active');
        activeBadge = null;
      }
    };

    // Close panel on click outside
    document.addEventListener('click', function(e) {
      if (!panel.contains(e.target) && !e.target.closest('.doc-aug-block-badge')) {
        hidePanel();
      }
    }, true);

    // Close button
    panel.addEventListener('click', function(e) {
      if (e.target.id === 'doc-aug-panel-close-btn' || e.target.closest('#doc-aug-panel-close-btn')) {
        hidePanel();
        return;
      }
      var item = e.target.closest('[data-nav]');
      if (item) {
        var nav = item.getAttribute('data-nav');
        document.__docAugOrigTitle = document.title;
        document.title = '__DOCS_NAV__:' + nav;
        console.log('__DOCS_NAV__:' + nav);
      }
    });

    let addedCount = 0;

    for (const block of blockResults) {
      const el = document.querySelector('[data-block-id="' + block.blockId + '"]');
      if (!el) continue;

      var currentPosition = window.getComputedStyle(el).position;
      if (currentPosition === 'static') {
        el.style.position = 'relative';
      }

      const badge = document.createElement('div');
      badge.className = 'doc-aug-block-badge';
      badge.setAttribute('data-documents-augment', 'block-badge');
      badge.setAttribute('data-block-ref', block.blockId);

      badge.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>' +
          '<path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>' +
        '</svg> ' + block.results.length;

      badge.addEventListener('click', function(e) {
        e.stopPropagation();
        var bid = this.getAttribute('data-block-ref');
        if (activeBadge === this) {
          hidePanel();
        } else {
          showPanel(this, bid);
        }
      });

      el.appendChild(badge);
      addedCount++;
    }

    // Cleanup
    window.__documentsBlockCleanup = function() {
      hidePanel();
      document.querySelectorAll('[data-documents-augment="block-badge"]').forEach(function(el) { el.remove(); });
      document.querySelectorAll('[data-documents-augment="block-panel"]').forEach(function(el) { el.remove(); });
      document.querySelectorAll('[data-documents-augment="block-styles"]').forEach(function(el) { el.remove(); });
      document.querySelectorAll('[data-block-id]').forEach(function(el) {
        el.removeAttribute('data-block-id');
      });
      delete window.__documentsBlockCleanup;
    };

    return addedCount;
  } catch(e) {
    console.warn('[Documents Augment] Block indicator error:', e);
    return 0;
  }
})()
`;
}

/**
 * Builds a cleanup script to remove all augmentation from the page.
 */
export function buildCleanupScript(): string {
  return `
(function() {
  try {
    if (window.__documentsBlockCleanup) window.__documentsBlockCleanup();
    if (window.__documentsAugmentCleanup) window.__documentsAugmentCleanup();
  } catch(e) {}
})()
`;
}
