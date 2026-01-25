/**
 * EventBindingPanel - UI for managing event bindings
 * 
 * Features:
 * - Quick key bindings (select spell + key + trigger mode)
 * - Custom event bindings (event name + handler spell)
 */

import { useState, useEffect } from 'react'
import { Button, Select, TextInput, NumberInput, Group, Stack, Text, Card, Badge, ActionIcon } from '@mantine/core'
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
		<Stack gap="md" p="md">
			<Text size="lg" fw={700}>Event Bindings</Text>
			
			{/* Quick Key Binding */}
			<Card withBorder p="sm">
				<Text size="sm" fw={600} mb="xs">Quick Key Binding</Text>
				<Stack gap="xs">
					<Select
						label="Spell"
						placeholder="Select a spell"
						data={spells}
						value={selectedSpell}
						onChange={setSelectedSpell}
						searchable
					/>
					<div>
						<Text size="sm" fw={500} mb={4}>Key</Text>
						<Button
							variant={isCapturingKey ? 'filled' : 'light'}
							color={isCapturingKey ? 'orange' : 'blue'}
							fullWidth
							onClick={() => setIsCapturingKey(true)}
						>
							{isCapturingKey ? '⌨️ Press any key...' : (selectedKey || 'Click to capture key')}
						</Button>
						{selectedKey && !isCapturingKey && (
							<Button
								size="xs"
								variant="subtle"
								color="gray"
								fullWidth
								mt={4}
								onClick={() => setSelectedKey('')}
							>
								Clear
							</Button>
						)}
					</div>
					<Select
						label="Trigger Mode"
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
						/>
					)}
					<Button onClick={addKeyBinding} disabled={!selectedSpell || !selectedKey}>
						Add Key Binding
					</Button>
				</Stack>
			</Card>
			
			{/* Custom Event Binding */}
			<Card withBorder p="sm">
				<Text size="sm" fw={600} mb="xs">Custom Event Binding</Text>
				<Stack gap="xs">
					<TextInput
						label="Event Name"
						placeholder="e.g., onBulletNear"
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
					/>
					<Button onClick={addCustomBinding} disabled={!customSpell || !customEventName.trim()}>
						Add Custom Binding
					</Button>
				</Stack>
			</Card>
			
			{/* Active Bindings */}
			<Card withBorder p="sm">
				<Text size="sm" fw={600} mb="xs">Active Bindings ({bindings.length})</Text>
				<Stack gap="xs">
					{bindings.length === 0 ? (
						<Text size="sm" c="dimmed">No bindings yet</Text>
					) : (
						bindings.map((binding) => (
							<Group key={binding.id} justify="space-between" p="xs" style={{ background: '#f8f9fa', borderRadius: 4 }}>
								<Group gap="xs">
									<Badge color="blue" size="sm">{binding.eventName}</Badge>
									{binding.keyOrButton !== undefined && (
										<Badge color="cyan" size="sm" variant="light">
											Key: {String(binding.keyOrButton)}
										</Badge>
									)}
									<Text size="sm">→</Text>
									<Text size="sm" fw={500}>{getSpellName(binding.spellId)}</Text>
									{binding.triggerMode && (
										<Badge color="gray" size="xs">{binding.triggerMode}</Badge>
									)}
									{binding.holdInterval && (
										<Badge color="orange" size="xs">{binding.holdInterval}ms</Badge>
									)}
								</Group>
								<ActionIcon 
									color="red" 
									variant="subtle" 
									size="sm"
									onClick={() => removeBinding(binding.id)}
								>
									✕
								</ActionIcon>
							</Group>
						))
					)}
				</Stack>
			</Card>
			
			{/* Built-in Events Reference */}
			<Card withBorder p="sm">
				<Text size="sm" fw={600} mb="xs">Built-in Events</Text>
				<Stack gap={4}>
					{Object.entries(BUILT_IN_EVENTS).map(([name, info]) => (
						<Group key={name} gap="xs">
							<Badge color="violet" size="xs">{name}</Badge>
							<Text size="xs" c="dimmed">({info.params.join(', ')})</Text>
						</Group>
					))}
				</Stack>
			</Card>
		</Stack>
	)
}
