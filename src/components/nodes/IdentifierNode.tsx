import { Handle, Position } from 'reactflow'
import { Card, Text, TextInput, Stack } from '@mantine/core'
import { useState } from 'react'

interface IdentifierNodeProps {
	data: {
		astNode: {
			name: string
		}
		onChange?: (updates: any) => void
	}
}

export function IdentifierNode({ data }: IdentifierNodeProps) {
	const [name, setName] = useState(data.astNode.name)

	const handleChange = (newName: string) => {
		setName(newName)
		data.onChange?.({ name: newName })
	}

	return (
		<Card shadow="md" padding="sm" className="min-w-[180px] border-2 border-purple-300">
			<Stack gap="xs">
				<Text size="xs" fw={700} className="text-purple-600">
					🟪 Variable
				</Text>
				
				<TextInput
					value={name}
					onChange={(e) => handleChange(e.target.value)}
					size="xs"
					placeholder="variable name"
				/>
			</Stack>
			
			<Handle
				type="source"
				position={Position.Right}
				id="output"
				className="w-3 h-3 !bg-purple-500"
			/>
		</Card>
	)
}
