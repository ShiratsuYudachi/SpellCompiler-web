import { useMemo, useState, useEffect } from 'react'
import type { Node, Edge } from 'reactflow'
import { FunctionalEditor } from './components/FunctionalEditor'
import { SpellManager } from './components/SpellManager'
import { loadSpell, loadUIState } from './utils/spellStorage'
import { flowToIR } from './utils/flowToIR'
import { getGameInstance, getEditorContext, setEditorContext } from '../game/gameInstance'
import { GameEvents } from '../game/events'
import { levelRegistry } from '../game/levels/LevelRegistry'

export function Editor() {
	// Check if we're in game mode (editor context has a scene key)
	const initialEditorContext = getEditorContext()
	const isGameMode = Boolean(initialEditorContext?.sceneKey)

	const [screen, setScreen] = useState<'manager' | 'editor' | 'sceneConfig'>(
		isGameMode ? 'sceneConfig' : 'manager'
	)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editingName, setEditingName] = useState<string>('New Spell')
	const [initialFlow, setInitialFlow] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null)

	const editorKey = useMemo(() => {
		return `${editingId || 'new'}:${screen}`
	}, [editingId, screen])

	// Handle Tab key for switching between spell library and scene config
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// In game mode, Tab closes the editor (goes back to game)
			if (isGameMode && event.key === 'Tab') {
				event.preventDefault()
				// Only close if we're not in the manager screen
				if (screen !== 'manager') {
					const game = getGameInstance()
					if (game) {
						game.events.emit(GameEvents.toggleEditor)
					}
				}
				return
			}

			// In library mode, Tab switches between editor and sceneConfig
			if (event.key === 'Tab' && (screen === 'editor' || screen === 'sceneConfig')) {
				event.preventDefault()

				if (screen === 'editor') {
					// Switch to scene config
					setScreen('sceneConfig')
				} else if (screen === 'sceneConfig') {
					// Switch back to spell library (editor)
					setScreen('editor')
				}
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [screen, isGameMode])

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

					// Try to load saved UI state first (preserves node positions)
					const uiState = loadUIState(id)
					console.log('[Editor] UI state:', uiState ? 'found' : 'not found')
					if (uiState && Array.isArray(uiState.nodes) && Array.isArray(uiState.edges)) {
						console.log('[Editor] Loading from UI state, nodes:', uiState.nodes.length, 'edges:', uiState.edges.length)
						setEditingId(id)
						setEditingName(spell.name)
						setInitialFlow({ nodes: uiState.nodes, edges: uiState.edges })
						setScreen('editor')
						return
					}

					// Fallback to flow data from spell
					const flow = spell.flow as any
					if (!flow || !Array.isArray(flow.nodes) || !Array.isArray(flow.edges)) {
						console.log('[Editor] Invalid flow data in spell')
						return
					}

					console.log('[Editor] Loading from spell flow, nodes:', flow.nodes.length, 'edges:', flow.edges.length)
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

				const compiledSpell = flowToIR(flow.nodes, flow.edges)
				game.events.emit(GameEvents.registerSpell, compiledSpell)
				}}
			/>
		)
	}

	// Scene Config screen
	if (screen === 'sceneConfig') {
		const editorContext = getEditorContext()
		const sceneKey = editorContext?.sceneKey || 'Level1'

		// Try to load saved workflow from localStorage first
		const storageKey = `spell-workflow-${sceneKey}`
		let initialSceneFlow: { nodes: Node[]; edges: Edge[] } | undefined

		try {
			const savedFlow = localStorage.getItem(storageKey)
			if (savedFlow) {
				const parsed = JSON.parse(savedFlow)
				if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
					initialSceneFlow = { nodes: parsed.nodes, edges: parsed.edges }
					console.log('[Editor] Loaded saved workflow for scene:', sceneKey, 'nodes:', parsed.nodes.length)
				}
			}
		} catch (err) {
			console.error('[Editor] Failed to load saved workflow:', err)
		}

		// Fallback to scene config defaults if no saved workflow
		if (!initialSceneFlow) {
			const sceneConfig = levelRegistry.get(sceneKey)
			initialSceneFlow = sceneConfig?.initialSpellWorkflow
			console.log('[Editor] Using default workflow for scene:', sceneKey)
		}

		const handleExit = () => {
			if (isGameMode) {
				// In game mode, go to spell library
				setScreen('manager')
			} else {
				// In library mode, go back to manager
				setScreen('manager')
			}
		}

		return (
			<FunctionalEditor
				key={`scene-${sceneKey}`}
				initialSpellId={null}
				initialSpellName={`Scene: ${sceneKey}`}
				initialFlow={initialSceneFlow}
				onExit={handleExit}
				backButtonText="Spell Library"
				isLibraryMode={false}
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



