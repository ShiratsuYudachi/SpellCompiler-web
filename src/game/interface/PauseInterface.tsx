import { useEffect } from 'react'

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
				background: 'rgba(0, 0, 0, 0.85)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 10,
			}}
			onClick={onResume}
		>
			<div
				style={{
					background: '#1a1a2e',
					border: '3px solid #4a90e2',
					borderRadius: '12px',
					padding: '40px',
					minWidth: '400px',
					textAlign: 'center',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<h1
					style={{
						fontSize: '48px',
						color: '#ffffff',
						margin: '0 0 30px 0',
						fontWeight: 'bold',
						textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
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
							background: '#e74c3c',
							border: '2px solid #ff6b5a',
							borderRadius: '8px',
							cursor: 'pointer',
							transition: 'all 0.2s',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = '#ff6b5a'
							e.currentTarget.style.transform = 'scale(1.05)'
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = '#e74c3c'
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
