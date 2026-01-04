import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { Editor } from '../editor/Editor'
import { GameEvents } from './events'
import { MainScene } from './scenes/MainScene'
import { Scene1 } from './scenes/Scene1'
import { setGameInstance } from './gameInstance'

export function Game() {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const gameRef = useRef<Phaser.Game | null>(null)
	const [showEditor, setShowEditor] = useState(false)

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
			scene: [MainScene, Scene1],
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
				// Clear editor context when editor closes (defer to avoid React warning)
				if (!newValue) {
					setTimeout(() => {
						game.events.emit(GameEvents.setEditorContext, { sceneKey: undefined })
					}, 0)
				}
				return newValue
			})
		}
		game.events.on(GameEvents.toggleEditor, onToggleEditor)

		return () => {
			game.events.off(GameEvents.toggleEditor, onToggleEditor)
			game.destroy(true)
			gameRef.current = null
			setGameInstance(null)
		}
	}, [])

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
		</div>
	)
}

export default Game

