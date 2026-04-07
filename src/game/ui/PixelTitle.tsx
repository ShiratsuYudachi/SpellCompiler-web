import React from 'react'

const PIXEL_FONT = "'Press Start 2P', monospace"

export function PixelTitle({ scale = 1 }: { scale?: number }) {
	return (
		<div
			style={{
				display: 'flex',
				gap: Math.floor(24 * scale) + 'px',
				pointerEvents: 'none',
				transform: `scale(${scale})`,
				transformOrigin: 'top center'
			}}
		>
			<div style={{ display: 'flex', gap: '0px' }}>
				{[
					{ char: 'S', color: '#ff6b9d' },
					{ char: 'P', color: '#ff8fab' },
					{ char: 'E', color: '#ff9a8b' },
					{ char: 'L', color: '#ff7b7b' },
					{ char: 'L', color: '#ff5c5c' },
				].map((item, i) => (
					<span key={i} style={{
						fontSize: '48px',
						color: item.color,
						textShadow: '4px 4px 0 #1b1f2a, 0 0 10px rgba(0,0,0,0.4)',
						fontFamily: PIXEL_FONT,
					}}>{item.char}</span>
				))}
			</div>
			<div style={{ display: 'flex', gap: '0px' }}>
				{[
					{ char: 'C', color: '#4facfe' },
					{ char: 'O', color: '#00f2fe' },
					{ char: 'M', color: '#43e97b' },
					{ char: 'P', color: '#38f9d7' },
					{ char: 'I', color: '#fa709a' },
					{ char: 'L', color: '#fee140' },
					{ char: 'E', color: '#f6d365' },
					{ char: 'R', color: '#fda085' },
				].map((item, i) => (
					<span key={i} style={{
						fontSize: '48px',
						color: item.color,
						textShadow: '4px 4px 0 #1b1f2a, 0 0 10px rgba(0,0,0,0.4)',
						fontFamily: PIXEL_FONT,
					}}>{item.char}</span>
				))}
			</div>
		</div>
	)
}
