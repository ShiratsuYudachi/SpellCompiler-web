import { eventQueue } from '../events/EventQueue'
import { replacePhaserScene } from '../gameInstance'
import { LevelProgress } from '../scenes/base/LevelProgress'
import { SaveManager } from '../../storage/SaveManager'
import { crispDomTextRootStyle, CSS_FONT_STACK } from '../ui/inGameTextStyle'

/**
 * Main menu copy rendered as DOM (same approach as PauseInterface) — sharp on HiDPI + FIT.
 * Phaser MainInterface scene only draws background graphics.
 */
export function MainMenuOverlay() {
	const goLevelSelect = () => {
		SaveManager.loadLatestSaveAsCurrent()
		LevelProgress.init()
		eventQueue.init()
		replacePhaserScene('MainInterface', 'LevelSelectInterface')
	}
	const goSaveSelect = () => {
		replacePhaserScene('MainInterface', 'SaveSelectScene')
	}

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				zIndex: 20,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				pointerEvents: 'none',
				...crispDomTextRootStyle,
			}}
		>
			<h1
				style={{
					margin: 'clamp(72px, 14vh, 120px) 0 0 0',
					fontSize: '64px',
					fontWeight: 'bold',
					color: '#ffffff',
					textShadow: '0 1px 2px rgba(0, 0, 0, 0.65)',
					fontFamily: CSS_FONT_STACK,
					pointerEvents: 'none',
				}}
			>
				SPELL COMPILER
			</h1>
			<p
				style={{
					margin: '12px 0 0 0',
					fontSize: '24px',
					color: '#c4c8d0',
					textShadow: '0 1px 2px rgba(0, 0, 0, 0.55)',
					fontFamily: CSS_FONT_STACK,
					pointerEvents: 'none',
				}}
			>
				A Magical Journey
			</p>

			<div
				style={{
					marginTop: '48px',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: '15px',
					pointerEvents: 'auto',
				}}
			>
				<button
					type="button"
					onClick={goLevelSelect}
					style={{
						minWidth: '300px',
						padding: '15px 30px',
						fontSize: '28px',
						fontWeight: 'bold',
						color: '#ffffff',
						background: '#4a90e2',
						border: '3px solid #5aa0f2',
						borderRadius: '8px',
						cursor: 'pointer',
						fontFamily: CSS_FONT_STACK,
						transition: 'all 0.2s',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = '#5aa0f2'
						e.currentTarget.style.transform = 'scale(1.05)'
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = '#4a90e2'
						e.currentTarget.style.transform = 'scale(1)'
					}}
				>
					START GAME
				</button>

				<button
					type="button"
					onClick={goSaveSelect}
					style={{
						minWidth: '300px',
						padding: '12px 30px',
						fontSize: '22px',
						fontWeight: 'bold',
						color: '#ffffff',
						background: '#48bb78',
						border: '2px solid #68d391',
						borderRadius: '8px',
						cursor: 'pointer',
						fontFamily: CSS_FONT_STACK,
						transition: 'background 0.2s',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = '#68d391'
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = '#48bb78'
					}}
				>
					SAVE FILES
				</button>
			</div>

			<p
				style={{
					marginTop: 'auto',
					marginBottom: 'clamp(32px, 6vh, 56px)',
					fontSize: '14px',
					color: '#9098a8',
					textAlign: 'center',
					fontFamily: CSS_FONT_STACK,
					pointerEvents: 'none',
				}}
			>
				Press TAB to open spell editor in levels
			</p>

			<div
				style={{
					position: 'absolute',
					left: 20,
					bottom: 20,
					fontSize: '13px',
					color: '#5a6270',
					fontFamily: CSS_FONT_STACK,
					pointerEvents: 'none',
				}}
			>
				v1.0.0 - Stage 1
			</div>
		</div>
	)
}
