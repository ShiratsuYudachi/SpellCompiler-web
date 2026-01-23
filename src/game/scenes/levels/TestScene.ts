import { BaseScene } from '../base/BaseScene'

/**
 * TestScene - Showcase for new Stage 1 architecture
 * Demonstrates:
 * - GameState as a monad-like token
 * - Vector2D as functional closures
 * - List as functional cons cells
 * - Query and Mutation spells
 */
export class TestScene extends BaseScene {
	constructor() {
		super({ key: 'TestScene' })
	}

	protected onLevelCreate(): void {
		// Show hints about the new architecture
		this.showTestHints()
	}

	private showTestHints() {
		const hints = [
			'🎯 Test Scene - Stage 1 Architecture Demo',
			'',
			'📚 New Functional Features:',
			'• vec::create(x, y) - Create vector as closure',
			'• list::empty(), list::cons - Functional lists',
			'• game::spawnFireball(state, pos, dir) - Mutation',
			'',
			'💡 The example spell shows:',
			'1. Creating vectors with vec::create',
			'2. Spawning fireballs using new architecture',
			'',
			'Press 1 to cast the demo spell!',
			'Press TAB to open editor and explore',
		]

		let y = 50
		hints.forEach((hint) => {
			const color = hint.startsWith('🎯') ? '#ffaa00' : hint.startsWith('📚') ? '#00aaff' : '#aaaaaa'
			const style = hint.startsWith('🎯') || hint.startsWith('📚') ? 'bold' : 'normal'

			this.add
				.text(20, y, hint, {
					fontSize: hint.startsWith('🎯') ? '16px' : '14px',
					color: color,
					fontStyle: style,
				})
				.setScrollFactor(0)
				.setDepth(1000)
			y += 20
		})
	}
}
