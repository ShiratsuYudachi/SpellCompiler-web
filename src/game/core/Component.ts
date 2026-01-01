export abstract class Component {
	abstract update(dt: number): void
	destroy?(): void
}



