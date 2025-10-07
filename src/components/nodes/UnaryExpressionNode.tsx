import { Handle, Position } from 'reactflow'
import { Card, Text, Select, Stack } from '@mantine/core'
import { useState } from 'react'

interface UnaryExpressionNodeProps {
	data: {
		astNode: {
			operator: '!' | '-' | '+'
		}
		onChange?: (updates: any) => void
	}
}

export function UnaryExpressionNode({ data }: UnaryExpressionNodeProps) {
	const [operator, setOperator] = useState(data.astNode.operator)

	const operators = [
		{ value: '!', label: '! (Not)' },
		{ value: '-', label: '- (Negative)' },
		{ value: '+', label: '+ (Positive)' }
	]

	const handleChange = (newOp: string | null) => {
		if (newOp) {
			setOperator(newOp as any)
			data.onChange?.({ operator: newOp })
		}
	}

	return (
		<Card shadow="md" padding="sm" className="min-w-[180px] border-2 border-cyan-300">
			<Stack gap="xs">
				<Text size="xs" fw={700} className="text-cyan-600">
					🔷 Unary Operation
				</Text>
				
				<Select
					data={operators}
					value={operator}
					onChange={handleChange}
					size="xs"
					allowDeselect={false}
				/>
				
				<div className="relative">
					<Handle
						type="target"
						position={Position.Left}
						id="operand"
						className="w-3 h-3 !bg-blue-500"
					/>
					<Text size="xs" c="dimmed" className="ml-4">
						◯ operand
					</Text>
				</div>
			</Stack>
			
			<Handle
				type="source"
				position={Position.Right}
				id="output"
				className="w-3 h-3 !bg-cyan-500"
			/>
		</Card>
	)
}
