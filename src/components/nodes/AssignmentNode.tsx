import { Handle, Position } from 'reactflow'
import { Card, Text, Stack } from '@mantine/core'

export function AssignmentNode() {
	return (
		<Card shadow="md" padding="sm" className="min-w-[200px] border-2 border-green-300">
			<Stack gap="xs">
				<Text size="xs" fw={700} className="text-green-600">
					🟩 Assignment
				</Text>
				
				<Text size="sm" className="text-center font-mono font-bold">
					=
				</Text>
				
				<div className="relative">
					<Handle
						type="target"
						position={Position.Left}
						id="left"
						style={{ top: '30%' }}
						className="w-3 h-3 !bg-blue-500"
					/>
					<Text size="xs" c="dimmed" className="ml-4">
						◯ variable
					</Text>
				</div>
				
				<div className="relative">
					<Handle
						type="target"
						position={Position.Left}
						id="right"
						style={{ top: '70%' }}
						className="w-3 h-3 !bg-blue-500"
					/>
					<Text size="xs" c="dimmed" className="ml-4">
						◯ value
					</Text>
				</div>
			</Stack>
			
			<Handle
				type="source"
				position={Position.Bottom}
				id="next"
				className="w-3 h-3 !bg-green-500"
			/>
		</Card>
	)
}
