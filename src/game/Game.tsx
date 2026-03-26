import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { Editor } from '../editor/Editor'
import { GameEvents } from './events'
import { MainInterface } from './interface/MainInterface'
import { LevelSelectInterface } from './interface/LevelSelectInterface'
import { PauseInterface } from './interface/PauseInterface'
import { LevelSelectOverlay } from './interface/LevelSelectOverlay'
import { MainMenuOverlay } from './interface/MainMenuOverlay'
import { SaveSelectOverlay } from './interface/SaveSelectOverlay'
import { VictoryInterface } from './interface/VictoryInterface'
import { SaveSelectScene } from './scenes/SaveSelectScene'
import { Level1 } from './scenes/levels/Level1'
import { Level2 } from './scenes/levels/Level2'
import { Level3 } from './scenes/levels/Level3'
import { Level4 } from './scenes/levels/Level4'
import { Level5 } from './scenes/levels/Level5'
import { Level6 } from './scenes/levels/Level6'
import { Level7 } from './scenes/levels/Level7'
import { Level8 } from './scenes/levels/Level8'
import { Level9 } from './scenes/levels/Level9'
import { Level10 } from './scenes/levels/Level10'
import { Level11 } from './scenes/levels/Level11'
import { Level12 } from './scenes/levels/Level12'
import { Level13 } from './scenes/levels/Level13'
import { Level14 } from './scenes/levels/Level14'
import { Level15 } from './scenes/levels/Level15'
import { Level16 } from './scenes/levels/Level16'
import { Level17 } from './scenes/levels/Level17'
import { Level18 } from './scenes/levels/Level18'
import { Level19 } from './scenes/levels/Level19'
import { Level20 } from './scenes/levels/Level20'
import { LevelHudOverlay } from './ui/LevelHudOverlay'
import { getPhaserCanvasResolution } from './canvasResolution'
import { getForegroundSceneKey, setGameInstance, setEditorContext } from './gameInstance'

export function Game() {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const gameRef = useRef<Phaser.Game | null>(null)
	const [showEditor, setShowEditor] = useState(false)
	const [showPause, setShowPause] = useState(false)
	const [showVictory, setShowVictory] = useState(false)
	const [showMainMenuDom, setShowMainMenuDom] = useState(false)
	const [showLevelSelectDom, setShowLevelSelectDom] = useState(false)
	const [showSaveSelectDom, setShowSaveSelectDom] = useState(false)
	const pausedSceneRef = useRef<string | null>(null)
	const completedLevelRef = useRef<number>(0)

	useEffect(() => {
		if (!containerRef.current) {
			return
		}

		if (gameRef.current) {
			return
		}

		const config = {
			type: Phaser.AUTO,
			parent: containerRef.current,
			width: 960,
			height: 540,
			// Higher backing store = sharper text/UI when the canvas is scaled up (FIT)
			resolution: getPhaserCanvasResolution(),
			render: {
				antialias: true,
				roundPixels: true,
			},
			scene: [
				MainInterface,
				SaveSelectScene,
				LevelSelectInterface,
				Level1,
				Level2,
				Level3,
				Level4,
				Level5,
				Level6,
				Level7,
				Level8,
				Level9,
				Level10,
				Level11,
				Level12,
				Level13,
				Level14,
				Level15,
				Level16,
				Level17,
				Level18,
				Level19,
				Level20,
			],
			input: {
				mouse: {
					preventDefaultDown: false,
					preventDefaultUp: false,
					preventDefaultMove: false,
					preventDefaultWheel: false,
				},
			},
			physics: {
				default: 'arcade',
				arcade: {
					debug: false,
				},
			},
			scale: {
				mode: Phaser.Scale.FIT,
				autoCenter: Phaser.Scale.CENTER_BOTH,
				autoRound: true,
			},
		} as Phaser.Types.Core.GameConfig

		const game = new Phaser.Game(config)
		gameRef.current = game
		setGameInstance(game)

		const onWindowResize = () => {
			game.scale.refresh()
		}
		window.addEventListener('resize', onWindowResize)

		const onToggleEditor = (payload?: { sceneKey?: string }) => {
			setShowEditor((v) => {
				const newValue = !v
				// Set context synchronously so Editor mounts with sceneKey (rAF caused first paint on SpellManager).
				if (newValue) {
					const key = payload?.sceneKey ?? getForegroundSceneKey(game)
					if (key) setEditorContext({ sceneKey: key })
				} else {
					setEditorContext({ sceneKey: undefined })
				}
				return newValue
			})
		}
		game.events.on(GameEvents.toggleEditor, onToggleEditor)

		const onTogglePause = (payload?: { sceneKey?: string }) => {
			setShowPause((v) => {
				const newValue = !v
				if (newValue) {
					const key = payload?.sceneKey ?? getForegroundSceneKey(game)
					if (key) {
						pausedSceneRef.current = key
						game.scene.pause(key)
					}
				} else {
					// Resume the paused scene
					if (pausedSceneRef.current) {
						game.scene.resume(pausedSceneRef.current)
						pausedSceneRef.current = null
					}
				}
				return newValue
			})
		}
		game.events.on(GameEvents.togglePause, onTogglePause)

		const onShowVictory = (data: { level: number }) => {
			console.log('[Game] Victory event received for level:', data.level)
			completedLevelRef.current = data.level

			const key = getForegroundSceneKey(game)
			if (key) {
				pausedSceneRef.current = key
				game.scene.pause(key)
			}

			setShowVictory(true)
		}
		game.events.on(GameEvents.showVictory, onShowVictory)

		const onMainMenuUi = (data: { visible: boolean }) => {
			setShowMainMenuDom(data.visible)
		}
		game.events.on(GameEvents.uiMainMenu, onMainMenuUi)

		const onLevelSelectUi = (data: { visible: boolean }) => {
			setShowLevelSelectDom(data.visible)
		}
		game.events.on(GameEvents.uiLevelSelect, onLevelSelectUi)

		const onSaveSelectUi = (data: { visible: boolean }) => {
			setShowSaveSelectDom(data.visible)
		}
		game.events.on(GameEvents.uiSaveSelect, onSaveSelectUi)

		return () => {
			window.removeEventListener('resize', onWindowResize)
			game.events.off(GameEvents.toggleEditor, onToggleEditor)
			game.events.off(GameEvents.togglePause, onTogglePause)
			game.events.off(GameEvents.showVictory, onShowVictory)
			game.events.off(GameEvents.uiMainMenu, onMainMenuUi)
			game.events.off(GameEvents.uiLevelSelect, onLevelSelectUi)
			game.events.off(GameEvents.uiSaveSelect, onSaveSelectUi)
			game.destroy(true)
			gameRef.current = null
			setGameInstance(null)
		}
	}, [])

	useEffect(() => {
		const g = gameRef.current
		const kb = g?.input.keyboard
		if (!kb) return
		kb.enabled = !showEditor
		return () => {
			kb.enabled = true
		}
	}, [showEditor])

	const handleResume = () => {
		if (gameRef.current) {
			gameRef.current.events.emit(GameEvents.togglePause)
		}
	}

	const handleQuit = () => {
		if (gameRef.current) {
			// Close editor if open
			if (showEditor) {
				setShowEditor(false)
			}
			// Stop the paused scene
			if (pausedSceneRef.current) {
				gameRef.current.scene.stop(pausedSceneRef.current)
				pausedSceneRef.current = null
			}
			// Close pause menu
			setShowPause(false)
			// Go to main menu
			gameRef.current.scene.start('MainInterface')
		}
	}

	const handleNextLevel = () => {
		if (gameRef.current && completedLevelRef.current > 0) {
			const nextLevel = completedLevelRef.current + 1
			console.log('[Game] Next level:', nextLevel)

			// Stop current scene
			if (pausedSceneRef.current) {
				gameRef.current.scene.stop(pausedSceneRef.current)
				pausedSceneRef.current = null
			}

			// Close victory screen
			setShowVictory(false)
			completedLevelRef.current = 0

			// Start next level
			if (nextLevel <= 20) {
				gameRef.current.scene.start(`Level${nextLevel}`)
			} else {
				gameRef.current.scene.start('MainInterface')
			}
		}
	}

	const handleReplay = () => {
		if (gameRef.current && completedLevelRef.current > 0) {
			const currentLevel = completedLevelRef.current
			console.log('[Game] Replay level:', currentLevel)

			// Stop current scene
			if (pausedSceneRef.current) {
				gameRef.current.scene.stop(pausedSceneRef.current)
				pausedSceneRef.current = null
			}

			// Close victory screen
			setShowVictory(false)
			completedLevelRef.current = 0

			// Restart current level
			gameRef.current.scene.start(`Level${currentLevel}`)
		}
	}

	const handleVictoryMainMenu = () => {
		if (gameRef.current) {
			console.log('[Game] Victory -> Main Menu')

			// Stop current scene
			if (pausedSceneRef.current) {
				gameRef.current.scene.stop(pausedSceneRef.current)
				pausedSceneRef.current = null
			}

			// Close victory screen
			setShowVictory(false)
			completedLevelRef.current = 0

			// Go to main menu
			gameRef.current.scene.start('MainInterface')
		}
	}

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<div
				className="phaser-game-host"
				ref={containerRef}
				style={{ position: 'absolute', inset: 0, pointerEvents: showEditor ? 'none' : 'auto' }}
			/>
			{!showEditor && !showVictory ? <LevelHudOverlay /> : null}
			{showMainMenuDom ? <MainMenuOverlay /> : null}
			{showLevelSelectDom ? <LevelSelectOverlay /> : null}
			{showSaveSelectDom ? <SaveSelectOverlay /> : null}
			{showEditor ? (
				<div
					style={{
						position: 'absolute',
						inset: 0,
						background: 'rgba(0, 0, 0, 0.35)',
						zIndex: 10,
					}}
				>
					<div
						style={{
							position: 'absolute',
							inset: 12,
							background: '#0b0b0b',
							border: '1px solid rgba(255, 255, 255, 0.2)',
						}}
					>
						<Editor />
					</div>
				</div>
			) : null}
			{showPause ? (
				<PauseInterface onResume={handleResume} onQuit={handleQuit} />
			) : null}
			{showVictory ? (
				<VictoryInterface
					level={completedLevelRef.current}
					onNextLevel={handleNextLevel}
					onReplay={handleReplay}
					onMainMenu={handleVictoryMainMenu}
				/>
			) : null}
		</div>
	)
}

export default Game
