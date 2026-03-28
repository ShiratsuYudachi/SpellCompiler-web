import { useEffect, useState } from 'react'
import { replacePhaserScene } from '../gameInstance'
import { CATEGORY_COLORS, LEVEL_GRID } from '../ui/levelSelectData'
import { crispDomTextRootStyle, CSS_FONT_STACK } from '../ui/inGameTextStyle'
import { LevelProgress } from '../scenes/base/LevelProgress'

export function LevelSelectOverlay() {
	const [, setTick] = useState(0)

	const back = () => {
		replacePhaserScene('LevelSelectInterface', 'MainInterface')
	}

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'u' || e.key === 'U') {
				e.preventDefault()
				LevelProgress.unlockAll()
				setTick((t) => t + 1)
			}
			if (e.key === 'r' || e.key === 'R') {
				e.preventDefault()
				LevelProgress.reset()
				setTick((t) => t + 1)
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [])

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 22,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				paddingTop: 24,
				paddingBottom: 16,
				boxSizing: 'border-box',
				...crispDomTextRootStyle,
				pointerEvents: 'auto',
			}}
		>
			<h1
				style={{
					fontSize: 32,
					fontWeight: 800,
					color: '#fff',
					margin: '0 0 12px 0',
					textShadow: '0 1px 2px rgba(0,0,0,0.55)',
					fontFamily: CSS_FONT_STACK,
				}}
			>
				SELECT LEVEL
			</h1>

			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					overflowX: 'hidden',
					width: 'min(920px, 96vw)',
					padding: '8px 12px 100px',
				}}
			>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
						gap: '16px 12px',
						maxWidth: 880,
						margin: '0 auto',
					}}
				>
					{LEVEL_GRID.map((entry) => {
						const unlocked = LevelProgress.isLevelUnlocked(entry.num)
						const completed = LevelProgress.isLevelCompleted(entry.num)
						const accent = CATEGORY_COLORS[entry.category] ?? '#4a90e2'
						return (
							<button
								key={entry.key}
								type="button"
								disabled={!unlocked}
								onClick={() => unlocked && replacePhaserScene('LevelSelectInterface', entry.key)}
								style={{
									position: 'relative',
									minHeight: 100,
									borderRadius: 8,
									border: `2px solid ${unlocked ? accent : '#3a3f4e'}`,
									background: unlocked ? '#2d3748' : '#1a1f2e',
									color: '#fff',
									cursor: unlocked ? 'pointer' : 'default',
									padding: '10px 8px',
									fontFamily: CSS_FONT_STACK,
									opacity: unlocked ? 1 : 0.75,
								}}
							>
								{unlocked ? (
									<div
										style={{
											position: 'absolute',
											top: 4,
											left: '50%',
											transform: 'translateX(-50%)',
											width: '90%',
											height: 4,
											background: accent,
											opacity: 0.85,
											borderRadius: 2,
										}}
									/>
								) : null}
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'flex-start',
										marginBottom: 6,
									}}
								>
									<span
										style={{
											fontSize: 28,
											fontWeight: 800,
											color: unlocked ? '#fff' : '#555',
										}}
									>
										{entry.num}
									</span>
									<span
										style={{
											fontSize: 9,
											fontWeight: 700,
											color: unlocked ? accent : '#444',
											textTransform: 'none',
										}}
									>
										{entry.category}
									</span>
								</div>
								<div
									style={{
										fontSize: 12,
										color: unlocked ? '#c8c8c8' : '#444',
										textAlign: 'center',
										lineHeight: 1.25,
									}}
								>
									{entry.name}
								</div>
								{completed ? (
									<div
										style={{
											position: 'absolute',
											top: 6,
											right: 8,
											fontSize: 20,
											color: '#00ff88',
											fontWeight: 800,
										}}
									>
										✓
									</div>
								) : null}
								{!unlocked ? (
									<div
										style={{
											position: 'absolute',
											inset: 0,
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: 28,
											opacity: 0.35,
										}}
									>
										🔒
									</div>
								) : null}
							</button>
						)
					})}
				</div>
			</div>

			<div
				style={{
					position: 'fixed',
					bottom: 72,
					left: '50%',
					transform: 'translateX(-50%)',
					fontSize: 11,
					color: '#6a7078',
					fontFamily: CSS_FONT_STACK,
				}}
			>
				U = unlock all &nbsp;|&nbsp; R = reset progress
			</div>

			<button
				type="button"
				onClick={back}
				style={{
					position: 'fixed',
					bottom: 20,
					left: '50%',
					transform: 'translateX(-50%)',
					minWidth: 200,
					padding: '12px 24px',
					fontSize: 18,
					fontWeight: 700,
					color: '#fff',
					background: '#8b4513',
					border: '2px solid #cd853f',
					borderRadius: 8,
					cursor: 'pointer',
					fontFamily: CSS_FONT_STACK,
				}}
			>
				BACK TO MENU
			</button>
		</div>
	)
}
