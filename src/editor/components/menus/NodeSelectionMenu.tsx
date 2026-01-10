// =============================================
// Node Selection Menu
//  -  Handle 
// =============================================

import { Menu, Text, Divider } from '@mantine/core';
import { useEffect, useState } from 'react';
import { getFunctionsByNamespace, type FunctionInfo } from '../../utils/getFunctionRegistry';
import { GameEvents } from '../../../game/events';
import { getGameInstance } from '../../../game/gameInstance';

interface NodeSelectionMenuProps {
	position: { x: number; y: number };
	onSelectFunction: (funcInfo: FunctionInfo) => void;
	onSelectBasicNode: (type: 'literal' | 'if' | 'output' | 'lambdaDef' | 'customFunction' | 'applyFunc' | 'vector') => void;
	onClose: () => void;
}

const BASIC_NODES = [
	{ type: 'literal' as const, label: 'Literal', icon: '🔢', description: 'Constant value' },
	{ type: 'vector' as const, label: 'Vector2D', icon: '📐', description: '2D Vector (x, y)' },
	{ type: 'if' as const, label: 'If', icon: '🔀', description: 'Conditional expression' },
	{ type: 'customFunction' as const, label: 'Call Function', icon: '📞', description: 'Call custom function' },
	{ type: 'applyFunc' as const, label: 'Apply', icon: '⚡', description: 'Apply function dynamically' },
	{ type: 'lambdaDef' as const, label: 'Lambda', icon: 'λ', description: 'Define lambda (with return)' },
	{ type: 'output' as const, label: 'Output', icon: '📤', description: 'Mark final result' },
];

const FUNCTION_GROUPS = [
	{ key: 'special', label: 'Special', functions: ['this'] },
	{ key: 'arithmetic', label: 'Arithmetic', functions: ['add', 'subtract', 'multiply', 'divide'] },
	{ key: 'comparison', label: 'Comparison', functions: ['gt', 'lt', 'gte', 'lte', 'eq', 'neq'] },
	{ key: 'logical', label: 'Logical', functions: ['and', 'or', 'not'] },
	{ key: 'math', label: 'Math', functions: ['abs', 'negate', 'mod', 'max', 'min', 'power', 'sqrt', 'floor', 'ceil', 'round'] },
	{ key: 'list', label: 'List', functions: ['list', 'cons', 'empty', 'head', 'tail', 'length', 'nth', 'append', 'concat', 'range', 'map', 'filter', 'reduce'] },
	{ key: 'functional', label: 'Functional Utils', functions: ['tap', 'print'] },
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

	const functionsByNamespace = getFunctionsByNamespace();
	const stdFunctions = functionsByNamespace['std'] || [];
	const gameFunctions = functionsByNamespace['game'] || [];
	const vecFunctions = functionsByNamespace['vec'] || [];

	// Filter based on scene context
	const isLevel1 = editorContext?.sceneKey === 'Level1';

	// Debug: Log context and available functions
	console.log('[NodeSelectionMenu] Editor context:', editorContext);
	console.log('[NodeSelectionMenu] Is Level1:', isLevel1);
	console.log('[NodeSelectionMenu] All game functions:', gameFunctions.map(f => f.displayName));
	
	// In Level1, only allow literal, vector, output, getPlayer, and teleportRelative
	const availableBasicNodes = isLevel1
		? BASIC_NODES.filter(node => node.type === 'literal' || node.type === 'vector' || node.type === 'output')
		: BASIC_NODES;

	const availableGameFunctions = isLevel1
		? gameFunctions.filter(fn => fn.name === 'game::getPlayer' || fn.name === 'game::teleportRelative')
		: gameFunctions;

	// Group std functions by category (empty in Level1)
	const groupedFunctions = isLevel1
		? []
		: FUNCTION_GROUPS.map(group => ({
			...group,
			items: stdFunctions.filter(fn => group.functions.includes(fn.displayName))
		}));

	return (
		<Menu
			opened={true}
			onChange={onClose}
			position="right-start"
			withArrow
			shadow="md"
			radius="md"
			width={300}
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
				style={{ maxHeight: '400px', overflowY: 'auto' }}
			>
				<Menu.Label>Basic Nodes</Menu.Label>
				{availableBasicNodes.map(node => (
					<Menu.Item
						key={node.type}
						leftSection={node.icon}
						onClick={() => {
							onSelectBasicNode(node.type);
							onClose();
						}}
						rightSection={
							<Text size="xs" c="dimmed">
								{node.description}
							</Text>
						}
					>
						{node.label}
					</Menu.Item>
				))}

				{groupedFunctions.map((group) =>
					group.items.length > 0 && (
						<div key={group.key}>
							<Divider my="xs" />
							<Menu.Label>{group.label}</Menu.Label>
							<div className="grid grid-cols-2 gap-1 px-2 pb-2">
								{group.items.map(func => (
									<button
										key={func.name}
										onClick={() => {
											onSelectFunction(func);
											onClose();
										}}
										className="px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
									>
										{func.displayName}
									</button>
								))}
							</div>
						</div>
					)
				)}

				{!isLevel1 && vecFunctions.length > 0 && (
					<div>
						<Divider my="xs" />
						<Menu.Label>Vector (vec::)</Menu.Label>
						<div className="grid grid-cols-2 gap-1 px-2 pb-2">
							{vecFunctions.map(func => (
								<button
									key={func.name}
									onClick={() => {
										onSelectFunction(func);
										onClose();
									}}
									className="px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
								>
									{func.displayName}
								</button>
							))}
						</div>
					</div>
				)}

				{availableGameFunctions.length > 0 && (
					<div>
						<Divider my="xs" />
						<Menu.Label>Game</Menu.Label>
						<div className="grid grid-cols-2 gap-1 px-2 pb-2">
							{availableGameFunctions.map(func => (
								<button
									key={func.name}
									onClick={() => {
										onSelectFunction(func);
										onClose();
									}}
									className="px-2 py-1.5 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
								>
									{func.displayName}
								</button>
							))}
						</div>
					</div>
				)}
			</Menu.Dropdown>
		</Menu>
	);
}