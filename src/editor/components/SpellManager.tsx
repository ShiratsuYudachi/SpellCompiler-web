import { useEffect, useState } from 'react'
import { Badge, Button, Group, Stack, Text, TextInput, Modal, ActionIcon, Tooltip } from '@mantine/core'
import { deleteSpell, duplicateSpell, listSpells, loadSpell, type SpellMeta } from '../utils/spellStorage'
import { AddEventPanel } from './AddEventPanel'
import { EditorColors, PIXEL_FONT, getPixelBoxStyle, getPixelGlassStyle, getPixelInputStyle } from '../utils/EditorTheme'

export function SpellManager(props: {
	onNew: (name: string) => void
	onEdit: (id: string) => void
	onBind: (id: string) => void
}) {
	const [spells, setSpells] = useState<SpellMeta[]>([])
	const [name, setName] = useState('New Spell')
	const [error, setError] = useState<string | null>(null)
	const [bindingModalOpen, setBindingModalOpen] = useState(false)
	const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null)
    
    // Duplicate modal state
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
    const [spellToDuplicate, setSpellToDuplicate] = useState<string | null>(null)
    const [duplicateName, setDuplicateName] = useState('')

	const refresh = () => setSpells(listSpells())

	useEffect(() => {
		refresh()
	}, [])

    const handleDuplicateClick = (id: string) => {
        const spell = loadSpell(id)
        if (spell) {
            setSpellToDuplicate(id)
            setDuplicateName(`Copy of ${spell.name}`)
            setDuplicateModalOpen(true)
        }
    }

    const confirmDuplicate = () => {
        if (spellToDuplicate && duplicateName.trim()) {
            duplicateSpell(spellToDuplicate, duplicateName.trim())
            setDuplicateModalOpen(false)
            setSpellToDuplicate(null)
            setDuplicateName('')
            refresh()
        }
    }

	return (
		<div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            backgroundColor: EditorColors.bg, // Sync with Editor Theme
            color: '#fff', 
            fontFamily: PIXEL_FONT 
        }}>
			{/* Library Header */}
			<div style={{ 
                ...getPixelGlassStyle(0.3, 10),
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}>
				<Group justify="space-between">
					<Stack gap={4}>
                        <Text style={{ 
                            fontSize: '12px', 
                            fontFamily: PIXEL_FONT, 
                            letterSpacing: '2px',
                            color: EditorColors.data.border,
                            textShadow: `0 0 10px ${EditorColors.data.glow}`
                        }}>
                            SPELL_REQUISITION
                        </Text>
                        <Text size="xs" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '7px' }}>
                            ACTIVE_DATABASE_v2.0
                        </Text>
                    </Stack>
					<Group gap="xs">
						<TextInput
							value={name}
							onChange={(e) => setName(e.currentTarget.value)}
							placeholder="ENTER_SPELL_KEY"
                            size="xs"
                            styles={{ input: { ...getPixelInputStyle(), width: '160px', height: '32px' } }}
						/>
						<Button
							onClick={() => {
								setError(null)
								props.onNew(name.trim() || 'New Spell')
							}}
                            color="cyan"
                            style={{ boxShadow: `0 0 15px ${EditorColors.data.glow}` }}
						>
							INIT_NEW
						</Button>
					</Group>
				</Group>
			</div>

			{/* Spell List */}
			<div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
				<Stack gap="md">
					{error && (
						<div style={{ 
                            padding: '12px', 
                            backgroundColor: 'rgba(255,92,92,0.1)', 
                            border: `1px solid ${EditorColors.control.border}`,
                            color: EditorColors.control.border,
                            fontSize: '9px'
                        }}>
							[ERR]: {error}
						</div>
					)}

					{spells.length === 0 ? (
						<div style={{ 
                            padding: '40px', 
                            textAlign: 'center', 
                            border: '1px dashed rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.2)',
                            fontSize: '9px'
                        }}>
							-- NO_SAVED_SPELLS_FOUND --
						</div>
					) : null}

				{spells.map((s) => (
					<div 
                        key={s.id} 
                        style={{
                            ...getPixelGlassStyle(0.15, 12),
                            borderLeft: `2px solid ${s.hasCompiledAST ? EditorColors.logic.border : (s.compilationFailed ? EditorColors.control.border : 'rgba(255,255,255,0.1)')}`,
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: '18px 24px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 15px 40px rgba(0,0,0,0.5), inset 0 0 20px ${s.hasCompiledAST ? EditorColors.logic.glow : (s.compilationFailed ? EditorColors.control.glow : 'rgba(255,255,255,0.02)')}`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(13, 17, 23, 0.15)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.02)';
                        }}
                    >
						<Group justify="space-between" align="center" style={{ width: '100%' }}>
							<Stack gap={2}>
								<Group gap="md">
                                    <div style={{ 
                                        width: 8, 
                                        height: 8, 
                                        backgroundColor: s.hasCompiledAST ? EditorColors.logic.border : (s.compilationFailed ? EditorColors.control.border : '#444'),
                                        boxShadow: `0 0 10px ${s.hasCompiledAST ? EditorColors.logic.border : (s.compilationFailed ? EditorColors.control.border : '#000')}`
                                    }} />
									<Text style={{ 
                                        fontSize: '11px', 
                                        letterSpacing: '1.5px',
                                        color: '#fff',
                                        textShadow: '0 0 10px rgba(0,0,0,0.5)'
                                    }}>
                                        {s.name.toUpperCase()}
                                    </Text>
                                    {s.hasCompiledAST && (
                                        <Badge variant="outline" color="green" size="xs" style={{ fontSize: '6px', borderRadius: 0, border: `1px solid ${EditorColors.logic.border}44` }}>
                                            VALIDATED
                                        </Badge>
                                    )}
								</Group>
								<Text size="xs" style={{ 
                                    color: 'rgba(255,255,255,0.2)', 
                                    fontSize: '7px', 
                                    marginLeft: '24px',
                                    letterSpacing: '0.5px'
                                }}>
									LAST_ALTERATION: {new Date(s.savedAt).toLocaleDateString()}
								</Text>
							</Stack>

							<Group gap={8}>
								<Tooltip label="BIND_TO_EVENT" position="top" withArrow>
                                    <Button
                                        variant="subtle"
                                        color="cyan"
                                        size="compact-xs"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setError(null)
                                            setSelectedSpellId(s.id)
                                            setBindingModalOpen(true)
                                        }}
                                        disabled={!s.hasCompiledAST}
                                        style={{ border: '1px solid rgba(0, 210, 255, 0.2)', fontSize: '7px' }}
                                    >
                                        BIND
                                    </Button>
                                </Tooltip>
								
                                <Button
									variant="subtle"
                                    color="gray"
                                    size="compact-xs"
									onClick={() => props.onEdit(s.id)}
                                    style={{ border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '7px' }}
								>
									OPEN
								</Button>

								<Button
									variant="subtle"
									color="gray"
                                    size="compact-xs"
									onClick={(e) => {
                                        e.stopPropagation();
                                        handleDuplicateClick(s.id)
                                    }}
                                    style={{ border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '7px' }}
								>
									COPY
								</Button>
								
                                <Button
									color="red"
									variant="subtle"
                                    size="compact-xs"
									onClick={(e) => {
                                        e.stopPropagation();
										if (confirm('Permanently delete this spell schema?')) {
                                            deleteSpell(s.id)
										    refresh()
                                        }
									}}
                                    style={{ border: '1px solid rgba(255, 0, 85, 0.1)', fontSize: '7px' }}
								>
									DEL
								</Button>
							</Group>
						</Group>
					</div>
				))}
				</Stack>
			</div>

			<Modal
				opened={bindingModalOpen}
				onClose={() => setBindingModalOpen(false)}
				title="BINDING_CONFIG"
				size="lg"
			>
				<AddEventPanel initialSpellId={selectedSpellId} onClose={() => setBindingModalOpen(false)} />
			</Modal>

            <Modal
                opened={duplicateModalOpen}
                onClose={() => setDuplicateModalOpen(false)}
                title="REPLICATE_SPELL"
            >
                <Stack>
                    <TextInput
                        label="NEW_IDENTIFIER"
                        value={duplicateName}
                        onChange={(e) => setDuplicateName(e.currentTarget.value)}
                        placeholder="ENTER_MANIFEST_NAME"
                        styles={{ input: getPixelInputStyle() }}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" color="gray" onClick={() => setDuplicateModalOpen(false)}>ABORT</Button>
                        <Button color="blue" onClick={confirmDuplicate}>REPLICATE</Button>
                    </Group>
                </Stack>
            </Modal>
		</div>
	)
}

export default SpellManager
