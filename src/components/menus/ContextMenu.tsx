// =============================================
// Context Menu
// 右键菜单组件
// =============================================

import { Menu } from '@mantine/core';

interface ContextMenuProps {
	position: { x: number; y: number };
	onAddNode: () => void;
	onEvaluate: () => void;
	onClose: () => void;
}

export function ContextMenu({ position, onAddNode, onEvaluate, onClose }: ContextMenuProps) {
	return (
		<Menu
			opened={true}
			onChange={onClose}
			position="right-start"
			withArrow
			shadow="md"
			radius="md"
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
			>
				<Menu.Item
					leftSection="➕"
					onClick={() => {
						onAddNode();
						onClose();
					}}
				>
					Add Node
				</Menu.Item>
				<Menu.Item
					leftSection="▶️"
					onClick={() => {
						onEvaluate();
						onClose();
					}}
				>
					Evaluate
				</Menu.Item>
			</Menu.Dropdown>
		</Menu>
	);
}
