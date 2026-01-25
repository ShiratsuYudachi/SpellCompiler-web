import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Group, Paper, Stack, Text, TextInput } from '@mantine/core'
import { deleteSpell, listSpells, type SpellMeta } from '../utils/spellStorage'

export function SpellManager(props: {
	onNew: (name: string) => void
	onEdit: (id: string) => void
	onBind: (id: string) => void
}) {
	const [spells, setSpells] = useState<SpellMeta[]>([])
	const [name, setName] = useState('New Spell')
	const [error, setError] = useState<string | null>(null)

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
										<Badge color="green" size="sm">AST</Badge>
									) : (
										<Badge color="red" size="sm" variant="light">No AST</Badge>
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
										try {
											props.onBind(s.id)
										} catch (err) {
											setError(err instanceof Error ? err.message : String(err))
										}
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
		</div>
	)
}

export default SpellManager


