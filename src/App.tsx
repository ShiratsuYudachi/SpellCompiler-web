import { Button, Title, Text, Paper, Group, Container } from '@mantine/core'
import { useState } from 'react'

function App() {
	const [count, setCount] = useState(0)

	return (
		<Container size="md" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
			<Paper shadow="xl" radius="lg" p="xl" className="w-full max-w-md">
				<div className="text-center space-y-6">
					<Title order={1} className="text-indigo-600">
						🎉 Hello World!
					</Title>
					
					<Text size="lg" c="dimmed">
						Welcome to SpellCompiler Web
					</Text>

					<div className="bg-indigo-50 rounded-lg p-6 border-2 border-indigo-200">
						<Text size="xl" fw={700} className="text-indigo-700">
							Count: {count}
						</Text>
					</div>

					<Group justify="center" gap="md">
						<Button 
							variant="filled" 
							color="indigo"
							size="lg"
							onClick={() => setCount(count + 1)}
							className="transition-transform hover:scale-105"
						>
							Increment
						</Button>
						
						<Button 
							variant="outline" 
							color="indigo"
							size="lg"
							onClick={() => setCount(0)}
							className="transition-transform hover:scale-105"
						>
							Reset
						</Button>
					</Group>

					<div className="pt-4 border-t border-gray-200">
						<Text size="sm" c="dimmed">
							Built with React + TypeScript + Tailwind + Mantine
						</Text>
					</div>
				</div>
			</Paper>
		</Container>
	)
}

export default App
