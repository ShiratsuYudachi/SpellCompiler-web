import { memo } from 'react'
import { Handle, Position } from 'reactflow'

export interface SpellInputNodeData {
	label?: string
	paramName?: string // e.g., 'state' for GameState
}

/**
 * SpellInputNode - Represents the input parameter of a Castable Spell
 * 
 * For Castable Spells, the input is always GameState, which is injected
 * by the evaluator at runtime rather than being created by a function call.
 */
export const SpellInputNode = memo(({ data }: { data: SpellInputNodeData }) => {
	const label = data.label || 'Spell Input'
	const paramName = data.paramName || 'state'

	return (
		<div
			style={{
				padding: '12px 16px',
				borderRadius: '8px',
				background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				border: '2px solid #9f7aea',
				color: '#fff',
				minWidth: '120px',
				boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
			}}
		>
			<div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>
				{label}
			</div>
			<div style={{ fontSize: '14px', fontWeight: 'bold' }}>
				{paramName}: GameState
			</div>
			
			{/* Output handle - provides GameState to connected nodes */}
			<Handle
				type="source"
				position={Position.Right}
				id="output"
				style={{
					background: '#9f7aea',
					width: '12px',
					height: '12px',
					border: '2px solid #fff',
				}}
			/>
		</div>
	)
})

SpellInputNode.displayName = 'SpellInputNode'
