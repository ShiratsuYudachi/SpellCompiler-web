// =============================================
// Node Selection Menu
//  -  Handle 
// =============================================

import { Menu, Text, Divider } from '@mantine/core';
import { useEffect, useState, type ReactNode } from 'react';
import { getFunctionTreeForMenu, type FunctionInfo, type FunctionTreeNode } from '../../utils/getFunctionRegistry';
import { GameEvents } from '../../../game/events';
import { getGameInstance } from '../../../game/gameInstance';

interface NodeSelectionMenuProps {
	position: { x: number; y: number };
	onSelectFunction: (funcInfo: FunctionInfo) => void;
	onSelectBasicNode: (type: 'literal' | 'triggerType' | 'if' | 'output' | 'lambdaDef' | 'customFunction' | 'applyFunc' | 'vector') => void;
	onClose: () => void;
}

const BASIC_NODES = [
	{ type: 'literal' as const, label: 'Literal', icon: '🔢', description: 'Constant value (number)' },
	{ type: 'triggerType' as const, label: 'Trigger Type', icon: '⚡', description: 'Select trigger type for onTrigger' },
	{ type: 'vector' as const, label: 'Vector2D', icon: '📐', description: '2D Vector (x, y)' },
	{ type: 'if' as const, label: 'If', icon: '🔀', description: 'Conditional expression' },
	{ type: 'customFunction' as const, label: 'Call Function', icon: '📞', description: 'Call custom function' },
	{ type: 'applyFunc' as const, label: 'Apply', icon: '⚡', description: 'Apply function dynamically' },
	{ type: 'lambdaDef' as const, label: 'Lambda', icon: 'λ', description: 'Define lambda (with return)' },
	{ type: 'output' as const, label: 'Output', icon: '📤', description: 'Mark final result' },
];

export function NodeSelectionMenu({
	position,
	onSelectFunction,
	onSelectBasicNode,
	onClose
}: NodeSelectionMenuProps) {
	const [editorContext, setEditorContext] = useState<{ sceneKey?: string } | null>(null);

	// Listen for editor context changes
	useEffect(() => {
		const game = getGameInstance();
		if (!game) return;

		const handler = (context: { sceneKey?: string }) => {
			setEditorContext(context);
		};

		game.events.on(GameEvents.setEditorContext, handler);
		return () => {
			game.events.off(GameEvents.setEditorContext, handler);
		};
	}, []);

	const isLevel1 = editorContext?.sceneKey === 'Level1';

	// In Level1, only allow literal, vector, output, getPlayer, and teleportRelative
	const availableBasicNodes = isLevel1
		? BASIC_NODES.filter(node => node.type === 'literal' || node.type === 'vector' || node.type === 'output')
		: BASIC_NODES;

	const allowedInLevel1 = new Set(['game::getPlayer', 'game::teleportRelative'])
	const tree = getFunctionTreeForMenu()

	const filterTreeForLevel1 = (nodes: FunctionTreeNode[]): FunctionTreeNode[] => {
		return nodes
			.map((n) => {
				if (n.type === 'function') {
					if (!allowedInLevel1.has(n.fullName)) return null
					return n
				}
				const children = filterTreeForLevel1(n.children)
				if (children.length === 0) return null
				return { ...n, children }
			})
			.filter(Boolean) as FunctionTreeNode[]
	}

	const visibleTree = isLevel1 ? filterTreeForLevel1(tree) : tree

	const toFunctionInfo = (fullName: string, params: string[], displayName: string): FunctionInfo => {
		const parts = fullName.split('::').filter(Boolean)
		const namespace = parts[0] || 'user'
		return {
			name: fullName,
			displayName,
			namespace,
			paramCount: params.length,
			params,
			isNative: true,
		}
	}

	const renderTree = (nodes: FunctionTreeNode[], depth: number): ReactNode[] => {
		const items: ReactNode[] = []
		for (const n of nodes) {
			if (n.type === 'group') {
				items.push(
					<div key={`g:${n.path.join('::')}`}>
						{depth === 0 ? <Divider my="xs" style={{ marginTop: '8px', marginBottom: '8px' }} /> : null}
						<Menu.Label style={{ padding: '4px 8px', marginBottom: '4px' }}>
							{n.name}
						</Menu.Label>
						<div style={{ paddingLeft: depth === 0 ? 0 : 12 }}>
							{renderTree(n.children, depth + 1)}
						</div>
					</div>,
				)
				continue
			}

			items.push(
				<button
					key={n.fullName}
					onClick={() => {
						onSelectFunction(toFunctionInfo(n.fullName, n.params, n.displayName))
						onClose()
					}}
					className="px-3 py-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
					style={{
						fontSize: '13px',
						lineHeight: '1.4',
						marginLeft: depth > 1 ? (depth - 1) * 12 : 0,
					}}
				>
					{n.displayName}
				</button>,
			)
		}
		return items
	}

	return (
		<Menu
			opened={true}
			onChange={onClose}
			position="right-start"
			withArrow
			shadow="md"
			radius="md"
			width={350}
		>
			<Menu.Target>
				<div
					style={{
						position: 'fixed',
						left: `${position.x}px`,
						top: `${position.y}px`,
						width: 1,
						height: 1
					}}
				/>
			</Menu.Target>

			<Menu.Dropdown
				onClick={(e) => e.stopPropagation()}
				onContextMenu={(e) => e.stopPropagation()}
				style={{ maxHeight: '500px', overflowY: 'auto', padding: '8px' }}
			>
				<Menu.Label style={{ padding: '4px 8px', marginBottom: '4px' }}>Basic Nodes</Menu.Label>
				{availableBasicNodes.map(node => (
					<Menu.Item
						key={node.type}
						leftSection={node.icon}
						onClick={() => {
							onSelectBasicNode(node.type);
							onClose();
						}}
						style={{ padding: '8px 12px', marginBottom: '2px' }}
					>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
							<span style={{ fontWeight: 500 }}>{node.label}</span>
							<Text size="xs" c="dimmed" style={{ fontSize: '11px', lineHeight: '1.2' }}>
								{node.description}
							</Text>
						</div>
					</Menu.Item>
				))}
				{renderTree(visibleTree, 0)}
			</Menu.Dropdown>
		</Menu>
	);
}