// =============================================
// Literal Node Component
// 
// =============================================

import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import type { LiteralNodeData } from '../../types/flowTypes';
import { getPixelBoxStyle, getPixelInputStyle, getPixelHeaderStyle, EditorColors } from '../../utils/EditorTheme'

export function LiteralNode({ data }: NodeProps) {
	const nodeData = data as LiteralNodeData;
	const [value, setValue] = useState(nodeData.value ?? 0);

	const handleChange = (newValue: string) => {
		// Try to parse as number
		const num = parseFloat(newValue);
		if (!isNaN(num)) {
			setValue(num);
			nodeData.value = num;
		} else {
			setValue(newValue);
			nodeData.value = newValue;
		}
	};

	// Check if value is a string
	const isString = typeof value === 'string' && (typeof nodeData.value === 'string' || isNaN(Number(value)));

	return (
		<div style={getPixelBoxStyle('data')}>
			<div style={getPixelHeaderStyle('data')}>
				🔢 Literal
			</div>
			
			<input
				type="text"
				value={typeof value === 'string' ? value : String(value)}
				onChange={(e) => handleChange(e.target.value)}
				className="nodrag"
				style={getPixelInputStyle()}
				placeholder="Value..."
			/>

			{/* Hint for string values */}
			{isString && (
				<div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
					String: "{value}"
				</div>
			)}

			{/* Hint for number values */}
			{!isString && typeof value === 'number' && (
				<div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
					Number: {value}
				</div>
			)}

			{/* Output handle */}
			<Handle
				type="source"
				position={Position.Right}
				id="value"
				style={{ width: 10, height: 10, borderRadius: 0, background: 'rgba(5, 8, 10, 0.9)', border: `1px solid ${EditorColors.data.border}`, boxShadow: `0 0 8px ${EditorColors.data.glow}` }}
			/>
		</div>
	);
}
