// =============================================
// Function Output Node Component
//  -  FunctionValue
// =============================================

import { Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { SmartHandle } from '../handles/SmartHandle';
import { getPixelBoxStyle, getPixelHeaderStyle, getPixelInputStyle, EditorColors } from '../../utils/EditorTheme';

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
		<div style={getPixelBoxStyle('output')}>
			<div style={getPixelHeaderStyle('output')}>
				↩️ RETURN_FUNC
			</div>

			{/* Lambda ID Input */}
			<input
				type="text"
				value={lambdaId}
				onChange={(e) => handleLambdaIdChange(e.target.value)}
				placeholder="LAMBDA_LINK_ID"
				className="nodrag"
				style={{ ...getPixelInputStyle(), marginBottom: '12px', textAlign: 'center' }}
			/>

			{/* Input handle for return value (left) */}
			<div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', position: 'relative', height: '24px' }}>
				<SmartHandle
					type="target"
					position={Position.Left}
					id="value"
					nodeId={id}
					style={{ left: -10, border: `1px solid ${EditorColors.data.border}`, boxShadow: `0 0 8px ${EditorColors.data.glow}` }}
				/>
				<span style={{ marginLeft: 15, fontSize: '8px', color: EditorColors.data.border, opacity: 0.8 }}>VALUE</span>
			</div>

			{/* Output handle for FunctionValue (right) */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '24px' }}>
				<span style={{ marginRight: 15, fontSize: '8px', color: EditorColors.output.border, opacity: 0.8 }}>FUNC_OUT</span>
				<SmartHandle
					type="source"
					position={Position.Right}
					id="function"
					nodeId={id}
					style={{ border: `1px solid ${EditorColors.output.border}`, boxShadow: `0 0 8px ${EditorColors.output.glow}` }}
				/>
			</div>
		</div>
	);
}
