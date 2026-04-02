import { ref, type Ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import apiClient from '../api';
import { getSocket } from '../notifications/notification';
import { buildSegmentationScript } from './pageSegmentation';
import {
  buildEntityHighlightScript,
  buildBlockIndicatorScript,
  buildCleanupScript,
  type EntityMatch,
  type BlockResult,
} from './pageAugmentation';

const sourceTypeToCollection: Record<string, string> = {
  resource: 'resources',
  doc: 'docs',
  knowledge: 'knowledge',
  note: 'notes',
  canvas: 'canvases',
  entity: 'entities',
  dataset: 'datasets',
  event: 'events',
};

interface SearchResult {
  id: number | string;
  name: string;
  collection: string;
  score: number;
  highlightedContent?: string;
  source: 'natural' | 'rag';
  text?: string;
}

export interface AugmentationState {
  enabled: Ref<boolean>;
  isAnalyzing: Ref<boolean>;
  entityMatches: Ref<EntityMatch[]>;
  blockResults: Ref<BlockResult[]>;
  entityCount: Ref<number>;
  blockConnectionCount: Ref<number>;
  progress: Ref<number>;
  analyze: (webview: any, projectId?: number | null) => Promise<void>;
  cleanup: (webview: any) => Promise<void>;
  toggle: () => void;
}

const RAG_MIN_SCORE = 0.55;

function semanticSearch(query: string, projectId?: number, limit = 15): Promise<SearchResult[]> {
  const requestId = uuidv4();

  return new Promise<SearchResult[]>((resolve) => {
    const socket = getSocket();
    const timeout = setTimeout(() => {
      socket.off('searchResponse', onResponse);
      resolve([]);
    }, 20000);

    const onResponse = (data: any) => {
      if (data.requestId !== requestId) return;
      socket.off('searchResponse', onResponse);
      clearTimeout(timeout);
      const results = (data.results || [])
        .filter((r: any) => (r.score || 0) >= RAG_MIN_SCORE)
        .map((r: any, i: number) => {
          const rawType = r.metadata?.source_type || 'unknown';
          const collection = sourceTypeToCollection[rawType] || rawType;
          const rawSourceId = String(r.metadata?.source_id || '');
          const numericId = parseInt(rawSourceId.replace(/\D+/g, ''), 10) || 0;
          const text = (r.text || '').trim();
          const firstLine = text.split('\n')[0]?.slice(0, 120) || `${rawType} #${numericId || i}`;
          return {
            id: numericId || `rag-${i}`,
            name: firstLine,
            collection,
            score: r.score || 0,
            highlightedContent: text.length > 120 ? text.slice(0, 300) : text,
            source: 'rag' as const,
            text,
          };
        });
      resolve(results);
    };

    socket.on('searchResponse', onResponse);

    apiClient.post('/model/semantic-search', {
      query,
      projectId,
      requestId,
      limit,
    }).catch(() => {
      socket.off('searchResponse', onResponse);
      clearTimeout(timeout);
      resolve([]);
    });
  });
}

function assignResultsToBlocks(
  blocks: { blockId: string; text: string }[],
  results: SearchResult[],
): BlockResult[] {
  if (results.length === 0 || blocks.length === 0) return [];

  const blockResults: Map<string, BlockResult> = new Map();

  for (const result of results) {
    const resultText = (result.highlightedContent || result.name || '').toLowerCase();
    const resultWords = new Set(
      resultText
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3)
    );

    let bestBlock: { blockId: string; score: number } | null = null;

    for (const block of blocks) {
      const blockWords = block.text.toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3);

      let overlap = 0;
      for (const w of blockWords) {
        if (resultWords.has(w)) overlap++;
      }

      if (overlap > 0 && (!bestBlock || overlap > bestBlock.score)) {
        bestBlock = { blockId: block.blockId, score: overlap };
      }
    }

    const targetBlockId = bestBlock ? bestBlock.blockId : blocks[0].blockId;

    if (!blockResults.has(targetBlockId)) {
      blockResults.set(targetBlockId, { blockId: targetBlockId, results: [] });
    }

    const br = blockResults.get(targetBlockId)!;
    if (br.results.length < 5) {
      const rawId = result.id;
      const parsedId = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);
      br.results.push({
        id: isNaN(parsedId) ? 0 : parsedId,
        name: result.name,
        collection: result.collection,
        highlightedContent: result.highlightedContent,
        score: result.score,
      });
    }
  }

  return Array.from(blockResults.values()).filter(br => br.results.length > 0);
}

export function usePageAugmentation(): AugmentationState {
  const enabled = ref(false);
  const isAnalyzing = ref(false);
  const entityMatches = ref<EntityMatch[]>([]);
  const blockResults = ref<BlockResult[]>([]);
  const entityCount = ref(0);
  const blockConnectionCount = ref(0);
  const progress = ref(0);

  let abortController: AbortController | null = null;

  const toggle = () => {
    enabled.value = !enabled.value;
  };

  const cleanup = async (webview: any) => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    entityMatches.value = [];
    blockResults.value = [];
    entityCount.value = 0;
    blockConnectionCount.value = 0;
    progress.value = 0;
    isAnalyzing.value = false;

    if (webview) {
      try {
        await webview.executeJavaScript(buildCleanupScript());
      } catch {
        // Webview may not be ready
      }
    }
  };

  const analyze = async (webview: any, projectId?: number | null) => {
    if (!webview || !enabled.value) return;

    if (abortController) abortController.abort();
    abortController = new AbortController();
    const signal = abortController.signal;

    isAnalyzing.value = true;
    progress.value = 0;
    entityMatches.value = [];
    blockResults.value = [];
    entityCount.value = 0;
    blockConnectionCount.value = 0;

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (signal.aborted) return;

      let pageText = '';
      let pageTitle = '';
      try {
        pageText = await webview.executeJavaScript(`
(function() {
  try {
    var clone = document.body.cloneNode(true);
    ['script','style','noscript','svg','iframe','video','audio','canvas','img'].forEach(function(tag) { clone.querySelectorAll(tag).forEach(function(el) { el.remove(); }); });
    ['nav','header','footer','[role="navigation"]','[role="banner"]','[role="contentinfo"]','[aria-hidden="true"]','.nav','.navbar','.header','.footer','.sidebar','.menu','.cookie','.banner','.ad','.ads','.advertisement','.popup','.modal','.overlay','.toast'].forEach(function(sel) {
      try { clone.querySelectorAll(sel).forEach(function(el) { el.remove(); }); } catch(e) {}
    });
    var text = clone.innerText;
    clone.remove();
    return text.split('\\n').map(function(l) { return l.trim(); }).filter(Boolean).join('\\n');
  } catch(e) { return ''; }
})()
`);
        pageTitle = await webview.executeJavaScript('document.title');
      } catch {
        isAnalyzing.value = false;
        return;
      }

      if (signal.aborted || !pageText || pageText.length < 20) {
        isAnalyzing.value = false;
        return;
      }

      progress.value = 10;

      let blocks: { blockId: string; text: string; tagName: string }[] = [];
      try {
        const segmentationResult = await webview.executeJavaScript(buildSegmentationScript());
        blocks = JSON.parse(segmentationResult || '[]');
      } catch {
        // Segmentation failed, continue without blocks
      }

      if (signal.aborted) return;
      progress.value = 20;

      const pid = projectId ? Number(projectId) : undefined;

      const phase1Promise = apiClient
        .post('/search/page-entities', {
          text: pageText.slice(0, 10000),
          projectId: pid,
        })
        .then(async (res) => {
          if (signal.aborted) return;
          const matches: EntityMatch[] = res.data || [];
          entityMatches.value = matches;
          entityCount.value = matches.length;
          progress.value = Math.max(progress.value, 40);

          if (matches.length > 0) {
            const script = buildEntityHighlightScript(matches);
            if (script) {
              try {
                await webview.executeJavaScript(script);
              } catch {
                // Highlight injection failed
              }
            }
          }
        })
        .catch(() => {
          // Entity matching failed silently
        });

      const phase2Promise = (async () => {
        const queryText = `${pageTitle}. ${pageText.slice(0, 500)}`;

        const [naturalResults, ragResults] = await Promise.all([
          blocks.length > 0
            ? apiClient.post('/search/page-blocks', {
                blocks: blocks.slice(0, 15).map((b: any) => ({ blockId: b.blockId, text: b.text })),
                projectId: pid,
              }).then((res: any) => res.data || []).catch((): BlockResult[] => [])
            : Promise.resolve([]),

          semanticSearch(queryText, pid, 15),
        ]);

        if (signal.aborted) return;

        progress.value = Math.max(progress.value, 75);

        const mergedBlockResults: Map<string, BlockResult> = new Map();

        for (const br of naturalResults as BlockResult[]) {
          mergedBlockResults.set(br.blockId, { ...br });
        }

        if (ragResults.length > 0 && blocks.length > 0) {
          const ragBlockResults = assignResultsToBlocks(
            blocks.map(b => ({ blockId: b.blockId, text: b.text })),
            ragResults,
          );

          for (const rbr of ragBlockResults) {
            if (mergedBlockResults.has(rbr.blockId)) {
              const existing = mergedBlockResults.get(rbr.blockId)!;
              const seenKeys = new Set(existing.results.map(r => `${r.collection}-${r.id}`));
              for (const r of rbr.results) {
                const key = `${r.collection}-${r.id}`;
                if (!seenKeys.has(key) && existing.results.length < 5) {
                  existing.results.push(r);
                  seenKeys.add(key);
                }
              }
            } else {
              mergedBlockResults.set(rbr.blockId, rbr);
            }
          }
        }

        const allBlockResults = Array.from(mergedBlockResults.values());
        blockResults.value = allBlockResults;
        blockConnectionCount.value = allBlockResults.reduce((sum, r) => sum + r.results.length, 0);

        progress.value = Math.max(progress.value, 90);

        if (allBlockResults.length > 0) {
          const script = buildBlockIndicatorScript(allBlockResults);
          if (script) {
            try {
              await webview.executeJavaScript(script);
            } catch {
              // Block indicator injection failed
            }
          }
        }
      })();

      await Promise.all([phase1Promise, phase2Promise]);

      if (!signal.aborted) {
        progress.value = 100;
      }
    } catch {
      // Analysis failed
    } finally {
      if (!signal.aborted) {
        isAnalyzing.value = false;
      }
    }
  };

  return {
    enabled,
    isAnalyzing,
    entityMatches,
    blockResults,
    entityCount,
    blockConnectionCount,
    progress,
    analyze,
    cleanup,
    toggle,
  };
}
