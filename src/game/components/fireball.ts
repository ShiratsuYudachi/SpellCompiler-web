export const Owner = {
	eid: [] as number[],
}

export const FireballStats = {
	speed: [] as number[],
	damage: [] as number[],
	hitRadius: [] as number[],
	// Deflection system
	initialX: [] as number[],
	initialY: [] as number[],
	pendingDeflection: [] as number[],
	deflectAtTime: [] as number[],
	// Plate-based deflection: 0=NONE, 1=RED, 2=YELLOW
	deflectOnPlateColor: [] as number[],
	deflectOnPlateAngle: [] as number[],
	plateDeflected: [] as number[], // 0=not yet, 1=already deflected (prevent multiple triggers)
}

export const Lifetime = {
	bornAt: [] as number[],
	lifetimeMs: [] as number[],
}



