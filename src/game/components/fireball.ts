export const Owner = {
	eid: [] as number[],
}

// Deflection queue item
export interface DeflectionItem {
	angle: number      // 偏转角度（度）
	triggerTime: number // 触发时间戳
}

export const FireballStats = {
	speed: [] as number[],
	damage: [] as number[],
	hitRadius: [] as number[],
	// Deflection system
	initialX: [] as number[],
	initialY: [] as number[],
	// Legacy single deflection (kept for compatibility)
	pendingDeflection: [] as number[],
	deflectAtTime: [] as number[],
	// New: Deflection queue for multiple sequential deflections
	deflectionQueue: [] as DeflectionItem[][],
	// Plate-based deflection: 0=NONE, 1=RED, 2=YELLOW
	deflectOnPlateColor: [] as number[],
	deflectOnPlateAngle: [] as number[],
	plateDeflected: [] as number[], // 0=not yet, 1=already deflected (prevent multiple triggers)
}

export const Lifetime = {
	bornAt: [] as number[],
	lifetimeMs: [] as number[],
}



