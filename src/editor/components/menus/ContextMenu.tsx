// =============================================
// Context Menu
// 
// =============================================

import { Menu } from '@mantine/core';

interface ContextMenuProps {
	position: { x: number; y: number };
	onAddNode: () => void;
	onDeleteSelected?: () => void;
	onEvaluate: () => void;
	onClose: () => void;
	hasSelection?: boolean;
}

export function ContextMenu({ position, onAddNode, onDeleteSelected, onEvaluate, onClose, hasSelection }: ContextMenuProps) {
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
				{hasSelection && onDeleteSelected && (
					<Menu.Item
						leftSection="🗑️"
						color="red"
						onClick={() => {
							onDeleteSelected();
							onClose();
						}}
					>
						Delete Selected
					</Menu.Item>
				)}
				<Menu.Divider />
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
