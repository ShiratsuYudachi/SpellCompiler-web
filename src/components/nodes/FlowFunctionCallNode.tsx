// =============================================
// Function Call Node Component
// 函数调用节点
// =============================================

import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { FunctionCallNodeData } from '../../types/flowTypes';

// Basic functions available
const AVAILABLE_FUNCTIONS = [
	'add', 'subtract', 'multiply', 'divide',
	'gt', 'lt', 'gte', 'lte', 'eq',
	'and', 'or', 'not',
	'abs', 'negate', 'mod',
	'max', 'min',
	'list', 'cons', 'empty', 'head', 'tail', 'length'
];

export function FlowFunctionCallNode({ data }: NodeProps) {
	const nodeData = data as FunctionCallNodeData;
	const [functionName, setFunctionName] = useState(nodeData.functionName ?? 'add');

	const handleFunctionChange = (newFn: string) => {
		setFunctionName(newFn);
		nodeData.functionName = newFn;
	};

	// Determine number of argument handles (max 4)
	const argCount = 4;

	return (
		<div className="px-4 py-3 shadow-md rounded-lg bg-yellow-50 border-2 border-yellow-400 min-w-[180px]">
			<div className="font-bold text-sm text-yellow-700 mb-2">
				⚙️ Function Call
			</div>
			
			<select
				value={functionName}
				onChange={(e) => handleFunctionChange(e.target.value)}
				className="w-full px-2 py-1 text-sm border border-yellow-300 rounded focus:outline-none focus:border-yellow-500 bg-white"
			>
				{AVAILABLE_FUNCTIONS.map(fn => (
					<option key={fn} value={fn}>{fn}</option>
				))}
			</select>

			{/* Input handles for arguments */}
			<div className="mt-2 space-y-1">
				{Array.from({ length: argCount }).map((_, i) => (
					<div key={i} className="flex items-center relative">
						<Handle
							type="target"
							position={Position.Left}
							id={`arg${i}`}
							style={{ top: `${40 + i * 24}px` }}
							className="w-3 h-3 bg-yellow-500 -left-1.5"
						/>
						<div className="ml-3 text-xs text-yellow-600">
							arg{i}
						</div>
					</div>
				))}
			</div>

			{/* Output handle */}
			<Handle
				type="source"
				position={Position.Right}
				id="result"
				className="w-3 h-3 bg-yellow-500"
			/>
		</div>
	);
}
