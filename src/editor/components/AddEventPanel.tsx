/**
 * AddEventPanel - UI for adding new event bindings
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
	Tabs, 
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

export function AddEventPanel({ initialSpellId, onClose }: { initialSpellId?: string | null, onClose?: () => void }) {
	const [spells, setSpells] = useState<SpellOption[]>([])
	
	// New binding form state
	const [selectedSpell, setSelectedSpell] = useState<string | null>(initialSpellId || null)
	const [selectedKey, setSelectedKey] = useState('')
	const [isCapturingKey, setIsCapturingKey] = useState(false)
	const [triggerMode, setTriggerMode] = useState<'press' | 'release' | 'hold'>('press')
	const [holdInterval, setHoldInterval] = useState(100)
	
	// Custom event form state
	const [customEventName, setCustomEventName] = useState('')
	const [customSpell, setCustomSpell] = useState<string | null>(initialSpellId || null)
	
	// Load spells on mount
	useEffect(() => {
		const savedSpells = listSpells()
		// Only show spells that have successfully compiled AST
		const compiledSpells = savedSpells.filter(s => s.hasCompiledAST)
		setSpells(compiledSpells.map(s => ({ value: s.id, label: s.name })))
	}, [])

	// Update selected spell when initialSpellId changes
	useEffect(() => {
		if (initialSpellId) {
			setSelectedSpell(initialSpellId)
            setCustomSpell(initialSpellId)
		}
	}, [initialSpellId])
	
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
		
		// Reset form
		setSelectedSpell(null)
		setSelectedKey('')
        if (onClose) onClose()
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
		
		// Reset form
		setCustomSpell(null)
		setCustomEventName('')
        if (onClose) onClose()
	}
	
	return (
		<Stack h="100%" gap="md" p="md">
			<Title order={4}>Add Event Binding</Title>
			
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
