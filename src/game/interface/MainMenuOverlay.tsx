import { eventQueue } from '../events/EventQueue'
import { replacePhaserScene } from '../gameInstance'
import { LevelProgress } from '../scenes/base/LevelProgress'
import { SaveManager } from '../../storage/SaveManager'
import { crispDomTextRootStyle } from '../ui/inGameTextStyle'
import { PixelTitle } from '../ui/PixelTitle'

const PIXEL_FONT = "'Press Start 2P', monospace"

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
			<div style={{ margin: 'clamp(72px, 14vh, 120px) 0 0 0' }}>
				<PixelTitle />
			</div>
			<p
				style={{
					margin: '24px 0 0 0',
					fontSize: '16px',
					color: '#c4c8d0',
					textShadow: '2px 2px 0 #1b1f2a',
					fontFamily: PIXEL_FONT,
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
						minWidth: '340px',
						padding: '24px 30px',
						fontSize: '24px',
						color: '#ffffff',
						background: '#5c94fc', 
						border: 'none',
						borderRadius: '6px',
						boxShadow: '0 8px 0 0 #0058f8, inset 0 4px 0 0 rgba(255,255,255,0.4)',
						cursor: 'pointer',
						fontFamily: PIXEL_FONT,
						transition: 'transform 0.1s, box-shadow 0.1s',
						textShadow: '3px 3px 0 #0058f8'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = '#7baafd'
						e.currentTarget.style.transform = 'translateY(2px)'
						e.currentTarget.style.boxShadow = '0 6px 0 0 #0058f8, inset 0 4px 0 0 rgba(255,255,255,0.4)'
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = '#5c94fc'
						e.currentTarget.style.transform = 'translateY(0)'
						e.currentTarget.style.boxShadow = '0 8px 0 0 #0058f8, inset 0 4px 0 0 rgba(255,255,255,0.4)'
					}}
					onMouseDown={(e) => {
						e.currentTarget.style.transform = 'translateY(8px)'
						e.currentTarget.style.boxShadow = '0 0px 0 0 #0058f8, inset 0 2px 0 0 rgba(255,255,255,0.4)'
					}}
					onMouseUp={(e) => {
						e.currentTarget.style.transform = 'translateY(2px)'
						e.currentTarget.style.boxShadow = '0 6px 0 0 #0058f8, inset 0 4px 0 0 rgba(255,255,255,0.4)'
					}}
				>
					START GAME
				</button>

				<button
					type="button"
					onClick={goSaveSelect}
					style={{
						minWidth: '260px',
						padding: '16px 20px',
						fontSize: '18px',
						color: '#ffffff',
						background: '#48cc48',
						border: 'none',
						borderRadius: '6px',
						boxShadow: '0 6px 0 0 #008800, inset 0 4px 0 0 rgba(255,255,255,0.4)',
						cursor: 'pointer',
						fontFamily: PIXEL_FONT,
						transition: 'transform 0.1s, box-shadow 0.1s',
						textShadow: '2px 2px 0 #008800'
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = '#64db64'
						e.currentTarget.style.transform = 'translateY(2px)'
						e.currentTarget.style.boxShadow = '0 4px 0 0 #008800, inset 0 4px 0 0 rgba(255,255,255,0.4)'
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = '#48cc48'
						e.currentTarget.style.transform = 'translateY(0)'
						e.currentTarget.style.boxShadow = '0 6px 0 0 #008800, inset 0 4px 0 0 rgba(255,255,255,0.4)'
					}}
					onMouseDown={(e) => {
						e.currentTarget.style.transform = 'translateY(6px)'
						e.currentTarget.style.boxShadow = '0 0px 0 0 #008800, inset 0 2px 0 0 rgba(255,255,255,0.4)'
					}}
					onMouseUp={(e) => {
						e.currentTarget.style.transform = 'translateY(2px)'
						e.currentTarget.style.boxShadow = '0 4px 0 0 #008800, inset 0 4px 0 0 rgba(255,255,255,0.4)'
					}}
				>
					SAVE FILES
				</button>
			</div>

			<p
				style={{
					marginTop: 'auto',
					marginBottom: 'clamp(32px, 6vh, 56px)',
					fontSize: '10px',
					color: '#9098a8',
					textAlign: 'center',
					fontFamily: PIXEL_FONT,
					pointerEvents: 'none',
					textShadow: '1px 1px 0 #1b1f2a'
				}}
			>
				Press TAB to open spell editor in levels
			</p>

			<div
				style={{
					position: 'absolute',
					left: 20,
					bottom: 20,
					fontSize: '10px',
					color: '#5a6270',
					fontFamily: PIXEL_FONT,
					pointerEvents: 'none',
				}}
			>
				v1.0.0 - Stage 1
			</div>
		</div>
	)
}
