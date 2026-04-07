// =============================================
// Apply Function Node Component
//  - 
// =============================================

import { Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import { SmartHandle } from '../handles/SmartHandle';
import { getPixelBoxStyle, getPixelHeaderStyle, getPixelInputStyle, EditorColors } from '../../utils/EditorTheme';

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
		<div style={getPixelBoxStyle('logic')}>
			{/* Header */}
			<div style={getPixelHeaderStyle('logic')}>
				⚡ APPLY
			</div>

			{/* Function input */}
			<div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', position: 'relative', height: '24px' }}>
				<SmartHandle
					type="target"
					position={Position.Left}
					id="func"
					nodeId={id}
					style={{ left: -10, border: `1px solid ${EditorColors.output.border}`, boxShadow: `0 0 8px ${EditorColors.output.glow}` }}
				/>
				<span style={{ marginLeft: 15, fontSize: '8px', color: EditorColors.output.border, opacity: 0.8 }}>FUNCTION</span>
			</div>

			{/* Param count control */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '4px 8px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
				<span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)' }}>ARGS:</span>
				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					<button
						onClick={() => handleParamCountChange(paramCount - 1)}
						style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', width: '18px', height: '18px', fontSize: '10px' }}
						type="button"
					>
						−
					</button>
					<span style={{ fontSize: '9px', color: EditorColors.logic.border, fontFamily: 'monospace', width: '12px', textAlign: 'center' }}>{paramCount}</span>
					<button
						onClick={() => handleParamCountChange(paramCount + 1)}
						style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', width: '18px', height: '18px', fontSize: '10px' }}
						type="button"
					>
						+
					</button>
				</div>
			</div>

			{/* Argument handles */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
				{Array.from({ length: paramCount }).map((_, i) => (
					<div key={i} style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
						<SmartHandle
							type="target"
							position={Position.Left}
							id={`arg${i}`}
							nodeId={id}
							style={{ left: -10, border: `1px solid ${EditorColors.data.border}`, boxShadow: `0 0 8px ${EditorColors.data.glow}` }}
						/>
						<span style={{ marginLeft: 15, fontSize: '8px', color: EditorColors.data.border, opacity: 0.8 }}>ARG{i}</span>
					</div>
				))}
			</div>

			{/* Result output */}
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '12px', height: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
				<span style={{ marginRight: 15, fontSize: '8px', color: EditorColors.logic.border, opacity: 0.8 }}>RESULT</span>
				<SmartHandle
					type="source"
					position={Position.Right}
					id="result"
					nodeId={id}
					style={{ border: `1px solid ${EditorColors.logic.border}`, boxShadow: `0 0 8px ${EditorColors.logic.glow}` }}
				/>
			</div>
		</div>
	);
}

