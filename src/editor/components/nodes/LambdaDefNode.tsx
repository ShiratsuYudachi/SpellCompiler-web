// =============================================
// Lambda Definition Node Component
// Lambda  -  Lambda 
// =============================================

import { Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { SmartHandle } from '../handles/SmartHandle';
import { getPixelBoxStyle, getPixelHeaderStyle, getPixelInputStyle, EditorColors } from '../../utils/EditorTheme';

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
		<div style={getPixelBoxStyle('output')}>
			{/* Left Handle - Captured Environment */}
			<SmartHandle
				type="target"
				position={Position.Left}
				id="env"
				nodeId={id}
				style={{ left: -10, top: 20, border: `1px solid ${EditorColors.output.border}`, boxShadow: `0 0 8px ${EditorColors.output.glow}` }}
			/>
			<div style={{ position: 'absolute', left: 15, top: 15, fontSize: '7px', color: EditorColors.output.border, opacity: 0.6 }}>
				ENV_CAPTURE
			</div>

			{/* Header with emoji */}
			<div style={getPixelHeaderStyle('output')}>
				λ LAMBDA_DEF
			</div>

			{/* Function Name */}
			<input
				type="text"
				value={functionName}
				onChange={(e) => handleNameChange(e.target.value)}
				placeholder="lambda_id"
				className="nodrag"
				style={{ ...getPixelInputStyle(), marginBottom: '12px', textAlign: 'center' }}
			/>

			{/* Parameters */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
				{params.map((param, i) => (
					<div
						key={i}
						style={{ position: 'relative', height: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}
						onMouseEnter={() => setHoveredIndex(i)}
						onMouseLeave={() => setHoveredIndex(null)}
					>
						{/* Parameter Input */}
						<input
							type="text"
							value={param}
							onChange={(e) => handleParamNameChange(i, e.target.value)}
							placeholder={`p${i}`}
							className="nodrag"
							style={{ ...getPixelInputStyle(), flex: 1, padding: '4px 8px' }}
						/>

						{/* Delete Button */}
						{hoveredIndex === i && (
							<button
								onClick={() => handleDeleteParam(i)}
								style={{ background: 'none', border: 'none', color: EditorColors.control.border, cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
								type="button"
							>
								×
							</button>
						)}

						{/* Handle */}
						<SmartHandle
							type="source"
							position={Position.Right}
							id={`param${i}`}
							nodeId={id}
							style={{ border: `1px solid ${EditorColors.data.border}`, boxShadow: `0 0 8px ${EditorColors.data.glow}` }}
						/>
					</div>
				))}

				{/* Add New Parameter */}
				<input
					type="text"
					value={newParamValue}
					onChange={(e) => setNewParamValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') handleAddParam();
					}}
					placeholder="+ ARG"
					className="nodrag"
					style={{ ...getPixelInputStyle(), marginTop: '8px', borderStyle: 'dashed', color: EditorColors.data.border }}
				/>
			</div>
		</div>
	);
}
