import { memo } from 'react'
import { Handle, Position } from 'reactflow'

export interface SpellInputNodeData {
	label?: string
	params?: string[]  // Parameter names, e.g., ['state', 'target', 'amount']
}

/**
 * SpellInputNode - Represents the input parameters of a Castable Spell
 * 
 * For Castable Spells, inputs are injected by the evaluator at runtime.
 * Default parameter is 'state' (GameState), but additional parameters can be added.
 */
export const SpellInputNode = memo(({ data }: { data: SpellInputNodeData }) => {
	const label = data.label || 'Spell Input'
	const params = data.params || ['state']

	return (
		<div
			style={{
				padding: '12px 16px',
				borderRadius: '8px',
				background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				border: '2px solid #9f7aea',
				color: '#fff',
				minWidth: '140px',
				boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
			}}
		>
			<div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '6px', fontWeight: 'bold' }}>
				{label}
			</div>
			
			{/* Parameter list */}
			<div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
				{params.map((param, index) => (
					<div key={param} style={{ 
						display: 'flex', 
						alignItems: 'center', 
						justifyContent: 'space-between',
						padding: '2px 0'
					}}>
						<span>{param}</span>
						{/* Output handle for each parameter */}
						<Handle
							type="source"
							position={Position.Right}
							id={`param-${index}`}
							style={{
								background: '#9f7aea',
								width: '10px',
								height: '10px',
								border: '2px solid #fff',
								right: '-6px',
								top: `${28 + index * 25}px`,
							}}
						/>
					</div>
				))}
			</div>
		</div>
	)
})

SpellInputNode.displayName = 'SpellInputNode'
