// =============================================
// Function Output Node Component
// 函数输出节点 - 标记函数的返回值并输出 FunctionValue
// =============================================

import { Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { SmartHandle } from '../handles/SmartHandle';

interface FunctionOutNodeData {
	functionName?: string;
	lambdaId?: string;  // Reference to the bound LambdaDef node
}

export function FunctionOutNode({ id, data }: NodeProps<FunctionOutNodeData>) {
	const [lambdaId, setLambdaId] = useState(data.lambdaId || '');

	// Update lambda binding
	const handleLambdaIdChange = (newId: string) => {
		setLambdaId(newId);
		data.lambdaId = newId;
	};

	return (
		<div className="relative px-4 py-3 shadow-md rounded-lg bg-indigo-50 border-2 border-indigo-400 min-w-[180px]">
			<div className="font-bold text-sm text-indigo-700 mb-2 text-center">
				↩️ Return
			</div>

			{/* Lambda ID Input */}
			<input
				type="text"
				value={lambdaId}
				onChange={(e) => handleLambdaIdChange(e.target.value)}
				placeholder="lambda node id"
				className="w-full text-xs text-gray-600 bg-transparent border-none outline-none mb-2 px-1 py-0.5 rounded hover:bg-indigo-50 focus:bg-indigo-100 text-center"
			/>

			{/* Input handle for return value (left) */}
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<SmartHandle
						type="target"
						position={Position.Left}
						id="value"
						className="w-3 h-3 bg-indigo-500 !absolute !-left-1.5"
						nodeId={id}
					/>
					<span className="ml-2 text-xs text-indigo-600">value</span>
				</div>
			</div>

			{/* Output handle for FunctionValue (right) */}
			<div className="flex items-center justify-end">
				<span className="mr-2 text-xs text-purple-600">fn</span>
				<SmartHandle
					type="source"
					position={Position.Right}
					id="function"
					className="w-3 h-3 bg-purple-500 !absolute !-right-1.5"
					nodeId={id}
				/>
			</div>
		</div>
	);
}
