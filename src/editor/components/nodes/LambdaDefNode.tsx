// =============================================
// Lambda Definition Node Component
// Lambda  -  Lambda 
// =============================================

import { Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { SmartHandle } from '../handles/SmartHandle';

interface LambdaDefNodeData {
	functionName?: string;
	params?: string[];
}

export function LambdaDefNode({ id, data }: NodeProps<LambdaDefNodeData>) {
	const [functionName, setFunctionName] = useState(data.functionName || 'lambda');
	const [params, setParams] = useState<string[]>(data.params || ['param1']);
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
	const [newParamValue, setNewParamValue] = useState('');

	// Update data when function name changes
	const handleNameChange = (newName: string) => {
		setFunctionName(newName);
		data.functionName = newName;
	};

	// Update parameter name
	const handleParamNameChange = (index: number, newName: string) => {
		const updated = [...params];
		updated[index] = newName;
		setParams(updated);
		data.params = updated;
	};

	// Delete parameter
	const handleDeleteParam = (index: number) => {
		const updated = params.filter((_, i) => i !== index);
		setParams(updated);
		data.params = updated;
	};

	// Add new parameter
	const handleAddParam = () => {
		if (newParamValue.trim()) {
			const updated = [...params, newParamValue.trim()];
			setParams(updated);
			data.params = updated;
			setNewParamValue('');
		}
	};

	return (
		<div className="relative px-4 py-3 shadow-md rounded-lg bg-purple-50 border-2 border-purple-400 min-w-[200px]">
			{/* Left Handle - Captured Environment */}
			<SmartHandle
				type="target"
				position={Position.Left}
				id="env"
				className="w-3 h-3 bg-purple-500 !absolute !-left-1.5 !top-3"
				nodeId={id}
			/>
			<div className="absolute left-1 top-2 text-[10px] text-purple-600 font-medium">
				env
			</div>

			{/* Header with emoji */}
			<div className="font-bold text-sm text-purple-700 mb-2 text-center mt-3">
				λ Lambda
			</div>

			{/* Function Name */}
			<input
				type="text"
				value={functionName}
				onChange={(e) => handleNameChange(e.target.value)}
				placeholder="lambda name"
				className="w-full text-base font-semibold bg-transparent border-none outline-none mb-3 px-1 py-0.5 rounded hover:bg-purple-50 focus:bg-purple-100"
			/>

			{/* Parameters */}
			<div className="space-y-0">
				{params.map((param, i) => (
					<div
						key={i}
						className="relative flex items-center gap-2 group"
						onMouseEnter={() => setHoveredIndex(i)}
						onMouseLeave={() => setHoveredIndex(null)}
					>

						{/* Parameter Input */}
						<input
							type="text"
							value={param}
							onChange={(e) => handleParamNameChange(i, e.target.value)}
							placeholder={`param${i + 1}`}
							className="flex-1 text-sm text-gray-700 bg-transparent border-none outline-none px-1 py-0.5 rounded hover:bg-gray-50 focus:bg-gray-50"
						/>

						{/* Delete Button */}
						<button
							onClick={() => handleDeleteParam(i)}
							className={`w-4 h-4 text-gray-400 hover:text-red-500 text-lg leading-none flex items-center justify-center transition-opacity ${
								hoveredIndex === i ? 'opacity-100' : 'opacity-0'
							}`}
							type="button"
						>
							×
						</button>

						{/* Handle */}
						<SmartHandle
							type="source"
							position={Position.Right}
							id={`param${i}`}
							className="w-3 h-3 bg-blue-500 !absolute !-right-4 !top-1/2 !-translate-y-1/2 !translate-x-1/2"
							nodeId={id}
						/>
					</div>
				))}

				{/* Add New Parameter */}
				
				
				<input
					type="text"
					value={newParamValue}
					onChange={(e) => setNewParamValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							handleAddParam();
						}
					}}
					placeholder="+ Add Param"
					className="flex-1 text-sm text-purple-500 placeholder-purple-400 bg-transparent border-none outline-none px-1 py-0.5 rounded hover:bg-purple-50 focus:bg-purple-100"
				/>
				</div>
			
		</div>
	);
}
