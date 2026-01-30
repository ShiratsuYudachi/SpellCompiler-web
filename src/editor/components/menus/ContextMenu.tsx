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
	onCopy?: () => void;
	onPaste?: () => void;
	canPaste?: boolean;
	hasNodeSelected?: boolean;
	hasEdgeSelected?: boolean;
	onUndo?: () => void;
	onRedo?: () => void;
	canUndo?: boolean;
	canRedo?: boolean;
}

export function ContextMenu({
	position,
	onAddNode,
	onDeleteSelected,
	onEvaluate,
	onClose,
	onCopy,
	onPaste,
	canPaste,
	hasNodeSelected,
	hasEdgeSelected,
	onUndo,
	onRedo,
	canUndo,
	canRedo,
}: ContextMenuProps) {
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
				{hasNodeSelected && onCopy && (
					<Menu.Item
						leftSection="📋"
						onClick={() => {
							onCopy();
							onClose();
						}}
					>
						Copy
					</Menu.Item>
				)}
				{canPaste && onPaste && (
					<Menu.Item
						leftSection="📄"
						onClick={() => {
							onPaste();
							onClose();
						}}
					>
						Paste
					</Menu.Item>
				)}
				{(hasNodeSelected || hasEdgeSelected) && onDeleteSelected && (
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
				{canUndo && onUndo && (
					<Menu.Item
						leftSection="↩️"
						onClick={() => {
							onUndo();
							onClose();
						}}
					>
						Undo
					</Menu.Item>
				)}
				{canRedo && onRedo && (
					<Menu.Item
						leftSection="↪️"
						onClick={() => {
							onRedo();
							onClose();
						}}
					>
						Redo
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
