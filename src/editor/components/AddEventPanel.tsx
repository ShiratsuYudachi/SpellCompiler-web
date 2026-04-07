import { useState, useEffect } from 'react'
import { 
	Button, 
	Select, 
	TextInput, 
	NumberInput, 
	Group, 
	Stack, 
	Text, 
	Tabs, 
    Accordion,
    Code
} from '@mantine/core'
import { PIXEL_FONT, EditorColors, getPixelGlassStyle, getPixelInputStyle } from '../utils/EditorTheme'
import { eventQueue, type EventBinding, BUILT_IN_EVENTS } from '../../game/events/EventQueue'
import { listSpells } from '../utils/spellStorage'

interface SpellOption {
	value: string
	label: string
}

export function AddEventPanel({ initialSpellId, binding, onClose }: { initialSpellId?: string | null, binding?: EventBinding | null, onClose?: () => void }) {
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
    
    // Tab state
    const [activeTab, setActiveTab] = useState<string | null>('key')

	// Load spells on mount
	useEffect(() => {
		const savedSpells = listSpells()
		// Only show spells that have successfully compiled AST
		const compiledSpells = savedSpells.filter(s => s.hasCompiledAST)
		setSpells(compiledSpells.map(s => ({ value: s.id, label: s.name })))
	}, [])

    // Initialize from binding if provided
    useEffect(() => {
        if (binding) {
            if (binding.keyOrButton) {
                setActiveTab('key')
                setSelectedSpell(binding.spellId)
                setSelectedKey(String(binding.keyOrButton))
                setTriggerMode(binding.triggerMode || 'press')
                setHoldInterval(binding.holdInterval || 100)
            } else {
                setActiveTab('custom')
                setCustomSpell(binding.spellId)
                setCustomEventName(binding.eventName)
            }
        } else if (initialSpellId) {
			setSelectedSpell(initialSpellId)
            setCustomSpell(initialSpellId)
		}
    }, [binding, initialSpellId])

	
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
		
        // If editing, remove old binding first
        if (binding) {
            eventQueue.removeBinding(binding.id)
        }

		const eventName = triggerMode === 'hold' ? 'whileKeyHeld' : 
		                  triggerMode === 'release' ? 'onKeyReleased' : 'onKeyPressed'
		
		const newBinding: EventBinding = {
			id: binding ? binding.id : `key-${selectedKey}-${Date.now()}`,
			eventName,
			spellId: selectedSpell,
			triggerMode,
			holdInterval: triggerMode === 'hold' ? holdInterval : undefined,
			keyOrButton: selectedKey
		}
		
		eventQueue.addBinding(newBinding)
		
		// Reset form
		setSelectedSpell(null)
		setSelectedKey('')
        if (onClose) onClose()
	}
	
	// Add custom event binding
	const addCustomBinding = () => {
		if (!customSpell || !customEventName.trim()) return
		
        // If editing, remove old binding first
        if (binding) {
            eventQueue.removeBinding(binding.id)
        }

		const newBinding: EventBinding = {
			id: binding ? binding.id : `custom-${customEventName}-${Date.now()}`, 
			eventName: customEventName.trim(),
			spellId: customSpell
		}
		
		eventQueue.addBinding(newBinding)
		
		// Reset form
		setCustomSpell(null)
		setCustomEventName('')
        if (onClose) onClose()
	}
	
	return (
		<Stack gap="xl" p="xs" style={{ backgroundColor: 'transparent' }}>
			<div style={{ ...getPixelGlassStyle(0.2, 10), padding: '16px', borderStyle: 'dashed' }}>
				<Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius={0}>
					<Tabs.List grow mb="xl">
						<Tabs.Tab value="key" style={{ fontSize: '8px', fontFamily: PIXEL_FONT }}>KEY_BIND</Tabs.Tab>
						<Tabs.Tab value="custom" style={{ fontSize: '8px', fontFamily: PIXEL_FONT }}>CUSTOM_EVT</Tabs.Tab>
					</Tabs.List>

					<Tabs.Panel value="key">
						<Stack gap="md">
							<Select
								label="SCHEMA_ID"
								placeholder="SELECT_SPELL"
								data={spells}
								value={selectedSpell}
								onChange={setSelectedSpell}
								searchable
                                styles={{ input: getPixelInputStyle() }}
							/>
							
							<Group grow align="flex-end">
								<Stack gap={6}>
									<Text size="xs" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '7px' }}>TRIGGER_KEY</Text>
									<Button
										variant="outline"
										color={isCapturingKey ? 'red' : 'gray'}
										onClick={() => setIsCapturingKey(true)}
										style={{ 
											fontSize: '8px',
                                            height: '36px',
                                            border: isCapturingKey ? `2px solid ${EditorColors.control.border}` : '1px solid rgba(255,255,255,0.1)',
                                            backgroundColor: isCapturingKey ? 'rgba(255,0,0,0.1)' : 'rgba(255,255,255,0.02)'
										}}
									>
										{isCapturingKey ? 'CAPTURING...' : (selectedKey ? `KEY: ${selectedKey.toUpperCase()}` : 'CAPT_INPUT')}
									</Button>
								</Stack>
							</Group>

							<Group grow>
								<Select
									label="TRIGGER_MODE"
									data={[
										{ value: 'press', label: 'ON_PRESS' },
										{ value: 'release', label: 'ON_RELEASE' },
										{ value: 'hold', label: 'ON_HOLD' }
									]}
									value={triggerMode}
									onChange={(v) => setTriggerMode(v as 'press' | 'release' | 'hold')}
                                    styles={{ input: getPixelInputStyle() }}
								/>
								{triggerMode === 'hold' && (
									<NumberInput
										label="CYCLE_MS"
										value={holdInterval}
										onChange={(v) => setHoldInterval(typeof v === 'number' ? v : 100)}
										min={16}
										max={5000}
										step={10}
                                        styles={{ input: getPixelInputStyle() }}
									/>
								)}
							</Group>

							<Button 
								fullWidth 
								mt="md" 
								onClick={addKeyBinding} 
								disabled={!selectedSpell || !selectedKey}
								color="blue"
                                style={{ boxShadow: `0 0 15px ${EditorColors.data.glow}` }}
							>
								{binding ? 'UPDATE_BIND' : 'COMMIT_BIND'}
							</Button>
						</Stack>
					</Tabs.Panel>

					<Tabs.Panel value="custom">
						<Stack gap="md">
							<TextInput
								label="EVENT_NAME"
								placeholder="e.g., ON_TICK"
								value={customEventName}
								onChange={(e) => setCustomEventName(e.currentTarget.value)}
                                styles={{ input: getPixelInputStyle() }}
							/>
							<Select
								label="HANDLER_ID"
								placeholder="SELECT_SPELL"
								data={spells}
								value={customSpell}
								onChange={setCustomSpell}
								searchable
                                styles={{ input: getPixelInputStyle() }}
							/>
							<Button 
								fullWidth 
								mt="md" 
								onClick={addCustomBinding} 
								disabled={!customSpell || !customEventName.trim()}
								color="violet"
                                style={{ boxShadow: `0 0 15px ${EditorColors.output.glow}` }}
							>
								{binding ? 'UPDATE_LISTENER' : 'COMMIT_LISTENER'}
							</Button>
						</Stack>
					</Tabs.Panel>
				</Tabs>
			</div>
            
            <Accordion variant="separated" radius={0} styles={{ item: { border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.01)' } }}>
				<Accordion.Item value="builtin">
					<Accordion.Control>
						<Text style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)', fontFamily: PIXEL_FONT }}>BUILT_IN_REF</Text>
					</Accordion.Control>
					<Accordion.Panel>
						<Stack gap="xs">
							{Object.entries(BUILT_IN_EVENTS).map(([name, info]) => (
								<Group key={name} justify="space-between" wrap="nowrap">
									<Text style={{ fontSize: '7px', color: EditorColors.data.border }}>{name}</Text>
									<Code style={{ fontSize: '6px', backgroundColor: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.5)' }}>{info.params.join(', ') || 'VOID'}</Code>
								</Group>
							))}
						</Stack>
					</Accordion.Panel>
				</Accordion.Item>
			</Accordion>
		</Stack>
	)
}
