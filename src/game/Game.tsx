import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { Editor } from '../editor/Editor'

class MainScene extends Phaser.Scene {
	create() {
		this.cameras.main.setBackgroundColor('#1b1f2a')
		this.add
			.text(24, 24, 'Phaser Game\\nPress Tab to toggle Editor', {
				fontFamily: 'monospace',
				fontSize: '20px',
				color: '#ffffff',
			})
			.setShadow(2, 2, '#000000', 2)
	}
}

export function Game() {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const gameRef = useRef<Phaser.Game | null>(null)
	const [showEditor, setShowEditor] = useState(false)

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') {
				return
			}
			e.preventDefault()
			setShowEditor((v) => !v)
		}

		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

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
			scene: MainScene,
			scale: {
				mode: Phaser.Scale.FIT,
				autoCenter: Phaser.Scale.CENTER_BOTH,
			},
		}

		const game = new Phaser.Game(config)
		gameRef.current = game

		return () => {
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

