import type { ReactNode } from 'react'

/** Same chrome as in-game editor overlay: dim + dark panel so direct /editor matches colors. */
export function EditorShell({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				background: 'rgba(0, 0, 0, 0.35)',
				// Above Phaser canvas (game host has no z-index); avoids WebGL compositing hiding the flow.
				zIndex: 10000,
				isolation: 'isolate',
			}}
		>
			<div
				style={{
					position: 'absolute',
					inset: 12,
					background: '#0b0b0b',
					border: '1px solid rgba(255, 255, 255, 0.2)',
				}}
			>
				{children}
			</div>
		</div>
	)
}
