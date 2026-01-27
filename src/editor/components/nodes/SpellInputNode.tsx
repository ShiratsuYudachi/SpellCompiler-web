import { memo, useState } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'

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
export const SpellInputNode = memo(({ id, data }: { id: string; data: SpellInputNodeData }) => {
	const label = data.label || 'Spell Input'
	const params = data.params || ['state']
	const { setNodes } = useReactFlow()
	
	const [isEditing, setIsEditing] = useState(false)
	const [newParamName, setNewParamName] = useState('')

	// Add new parameter
	const handleAddParam = () => {
		if (!newParamName.trim()) return
		
		const trimmedName = newParamName.trim()
		// Validate parameter name (must be valid identifier)
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
			alert('Invalid parameter name. Use only letters, numbers, and underscores. Must start with a letter or underscore.')
			return
		}
		
		// Check for duplicates
		if (params.includes(trimmedName)) {
			alert('Parameter name already exists!')
			return
		}
		
		setNodes((nodes) =>
			nodes.map((node) => {
				if (node.id === id) {
					return {
						...node,
						data: {
							...node.data,
							params: [...params, trimmedName],
						},
					}
				}
				return node
			})
		)
		
		setNewParamName('')
	}

	// Remove parameter
	const handleRemoveParam = (index: number) => {
		if (params.length <= 1) {
			alert('Must have at least one parameter!')
			return
		}
		
		setNodes((nodes) =>
			nodes.map((node) => {
				if (node.id === id) {
					return {
						...node,
						data: {
							...node.data,
							params: params.filter((_, i) => i !== index),
						},
					}
				}
				return node
			})
		)
	}

	// Rename parameter
	const handleRenameParam = (index: number) => {
		const currentName = params[index]
		const newName = prompt(`Rename parameter "${currentName}" to:`, currentName)
		
		if (!newName || newName === currentName) return
		
		const trimmedName = newName.trim()
		// Validate parameter name
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) {
			alert('Invalid parameter name. Use only letters, numbers, and underscores. Must start with a letter or underscore.')
			return
		}
		
		// Check for duplicates
		if (params.includes(trimmedName)) {
			alert('Parameter name already exists!')
			return
		}
		
		setNodes((nodes) =>
			nodes.map((node) => {
				if (node.id === id) {
					return {
						...node,
						data: {
							...node.data,
							params: params.map((p, i) => (i === index ? trimmedName : p)),
						},
					}
				}
				return node
			})
		)
	}

	return (
		<div
			style={{
				padding: '12px 16px',
				borderRadius: '8px',
				background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				border: '2px solid #9f7aea',
				color: '#fff',
				minWidth: '180px',
				boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
			}}
		>
			<div style={{ 
				fontSize: '12px', 
				opacity: 0.9, 
				marginBottom: '6px', 
				fontWeight: 'bold',
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center'
			}}>
				<span>{label}</span>
				<button
					onClick={() => setIsEditing(!isEditing)}
					style={{
						background: 'rgba(255, 255, 255, 0.2)',
						border: 'none',
						borderRadius: '4px',
						color: '#fff',
						cursor: 'pointer',
						padding: '2px 6px',
						fontSize: '10px',
					}}
					title="Toggle edit mode"
				>
					{isEditing ? '✓' : '✎'}
				</button>
			</div>
			
			{/* Parameter list */}
			<div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
				{params.map((param, index) => (
					<div key={`${param}-${index}`} style={{ 
						display: 'flex', 
						alignItems: 'center', 
						justifyContent: 'space-between',
						padding: '2px 0'
					}}>
						<span 
							style={{ 
								flex: 1,
								cursor: isEditing ? 'pointer' : 'default',
								textDecoration: isEditing ? 'underline dotted' : 'none'
							}}
							onClick={() => isEditing && handleRenameParam(index)}
							title={isEditing ? 'Click to rename' : undefined}
						>
							{param}
						</span>
						
						{/* Remove button (only in edit mode and if more than 1 param) */}
						{isEditing && params.length > 1 && (
							<button
								onClick={() => handleRemoveParam(index)}
								style={{
									background: 'rgba(255, 0, 0, 0.3)',
									border: 'none',
									borderRadius: '3px',
									color: '#fff',
									cursor: 'pointer',
									padding: '0 4px',
									fontSize: '12px',
									marginRight: '4px',
								}}
								title="Remove parameter"
							>
								×
							</button>
						)}
						
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
								top: `${40 + index * 28}px`,
							}}
						/>
					</div>
				))}
			</div>
			
			{/* Add parameter section (only in edit mode) */}
			{isEditing && (
				<div style={{ 
					marginTop: '8px', 
					paddingTop: '8px', 
					borderTop: '1px solid rgba(255, 255, 255, 0.3)',
					display: 'flex',
					gap: '4px'
				}}>
					<input
						type="text"
						value={newParamName}
						onChange={(e) => setNewParamName(e.target.value)}
						onKeyPress={(e) => e.key === 'Enter' && handleAddParam()}
						placeholder="param name"
						style={{
							flex: 1,
							padding: '4px 6px',
							fontSize: '12px',
							borderRadius: '4px',
							border: 'none',
							background: 'rgba(255, 255, 255, 0.2)',
							color: '#fff',
						}}
					/>
					<button
						onClick={handleAddParam}
						style={{
							background: 'rgba(255, 255, 255, 0.3)',
							border: 'none',
							borderRadius: '4px',
							color: '#fff',
							cursor: 'pointer',
							padding: '4px 8px',
							fontSize: '12px',
						}}
						title="Add parameter"
					>
						+
					</button>
				</div>
			)}
		</div>
	)
})

SpellInputNode.displayName = 'SpellInputNode'
