// =============================================
// Smart Handle Component
//  Handle - 、
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
	style?: React.CSSProperties;
}

export function SmartHandle({ 
	type, 
	position, 
	id, 
	className = '', 
	nodeId,
	style
}: SmartHandleProps) {
	const [isHovered, setIsHovered] = useState(false);
	const { onHandleAddNode } = useEditor();
	
	const handleClick = (e: React.MouseEvent) => {
		// Only handle click for source handles
		if (type === 'source' && onHandleAddNode) {
			e.stopPropagation();
			onHandleAddNode(nodeId, id, e);
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
				style={{
					borderRadius: 0,
					width: 10,
					height: 10,
					background: 'rgba(5, 8, 10, 0.9)',
					border: isHovered && type === 'source' ? '1px solid #fff' : '1px solid rgba(255,255,255,0.3)',
					boxShadow: isHovered && type === 'source' ? '0 0 12px #fff, inset 0 0 4px rgba(255,255,255,0.2)' : 'none',
					transition: 'all 0.15s ease',
					transform: isHovered && type === 'source' ? 'scale(1.2)' : 'scale(1)',
					cursor: type === 'source' ? 'pointer' : 'default',
					...style
				}}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onClick={handleClick}
			/>
		</Tooltip>
	);
}
