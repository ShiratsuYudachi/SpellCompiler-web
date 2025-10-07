// =============================================
// Function Call Node Component
// 函数调用节点
// =============================================

import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import type { FunctionCallNodeData } from '../../types/flowTypes';

// Basic functions available (from std:: namespace)
const AVAILABLE_FUNCTIONS = [
	// Arithmetic
	'std::add', 'std::subtract', 'std::multiply', 'std::divide',
	// Comparison
	'std::gt', 'std::lt', 'std::gte', 'std::lte', 'std::eq', 'std::neq',
	// Logical
	'std::and', 'std::or', 'std::not',
	// Math
	'std::abs', 'std::negate', 'std::mod', 'std::max', 'std::min',
	// List
	'std::list', 'std::cons', 'std::empty', 'std::head', 'std::tail', 'std::length'
];

export function FlowFunctionCallNode({ data }: NodeProps) {
	const nodeData = data as FunctionCallNodeData;
	const [functionName, setFunctionName] = useState(nodeData.functionName ?? 'std::add');

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
