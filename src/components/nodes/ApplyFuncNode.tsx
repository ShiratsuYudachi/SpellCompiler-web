// =============================================
// Apply Function Node Component
// 函数应用节点 - 动态调用函数
// =============================================

import { Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { SmartHandle } from '../handles/SmartHandle';

interface ApplyFuncNodeData {
	paramCount?: number;
}

export function ApplyFuncNode({ id, data }: NodeProps<ApplyFuncNodeData>) {
	const [paramCount, setParamCount] = useState(data.paramCount || 1);

	const handleParamCountChange = (newCount: number) => {
		const count = Math.max(0, Math.min(10, newCount));
		setParamCount(count);
		data.paramCount = count;
	};

	return (
		<div className="relative px-4 py-3 shadow-md rounded-lg bg-green-50 border-2 border-green-400 min-w-[160px]">
			{/* Header */}
			<div className="font-bold text-sm text-green-700 mb-2 text-center">
				⚡ Apply
			</div>

			{/* Function input */}
			<div className="flex items-center mb-3 relative">
				<SmartHandle
					type="target"
					position={Position.Left}
					id="func"
					className="w-3 h-3 bg-purple-500 !absolute !-left-4"
					nodeId={id}
				/>
				<span className="ml-1 text-xs text-purple-600 font-medium">function</span>
			</div>

			{/* Param count control */}
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs text-gray-600">Args:</span>
				<div className="flex items-center gap-1">
					<button
						onClick={() => handleParamCountChange(paramCount - 1)}
						className="w-5 h-5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs flex items-center justify-center"
						type="button"
					>
						−
					</button>
					<span className="text-sm font-mono w-6 text-center">{paramCount}</span>
					<button
						onClick={() => handleParamCountChange(paramCount + 1)}
						className="w-5 h-5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs flex items-center justify-center"
						type="button"
					>
						+
					</button>
				</div>
			</div>

			{/* Argument handles */}
			<div className="space-y-1">
				{Array.from({ length: paramCount }).map((_, i) => (
					<div key={i} className="flex items-center relative h-6">
						<SmartHandle
							type="target"
							position={Position.Left}
							id={`arg${i}`}
							className="w-3 h-3 bg-blue-500 !absolute !-left-4"
							nodeId={id}
						/>
						<span className="ml-1 text-xs text-gray-600">arg{i}</span>
					</div>
				))}
			</div>

			{/* Result output */}
			<div className="flex items-center justify-end mt-3 relative">
				<span className="mr-1 text-xs text-green-600 font-medium">result</span>
				<SmartHandle
					type="source"
					position={Position.Right}
					id="result"
					className="w-3 h-3 bg-green-500 !absolute !-right-4"
					nodeId={id}
				/>
			</div>
		</div>
	);
}

