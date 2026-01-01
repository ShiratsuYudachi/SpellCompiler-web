import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { Editor } from '../editor/Editor'

class MainScene extends Phaser.Scene {
	create() {
		this.cameras.main.setBackgroundColor('#1b1f2a')
		this.add
			.text(90, 48, 'Phaser Game\\nPress Tab to toggle Editor', {
				fontFamily: 'monospace',
				fontSize: '100px',
				color: '#ffffff',
			})
			.setShadow(2, 2, '#000000', 2)

		this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
			e.preventDefault()
			this.game.events.emit('toggle-editor')
		})
	}
}

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
			width: 2560,
			height: 1440,
			scene: MainScene,
			scale: {
				mode: Phaser.Scale.FIT,
				autoCenter: Phaser.Scale.CENTER_BOTH,
			},
		}

		const game = new Phaser.Game(config)
		gameRef.current = game
		const onToggleEditor = () => setShowEditor((v) => !v)
		game.events.on('toggle-editor', onToggleEditor)

		return () => {
			game.events.off('toggle-editor', onToggleEditor)
			game.destroy(true)
			gameRef.current = null
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

