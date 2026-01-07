interface VictoryInterfaceProps {
	level: number
	onNextLevel: () => void
	onReplay: () => void
	onMainMenu: () => void
}

export function VictoryInterface({ level, onNextLevel, onReplay, onMainMenu }: VictoryInterfaceProps) {
	const isLastLevel = level >= 20

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
		>
			<div
				style={{
					background: '#1a1a2e',
					border: '3px solid #4a90e2',
					borderRadius: '12px',
					padding: '50px 60px',
					minWidth: '450px',
					textAlign: 'center',
					boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
				}}
			>
				{/* Title */}
				<h1
					style={{
						fontSize: '42px',
						color: '#ffffff',
						margin: '0 0 40px 0',
						fontWeight: 'bold',
						textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
					}}
				>
					LEVEL {level} COMPLETED!
				</h1>

				{/* Next Level Button (large) */}
				{!isLastLevel && (
					<button
						onClick={onNextLevel}
						style={{
							width: '300px',
							height: '60px',
							fontSize: '24px',
							fontWeight: 'bold',
							color: '#ffffff',
							background: '#4a90e2',
							border: '2px solid #5aa0f2',
							borderRadius: '8px',
							cursor: 'pointer',
							transition: 'all 0.2s',
							marginBottom: '20px',
							display: 'block',
							margin: '0 auto 20px auto',
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
						→ NEXT LEVEL
					</button>
				)}

				{/* Replay and Menu buttons (small, side by side) */}
				<div
					style={{
						display: 'flex',
						gap: '20px',
						justifyContent: 'center',
					}}
				>
					<button
						onClick={onReplay}
						style={{
							width: '140px',
							height: '50px',
							fontSize: '18px',
							fontWeight: 'bold',
							color: '#ffffff',
							background: '#2d3748',
							border: '2px solid #4a5568',
							borderRadius: '8px',
							cursor: 'pointer',
							transition: 'all 0.2s',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = '#3d4758'
							e.currentTarget.style.transform = 'scale(1.05)'
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = '#2d3748'
							e.currentTarget.style.transform = 'scale(1)'
						}}
					>
						↻ REPLAY
					</button>

					<button
						onClick={onMainMenu}
						style={{
							width: '140px',
							height: '50px',
							fontSize: '18px',
							fontWeight: 'bold',
							color: '#ffffff',
							background: '#2d3748',
							border: '2px solid #4a5568',
							borderRadius: '8px',
							cursor: 'pointer',
							transition: 'all 0.2s',
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.background = '#3d4758'
							e.currentTarget.style.transform = 'scale(1.05)'
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = '#2d3748'
							e.currentTarget.style.transform = 'scale(1)'
						}}
					>
						⌂ MENU
					</button>
				</div>

				{/* Show "Back to Menu" message if last level */}
				{isLastLevel && (
					<p
						style={{
							marginTop: '20px',
							fontSize: '16px',
							color: '#aaaaaa',
						}}
					>
						Congratulations! You've completed all levels!
					</p>
				)}
			</div>
		</div>
	)
}
