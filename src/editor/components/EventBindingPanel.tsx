/**
 * EventBindingPanel - UI for managing event bindings
 * 
 * Features:
 * - Quick key bindings (select spell + key + trigger mode)
 * - Custom event bindings (event name + handler spell)
 */

import { useState, useEffect } from 'react'
import { 
	Button, 
	Select, 
	TextInput, 
	NumberInput, 
	Group, 
	Stack, 
	Text, 
	Card, 
	Badge, 
	ActionIcon, 
	Tabs, 
	Divider, 
	ScrollArea,
	Paper,
	Title,
	Accordion,
	Code
} from '@mantine/core'
import { eventQueue, type EventBinding, BUILT_IN_EVENTS } from '../../game/events/EventQueue'
import { listSpells } from '../utils/spellStorage'

interface SpellOption {
	value: string
	label: string
}

export function EventBindingPanel() {
	const [bindings, setBindings] = useState<EventBinding[]>([])
	const [spells, setSpells] = useState<SpellOption[]>([])
	
	// New binding form state
	const [selectedSpell, setSelectedSpell] = useState<string | null>(null)
	const [selectedKey, setSelectedKey] = useState('')
	const [isCapturingKey, setIsCapturingKey] = useState(false)
	const [triggerMode, setTriggerMode] = useState<'press' | 'release' | 'hold'>('press')
	const [holdInterval, setHoldInterval] = useState(100)
	
	// Custom event form state
	const [customEventName, setCustomEventName] = useState('')
	const [customSpell, setCustomSpell] = useState<string | null>(null)
	
	// Load spells and bindings on mount
	useEffect(() => {
		const savedSpells = listSpells()
		// Only show spells that have successfully compiled AST
		const compiledSpells = savedSpells.filter(s => s.hasCompiledAST)
		setSpells(compiledSpells.map(s => ({ value: s.id, label: s.name })))
		setBindings(eventQueue.getBindings())
	}, [])
	
	// Key capture handler
	useEffect(() => {
		if (!isCapturingKey) return
		
		const handleKeyDown = (e: KeyboardEvent) => {
			e.preventDefault()
			e.stopPropagation()
			
			// Use event.key for the key value
			setSelectedKey(e.key)
			setIsCapturingKey(false)
		}
		
		window.addEventListener('keydown', handleKeyDown, true)
		
		return () => {
			window.removeEventListener('keydown', handleKeyDown, true)
		}
	}, [isCapturingKey])
	
	const refreshBindings = () => {
		setBindings(eventQueue.getBindings())
	}
	
	// Add quick key binding
	const addKeyBinding = () => {
		if (!selectedSpell || !selectedKey) return
		
		const eventName = triggerMode === 'hold' ? 'whileKeyHeld' : 
		                  triggerMode === 'release' ? 'onKeyReleased' : 'onKeyPressed'
		
		const binding: EventBinding = {
			id: `key-${selectedKey}-${Date.now()}`,
			eventName,
			spellId: selectedSpell,
			triggerMode,
			holdInterval: triggerMode === 'hold' ? holdInterval : undefined,
			keyOrButton: selectedKey  // Store the specific key
		}
		
		eventQueue.addBinding(binding)
		refreshBindings()
		
		// Reset form
		setSelectedSpell(null)
		setSelectedKey('')
	}
	
	// Add custom event binding
	const addCustomBinding = () => {
		if (!customSpell || !customEventName.trim()) return
		
		const binding: EventBinding = {
			id: `custom-${customEventName}-${Date.now()}`,
			eventName: customEventName.trim(),
			spellId: customSpell
		}
		
		eventQueue.addBinding(binding)
		refreshBindings()
		
		// Reset form
		setCustomSpell(null)
		setCustomEventName('')
	}
	
	// Remove binding
	const removeBinding = (bindingId: string) => {
		eventQueue.removeBinding(bindingId)
		refreshBindings()
	}
	
	// Get spell name by ID
	const getSpellName = (spellId: string): string => {
		const spell = spells.find(s => s.value === spellId)
		return spell?.label || spellId
	}
	
	return (
		<Stack h="100%" gap="md" p="md">
			<Group justify="space-between" align="center">
				<Title order={4}>Event Manager</Title>
				<Badge size="lg" variant="light" color="blue">{bindings.length} Active</Badge>
			</Group>
			
			<Card withBorder shadow="sm" radius="md" p={0}>
				<Tabs defaultValue="key" variant="pills" radius="md" p="xs">
					<Tabs.List grow mb="xs">
						<Tabs.Tab value="key">Key Binding</Tabs.Tab>
						<Tabs.Tab value="custom">Custom Event</Tabs.Tab>
					</Tabs.List>

					<Tabs.Panel value="key">
						<Stack gap="xs" p="xs">
							<Select
								label="Spell"
								placeholder="Select a spell to trigger"
								data={spells}
								value={selectedSpell}
								onChange={setSelectedSpell}
								searchable
								checkIconPosition="right"
							/>
							
							<Group grow align="flex-end">
								<Stack gap={4} style={{ flex: 1 }}>
									<Text size="sm" fw={500}>Trigger Key</Text>
									<Button
										variant={isCapturingKey ? 'filled' : 'light'}
										color={isCapturingKey ? 'red' : 'gray'}
										onClick={() => setIsCapturingKey(true)}
										style={{ 
											transition: 'all 0.2s',
											border: isCapturingKey ? '2px solid var(--mantine-color-red-6)' : undefined
										}}
									>
										{isCapturingKey ? 'Press any key...' : (selectedKey ? `Key: ${selectedKey}` : 'Click to Capture')}
									</Button>
								</Stack>
								
								{selectedKey && !isCapturingKey && (
									<Button 
										variant="subtle" 
										color="gray" 
										onClick={() => setSelectedKey('')}
										style={{ flex: 0, paddingLeft: 8, paddingRight: 8 }}
									>
										✕
									</Button>
								)}
							</Group>

							<Group grow>
								<Select
									label="Mode"
									data={[
										{ value: 'press', label: 'On Press' },
										{ value: 'release', label: 'On Release' },
										{ value: 'hold', label: 'While Holding' }
									]}
									value={triggerMode}
									onChange={(v) => setTriggerMode(v as 'press' | 'release' | 'hold')}
								/>
								{triggerMode === 'hold' && (
									<NumberInput
										label="Interval (ms)"
										value={holdInterval}
										onChange={(v) => setHoldInterval(typeof v === 'number' ? v : 100)}
										min={16}
										max={5000}
										step={10}
									/>
								)}
							</Group>

							<Button 
								fullWidth 
								mt="xs" 
								onClick={addKeyBinding} 
								disabled={!selectedSpell || !selectedKey}
								variant="filled"
								color="blue"
							>
								Add Key Binding
							</Button>
						</Stack>
					</Tabs.Panel>

					<Tabs.Panel value="custom">
						<Stack gap="xs" p="xs">
							<TextInput
								label="Event Name"
								placeholder="e.g., onBulletNear"
								description="Name of the event to listen for"
								value={customEventName}
								onChange={(e) => setCustomEventName(e.currentTarget.value)}
							/>
							<Select
								label="Handler Spell"
								placeholder="Select a spell"
								data={spells}
								value={customSpell}
								onChange={setCustomSpell}
								searchable
								checkIconPosition="right"
							/>
							<Button 
								fullWidth 
								mt="xs" 
								onClick={addCustomBinding} 
								disabled={!customSpell || !customEventName.trim()}
								variant="filled"
								color="violet"
							>
								Add Custom Binding
							</Button>
						</Stack>
					</Tabs.Panel>
				</Tabs>
			</Card>
			
			<Divider label="Active Bindings" labelPosition="center" />
			
			<ScrollArea style={{ flex: 1, minHeight: 200 }} offsetScrollbars>
				<Stack gap="xs">
					{bindings.length === 0 ? (
						<Paper p="xl" withBorder style={{ borderStyle: 'dashed', textAlign: 'center', backgroundColor: 'transparent' }}>
							<Text c="dimmed" size="sm">No active bindings</Text>
							<Text c="dimmed" size="xs" mt={4}>Add a binding above to get started</Text>
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
			
			<Accordion variant="contained" radius="md">
				<Accordion.Item value="builtin">
					<Accordion.Control icon="ℹ️">
						<Text size="sm">Built-in Events Reference</Text>
					</Accordion.Control>
					<Accordion.Panel>
						<Stack gap="xs">
							{Object.entries(BUILT_IN_EVENTS).map(([name, info]) => (
								<Group key={name} justify="space-between" wrap="nowrap">
									<Text size="xs" fw={500} style={{ flex: 1 }}>{name}</Text>
									<Code fz="xs" c="dimmed">{info.params.join(', ') || 'no params'}</Code>
								</Group>
							))}
						</Stack>
					</Accordion.Panel>
				</Accordion.Item>
			</Accordion>
		</Stack>
	)
}
