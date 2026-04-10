import { useEffect, useState } from 'react'

export type CanvasRect = { left: number; top: number; width: number; height: number }

/**
 * Tracks the Phaser game canvas bounding rect so DOM overlays align with FIT-scaled content.
 *
 * Phaser creates the canvas asynchronously after mount. The first paint may have no canvas yet;
 * we observe the host container and canvas insertion so the HUD does not stay stuck with a null rect.
 * Measurements are deferred by two animation frames so layout matches `Game.tsx` scale refresh after
 * resize / DevTools dock (Chrome often fires resize before final layout).
 */
export function usePhaserCanvasRect(): CanvasRect | null {
	const [rect, setRect] = useState<CanvasRect | null>(null)

	useEffect(() => {
		const host = document.querySelector('.phaser-game-host') as HTMLElement | null
		if (!host) {
			return
		}

		let rafPairId: number | null = null
		let observedCanvas: HTMLCanvasElement | null = null
		let canvasResizeRo: ResizeObserver | null = null
		let mutationCoalesce: number | null = null

		const pick = () => {
			const canvas = host.querySelector('canvas') as HTMLCanvasElement | null
			if (!canvas) {
				if (canvasResizeRo && observedCanvas) {
					canvasResizeRo.disconnect()
					canvasResizeRo = null
					observedCanvas = null
				}
				setRect(null)
				return
			}

			if (canvas !== observedCanvas) {
				if (canvasResizeRo && observedCanvas) {
					canvasResizeRo.disconnect()
				}
				observedCanvas = canvas
				canvasResizeRo = new ResizeObserver(schedulePick)
				canvasResizeRo.observe(canvas)
			}

			const r = canvas.getBoundingClientRect()
			setRect({ left: r.left, top: r.top, width: r.width, height: r.height })
		}

		const schedulePick = () => {
			if (rafPairId !== null) {
				cancelAnimationFrame(rafPairId)
			}
			rafPairId = requestAnimationFrame(() => {
				rafPairId = requestAnimationFrame(() => {
					rafPairId = null
					pick()
				})
			})
		}

		const schedulePickOnHostMutate = () => {
			if (mutationCoalesce !== null) {
				cancelAnimationFrame(mutationCoalesce)
			}
			mutationCoalesce = requestAnimationFrame(() => {
				mutationCoalesce = null
				schedulePick()
			})
		}

		schedulePick()

		const hostRo = new ResizeObserver(schedulePick)
		hostRo.observe(host)

		const mo = new MutationObserver(schedulePickOnHostMutate)
		mo.observe(host, { childList: true, subtree: true })

		window.addEventListener('scroll', schedulePick, true)
		window.addEventListener('resize', schedulePick)

		const vv = window.visualViewport
		if (vv) {
			vv.addEventListener('resize', schedulePick)
			vv.addEventListener('scroll', schedulePick)
		}

		return () => {
			if (rafPairId !== null) {
				cancelAnimationFrame(rafPairId)
			}
			if (mutationCoalesce !== null) {
				cancelAnimationFrame(mutationCoalesce)
			}
			hostRo.disconnect()
			mo.disconnect()
			if (canvasResizeRo && observedCanvas) {
				canvasResizeRo.disconnect()
			}
			window.removeEventListener('scroll', schedulePick, true)
			window.removeEventListener('resize', schedulePick)
			if (vv) {
				vv.removeEventListener('resize', schedulePick)
				vv.removeEventListener('scroll', schedulePick)
			}
		}
	}, [])

	return rect
}
