// =============================================
// Node Selection Menu
// 节点选择菜单 - 从 Handle 点击时弹出
// =============================================

import { Paper, Text, Stack, UnstyledButton } from '@mantine/core';
import { getFunctionsByNamespace, type FunctionInfo } from '../../utils/getFunctionRegistry';

interface NodeSelectionMenuProps {
	position: { x: number; y: number };
	onSelectFunction: (funcInfo: FunctionInfo) => void;
	onSelectBasicNode: (type: 'literal' | 'if' | 'output') => void;
	onClose: () => void;
}

const BASIC_NODES = [
	{ type: 'literal' as const, label: '🔢 Literal', description: 'Constant value' },
	{ type: 'if' as const, label: '🔀 If', description: 'Conditional expression' },
	{ type: 'output' as const, label: '📤 Output', description: 'Mark final result' },
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
		<>
			{/* Backdrop */}
			<div 
				className="fixed inset-0 z-40"
				onClick={onClose}
			/>
			
			{/* Menu */}
			<Paper
				shadow="lg"
				p="xs"
				className="fixed z-50 max-h-96 overflow-y-auto"
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`,
					width: '280px'
				}}
			>
				<Stack gap="xs">
					{/* Basic Nodes Section */}
					<div>
						<Text size="xs" fw={600} c="dimmed" mb="xs" px="xs">
							Basic Nodes
						</Text>
						{BASIC_NODES.map(node => (
							<UnstyledButton
								key={node.type}
								onClick={() => onSelectBasicNode(node.type)}
								className="w-full px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
							>
								<div className="flex items-center gap-2">
									<Text size="sm">{node.label}</Text>
									<Text size="xs" c="dimmed" className="ml-auto">
										{node.description}
									</Text>
								</div>
							</UnstyledButton>
						))}
					</div>
					
					{/* Function Groups */}
					{groupedFunctions.map(group => (
						group.items.length > 0 && (
							<div key={group.key}>
								<Text size="xs" fw={600} c="dimmed" mb="xs" px="xs">
									{group.label}
								</Text>
								<div className="grid grid-cols-2 gap-1">
									{group.items.map(func => (
										<UnstyledButton
											key={func.name}
											onClick={() => onSelectFunction(func)}
											className="px-2 py-1 rounded hover:bg-blue-50 transition-colors text-left"
										>
											<Text size="xs" className="truncate">
												{func.displayName}
											</Text>
										</UnstyledButton>
									))}
								</div>
							</div>
						)
					))}
				</Stack>
			</Paper>
		</>
	);
}