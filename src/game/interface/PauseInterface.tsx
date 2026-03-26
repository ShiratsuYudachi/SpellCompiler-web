import { useEffect } from 'react'
import { crispDomTextRootStyle, CSS_FONT_STACK } from '../ui/inGameTextStyle'

interface PauseInterfaceProps {
	onResume: () => void
	onQuit: () => void
}

export function PauseInterface({ onResume, onQuit }: PauseInterfaceProps) {
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onResume()
			} else if (e.key === 'q' || e.key === 'Q') {
				e.preventDefault()
				onQuit()
			}
		}

		window.addEventListener('keydown', handleKeyPress)
		return () => window.removeEventListener('keydown', handleKeyPress)
	}, [onResume, onQuit])

	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				background: 'rgba(0, 0, 0, 0.88)',
				backdropFilter: 'blur(6px)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000, // Higher than editor (z-index: 10) to ensure it's on top
				...crispDomTextRootStyle,
			}}
			onClick={onResume}
		>
			<div
				style={{
					background: '#1a1a1e',
					border: '1px solid #333338',
					borderRadius: '12px',
					padding: '40px',
					minWidth: '400px',
					textAlign: 'center',
					boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
					fontFamily: CSS_FONT_STACK,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<h1
					style={{
						fontSize: '48px',
						color: '#ffffff',
						margin: '0 0 30px 0',
						fontWeight: 'bold',
						textShadow: '0 2px 8px rgba(0, 0, 0, 0.75)',
					}}
				>
					PAUSED
				</h1>

				<div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
					<button
						onClick={onResume}
						style={{
							padding: '15px 30px',
							fontSize: '20px',
							fontWeight: 'bold',
							color: '#ffffff',
							background: '#4a90e2',
							border: '2px solid #5aa0f2',
							borderRadius: '8px',
							cursor: 'pointer',
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
						RESUME [ESC]
					</button>

					<button
						onClick={onQuit}
						style={{
							padding: '15px 30px',
							fontSize: '20px',
							fontWeight: 'bold',
							color: '#ffffff',
							background: '#5c2a2a',
							border: '2px solid #7a3a3a',
							borderRadius: '8px',
							cursor: 'pointer',
							transition: 'all 0.2s',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = '#6e3434'
							e.currentTarget.style.transform = 'scale(1.05)'
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = '#5c2a2a'
							e.currentTarget.style.transform = 'scale(1)'
						}}
					>
						QUIT [Q]
					</button>
				</div>

				<p
					style={{
						marginTop: '25px',
						fontSize: '14px',
						color: '#888888',
					}}
				>
					Click anywhere outside or press ESC to resume
				</p>
			</div>
		</div>
	)
}
