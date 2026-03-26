import { useSyncExternalStore } from 'react'
import { GameEvents } from '../events'
import { getGameInstance } from '../gameInstance'
import { crispDomTextRootStyle, CSS_FONT_STACK } from './inGameTextStyle'
import { getGameDomUiSnapshot, subscribeGameDomUi } from './gameDomUiStore'
import { usePhaserCanvasRect } from './usePhaserCanvasRect'

const DESIGN_W = 960
const DESIGN_H = 540

export function LevelHudOverlay() {
	const state = useSyncExternalStore(subscribeGameDomUi, getGameDomUiSnapshot, getGameDomUiSnapshot)
	const canvasRect = usePhaserCanvasRect()
	const h = state.levelHud

	if (!h.visible || !canvasRect) return null

	const scale = Math.min(canvasRect.width / DESIGN_W, canvasRect.height / DESIGN_H)

	const dismissTutorial = () => {
		getGameInstance()?.events.emit(GameEvents.dismissTutorial)
	}

	return (
		<div
			style={{
				position: 'fixed',
				left: canvasRect.left,
				top: canvasRect.top,
				width: canvasRect.width,
				height: canvasRect.height,
				pointerEvents: 'none',
				overflow: 'hidden',
				zIndex: 25,
				...crispDomTextRootStyle,
			}}
		>
			<div
				style={{
					position: 'absolute',
					left: '50%',
					top: '50%',
					width: DESIGN_W,
					height: DESIGN_H,
					transform: `translate(-50%, -50%) scale(${scale})`,
					transformOrigin: 'center center',
				}}
			>
				{/* HP + cast — top-left */}
				<div
					style={{
						position: 'absolute',
						left: 20,
						top: 20,
						pointerEvents: 'none',
					}}
				>
					<div
						style={{
							fontSize: 15,
							fontWeight: 600,
							color: '#f2f2f2',
							textShadow: '0 1px 2px rgba(0,0,0,0.65)',
							fontFamily: CSS_FONT_STACK,
							whiteSpace: 'pre-line',
						}}
					>
						{h.hpLine}
					</div>
					{h.castVisible ? (
						<div
							style={{
								marginTop: 6,
								fontSize: 13,
								fontWeight: 700,
								color: h.castWarning ? '#e88878' : '#e8dcc8',
								fontFamily: CSS_FONT_STACK,
							}}
						>
							{h.castLine}
						</div>
					) : null}
				</div>

				{/* Spell line — lower-left HUD stack */}
				{h.spellLine ? (
					<div
						style={{
							position: 'absolute',
							left: 16,
							bottom: 120,
							maxWidth: 420,
							fontSize: 15,
							color: '#f2f2f2',
							textShadow: '0 1px 2px rgba(0,0,0,0.65)',
							fontFamily: CSS_FONT_STACK,
							whiteSpace: 'pre-wrap',
						}}
					>
						{h.spellLine}
					</div>
				) : null}

				{/* Task panel — top-right */}
				<div
					style={{
						position: 'absolute',
						right: 20,
						top: 20,
						width: 210,
						minHeight: 90,
						background: 'rgba(26,26,30,0.96)',
						border: '2px solid #3a3d46',
						borderRadius: 8,
						overflow: 'hidden',
						pointerEvents: 'none',
					}}
				>
					<div
						style={{
							background: '#2a2d35',
							padding: '6px 0',
							textAlign: 'center',
							fontSize: 11,
							fontWeight: 700,
							color: '#e6e8ef',
							letterSpacing: '0.06em',
							fontFamily: CSS_FONT_STACK,
						}}
					>
						{h.taskTitle}
					</div>
					<div
						style={{
							padding: '8px 12px',
							fontSize: 14,
							color: '#e8eaef',
							lineHeight: 1.45,
							fontFamily: CSS_FONT_STACK,
							whiteSpace: 'pre-wrap',
						}}
					>
						{h.taskBody}
					</div>
				</div>

				{/* Minimap label */}
				<div
					style={{
						position: 'absolute',
						right: 20 + 75 - 40,
						bottom: 20 + 150 + 4,
						fontSize: 11,
						fontWeight: 700,
						color: '#c8cbd4',
						fontFamily: CSS_FONT_STACK,
						textAlign: 'center',
						width: 150,
					}}
				>
					{h.minimapTitle}
				</div>

				{/* Controls — bottom-left */}
				<div
					style={{
						position: 'absolute',
						left: 20,
						bottom: 20,
						width: 250,
						minHeight: 90,
						background: 'rgba(26,26,30,0.92)',
						border: '2px solid rgba(58,61,70,0.75)',
						borderRadius: 8,
						overflow: 'hidden',
						pointerEvents: 'none',
					}}
				>
					<div
						style={{
							background: 'rgba(42,45,53,0.95)',
							padding: '5px 0',
							textAlign: 'center',
							fontSize: 11,
							fontWeight: 700,
							color: '#e6e8ef',
							fontFamily: CSS_FONT_STACK,
						}}
					>
						CONTROLS
					</div>
					<div
						style={{
							padding: '8px 12px',
							fontSize: 14,
							color: '#d8dce6',
							lineHeight: 1.5,
							fontFamily: CSS_FONT_STACK,
							whiteSpace: 'pre-line',
						}}
					>
						{h.controlsLeft}
					</div>
				</div>

				{/* Survival timer — top center */}
				{h.survivalTimerVisible ? (
					<div
						style={{
							position: 'absolute',
							left: '50%',
							top: 48,
							transform: 'translateX(-50%)',
							fontSize: 22,
							fontWeight: 700,
							color: h.survivalTimerGreen ? '#00ff88' : '#ffffff',
							textShadow: '0 2px 6px rgba(0,0,0,0.75)',
							fontFamily: CSS_FONT_STACK,
						}}
					>
						{h.survivalTimerLine}
					</div>
				) : null}

				{/* Boss bar — top center */}
				{h.bossHud ? (
					<div
						style={{
							position: 'absolute',
							left: '50%',
							top: 12,
							transform: 'translateX(-50%)',
							width: 360,
							textAlign: 'center',
							pointerEvents: 'none',
						}}
					>
						<div
							style={{
								height: 10,
								background: 'rgba(0,0,0,0.55)',
								borderRadius: 4,
								overflow: 'hidden',
								marginBottom: 6,
							}}
						>
							<div
								style={{
									width: `${Math.round(h.bossHud.barPercent * 100)}%`,
									height: '100%',
									background:
										h.bossHud.barPercent > 0.5
											? '#00ff66'
											: h.bossHud.barPercent > 0.25
												? '#ffff00'
												: '#ff3333',
								}}
							/>
						</div>
						<div
							style={{
								fontSize: 16,
								fontWeight: 600,
								color: '#f0f0f0',
								fontFamily: CSS_FONT_STACK,
							}}
						>
							{h.bossHud.healthLine}
						</div>
						<div
							style={{
								fontSize: 14,
								fontWeight: 600,
								color: '#e8e070',
								fontFamily: CSS_FONT_STACK,
								marginTop: 2,
							}}
						>
							{h.bossHud.stateLine}
						</div>
					</div>
				) : null}

				{/* Skill / phase banner */}
				{h.banner ? (
					<div
						style={{
							position: 'absolute',
							left: '50%',
							top: '42%',
							transform: 'translate(-50%, -50%)',
							fontSize: h.banner.fontSizePx,
							fontWeight: 800,
							color: h.banner.color,
							textShadow: '0 2px 12px rgba(0,0,0,0.85)',
							fontFamily: CSS_FONT_STACK,
							pointerEvents: 'none',
							textAlign: 'center',
							maxWidth: 880,
						}}
					>
						{h.banner.text}
					</div>
				) : null}

				{/* Tutorial */}
				{h.tutorialVisible ? (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							background: 'rgba(0,0,0,0.72)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							pointerEvents: 'auto',
						}}
						onClick={dismissTutorial}
						onKeyDown={(e) => {
							if (e.key === 'Escape') dismissTutorial()
						}}
						role="presentation"
					>
						<div
							style={{
								width: 680,
								maxHeight: 300,
								overflow: 'auto',
								background: 'rgba(26,26,30,0.98)',
								border: '2px solid #3a3d46',
								borderRadius: 16,
								padding: 28,
								fontSize: 18,
								color: '#e8eaef',
								lineHeight: 1.55,
								fontFamily: CSS_FONT_STACK,
								whiteSpace: 'pre-wrap',
								textAlign: 'center',
								boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
							}}
							onClick={(e) => e.stopPropagation()}
						>
							{h.tutorialBody}
						</div>
					</div>
				) : null}
			</div>
		</div>
	)
}
