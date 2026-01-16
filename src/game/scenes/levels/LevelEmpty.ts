import { BaseScene } from '../base/BaseScene'

/**
 * LevelEmpty - 空关卡模板
 * 用于Level4-Level20等未开发关卡
 */
export class LevelEmpty extends BaseScene {
	constructor(key: string = 'LevelEmpty') {
		super({ key })
	}

	protected onLevelCreate() {
		// 显示关卡信息
		const levelName = this.scene.key.replace('Level', 'Level ')
		this.add
			.text(480, 100, levelName, {
				fontSize: '32px',
				color: '#ffffff',
				fontStyle: 'bold',
			})
			.setOrigin(0.5)

		this.add
			.text(480, 150, 'This level is under development', {
				fontSize: '18px',
				color: '#aaaaaa',
			})
			.setOrigin(0.5)

		// 提示信息
		this.add
			.text(480, 270, 'Move around and explore!', {
				fontSize: '16px',
				color: '#888888',
			})
			.setOrigin(0.5)
	}
}

// 导出Level4-Level20的具体实现
export class Level4 extends LevelEmpty {
	constructor() {
		super('Level4')
	}
}

export class Level5 extends LevelEmpty {
	constructor() {
		super('Level5')
	}
}

// Level6 is implemented in Level6.ts
// export class Level6 extends LevelEmpty {
// 	constructor() {
// 		super('Level6')
// 	}
// }

// Level7 is implemented in Level7.ts
// export class Level7 extends LevelEmpty {
// 	constructor() {
// 		super('Level7')
// 	}
// }

// Level8 is implemented in Level8.ts
// export class Level8 extends LevelEmpty {
// 	constructor() {
// 		super('Level8')
// 	}
// }

export class Level9 extends LevelEmpty {
	constructor() {
		super('Level9')
	}
}

export class Level10 extends LevelEmpty {
	constructor() {
		super('Level10')
	}
}

// Level11 is implemented in Level11.ts

export class Level12 extends LevelEmpty {
	constructor() {
		super('Level12')
	}
}

export class Level13 extends LevelEmpty {
	constructor() {
		super('Level13')
	}
}

export class Level14 extends LevelEmpty {
	constructor() {
		super('Level14')
	}
}

export class Level15 extends LevelEmpty {
	constructor() {
		super('Level15')
	}
}

export class Level16 extends LevelEmpty {
	constructor() {
		super('Level16')
	}
}

export class Level17 extends LevelEmpty {
	constructor() {
		super('Level17')
	}
}

export class Level18 extends LevelEmpty {
	constructor() {
		super('Level18')
	}
}

export class Level19 extends LevelEmpty {
	constructor() {
		super('Level19')
	}
}

export class Level20 extends LevelEmpty {
	constructor() {
		super('Level20')
	}
}
