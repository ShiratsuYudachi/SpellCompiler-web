import { useMemo, useState, useEffect, useSyncExternalStore, useCallback } from 'react'
import type { Node, Edge } from 'reactflow'
import { FunctionalEditor } from './components/FunctionalEditor'
import { SpellManager } from './components/SpellManager'
import { loadSpell } from './utils/spellStorage'
import {
	getGameInstance,
	getEditorContext,
	setEditorContext,
	subscribeEditorContext,
	getForegroundSceneKey,
	isPauseOverlayVisible,
} from '../game/gameInstance'
import { GameEvents } from '../game/events'
import { levelRegistry } from '../game/levels/LevelRegistry'
import { crispDomTextRootStyle, CSS_FONT_STACK } from '../game/ui/inGameTextStyle'

function StandaloneEditorPauseOverlay({ onClose }: { onClose: () => void }) {
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onClose()
			}
		}
		window.addEventListener('keydown', handleKey)
		return () => window.removeEventListener('keydown', handleKey)
	}, [onClose])

	const homeHref = import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

	return (
		<div
			data-pause-overlay
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0, 0, 0, 0.88)',
				backdropFilter: 'blur(6px)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 11001,
				...crispDomTextRootStyle,
			}}
			onClick={onClose}
		>
			<div
				style={{
					background: '#1a1a1e',
					border: '1px solid #333338',
					borderRadius: '12px',
					padding: '40px',
					minWidth: '400px',
					textAlign: 'center',
					boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
					fontFamily: CSS_FONT_STACK,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<h1
					style={{
						fontSize: '36px',
						color: '#ffffff',
						margin: '0 0 16px 0',
						fontWeight: 'bold',
						textShadow: '0 2px 8px rgba(0, 0, 0, 0.75)',
					}}
				>
					PAUSED
				</h1>
				<p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#aaaaaa' }}>
					No game session — open the editor from the game with Tab, or refresh this page.
				</p>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
					<button
						type="button"
						onClick={onClose}
						style={{
							padding: '15px 30px',
							fontSize: '20px',
							fontWeight: 'bold',
							color: '#ffffff',
							background: '#4a90e2',
							border: '2px solid #5aa0f2',
							borderRadius: '8px',
							cursor: 'pointer',
						}}
					>
						RESUME [ESC]
					</button>
					<button
						type="button"
						onClick={() => window.location.reload()}
						style={{
							padding: '15px 30px',
							fontSize: '20px',
							fontWeight: 'bold',
							color: '#ffffff',
							background: '#3a5a7a',
							border: '2px solid #4a6a8a',
							borderRadius: '8px',
							cursor: 'pointer',
						}}
					>
						REFRESH PAGE [TAB]
					</button>
					<button
						type="button"
						onClick={() => {
							window.location.href = homeHref
						}}
						style={{
							padding: '15px 30px',
							fontSize: '20px',
							fontWeight: 'bold',
							color: '#ffffff',
							background: '#5c2a2a',
							border: '2px solid #7a3a3a',
							borderRadius: '8px',
							cursor: 'pointer',
						}}
					>
						OPEN GAME
					</button>
				</div>
			</div>
		</div>
	)
}

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

	const hasRunningGame = Boolean(getGameInstance())
	const [standalonePauseOpen, setStandalonePauseOpen] = useState(false)
	const closeStandalonePause = useCallback(() => setStandalonePauseOpen(false), [])
	const toggleStandalonePause = useCallback(() => setStandalonePauseOpen((v) => !v), [])

	// Tab: return to game (close editor overlay). No game (/editor route): refresh page.
	// Esc (Spell Library manager only): pause when game exists; standalone pause when not.
	// Esc on spell/scene editor screens is handled in FunctionalEditor.
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const game = getGameInstance()

			if (event.key === 'Tab') {
				event.preventDefault()
				if (game) {
					game.events.emit(GameEvents.toggleEditor)
				} else {
					window.location.reload()
				}
				return
			}

			if (event.key === 'Escape' && screen === 'manager') {
				if (game && isPauseOverlayVisible()) return
				if (!game && isPauseOverlayVisible()) return
				event.preventDefault()
				if (game) {
					game.events.emit(GameEvents.togglePause, { sceneKey: getForegroundSceneKey(game) })
				} else {
					toggleStandalonePause()
				}
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [screen, toggleStandalonePause])

	const standalonePause =
		!hasRunningGame && standalonePauseOpen ? (
			<StandaloneEditorPauseOverlay onClose={closeStandalonePause} />
		) : null

	const escWithoutGame = hasRunningGame ? undefined : toggleStandalonePause

	if (screen === 'manager') {
		return (
			<>
				{standalonePause}
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
			</>
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
			<>
				{standalonePause}
				<FunctionalEditor
					key={`scene-${sceneKey}`}
					initialSpellId={sceneSpellId}
					initialSpellName={`Scene: ${sceneKey}`}
					initialFlow={initialSceneFlow}
					onExit={handleExit}
					backButtonText="Spell Library"
					isLibraryMode={false}
					levelMeta={sceneConfig}
					onEscWithoutGame={escWithoutGame}
				/>
			</>
		)
	}

	// Editor screen (spell library)
	return (
		<>
			{standalonePause}
			<FunctionalEditor
				key={editorKey}
				initialSpellId={editingId}
				initialSpellName={editingName}
				initialFlow={initialFlow || undefined}
				onExit={() => setScreen('manager')}
				backButtonText="Spell Library"
				isLibraryMode={true}
				onEscWithoutGame={escWithoutGame}
			/>
		</>
	)
}

export default Editor



