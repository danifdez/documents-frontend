// Force-directed graph engine for the relationships view.
// Pure module: no Vue and no DOM access beyond the CanvasRenderingContext2D
// handed to drawGraph, so layout and rendering stay testable in isolation.
import type { Relationship, RelationshipEntity } from './useRelationships';

export interface SimNode { id: number | string; name: string; type: string; x: number; y: number; vx: number; vy: number; radius: number; }
export interface SimLink { source: number; target: number; predicate: string; weight: number; }

export interface GraphLayout {
    nodes: SimNode[];
    links: SimLink[];
}

export const SIM_W = 2400;
export const SIM_H = 1800;

export const buildGraphLayout = (ents: RelationshipEntity[], rels: Relationship[]): GraphLayout => {
    const idxMap = new Map<number | string, number>();

    // Count connections per entity to determine importance
    const degreeCount = new Map<number | string, number>();
    for (const r of rels) {
        degreeCount.set(r.source, (degreeCount.get(r.source) || 0) + 1);
        degreeCount.set(r.target, (degreeCount.get(r.target) || 0) + 1);
    }

    // Sort entities: most connected first
    const sortedEnts = [...ents].sort((a, b) => (degreeCount.get(b.id) || 0) - (degreeCount.get(a.id) || 0));

    // Build nodes — position with BFS-like radial layout from hubs
    const nodes: SimNode[] = sortedEnts.map((e, i) => {
        idxMap.set(e.id, i);
        return { id: e.id, name: e.name, type: e.type || 'default',
            x: 0, y: 0, vx: 0, vy: 0,
            radius: Math.max(28, Math.min(50, 10 + e.name.length * 2.2)) };
    });

    const links: SimLink[] = [];
    for (const r of rels) {
        const si = idxMap.get(r.source); const ti = idxMap.get(r.target);
        if (si !== undefined && ti !== undefined) links.push({ source: si, target: ti, predicate: r.predicate, weight: r.confidence || 1 });
    }

    // Initial layout: place hubs at center, radiate neighbors outward
    const placed = new Set<number>();
    const queue: number[] = [];

    // Place the top hub at center
    if (nodes.length > 0) {
        nodes[0].x = SIM_W / 2;
        nodes[0].y = SIM_H / 2;
        placed.add(0);
        queue.push(0);
    }

    // BFS radial placement
    while (queue.length > 0) {
        const curr = queue.shift()!;
        const neighbors: number[] = [];
        for (const l of links) {
            if (l.source === curr && !placed.has(l.target)) neighbors.push(l.target);
            if (l.target === curr && !placed.has(l.source)) neighbors.push(l.source);
        }
        if (neighbors.length === 0) continue;

        const ringRadius = nodes[curr].radius + 140 + neighbors.length * 15;
        // Find existing angle bias from already-placed neighbors
        let startAngle = Math.random() * Math.PI * 2;
        const angleStep = (Math.PI * 2) / Math.max(neighbors.length, 1);

        for (let i = 0; i < neighbors.length; i++) {
            const ni = neighbors[i];
            const angle = startAngle + i * angleStep;
            nodes[ni].x = nodes[curr].x + Math.cos(angle) * ringRadius;
            nodes[ni].y = nodes[curr].y + Math.sin(angle) * ringRadius;
            placed.add(ni);
            queue.push(ni);
        }
    }

    // Place any disconnected nodes in a ring around the periphery
    const unplaced = nodes.filter((_, i) => !placed.has(i));
    if (unplaced.length > 0) {
        const peripheryRadius = SIM_W * 0.35;
        const angleStep = (Math.PI * 2) / unplaced.length;
        unplaced.forEach((n, i) => {
            n.x = SIM_W / 2 + Math.cos(i * angleStep) * peripheryRadius;
            n.y = SIM_H / 2 + Math.sin(i * angleStep) * peripheryRadius;
        });
    }

    runSimulation(nodes, links);
    return { nodes, links };
};

export const runSimulation = (nodes: SimNode[], links: SimLink[]): void => {
    const maxIter = 500;

    // Build adjacency for quick neighbor lookup
    const adj = new Map<number, Set<number>>();
    for (const l of links) {
        if (!adj.has(l.source)) adj.set(l.source, new Set());
        if (!adj.has(l.target)) adj.set(l.target, new Set());
        adj.get(l.source)!.add(l.target);
        adj.get(l.target)!.add(l.source);
    }

    for (let iterations = 0; iterations < maxIter; iterations++) {
        const alpha = Math.max(0.01, 1 - iterations / maxIter);

        // Very light gravity
        for (const n of nodes) {
            n.vx += (SIM_W / 2 - n.x) * 0.0005 * alpha;
            n.vy += (SIM_H / 2 - n.y) * 0.0005 * alpha;
        }

        // Repulsion between nodes — radius-aware, stronger for non-neighbors
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                let dx = nodes[j].x - nodes[i].x;
                let dy = nodes[j].y - nodes[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const minDist = nodes[i].radius + nodes[j].radius + 60;
                const areNeighbors = adj.get(i)?.has(j);
                const repStrength = areNeighbors ? 3000 : 5000;
                let force = (repStrength * alpha) / (dist * dist);
                if (dist < minDist) {
                    force += (minDist - dist) * 1.0;
                }
                dx = (dx / dist) * force; dy = (dy / dist) * force;
                nodes[i].vx -= dx; nodes[i].vy -= dy;
                nodes[j].vx += dx; nodes[j].vy += dy;
            }
        }

        // Attraction along edges — keeps connected nodes close
        for (const l of links) {
            const s = nodes[l.source], t = nodes[l.target];
            const dx = t.x - s.x, dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const idealDist = s.radius + t.radius + 130;
            const force = (dist - idealDist) * 0.004 * alpha;
            s.vx += (dx / dist) * force; s.vy += (dy / dist) * force;
            t.vx -= (dx / dist) * force; t.vy -= (dy / dist) * force;
        }

        // Edge-node repulsion — prevent nodes from sitting on top of edges
        if (iterations % 4 === 0) {
            for (const l of links) {
                const s = nodes[l.source], t = nodes[l.target];
                for (let k = 0; k < nodes.length; k++) {
                    if (k === l.source || k === l.target) continue;
                    const n = nodes[k];
                    const ex = t.x - s.x, ey = t.y - s.y;
                    const edgeLen2 = ex * ex + ey * ey || 1;
                    const proj = Math.max(0, Math.min(1, ((n.x - s.x) * ex + (n.y - s.y) * ey) / edgeLen2));
                    const closestX = s.x + proj * ex, closestY = s.y + proj * ey;
                    const dx2 = n.x - closestX, dy2 = n.y - closestY;
                    const distToEdge = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
                    const clearance = n.radius + 35;
                    if (distToEdge < clearance) {
                        const push = (clearance - distToEdge) * 0.4 * alpha;
                        n.vx += (dx2 / distToEdge) * push;
                        n.vy += (dy2 / distToEdge) * push;
                    }
                }
            }
        }

        // Damping
        for (const n of nodes) { n.vx *= 0.7; n.vy *= 0.7; n.x += n.vx; n.y += n.vy; }
    }
};

// BFS over links up to maxDepth hops from startIdx; returns visited node indices
export const collectNodesWithinHops = (links: SimLink[], startIdx: number, maxDepth: number): Set<number> => {
    const visited = new Set<number>();
    visited.add(startIdx);
    let frontier = [startIdx];
    for (let depth = 0; depth < maxDepth; depth++) {
        const nextFrontier: number[] = [];
        for (const fi of frontier) {
            for (const l of links) {
                if (l.source === fi && !visited.has(l.target)) { visited.add(l.target); nextFrontier.push(l.target); }
                if (l.target === fi && !visited.has(l.source)) { visited.add(l.source); nextFrontier.push(l.source); }
            }
        }
        frontier = nextFrontier;
    }
    return visited;
};

export const findNodeAt = (nodes: SimNode[], gx: number, gy: number): SimNode | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = gx - n.x, dy = gy - n.y;
        if (dx * dx + dy * dy <= n.radius * n.radius) return n;
    }
    return null;
};

export const computeFitTransform = (nodes: SimNode[], width: number, height: number): { zoom: number; panX: number; panY: number } => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        minX = Math.min(minX, n.x - n.radius - 40);
        minY = Math.min(minY, n.y - n.radius - 40);
        maxX = Math.max(maxX, n.x + n.radius + 40);
        maxY = Math.max(maxY, n.y + n.radius + 40);
    }
    const gw = maxX - minX || 1;
    const gh = maxY - minY || 1;
    const zoom = Math.min((width - 60) / gw, (height - 60) / gh, 3);
    return {
        zoom,
        panX: (width / 2) - ((minX + maxX) / 2) * zoom,
        panY: (height / 2) - ((minY + maxY) / 2) * zoom,
    };
};

export interface DrawGraphOptions {
    width: number;
    height: number;
    dpr: number;
    zoom: number;
    panX: number;
    panY: number;
    selectedNodeIdx: number | null;
    focusedNodeIdx: number | null;
    mutedColor: string;
    getNodeColor: (type: string) => string;
}

export const drawGraph = (ctx: CanvasRenderingContext2D, nodes: SimNode[], links: SimLink[], opts: DrawGraphOptions): void => {
    const { width, height, dpr, zoom, panX, panY, mutedColor, getNodeColor } = opts;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Highlight set — focus (dblclick, 2-hop) takes priority over selection (click, 1-hop)
    const focus = opts.focusedNodeIdx;
    const sel = focus ?? opts.selectedNodeIdx;
    let highlightNodes = new Set<number>();
    const highlightEdges = new Set<number>();
    if (focus !== null) {
        highlightNodes = collectNodesWithinHops(links, focus, 2);
        // Mark edges where both endpoints are in the highlight set
        links.forEach((l, li) => {
            if (highlightNodes.has(l.source) && highlightNodes.has(l.target)) highlightEdges.add(li);
        });
    } else if (sel !== null) {
        highlightNodes.add(sel);
        links.forEach((l, li) => {
            if (l.source === sel || l.target === sel) {
                highlightEdges.add(li);
                highlightNodes.add(l.source);
                highlightNodes.add(l.target);
            }
        });
    }
    const hasSelection = sel !== null;

    // Count parallel edges between same node pairs to curve them
    const edgePairCount = new Map<string, number>();
    const edgePairIndex = new Map<string, number>();
    for (const l of links) {
        const key = Math.min(l.source, l.target) + '-' + Math.max(l.source, l.target);
        edgePairCount.set(key, (edgePairCount.get(key) || 0) + 1);
    }
    links.forEach((l, li) => {
        const key = Math.min(l.source, l.target) + '-' + Math.max(l.source, l.target);
        const idx = edgePairIndex.get(key) || 0;
        edgePairIndex.set(key, idx + 1);
        const total = edgePairCount.get(key) || 1;

        const isActive = !hasSelection || highlightEdges.has(li);
        const edgeAlpha = isActive ? 0.4 : 0.06;
        const arrowAlpha = isActive ? 0.5 : 0.08;
        const labelAlpha = isActive ? 1 : 0.15;

        const s = nodes[l.source], t = nodes[l.target];
        const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Perpendicular offset for parallel edges
        const nx = -dy / dist, ny = dx / dist;
        const curveAmount = total > 1 ? (idx - (total - 1) / 2) * 40 : 0;
        const cpx = (s.x + t.x) / 2 + nx * curveAmount;
        const cpy = (s.y + t.y) / 2 + ny * curveAmount;

        // Draw curved edge
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        if (curveAmount !== 0) {
            ctx.quadraticCurveTo(cpx, cpy, t.x, t.y);
        } else {
            ctx.lineTo(t.x, t.y);
        }
        ctx.strokeStyle = `rgba(148,163,184,${edgeAlpha})`; ctx.lineWidth = isActive ? Math.min(2.5, 1 + l.weight) : 1; ctx.stroke();

        // Arrow
        let arrowAngle: number;
        if (curveAmount !== 0) {
            arrowAngle = Math.atan2(t.y - cpy, t.x - cpx);
        } else {
            arrowAngle = Math.atan2(dy, dx);
        }
        const arrowLen = 10;
        const ex = t.x - Math.cos(arrowAngle) * (t.radius + 3);
        const ey = t.y - Math.sin(arrowAngle) * (t.radius + 3);
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex - arrowLen * Math.cos(arrowAngle - 0.3), ey - arrowLen * Math.sin(arrowAngle - 0.3));
        ctx.lineTo(ex - arrowLen * Math.cos(arrowAngle + 0.3), ey - arrowLen * Math.sin(arrowAngle + 0.3));
        ctx.closePath(); ctx.fillStyle = `rgba(148,163,184,${arrowAlpha})`; ctx.fill();

        // Label
        const labelX = curveAmount !== 0 ? (s.x + 2 * cpx + t.x) / 4 : (s.x + t.x) / 2;
        const labelY = curveAmount !== 0 ? (s.y + 2 * cpy + t.y) / 4 : (s.y + t.y) / 2;
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = mutedColor;
        ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        const lbl = l.predicate.replace(/_/g, ' ');
        ctx.fillText(lbl.length > 24 ? lbl.slice(0, 23) + '…' : lbl, labelX, labelY - 4);
        ctx.globalAlpha = 1;
    });

    for (let ni = 0; ni < nodes.length; ni++) {
        const n = nodes[ni];
        const isActive = !hasSelection || highlightNodes.has(ni);
        const isSelected = ni === sel;
        const nodeAlpha = isActive ? 1 : 0.15;
        const color = getNodeColor(n.type);

        ctx.globalAlpha = nodeAlpha;

        // Circle
        ctx.shadowColor = isSelected ? color : 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = isSelected ? 16 : 8;
        ctx.shadowOffsetY = isSelected ? 0 : 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = color + 'cc'; ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 3.5 : 2.5;
        ctx.stroke();

        // Name inside
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const maxWidth = n.radius * 1.6;
        const fontSize = Math.max(8, Math.min(12, n.radius * 0.38));
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

        const words = n.name.split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        const maxLines = Math.max(1, Math.floor(n.radius / (fontSize * 0.7)));
        const displayLines = lines.slice(0, maxLines);
        if (lines.length > maxLines) {
            displayLines[maxLines - 1] = displayLines[maxLines - 1].slice(0, -1) + '…';
        }

        const lineHeight = fontSize * 1.2;
        const startY = n.y - ((displayLines.length - 1) * lineHeight) / 2;
        for (let i = 0; i < displayLines.length; i++) {
            ctx.fillText(displayLines[i], n.x, startY + i * lineHeight);
        }

        ctx.globalAlpha = 1;
    }

    ctx.restore();
};
