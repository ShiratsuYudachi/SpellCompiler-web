import { useMemo, useState } from 'react'
import type { Node, Edge } from 'reactflow'
import { FunctionalEditor } from './components/FunctionalEditor'
import { SpellManager } from './components/SpellManager'
import { loadSpell } from './utils/spellStorage'
import { flowToIR } from './utils/flowToIR'
import { getGameInstance } from '../game/gameInstance'
import { GameEvents } from '../game/events'

export function Editor() {
	const [screen, setScreen] = useState<'manager' | 'editor'>('manager')
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editingName, setEditingName] = useState<string>('New Spell')
	const [initialFlow, setInitialFlow] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null)

	const editorKey = useMemo(() => {
		return `${editingId || 'new'}:${screen}`
	}, [editingId, screen])

	if (screen === 'manager') {
		return (
			<SpellManager
				onNew={(name) => {
					setEditingId(null)
					setEditingName(name)
					setInitialFlow(null)
					setScreen('editor')
				}}
				onEdit={(id) => {
					const spell = loadSpell(id)
					if (!spell) {
						return
					}

					const flow = spell.flow as any
					if (!flow || !Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
						return
					}

					setEditingId(id)
					setEditingName(spell.name)
					setInitialFlow({ nodes: flow.nodes, edges: flow.edges })
					setScreen('editor')
				}}
				onBind={(id) => {
					const spell = loadSpell(id)
					if (!spell) {
						throw new Error('Spell not found')
					}
					const flow = spell.flow as any
					if (!flow || !Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
						throw new Error('Invalid spell data')
					}

					const game = getGameInstance()
					if (!game) {
						throw new Error('Game is not running')
					}

					const { ast, functions } = flowToIR(flow.nodes, flow.edges)
					game.events.emit(GameEvents.registerSpell, { ast, dependencies: functions })
				}}
			/>
		)
	}

	return (
		<FunctionalEditor
			key={editorKey}
			initialSpellId={editingId}
			initialSpellName={editingName}
			initialFlow={initialFlow || undefined}
			onExit={() => setScreen('manager')}
		/>
	)
}

export default Editor



