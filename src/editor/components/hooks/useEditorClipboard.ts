// =============================================
// Editor clipboard hook: copy / paste nodes and edges
// =============================================

import { useCallback, useState } from 'react';
import type { Node, Edge } from 'reactflow';

export type ClipboardContextMenuPosition = { x: number; y: number } | undefined;

export interface UseEditorClipboardOptions {
	nodes: Node[];
	edges: Edge[];
	setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
	setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
	/** When provided, paste applies nodes+edges in one call (single undo step). Otherwise uses setNodes + setEdges. */
	applyPaste?: (newNodes: Node[], newEdges: Edge[]) => void;
	contextMenuPosition: ClipboardContextMenuPosition;
	screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
	generateNodeId: () => string;
	setError?: (message: string | null) => void;
}

export interface UseEditorClipboardReturn {
	clipboard: string | null;
	canPaste: boolean;
	handleCopy: () => void;
	handlePaste: () => void;
}

const PASTE_OFFSET = { x: 50, y: 50 };

export function useEditorClipboard({
	nodes,
	edges,
	setNodes,
	setEdges,
	applyPaste,
	contextMenuPosition,
	screenToFlowPosition,
	generateNodeId,
	setError,
}: UseEditorClipboardOptions): UseEditorClipboardReturn {
	const [clipboard, setClipboard] = useState<string | null>(null);

	const handleCopy = useCallback(() => {
		const selectedNodes = nodes.filter((node) => node.selected);
		if (selectedNodes.length === 0) return;

		const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
		const relatedEdges = edges.filter(
			(edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
		);

		const copyData = { nodes: selectedNodes, edges: relatedEdges };
		const jsonData = JSON.stringify(copyData);

		setClipboard(jsonData);

		if (navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(jsonData).catch((err) => {
				console.warn('[Editor] Failed to write to clipboard:', err);
			});
		}
	}, [nodes, edges]);

	const handlePaste = useCallback(() => {
		if (!clipboard) return;

		try {
			const copyData = JSON.parse(clipboard);
			if (!copyData.nodes || !Array.isArray(copyData.nodes)) {
				console.error('[Editor] Invalid clipboard data: missing nodes');
				return;
			}

			const idMap = new Map<string, string>();
			const newNodes: Node[] = [];
			const newEdges: Edge[] = [];

			let pastePosition: { x: number; y: number };
			if (contextMenuPosition) {
				pastePosition = screenToFlowPosition(contextMenuPosition);
			} else {
				const centerX = window.innerWidth / 2;
				const centerY = window.innerHeight / 2;
				pastePosition = screenToFlowPosition({ x: centerX, y: centerY });
			}

			let minX = Infinity;
			let minY = Infinity;
			copyData.nodes.forEach((node: Node) => {
				if (node.position.x < minX) minX = node.position.x;
				if (node.position.y < minY) minY = node.position.y;
			});

			copyData.nodes.forEach((node: Node) => {
				const newNodeId = generateNodeId();
				idMap.set(node.id, newNodeId);
				const newPosition = {
					x: pastePosition.x + (node.position.x - minX) + PASTE_OFFSET.x,
					y: pastePosition.y + (node.position.y - minY) + PASTE_OFFSET.y,
				};
				newNodes.push({
					...node,
					id: newNodeId,
					position: newPosition,
					selected: false,
				});
			});

			if (copyData.edges && Array.isArray(copyData.edges)) {
				copyData.edges.forEach((edge: Edge) => {
					const newSourceId = idMap.get(edge.source);
					const newTargetId = idMap.get(edge.target);
					if (newSourceId && newTargetId) {
						newEdges.push({
							...edge,
							id: `e-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
							source: newSourceId,
							target: newTargetId,
							selected: false,
						});
					}
				});
			}

			if (applyPaste) {
				applyPaste(newNodes, newEdges);
			} else {
				setNodes((nds) => [...nds, ...newNodes]);
				setEdges((eds) => [...eds, ...newEdges]);
			}
		} catch (err) {
			console.error('[Editor] Failed to paste:', err);
			setError?.(err instanceof Error ? err.message : 'Failed to paste');
		}
	}, [
		clipboard,
		contextMenuPosition,
		screenToFlowPosition,
		generateNodeId,
		applyPaste,
		setNodes,
		setEdges,
		setError,
	]);

	return {
		clipboard,
		canPaste: clipboard !== null,
		handleCopy,
		handlePaste,
	};
}
