// =============================================
// Node Selection Menu
// 节点选择菜单 - 从 Handle 点击时弹出
// =============================================

import { Menu, Text, Divider } from '@mantine/core';
import { getFunctionsByNamespace, type FunctionInfo } from '../../utils/getFunctionRegistry';

interface NodeSelectionMenuProps {
	position: { x: number; y: number };
	onSelectFunction: (funcInfo: FunctionInfo) => void;
	onSelectBasicNode: (type: 'literal' | 'if' | 'output') => void;
	onClose: () => void;
}

const BASIC_NODES = [
	{ type: 'literal' as const, label: 'Literal', icon: '🔢', description: 'Constant value' },
	{ type: 'if' as const, label: 'If', icon: '🔀', description: 'Conditional expression' },
	{ type: 'output' as const, label: 'Output', icon: '📤', description: 'Mark final result' },
];

const FUNCTION_GROUPS = [
	{ key: 'arithmetic', label: 'Arithmetic', functions: ['add', 'subtract', 'multiply', 'divide'] },
	{ key: 'comparison', label: 'Comparison', functions: ['gt', 'lt', 'gte', 'lte', 'eq', 'neq'] },
	{ key: 'logical', label: 'Logical', functions: ['and', 'or', 'not'] },
	{ key: 'math', label: 'Math', functions: ['abs', 'negate', 'mod', 'max', 'min', 'power', 'sqrt', 'floor', 'ceil', 'round'] },
	{ key: 'list', label: 'List', functions: ['list', 'cons', 'empty', 'head', 'tail', 'length', 'nth', 'append', 'concat', 'range', 'map', 'filter', 'reduce'] },
];

export function NodeSelectionMenu({
	position,
	onSelectFunction,
	onSelectBasicNode,
	onClose
}: NodeSelectionMenuProps) {
	const functionsByNamespace = getFunctionsByNamespace();
	const stdFunctions = functionsByNamespace['std'] || [];

	// Group std functions by category
	const groupedFunctions = FUNCTION_GROUPS.map(group => ({
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
				{BASIC_NODES.map(node => (
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

				{groupedFunctions.map((group, idx) =>
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
			</Menu.Dropdown>
		</Menu>
	);
}