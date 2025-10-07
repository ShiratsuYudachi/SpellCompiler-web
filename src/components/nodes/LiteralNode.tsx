import { Handle, Position } from 'reactflow'
import { Card, Text, NumberInput, TextInput, Switch, Stack } from '@mantine/core'
import { useState } from 'react'

interface LiteralNodeProps {
	data: {
		astNode: {
			value: number | string | boolean
			dataType: 'number' | 'string' | 'boolean'
		}
		onChange?: (updates: any) => void
	}
}

export function LiteralNode({ data }: LiteralNodeProps) {
	const [value, setValue] = useState(data.astNode.value)

	const handleChange = (newValue: any) => {
		setValue(newValue)
		data.onChange?.({ value: newValue })
	}

	return (
		<Card shadow="md" padding="sm" className="min-w-[180px] border-2 border-orange-300">
			<Stack gap="xs">
				<Text size="xs" fw={700} className="text-orange-600">
					🟧 Literal
				</Text>
				
				{data.astNode.dataType === 'number' && (
					<NumberInput
						value={value as number}
						onChange={handleChange}
						size="xs"
						placeholder="Enter number"
					/>
				)}
				
				{data.astNode.dataType === 'string' && (
					<TextInput
						value={value as string}
						onChange={(e) => handleChange(e.target.value)}
						size="xs"
						placeholder="Enter string"
					/>
				)}
				
				{data.astNode.dataType === 'boolean' && (
					<Switch
						checked={value as boolean}
						onChange={(e) => handleChange(e.currentTarget.checked)}
						label={value ? 'true' : 'false'}
						size="sm"
					/>
				)}
				
				<Text size="xs" c="dimmed">
					Type: {data.astNode.dataType}
				</Text>
			</Stack>
			
			<Handle
				type="source"
				position={Position.Right}
				id="output"
				className="w-3 h-3 !bg-orange-500"
			/>
		</Card>
	)
}
