import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Group, Paper, Stack, Text, TextInput, Modal } from '@mantine/core'
import { deleteSpell, listSpells, type SpellMeta } from '../utils/spellStorage'
import { AddEventPanel } from './AddEventPanel'

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

	const refresh = () => setSpells(listSpells())

	useEffect(() => {
		refresh()
	}, [])

	return (
		<div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<Paper shadow="sm" p="md" className="border-b">
				<Group justify="space-between">
					<Text size="xl" fw={700}>
						Spell Library
					</Text>
					<Group>
						<TextInput
							value={name}
							onChange={(e) => setName(e.currentTarget.value)}
							placeholder="Spell name"
						/>
						<Button
							onClick={() => {
								setError(null)
								props.onNew(name.trim() || 'New Spell')
							}}
						>
							New
						</Button>
					</Group>
				</Group>
			</Paper>

			<div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
				<Stack gap="sm">
					{error ? (
						<Alert color="red" title="Error">
							{error}
						</Alert>
					) : null}

					{spells.length === 0 ? (
						<Paper p="md" withBorder>
							<Text c="dimmed">No saved spells yet. Create one with “New”.</Text>
						</Paper>
					) : null}

				{spells.map((s) => (
					<Paper key={s.id} p="md" withBorder>
						<Group justify="space-between" align="center">
							<div>
								<Group gap="xs">
									<Text fw={700}>{s.name}</Text>
									{s.hasCompiledAST ? (
										<Badge color="green" size="sm">Compiled</Badge>
									) : (
										<Badge color="red" size="sm" variant="light">Compilation Failed</Badge>
									)}
								</Group>
								<Text size="sm" c="dimmed">
									{new Date(s.savedAt).toLocaleString()}
								</Text>
							</div>
							<Group>
								<Button
									variant="light"
									onClick={() => {
										setError(null)
										setSelectedSpellId(s.id)
										setBindingModalOpen(true)
									}}
									disabled={!s.hasCompiledAST}
								>
									Bind
								</Button>
								<Button
									variant="outline"
									onClick={() => {
										setError(null)
										props.onEdit(s.id)
									}}
								>
									Edit
								</Button>
								<Button
									color="red"
									variant="outline"
									onClick={() => {
										setError(null)
										deleteSpell(s.id)
										refresh()
									}}
								>
									Delete
								</Button>
							</Group>
						</Group>
					</Paper>
				))}
				</Stack>
			</div>

			<Modal
				opened={bindingModalOpen}
				onClose={() => setBindingModalOpen(false)}
				title="Add Event Binding"
				size="lg"
			>
				<AddEventPanel initialSpellId={selectedSpellId} onClose={() => setBindingModalOpen(false)} />
			</Modal>
		</div>
	)
}

export default SpellManager
