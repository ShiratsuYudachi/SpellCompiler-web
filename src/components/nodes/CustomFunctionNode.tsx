// =============================================
// Custom Function Node Component
// 自定义函数调用节点 - 调用用户定义的函数, to remove later
// =============================================

import { Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { TextInput } from '@mantine/core';
import { SmartHandle } from '../handles/SmartHandle';

interface CustomFunctionNodeData {
	functionName?: string;
	paramCount?: number;
}

export function CustomFunctionNode({ id, data }: NodeProps<CustomFunctionNodeData>) {
	const [functionName, setFunctionName] = useState(data.functionName || 'myFunc');
	const [paramCount, setParamCount] = useState(data.paramCount || 1);

	const handleNameChange = (newName: string) => {
		setFunctionName(newName);
		data.functionName = newName;
	};

	const handleParamCountChange = (newCount: number) => {
		const count = Math.max(0, Math.min(10, newCount)); // Limit 0-10 params
		setParamCount(count);
		data.paramCount = count;
	};

	const params = Array.from({ length: paramCount }, (_, i) => `arg${i}`);

	return (
		<div className="px-4 py-3 shadow-md rounded-lg bg-amber-50 border-2 border-amber-400 min-w-[180px]">
			<div className="font-bold text-sm text-amber-700 mb-2">
				📞 Call Function
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

			{/* Parameter Input Handles */}
			{params.length > 0 && (
				<div className="mb-2">
					<div className="text-xs text-amber-600 mb-1">Arguments:</div>
					{params.map((param, i) => (
						<div key={i} className="flex items-center justify-between mb-1">
							<SmartHandle
								type="target"
								position={Position.Left}
								id={`arg${i}`}
								className="w-3 h-3 bg-amber-500"
								nodeId={id}
							/>
							<span className="ml-2 text-xs text-amber-600">{param}</span>
						</div>
					))}
				</div>
			)}

			{/* Output Handle */}
			<div className="flex items-center justify-end">
				<span className="mr-2 text-xs text-amber-600">result</span>
				<SmartHandle
					type="source"
					position={Position.Right}
					id="output"
					className="w-3 h-3 bg-amber-500"
					nodeId={id}
				/>
			</div>
		</div>
	);
}
