// =============================================
// Function Definition Node Component
// 函数定义节点 - 定义一个新函数
// =============================================

import { Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { TextInput } from '@mantine/core';
import { SmartHandle } from '../handles/SmartHandle';

interface FunctionDefNodeData {
	functionName?: string;
	paramCount?: number;
	params?: string[];
}

export function FunctionDefNode({ id, data }: NodeProps<FunctionDefNodeData>) {
	const [functionName, setFunctionName] = useState(data.functionName || 'myFunc');
	const [paramCount, setParamCount] = useState(data.paramCount || 1);

	// Update data when values change
	const handleNameChange = (newName: string) => {
		setFunctionName(newName);
		data.functionName = newName;
	};

	const handleParamCountChange = (newCount: number) => {
		const count = Math.max(0, Math.min(10, newCount)); // Limit 0-10 params
		setParamCount(count);
		data.paramCount = count;
		// Generate parameter names
		data.params = Array.from({ length: count }, (_, i) => `arg${i}`);
	};

	const params = data.params || Array.from({ length: paramCount }, (_, i) => `arg${i}`);

	return (
		<div className="px-4 py-3 shadow-md rounded-lg bg-purple-50 border-2 border-purple-400 min-w-[200px]">
			<div className="font-bold text-sm text-purple-700 mb-2">
				📦 Function Definition
			</div>

			{/* Function Name Input */}
			<TextInput
				value={functionName}
				onChange={(e) => handleNameChange(e.target.value)}
				placeholder="Function name"
				size="xs"
				className="mb-2"
			/>

			{/* Param Count Input */}
			<TextInput
				type="number"
				value={paramCount}
				onChange={(e) => handleParamCountChange(parseInt(e.target.value) || 0)}
				placeholder="Parameter count"
				size="xs"
				min={0}
				max={10}
				className="mb-2"
			/>

			{/* Parameter Output Handles */}
			{params.length > 0 && (
				<div className="mt-2">
					<div className="text-xs text-purple-600 mb-1">Parameters:</div>
					{params.map((param, i) => (
						<div key={i} className="flex items-center justify-between mb-1">
							<span className="text-xs text-purple-600">{param}</span>
							<SmartHandle
								type="source"
								position={Position.Right}
								id={`param${i}`}
								className="w-3 h-3 bg-purple-500"
								nodeId={id}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
