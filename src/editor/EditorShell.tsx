import type { ReactNode } from 'react'

/** Same chrome as in-game editor overlay: dim + dark panel so direct /editor matches colors. */
export function EditorShell({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				background: 'rgba(0, 0, 0, 0.35)',
				zIndex: 10,
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
