import { useEffect, useState } from 'react'

export type CanvasRect = { left: number; top: number; width: number; height: number }

/**
 * Tracks the Phaser game canvas bounding rect so DOM overlays align with FIT-scaled content.
 */
export function usePhaserCanvasRect(): CanvasRect | null {
	const [rect, setRect] = useState<CanvasRect | null>(null)

	useEffect(() => {
		const pick = () => {
			const canvas = document.querySelector('.phaser-game-host canvas') as HTMLCanvasElement | null
			if (!canvas) {
				setRect(null)
				return
			}
			const r = canvas.getBoundingClientRect()
			setRect({ left: r.left, top: r.top, width: r.width, height: r.height })
		}

		pick()
		const ro = new ResizeObserver(pick)
		const canvas = document.querySelector('.phaser-game-host canvas')
		if (canvas) ro.observe(canvas)
		window.addEventListener('scroll', pick, true)
		window.addEventListener('resize', pick)

		return () => {
			ro.disconnect()
			window.removeEventListener('scroll', pick, true)
			window.removeEventListener('resize', pick)
		}
	}, [])

	return rect
}
