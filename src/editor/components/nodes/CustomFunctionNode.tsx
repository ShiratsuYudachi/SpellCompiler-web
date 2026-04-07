// =============================================
// Custom Function Node Component
//  - , to remove later
// =============================================

import { Position, Handle } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { Text, TextInput } from '@mantine/core';
import { getPixelBoxStyle, getPixelInputStyle, getPixelHeaderStyle, EditorColors } from '../../utils/EditorTheme';

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
		<div style={getPixelBoxStyle('logic')}>
			<div style={getPixelHeaderStyle('logic')}>
				📞 CALL_FUNCTION
			</div>

			<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
				<TextInput
					label="FUNC_NAME"
					value={functionName}
					onChange={(e) => handleNameChange(e.target.value)}
					placeholder="Enter name..."
					size="xs"
					styles={{ input: getPixelInputStyle() }}
				/>

				<TextInput
					label="PARAMS"
					type="number"
					value={paramCount}
					onChange={(e) => handleParamCountChange(parseInt(e.target.value) || 0)}
					size="xs"
					min={0}
					max={10}
					styles={{ input: getPixelInputStyle() }}
				/>
			</div>

			{/* Parameter Input Handles */}
			{params.length > 0 && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
					<Text size="xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '7px', marginBottom: 4 }}>ARGUMENTS:</Text>
					{params.map((param, i) => (
						<div key={i} style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
							<Handle
								type="target"
								position={Position.Left}
								id={`arg${i}`}
								style={{ left: -10, width: 10, height: 10, borderRadius: 0, background: 'rgba(5, 8, 10, 0.9)', border: `1px solid ${EditorColors.logic.border}`, boxShadow: `0 0 8px ${EditorColors.logic.glow}` }}
							/>
							<span style={{ marginLeft: 15, fontSize: '8px', color: EditorColors.logic.border, opacity: 0.8 }}>{param.toUpperCase()}</span>
						</div>
					))}
				</div>
			)}

			{/* Output Handle */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '24px' }}>
				<span style={{ marginRight: 15, fontSize: '8px', color: EditorColors.logic.border, opacity: 0.8 }}>RESULT</span>
				<Handle
					type="source"
					position={Position.Right}
					id="result"
					style={{ width: 10, height: 10, borderRadius: 0, background: 'rgba(5, 8, 10, 0.9)', border: `1px solid ${EditorColors.logic.border}`, boxShadow: `0 0 8px ${EditorColors.logic.glow}` }}
				/>
			</div>
		</div>
	);
}
