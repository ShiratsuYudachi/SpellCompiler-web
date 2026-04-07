// =============================================
// Vector Node Component
// 2D Vector (x, y)
// =============================================

import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import type { VectorNodeData } from '../../types/flowTypes';
import { getPixelBoxStyle, getPixelInputStyle, getPixelHeaderStyle } from '../../utils/EditorTheme';

export function VectorNode({ data }: NodeProps) {
	const nodeData = data as VectorNodeData;
	const [rawX, setRawX] = useState(String(nodeData.x ?? 0));
	const [rawY, setRawY] = useState(String(nodeData.y ?? 0));

	const handleChange = (key: 'x' | 'y', val: string) => {
		const num = parseFloat(val);
		if (key === 'x') {
			setRawX(val);
			if (!isNaN(num)) nodeData.x = num;
		} else {
			setRawY(val);
			if (!isNaN(num)) nodeData.y = num;
		}
	};

	return (
		<div style={getPixelBoxStyle('data')}>
			<div style={getPixelHeaderStyle('data')}>
				📐 Vector2D
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span style={{ fontSize: '8px', color: '#4facfe', width: '12px' }}>X</span>
					<input
						type="text"
						value={rawX}
						onChange={(e) => handleChange('x', e.target.value)}
						className="nodrag"
						style={getPixelInputStyle()}
					/>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<span style={{ fontSize: '8px', color: '#4facfe', width: '12px' }}>Y</span>
					<input
						type="text"
						value={rawY}
						onChange={(e) => handleChange('y', e.target.value)}
						className="nodrag"
						style={getPixelInputStyle()}
					/>
				</div>
			</div>

			<Handle
				type="source"
				position={Position.Right}
				id="value"
				style={{ width: 12, height: 12, borderRadius: 0, background: '#ffffff', border: '2px solid #4facfe' }}
			/>
		</div>
	);
}
