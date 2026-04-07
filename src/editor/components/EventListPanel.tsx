import { useState, useEffect } from 'react'
import { Button, Group, Stack, Text, Badge, ActionIcon, ScrollArea, Tooltip, Code } from '@mantine/core'
import { PIXEL_FONT, EditorColors, getPixelGlassStyle } from '../utils/EditorTheme'
import { eventQueue, type EventBinding } from '../../game/events/EventQueue'
import { listSpells } from '../utils/spellStorage'

interface SpellOption {
	value: string
	label: string
}

export function EventListPanel({ onAdd, onEdit }: { onAdd?: () => void, onEdit?: (binding: EventBinding) => void }) {
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
		if (confirm('RESCIND_BINDING_AUTHORIZATION?')) {
            eventQueue.removeBinding(bindingId)
        }
	}
	
	// Get spell name by ID
	const getSpellName = (spellId: string): string => {
		const spell = spells.find(s => s.value === spellId)
		return spell?.label.toUpperCase() || spellId
	}
	
	return (
		<Stack gap="xl" p="xs" style={{ backgroundColor: 'transparent' }}>
			<Group justify="space-between" align="center">
				<Group gap="md">
					<Text style={{ fontFamily: PIXEL_FONT, fontSize: '10px', color: EditorColors.data.border }}>ACTIVE_REGISTRY</Text>
					<Badge size="xs" variant="outline" color="cyan" radius={0} style={{ fontFamily: PIXEL_FONT, fontSize: '6px', border: `1px solid ${EditorColors.data.border}44` }}>{bindings.length} ACTIVE</Badge>
				</Group>
				{onAdd && (
					<Button size="xs" variant="filled" color="blue" onClick={onAdd} style={{ fontSize: '7px' }}>
						+ ADD_DESCRIPTOR
					</Button>
				)}
			</Group>
			
			<ScrollArea h={320} offsetScrollbars>
				<Stack gap="md">
					{bindings.length === 0 ? (
						<div style={{ 
                            padding: '40px', 
                            textAlign: 'center', 
                            border: '1px dashed rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.2)',
                            fontSize: '9px'
                        }}>
							-- NO_ACTIVE_LIST_FILTRATION --
						</div>
					) : (
						bindings.map((binding) => (
							<div 
								key={binding.id} 
								style={{ 
									...getPixelGlassStyle(0.1, 12),
                                    padding: '16px 20px',
                                    borderLeft: `3px solid ${binding.keyOrButton ? EditorColors.data.border : EditorColors.output.border}`,
									display: 'flex', 
									alignItems: 'center', 
									justifyContent: 'space-between',
								}}
							>
								<Stack gap={6} style={{ flex: 1 }}>
									<Group gap="xs" wrap="nowrap">
										<Text style={{ 
                                            fontSize: '9px', 
                                            color: binding.keyOrButton ? EditorColors.data.border : EditorColors.output.border,
                                            fontWeight: 'bold',
                                            letterSpacing: '1px'
                                        }}>
											{binding.eventName.toUpperCase()}
										</Text>
										{binding.keyOrButton !== undefined && (
											<Code style={{ 
                                                fontSize: '8px', 
                                                backgroundColor: 'rgba(255,255,255,0.05)', 
                                                color: '#fff',
                                                border: '1px solid rgba(255,255,255,0.1)'
                                            }}>{String(binding.keyOrButton).toUpperCase()}</Code>
										)}
									</Group>
									
									<Group gap={8} align="center">
										<Text style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)' }}>INVOKES:</Text>
										<Text style={{ fontSize: '9px', color: '#fff', letterSpacing: '0.5px' }}>{getSpellName(binding.spellId)}</Text>
									</Group>

									{(binding.triggerMode || binding.holdInterval) && (
										<Group gap={8}>
											{binding.triggerMode && (
												<Text style={{ fontSize: '6px', color: 'rgba(255,255,255,0.2)' }}>
													MODE: [{binding.triggerMode.toUpperCase()}]
												</Text>
											)}
											{binding.holdInterval && (
												<Text style={{ fontSize: '6px', color: 'rgba(255,255,255,0.2)' }}>
													INTERVAL: [{binding.holdInterval}MS]
												</Text>
											)}
										</Group>
									)}
								</Stack>

								<Group gap={8}>
									{onEdit && (
										<Tooltip label="MODIFY_PARAMETERS" position="left">
                                            <ActionIcon 
                                                color="blue" 
                                                variant="subtle" 
                                                onClick={() => onEdit(binding)}
                                                style={{ border: '1px solid rgba(0, 210, 255, 0.1)' }}
                                            >
                                                ✎
                                            </ActionIcon>
                                        </Tooltip>
									)}
									<ActionIcon 
										color="red" 
										variant="subtle" 
										onClick={() => removeBinding(binding.id)}
                                        style={{ border: '1px solid rgba(255, 0, 85, 0.1)' }}
									>
										×
									</ActionIcon>
								</Group>
							</div>
						))
					)}
				</Stack>
			</ScrollArea>
		</Stack>
	)
}
