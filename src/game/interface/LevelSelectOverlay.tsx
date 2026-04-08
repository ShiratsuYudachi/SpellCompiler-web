import { useEffect, useState } from 'react'
import { replacePhaserScene } from '../gameInstance'
import { LEVEL_GRID } from '../ui/levelSelectData'
import { crispDomTextRootStyle } from '../ui/inGameTextStyle'
import { LevelProgress } from '../scenes/base/LevelProgress'
import { PixelTitle } from '../ui/PixelTitle'

const PIXEL_FONT = "'Press Start 2P', monospace"

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

	const getRowTheme = (num: number) => {
		if (num <= 5) return { border: '#4a90e2', bg: '#1c2841', id: 'blue' }
		if (num <= 10) return { border: '#48cc48', bg: '#1a331a', id: 'green' }
		if (num <= 15) return { border: '#fee140', bg: '#3a3311', id: 'yellow' }
		return { border: '#ff5c5c', bg: '#3f1a1a', id: 'red' }
	}

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 22,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				paddingTop: 40,
				paddingBottom: 16,
				boxSizing: 'border-box',
				...crispDomTextRootStyle,
				pointerEvents: 'none',
				background: 'transparent',
				overflow: 'hidden'
			}}
		>
			{/* Binary/Code Decorations */}
			<div style={{ position: 'absolute', top: 10, left: 10, fontSize: 10, color: 'rgba(255,255,255,0.05)', fontFamily: 'monospace', textAlign: 'left', lineHeight: 1.2 }}>
				011010 01101 0110011<br/>111100 01000 1010011<br/>111000 01101 1000110<br/>001010 01010 01000
			</div>
			<div style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, color: 'rgba(255,255,255,0.05)', fontFamily: 'monospace', textAlign: 'right', lineHeight: 1.2 }}>
				010000 01101 100101<br/>111100 11001 100010<br/>000001 01110 010101<br/>101001 01101 101101
			</div>

			<PixelTitle scale={0.7} />
			
			<h2
				style={{
					fontSize: 16,
					color: '#ffffff',
					marginTop: 20,
					marginBottom: 40,
					fontFamily: PIXEL_FONT,
					textShadow: '2px 2px 0 #1b1f2a',
					letterSpacing: '1px'
				}}
			>
				SELECT YOUR CHALLENGE
			</h2>

			<div
				style={{
					flex: 1,
					overflowY: 'auto',
					overflowX: 'hidden',
					width: 'min(1100px, 96vw)',
					padding: '24px 20px 100px',
					pointerEvents: 'auto',
				}}
			>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
						gap: '24px 16px',
						margin: '0 auto',
					}}
				>
					{LEVEL_GRID.map((entry, index) => {
						const unlocked = LevelProgress.isLevelUnlocked(entry.num)
						const theme = getRowTheme(entry.num)
						
						// Determine if we should show a connecting line to the next level
						const showLine = index < LEVEL_GRID.length - 1 && (index + 1) % 5 !== 0;

						return (
							<div key={entry.key} style={{ position: 'relative' }}>
								{/* Connecting Line (Pipe) */}
								{showLine && (
									<div style={{
										position: 'absolute',
										top: '50%',
										left: '100%',
										width: '16px',
										height: '8px',
										background: unlocked ? theme.border : '#3a3f4e',
										transform: 'translateY(-50%)',
										zIndex: 0,
										opacity: 0.6
									}} />
								)}

								<button
									type="button"
									disabled={!unlocked}
									onClick={() => unlocked && replacePhaserScene('LevelSelectInterface', entry.key)}
									style={{
										position: 'relative',
										width: '100%',
										minHeight: 120,
										border: `3px solid ${unlocked ? theme.border : '#3a3f4e'}`,
										borderRadius: '8px',
										background: unlocked ? '#1a1f2e' : '#0d1117',
										color: '#fff',
										cursor: unlocked ? 'pointer' : 'default',
										padding: 0,
										fontFamily: PIXEL_FONT,
										opacity: unlocked ? 1 : 0.65,
										boxShadow: unlocked ? `0 4px 0 0 ${theme.border}` : '0 4px 0 0 #3a3f4e',
										transition: 'transform 0.1s, box-shadow 0.1s',
										overflow: 'hidden',
										display: 'flex',
										flexDirection: 'column',
										zIndex: 1
									}}
									onMouseEnter={(e) => {
										if (!unlocked) return
										e.currentTarget.style.transform = 'translateY(-2px)'
										e.currentTarget.style.boxShadow = `0 6px 0 0 ${theme.border}`
									}}
									onMouseLeave={(e) => {
										if (!unlocked) return
										e.currentTarget.style.transform = 'translateY(0)'
										e.currentTarget.style.boxShadow = `0 4px 0 0 ${theme.border}`
									}}
								>
									{/* Lvl Header */}
									<div
										style={{
											fontSize: '10px',
											background: unlocked ? 'rgba(255,255,255,0.05)' : 'transparent',
											color: unlocked ? '#ffffff' : '#666',
											textAlign: 'left',
											padding: '6px 8px',
											borderBottom: `1px solid ${unlocked ? 'rgba(255,255,255,0.1)' : '#333'}`,
										}}
									>
										Lvl {entry.num}
									</div>
									
									{/* Icon Placeholder (Isometric-ish) */}
									<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', padding: '10px 0' }}>
										{unlocked ? (['📦', '💻', '🔮', '⚙️', '💎'][entry.num % 5]) : '🔒'}
									</div>

									{/* Name Footer */}
									<div
										style={{
											fontSize: '8px',
											lineHeight: 1.4,
											color: unlocked ? '#c4c8d0' : '#555',
											textAlign: 'center',
											padding: '8px 4px',
											fontWeight: 'normal'
										}}
									>
										{entry.name}
									</div>
								</button>
							</div>
						)
					})}
				</div>
			</div>

			{/* Bottom buttons */}
			<div style={{
				position: 'fixed',
				bottom: 20,
				left: 24,
				pointerEvents: 'auto'
			}}>
				<button
					type="button"
					onClick={back}
					style={{
						minWidth: 160,
						padding: '10px 16px',
						fontSize: '10px',
						color: '#c4c8d0',
						background: '#2d3748',
						border: '1px solid rgba(255,255,255,0.1)',
						borderRadius: '4px',
						boxShadow: '0 4px 0 0 #1a202c',
						cursor: 'pointer',
						fontFamily: PIXEL_FONT,
						transition: 'transform 0.1s, box-shadow 0.1s',
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.background = '#3a445d'
						e.currentTarget.style.color = '#ffffff'
						e.currentTarget.style.transform = 'translateY(1px)'
						e.currentTarget.style.boxShadow = '0 3px 0 0 #1a202c'
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.background = '#2d3748'
						e.currentTarget.style.color = '#c4c8d0'
						e.currentTarget.style.transform = 'translateY(0)'
						e.currentTarget.style.boxShadow = '0 4px 0 0 #1a202c'
					}}
					onMouseDown={(e) => {
						e.currentTarget.style.transform = 'translateY(4px)'
						e.currentTarget.style.boxShadow = '0 0px 0 0 #1a202c'
					}}
					onMouseUp={(e) => {
						e.currentTarget.style.transform = 'translateY(1px)'
						e.currentTarget.style.boxShadow = '0 3px 0 0 #1a202c'
					}}
				>
					back to main menu
				</button>
			</div>
			
			<div
				style={{
					position: 'fixed',
					bottom: 72,
					left: '50%',
					transform: 'translateX(-50%)',
					fontSize: 8,
					color: '#6a7078',
					fontFamily: PIXEL_FONT,
				}}
			>
				U = unlock all &nbsp;|&nbsp; R = reset progress
			</div>
		</div>
	)
}
