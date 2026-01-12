import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { Editor } from '../editor/Editor'
import { GameEvents } from './events'
import { MainInterface } from './interface/MainInterface'
import { LevelSelectInterface } from './interface/LevelSelectInterface'
import { SettingsInterface } from './interface/SettingsInterface'
import { PauseInterface } from './interface/PauseInterface'
import { VictoryInterface } from './interface/VictoryInterface'
import { Level1 } from './scenes/levels/Level1'
import { Level2 } from './scenes/levels/Level2'
import { Level3 } from './scenes/levels/Level3'
import { Level4 } from './scenes/levels/Level4'
import { Level6 } from './scenes/levels/Level6'
import {
	Level5,
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
} from './scenes/levels/LevelEmpty'
import { setGameInstance, setEditorContext } from './gameInstance'

export function Game() {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const gameRef = useRef<Phaser.Game | null>(null)
	const [showEditor, setShowEditor] = useState(false)
	const [showPause, setShowPause] = useState(false)
	const [showVictory, setShowVictory] = useState(false)
	const pausedSceneRef = useRef<string | null>(null)
	const completedLevelRef = useRef<number>(0)

	useEffect(() => {
		if (!containerRef.current) {
			return
		}

		if (gameRef.current) {
			return
		}

		const config: Phaser.Types.Core.GameConfig = {
			type: Phaser.AUTO,
			parent: containerRef.current,
			width: 960,
			height: 540,
			scene: [
				MainInterface,
				LevelSelectInterface,
				SettingsInterface,
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
			physics: {
				default: 'arcade',
				arcade: {
					debug: false,
				},
			},
			scale: {
				mode: Phaser.Scale.FIT,
				autoCenter: Phaser.Scale.CENTER_BOTH,
			},
		}

		const game = new Phaser.Game(config)
		gameRef.current = game
		setGameInstance(game)

		const onToggleEditor = () => {
			setShowEditor((v) => {
				const newValue = !v
				if (newValue) {
					// When opening editor, set context to current scene
					const currentScene = game.scene.getScenes(true).find(s => s.scene.isActive())
					if (currentScene) {
						setEditorContext({ sceneKey: currentScene.scene.key })
					}
				} else {
					setEditorContext({ sceneKey: undefined })
				}
				return newValue
			})
		}
		game.events.on(GameEvents.toggleEditor, onToggleEditor)

		const onTogglePause = () => {
			setShowPause((v) => {
				const newValue = !v
				if (newValue) {
					// Store which scene was paused
					const currentScene = game.scene.getScenes(true).find(s => s.scene.isActive())
					if (currentScene) {
						pausedSceneRef.current = currentScene.scene.key
						game.scene.pause(currentScene.scene.key)
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

			// Pause the current scene
			const currentScene = game.scene.getScenes(true).find(s => s.scene.isActive())
			if (currentScene) {
				pausedSceneRef.current = currentScene.scene.key
				game.scene.pause(currentScene.scene.key)
			}

			setShowVictory(true)
		}
		game.events.on(GameEvents.showVictory, onShowVictory)

		return () => {
			game.events.off(GameEvents.toggleEditor, onToggleEditor)
			game.events.off(GameEvents.togglePause, onTogglePause)
			game.events.off(GameEvents.showVictory, onShowVictory)
			game.destroy(true)
			gameRef.current = null
			setGameInstance(null)
		}
	}, [])

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
			<div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
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
