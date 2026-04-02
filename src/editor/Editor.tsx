import { useMemo, useState, useEffect, useSyncExternalStore } from 'react'
import type { Node, Edge } from 'reactflow'
import { FunctionalEditor } from './components/FunctionalEditor'
import { SpellManager } from './components/SpellManager'
import { loadSpell } from './utils/spellStorage'
import { getGameInstance, getEditorContext, setEditorContext, subscribeEditorContext } from '../game/gameInstance'
import { GameEvents } from '../game/events'
import { levelRegistry } from '../game/levels/LevelRegistry'

export function Editor() {
	const editorContext = useSyncExternalStore(
		subscribeEditorContext,
		getEditorContext,
		() => null
	)
	const isGameMode = Boolean(editorContext?.sceneKey)

	const [screen, setScreen] = useState<'manager' | 'editor' | 'sceneConfig'>(() =>
		isGameMode ? 'sceneConfig' : 'manager'
	)

	// If context arrived after first paint (e.g. race), leave Spell Manager and open scene graph.
	useEffect(() => {
		if (isGameMode && screen === 'manager') {
			setScreen('sceneConfig')
		}
	}, [isGameMode, screen])
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editingName, setEditingName] = useState<string>('New Spell')
	const [initialFlow, setInitialFlow] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null)

	const editorKey = useMemo(() => {
		return `${editingId || 'new'}:${screen}`
	}, [editingId, screen])

	// Tab / Esc: close editor overlay (return to game).
	// Tab works in: scene editor (isGameMode), Spell Library manager, level-linked spell editor.
	// Esc works in: Spell Library manager and scene config (returns to game).
	// The 'editor' screen Esc is handled inside FunctionalEditor itself.
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const game = getGameInstance()

			if (event.key === 'Tab') {
				if (!game) return
				const levelLinkedSpell =
					editingId != null && /^scene-spell-.+/.test(editingId)
				const allowTab =
					isGameMode || screen === 'manager' || (screen === 'editor' && levelLinkedSpell)
				if (!allowTab) return
				event.preventDefault()
				game.events.emit(GameEvents.toggleEditor)
				return
			}

			if (event.key === 'Escape') {
				if (!game) return
				if (screen === 'manager' || screen === 'sceneConfig') {
					game.events.emit(GameEvents.toggleEditor)
				}
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [screen, isGameMode, editingId])

	if (screen === 'manager') {
		return (
			<SpellManager
				onNew={(name) => {
					// Clear game mode context when entering library mode
					setEditorContext({ sceneKey: undefined })
					setEditingId(null)
					setEditingName(name)
					setInitialFlow(null)
					setScreen('editor')
				}}
				onEdit={(id) => {
					// Clear game mode context when entering library mode
					setEditorContext({ sceneKey: undefined })
					console.log('[Editor] Edit spell:', id)
				const spell = loadSpell(id)
				if (!spell) {
					console.log('[Editor] Spell not found:', id)
					return
				}

			console.log('[Editor] Spell loaded:', spell.name)

			// Load flow directly from spell (already contains node positions)
			const flow = spell.flow as { nodes: Node[]; edges: Edge[] }
			if (flow && Array.isArray(flow.nodes) && Array.isArray(flow.edges)) {
				console.log('[Editor] Loading from spell flow, nodes:', flow.nodes.length, 'edges:', flow.edges.length)
				setEditingId(id)
				setEditingName(spell.name)
				setInitialFlow({ nodes: flow.nodes, edges: flow.edges })
				setScreen('editor')
			} else {
				console.log('[Editor] Invalid flow data in spell')
			}
				}}
				onBind={() => {
					// deprecated
				}}
			/>
		)
	}

	// Scene Config screen
	if (screen === 'sceneConfig') {
		const editorContext = getEditorContext()
		const sceneKey = editorContext?.sceneKey || 'Level1'

		const sceneConfig = levelRegistry.get(sceneKey)

		// Use a stable per-scene spell ID so edits survive Tab open/close and
		// Tab switches between editor ↔ sceneConfig in library mode.
		const sceneSpellId = `scene-spell-${sceneKey}`
		const savedSpell = loadSpell(sceneSpellId)
		// Prefer saved working copy; fall back to the level template
		const initialSceneFlow = (savedSpell?.flow as { nodes: Node[]; edges: Edge[] } | null)
			?? sceneConfig?.initialSpellWorkflow
		console.log('[Editor] Loading workflow for scene:', sceneKey, savedSpell ? '(saved copy)' : '(template)')

		const handleExit = () => {
			// Clear scene context so isGameMode is false; otherwise the effect below
			// forces screen back to sceneConfig and the user can never reach Spell Library.
			setEditorContext({ sceneKey: undefined })
			setScreen('manager')
		}

		return (
			<FunctionalEditor
				key={`scene-${sceneKey}`}
				initialSpellId={sceneSpellId}
				initialSpellName={`Scene: ${sceneKey}`}
				initialFlow={initialSceneFlow}
				onExit={handleExit}
				backButtonText="Spell Library"
				isLibraryMode={false}
				levelMeta={sceneConfig}
			/>
		)
	}

	// Editor screen (spell library)
	return (
		<FunctionalEditor
			key={editorKey}
			initialSpellId={editingId}
			initialSpellName={editingName}
			initialFlow={initialFlow || undefined}
			onExit={() => setScreen('manager')}
			backButtonText="Spell Library"
			isLibraryMode={true}
		/>
	)
}

export default Editor



