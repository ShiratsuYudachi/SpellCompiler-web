// =============================================
// Context Menu
// 右键菜单组件
// =============================================

import { UnstyledButton, Text } from '@mantine/core';
import { ListMenu } from './ListMenu';

interface ContextMenuProps {
	position: { x: number; y: number };
	onAddNode: () => void;
	onEvaluate: () => void;
	onClose: () => void;
}

const MENU_ITEMS = [
	{ key: 'addNode', label: '➕ Add Node', action: 'onAddNode' as const },
	{ key: 'evaluate', label: '▶️ Evaluate', action: 'onEvaluate' as const },
];

export function ContextMenu({ position, onAddNode, onEvaluate, onClose }: ContextMenuProps) {
	const handleAction = (action: 'onAddNode' | 'onEvaluate') => {
		if (action === 'onAddNode') {
			onAddNode();
		} else if (action === 'onEvaluate') {
			onEvaluate();
		}
		onClose();
	};

	return (
		<ListMenu position={position} onClose={onClose} width="180px">
			<div className="flex flex-col gap-1">
				{MENU_ITEMS.map(item => (
					<UnstyledButton
						key={item.key}
						onClick={() => handleAction(item.action)}
						className="w-full px-3 py-2 rounded hover:bg-gray-100 transition-colors text-left"
					>
						<Text size="sm">{item.label}</Text>
					</UnstyledButton>
				))}
			</div>
		</ListMenu>
	);
}
