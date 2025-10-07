// =============================================
// Smart Handle Component
// 智能 Handle - 支持悬停、点击添加节点
// =============================================

import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import type { HandleType } from 'reactflow';
import { Tooltip } from '@mantine/core';
import { useEditor } from '../../contexts/EditorContext';

interface SmartHandleProps {
	type: HandleType;
	position: Position;
	id: string;
	className?: string;
	nodeId: string;
}

export function SmartHandle({ 
	type, 
	position, 
	id, 
	className = '', 
	nodeId
}: SmartHandleProps) {
	const [isHovered, setIsHovered] = useState(false);
	const { onHandleAddNode } = useEditor();
	
	const handleClick = (e: React.MouseEvent) => {
		// Only handle click for source handles
		if (type === 'source' && onHandleAddNode) {
			e.stopPropagation();
			onHandleAddNode(nodeId, id);
		}
	};
	
	return (
		<Tooltip
			label={
				<div className="text-xs">
					<div>Click to add</div>
					<div>Drag to connect</div>
				</div>
			}
			position="top"
			withArrow
			disabled={type === 'target'}
		>
			<Handle
				type={type}
				position={position}
				id={id}
				className={`transition-all duration-200 ${className} ${
					isHovered && type === 'source' 
						? 'scale-150 cursor-pointer' 
						: ''
				}`}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onClick={handleClick}
			/>
		</Tooltip>
	);
}
