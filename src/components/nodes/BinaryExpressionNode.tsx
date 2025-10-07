import { Handle, Position } from 'reactflow'
import { Card, Text, Select, Stack } from '@mantine/core'
import { useState } from 'react'

interface BinaryExpressionNodeProps {
	data: {
		astNode: {
			operator: '+' | '-' | '*' | '/' | '>' | '<' | '==' | '&&' | '||'
		}
		onChange?: (updates: any) => void
	}
}

export function BinaryExpressionNode({ data }: BinaryExpressionNodeProps) {
	const [operator, setOperator] = useState(data.astNode.operator)

	const operators = [
		{ value: '+', label: '+ (Add)' },
		{ value: '-', label: '- (Subtract)' },
		{ value: '*', label: '* (Multiply)' },
		{ value: '/', label: '/ (Divide)' },
		{ value: '>', label: '> (Greater)' },
		{ value: '<', label: '< (Less)' },
		{ value: '==', label: '== (Equal)' },
		{ value: '&&', label: '&& (And)' },
		{ value: '||', label: '|| (Or)' }
	]

	const handleChange = (newOp: string | null) => {
		if (newOp) {
			setOperator(newOp as any)
			data.onChange?.({ operator: newOp })
		}
	}

	return (
		<Card shadow="md" padding="sm" className="min-w-[200px] border-2 border-yellow-300">
			<Stack gap="xs">
				<Text size="xs" fw={700} className="text-yellow-600">
					🟨 Binary Operation
				</Text>
				
				<div className="relative">
					<Handle
						type="target"
						position={Position.Left}
						id="left"
						style={{ top: '35%' }}
						className="w-3 h-3 !bg-blue-500"
					/>
					<Text size="xs" c="dimmed" className="ml-4">
						◯ left
					</Text>
				</div>
				
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
						id="right"
						style={{ top: '75%' }}
						className="w-3 h-3 !bg-blue-500"
					/>
					<Text size="xs" c="dimmed" className="ml-4">
						◯ right
					</Text>
				</div>
			</Stack>
			
			<Handle
				type="source"
				position={Position.Right}
				id="output"
				className="w-3 h-3 !bg-yellow-500"
			/>
		</Card>
	)
}
