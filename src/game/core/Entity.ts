import type { Component } from './Component'

export class Entity {
	private components: Component[] = []
	private active = true

	add(component: Component) {
		this.components.push(component)
		return this
	}

	get<T extends Component>(ctor: new (...args: any[]) => T) {
		for (const c of this.components) {
			if (c instanceof ctor) {
				return c as T
			}
		}
		return undefined
	}

	update(dt: number) {
		if (!this.active) {
			return
		}
		for (const c of this.components) {
			c.update(dt)
		}
	}

	destroy() {
		if (!this.active) {
			return
		}
		this.active = false
		for (const c of this.components) {
			c.destroy?.()
		}
		this.components = []
	}

	isActive() {
		return this.active
	}
}


