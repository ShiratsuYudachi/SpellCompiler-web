// =============================================
// Vector Node Component
// 2D Vector (x, y)
// =============================================

import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import type { VectorNodeData } from '../../types/flowTypes';

export function VectorNode({ data }: NodeProps) {
	const nodeData = data as VectorNodeData;
	const [x, setX] = useState(nodeData.x ?? 0);
	const [y, setY] = useState(nodeData.y ?? 0);

	const handleXChange = (newValue: string) => {
		const num = parseFloat(newValue);
		if (!isNaN(num)) {
			setX(num);
			nodeData.x = num;
		}
	};

	const handleYChange = (newValue: string) => {
		const num = parseFloat(newValue);
		if (!isNaN(num)) {
			setY(num);
			nodeData.y = num;
		}
	};

	return (
		<div className="px-4 py-3 shadow-md rounded-lg bg-teal-50 border-2 border-teal-400 min-w-[160px]">
			<div className="font-bold text-sm text-teal-700 mb-2 text-center">
				📐 Vector2D
			</div>

			{/* X input */}
			<div className="mb-2">
				<label className="text-xs text-teal-600 font-medium">X:</label>
				<input
					type="number"
					value={x}
					onChange={(e) => handleXChange(e.target.value)}
					className="w-full px-2 py-1 text-sm border border-teal-300 rounded focus:outline-none focus:border-teal-500"
					placeholder="X coordinate"
					step="any"
				/>
			</div>

			{/* Y input */}
			<div className="mb-1">
				<label className="text-xs text-teal-600 font-medium">Y:</label>
				<input
					type="number"
					value={y}
					onChange={(e) => handleYChange(e.target.value)}
					className="w-full px-2 py-1 text-sm border border-teal-300 rounded focus:outline-none focus:border-teal-500"
					placeholder="Y coordinate"
					step="any"
				/>
			</div>

			{/* Output handle */}
			<Handle
				type="source"
				position={Position.Right}
				id="value"
				className="w-3 h-3 bg-teal-500"
			/>
		</div>
	);
}
