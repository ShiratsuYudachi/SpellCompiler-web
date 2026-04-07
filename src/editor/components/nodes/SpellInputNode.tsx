import { memo, useState } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import { getPixelBoxStyle, getPixelInputStyle, getPixelHeaderStyle, EditorColors } from '../../utils/EditorTheme'

export interface SpellInputNodeData {
	label?: string
	params?: string[]  // Parameter names, e.g., ['state', 'target', 'amount']
}

/**
 * SpellInputNode - Represents the input parameters of a Castable Spell
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
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) return
		if (params.includes(trimmedName)) return
		
		setNodes((nodes) =>
			nodes.map((node) => {
				if (node.id === id) {
					return {
						...node,
						data: { ...node.data, params: [...params, trimmedName] },
					}
				}
				return node
			})
		)
		setNewParamName('')
	}

	// Remove parameter
	const handleRemoveParam = (index: number) => {
		if (params.length <= 1) return
		setNodes((nodes) =>
			nodes.map((node) => {
				if (node.id === id) {
					return {
						...node,
						data: { ...node.data, params: params.filter((_, i) => i !== index) },
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
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedName)) return
		if (params.includes(trimmedName)) return
		
		setNodes((nodes) =>
			nodes.map((node) => {
				if (node.id === id) {
					return {
						...node,
						data: { ...node.data, params: params.map((p, i) => (i === index ? trimmedName : p)) },
					}
				}
				return node
			})
		)
	}

	return (
		<div style={getPixelBoxStyle('input')}>
			<div style={{ ...getPixelHeaderStyle('input'), justifyContent: 'space-between' }}>
				<span>{label.toUpperCase()}</span>
				<button
					onClick={() => setIsEditing(!isEditing)}
					style={{
						background: 'rgba(255, 255, 255, 0.05)',
						border: `1px solid ${EditorColors.input.border}44`,
						color: EditorColors.input.border,
						cursor: 'pointer',
						padding: '4px 6px',
						fontSize: '7px',
						fontFamily: 'inherit'
					}}
				>
					{isEditing ? 'SYNC' : 'EDIT'}
				</button>
			</div>
			
			<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
				{params.map((param, index) => (
					<div key={`${param}-${index}`} style={{ 
						display: 'flex', 
						alignItems: 'center', 
						justifyContent: 'space-between',
						height: '28px',
						position: 'relative'
					}}>
						<span 
							style={{ 
								fontSize: '8px',
								color: '#ffffff',
								flex: 1,
								cursor: isEditing ? 'pointer' : 'default',
								textDecoration: isEditing ? 'underline dotted' : 'none',
								opacity: 0.9,
								letterSpacing: '0.5px'
							}}
							onClick={() => isEditing && handleRenameParam(index)}
						>
							{param.toUpperCase()}
						</span>
						
						{isEditing && params.length > 1 && (
							<button
								onClick={() => handleRemoveParam(index)}
								style={{
									background: 'none',
									border: 'none',
									color: EditorColors.control.border,
									cursor: 'pointer',
									padding: '0 8px',
									fontSize: '12px'
								}}
							>
								×
							</button>
						)}
						
						<Handle
							type="source"
							position={Position.Right}
							id={`param-${index}`}
							style={{
								width: 10,
								height: 10,
								borderRadius: 0,
								background: 'rgba(5, 8, 10, 0.9)',
								border: `1px solid ${EditorColors.input.border}`,
								boxShadow: `0 0 8px ${EditorColors.input.glow}`,
								right: '-10px'
							}}
						/>
					</div>
				))}
			</div>
			
			{isEditing && (
				<div style={{ 
					marginTop: '12px', 
					paddingTop: '12px', 
					borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
					display: 'flex',
					gap: '4px'
				}}>
					<input
						type="text"
						value={newParamName}
						onChange={(e) => setNewParamName(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && handleAddParam()}
						placeholder="+ ARG"
						className="nodrag"
						style={{ ...getPixelInputStyle(), flex: 1 }}
					/>
					<button
						onClick={handleAddParam}
						style={{
							background: 'rgba(255,255,255,0.05)',
							border: '1px solid rgba(255,255,255,0.1)',
							color: EditorColors.input.border,
							cursor: 'pointer',
							padding: '4px 8px',
							fontSize: '10px',
							fontFamily: 'inherit'
						}}
					>
						+
					</button>
				</div>
			)}
		</div>
	)
})

SpellInputNode.displayName = 'SpellInputNode'
