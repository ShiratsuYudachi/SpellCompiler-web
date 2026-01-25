/**
 * EventListPanel - UI for listing and managing active event bindings
 */

import { useState, useEffect } from 'react'
import { Button, Group, Stack, Text, Badge, ActionIcon, ScrollArea, Paper, Title, Code } from '@mantine/core'
import { eventQueue, type EventBinding } from '../../game/events/EventQueue'
import { listSpells } from '../utils/spellStorage'

interface SpellOption {
	value: string
	label: string
}

export function EventListPanel({ onAdd }: { onAdd?: () => void }) {
	const [bindings, setBindings] = useState<EventBinding[]>([])
	const [spells, setSpells] = useState<SpellOption[]>([])
	
	// Load spells and bindings on mount
	useEffect(() => {
		const savedSpells = listSpells()
		setSpells(savedSpells.map(s => ({ value: s.id, label: s.name })))
		setBindings(eventQueue.getBindings())

        // Subscribe to changes
        const unsubscribe = eventQueue.subscribe(() => {
            setBindings(eventQueue.getBindings())
        })
        return unsubscribe
	}, [])
	
	// Remove binding
	const removeBinding = (bindingId: string) => {
		eventQueue.removeBinding(bindingId)
	}
	
	// Get spell name by ID
	const getSpellName = (spellId: string): string => {
		const spell = spells.find(s => s.value === spellId)
		return spell?.label || spellId
	}
	
	return (
		<Stack h="100%" gap="md" p="md">
			<Group justify="space-between" align="center">
				<Group gap="xs">
					<Title order={4}>Active Bindings</Title>
					<Badge size="lg" variant="light" color="blue">{bindings.length} Active</Badge>
				</Group>
				{onAdd && (
					<Button size="xs" variant="light" onClick={onAdd}>
						+ Add Binding
					</Button>
				)}
			</Group>
			
			<ScrollArea style={{ flex: 1, minHeight: 200 }} offsetScrollbars>
				<Stack gap="xs">
					{bindings.length === 0 ? (
						<Paper p="xl" withBorder style={{ borderStyle: 'dashed', textAlign: 'center', backgroundColor: 'transparent' }}>
							<Text c="dimmed" size="sm">No active bindings</Text>
							<Text c="dimmed" size="xs" mt={4}>Add a binding to get started</Text>
						</Paper>
					) : (
						bindings.map((binding) => (
							<Paper 
								key={binding.id} 
								shadow="xs" 
								p="sm" 
								radius="md" 
								withBorder
								style={{ 
									display: 'flex', 
									alignItems: 'center', 
									justifyContent: 'space-between',
									transition: 'transform 0.2s, box-shadow 0.2s',
								}}
							>
								<Stack gap={4} style={{ flex: 1 }}>
									<Group gap="xs" wrap="nowrap">
										<Badge 
											color={binding.keyOrButton !== undefined ? 'blue' : 'violet'} 
											variant="light"
											size="sm"
										>
											{binding.eventName}
										</Badge>
										{binding.keyOrButton !== undefined && (
											<Code fz="xs" fw={700} c="blue">{String(binding.keyOrButton)}</Code>
										)}
									</Group>
									
									<Group gap={6} align="center">
										<Text size="xs" c="dimmed">triggers</Text>
										<Text size="sm" fw={600} c="dark">{getSpellName(binding.spellId)}</Text>
									</Group>

									{(binding.triggerMode || binding.holdInterval) && (
										<Group gap={6}>
											{binding.triggerMode && (
												<Badge variant="outline" color="gray" size="xs" style={{ textTransform: 'none' }}>
													mode: {binding.triggerMode}
												</Badge>
											)}
											{binding.holdInterval && (
												<Badge variant="outline" color="orange" size="xs" style={{ textTransform: 'none' }}>
													{binding.holdInterval}ms
												</Badge>
											)}
										</Group>
									)}
								</Stack>

								<ActionIcon 
									color="red" 
									variant="light" 
									size="lg"
									onClick={() => removeBinding(binding.id)}
									aria-label="Remove binding"
								>
									✕
								</ActionIcon>
							</Paper>
						))
					)}
				</Stack>
			</ScrollArea>
		</Stack>
	)
}
