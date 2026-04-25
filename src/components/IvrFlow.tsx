import { useMemo } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from '@xyflow/react';
import dagre from 'dagre';
import '@xyflow/react/dist/style.css';
import IvrNode from './IvrNode';
import type { TreeNode } from '../lib/types';

const NODE_W = 248;
const NODE_H = 108;

function layout(root: TreeNode): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph({ multigraph: false });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'TB',
    nodesep: 28,
    ranksep: 76,
    marginx: 32,
    marginy: 32,
  });

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const walk = (n: TreeNode, parentId: string | null) => {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
    nodes.push({
      id: n.id,
      type: 'ivr',
      position: { x: 0, y: 0 },
      data: { node: n },
    });
    if (parentId) {
      g.setEdge(parentId, n.id);
      edges.push({
        id: `${parentId}->${n.id}`,
        source: parentId,
        target: n.id,
        label: n.digit ? n.digit : undefined,
        type: 'smoothstep',
        labelBgStyle: { fill: '#0f172a', fillOpacity: 1 },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
        labelStyle: {
          fontSize: 11,
          fontFamily: 'JetBrains Mono, ui-monospace, monospace',
          fill: '#ffffff',
          fontWeight: 700,
        },
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      });
    }
    n.children.forEach((c) => walk(c, n.id));
  };
  walk(root, null);

  dagre.layout(g);

  for (const n of nodes) {
    const p = g.node(n.id);
    if (p) n.position = { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 };
  }

  return { nodes, edges };
}

const nodeTypes = { ivr: IvrNode };

interface Props {
  tree: TreeNode;
  height: number;
  variant?: 'current' | 'recommended';
}

export default function IvrFlow({ tree, height, variant = 'current' }: Props) {
  const { nodes, edges } = useMemo(() => layout(tree), [tree]);
  const accentDot = variant === 'recommended' ? 'bg-good' : 'bg-warn';
  return (
    <div
      className="rounded-lg border border-line bg-bg2 relative overflow-hidden"
      style={{ height }}
    >
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted bg-surface backdrop-blur px-2.5 py-1.5 rounded-md border border-line shadow-sm">
        <span className={`w-1.5 h-1.5 rounded-full ${accentDot}`} />
        <span>drag · scroll to zoom</span>
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.08, minZoom: 0.55, maxZoom: 1.4 }}
          proOptions={{ hideAttribution: true }}
          panOnScroll={false}
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          minZoom={0.4}
          maxZoom={2}
        >
          <Background gap={28} size={1} color="#e5e7eb" />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
