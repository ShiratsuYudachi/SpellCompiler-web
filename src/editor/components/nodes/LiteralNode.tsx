// =============================================
// Literal Node Component
// 
// =============================================

import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import type { LiteralNodeData } from '../../types/flowTypes';

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
		<div className="px-4 py-3 shadow-md rounded-lg bg-green-50 border-2 border-green-400 min-w-[150px]">
			<div className="font-bold text-sm text-green-700 mb-2">
				🔢 Literal
			</div>
			
			<input
				type="text"
				value={typeof value === 'string' ? value : String(value)}
				onChange={(e) => handleChange(e.target.value)}
				className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:border-green-500"
				placeholder="Number or string..."
			/>

			{/* Hint for string values */}
			{isString && (
				<div className="text-xs text-green-600 mt-1 opacity-70">
					💡 String: "{value}"
				</div>
			)}

			{/* Hint for number values */}
			{!isString && typeof value === 'number' && (
				<div className="text-xs text-green-600 mt-1 opacity-50">
					Number: {value}
				</div>
			)}

			{/* Output handle */}
			<Handle
				type="source"
				position={Position.Right}
				id="value"
				className="w-3 h-3 bg-green-500"
			/>
		</div>
	);
}
