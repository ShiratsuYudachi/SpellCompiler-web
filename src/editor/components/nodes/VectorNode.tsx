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
	const [rawX, setRawX] = useState(String(nodeData.x ?? 0));
	const [rawY, setRawY] = useState(String(nodeData.y ?? 0));

	const commitX = (raw: string) => {
		const num = parseFloat(raw);
		if (!isNaN(num)) {
			nodeData.x = num;
			setRawX(String(num));
		} else {
			setRawX(String(nodeData.x ?? 0));
		}
	};

	const commitY = (raw: string) => {
		const num = parseFloat(raw);
		if (!isNaN(num)) {
			nodeData.y = num;
			setRawY(String(num));
		} else {
			setRawY(String(nodeData.y ?? 0));
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
					type="text"
					value={rawX}
					onChange={(e) => setRawX(e.target.value)}
					onBlur={(e) => commitX(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') commitX((e.target as HTMLInputElement).value); }}
					className="nodrag w-full px-2 py-1 text-sm border border-teal-300 rounded focus:outline-none focus:border-teal-500"
					placeholder="X coordinate"
				/>
			</div>

			{/* Y input */}
			<div className="mb-1">
				<label className="text-xs text-teal-600 font-medium">Y:</label>
				<input
					type="text"
					value={rawY}
					onChange={(e) => setRawY(e.target.value)}
					onBlur={(e) => commitY(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') commitY((e.target as HTMLInputElement).value); }}
					className="nodrag w-full px-2 py-1 text-sm border border-teal-300 rounded focus:outline-none focus:border-teal-500"
					placeholder="Y coordinate"
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
