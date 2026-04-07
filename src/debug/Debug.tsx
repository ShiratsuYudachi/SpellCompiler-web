import { useState, useEffect, useRef } from 'react'
import { Container, Title, Button, Group, Text, Paper, Box } from '@mantine/core'
import Phaser from 'phaser'
import { DebugScene } from './DebugScene'

export default function DebugPage() {
	const [count, setCount] = useState(0)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!containerRef.current) return
		
		const game = new Phaser.Game({
			type: Phaser.AUTO,
			parent: containerRef.current,
			width: 960,
			height: 540,
			scene: [DebugScene],
			physics: {
				default: 'arcade',
				arcade: { debug: true }
			}
		})

		return () => {
			game.destroy(true)
		}
	}, [])

	return (
		<Container size="lg" py="xl">
			<Title order={1} mb="md">Debug / Testing Hub</Title>
			<Paper shadow="xs" p="md" withBorder mb="lg">
				<Text mb="sm">This page is reserved for testing experimental components.</Text>
				<Group>
					<Button onClick={() => setCount((c) => c + 1)}>
						Click Tester: {count}
					</Button>
				</Group>
			</Paper>
			<Box ref={containerRef} style={{ border: '2px solid red', width: 960, height: 540, margin: '0 auto' }} />
		</Container>
	)
}
