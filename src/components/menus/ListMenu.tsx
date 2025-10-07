// =============================================
// List Menu Base Component
// 列表菜单基础组件 - 提供 backdrop 和基础布局
// =============================================

import { Paper } from '@mantine/core';
import { ReactNode } from 'react';

interface ListMenuProps {
	position: { x: number; y: number };
	onClose: () => void;
	children: ReactNode;
	width?: string;
	maxHeight?: string;
}

export function ListMenu({
	position,
	onClose,
	children,
	width = '280px',
	maxHeight = '24rem'
}: ListMenuProps) {
	return (
		<Paper
			shadow="lg"
			p="xs"
			className="fixed z-50 overflow-y-auto"
			style={{
				left: `${position.x}px`,
				top: `${position.y}px`,
				width,
				maxHeight
			}}
			onClick={(e) => e.stopPropagation()}
			onContextMenu={(e) => e.stopPropagation()}
		>
			{children}
		</Paper>
	);
}
