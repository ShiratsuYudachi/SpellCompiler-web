import type { ReactNode } from 'react'
import { EditorColors } from './utils/EditorTheme'

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
					background: EditorColors.bg,
					border: `1px solid ${EditorColors.borderColor}`,
				}}
			>
				{children}
			</div>
		</div>
	)
}
