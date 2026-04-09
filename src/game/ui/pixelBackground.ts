import Phaser from 'phaser'

enum Team {
	FRIENDLY,
	ENEMY,
	NEUTRAL
}

interface AIImage extends Phaser.Physics.Arcade.Image {
	team: Team;
	lastFired: number;
	fireRate: number;
}

const TEAM_MAP: Record<string, Team> = {
	'player': Team.FRIENDLY,
	'friendly1': Team.FRIENDLY,
	'friendly2': Team.FRIENDLY,
	'enemy1': Team.ENEMY,
	'enemy2': Team.ENEMY,
	'enemy3': Team.ENEMY,
	'neutral1': Team.NEUTRAL
};

export function initPixelBackground(scene: Phaser.Scene) {
	const { width, height } = scene.scale

	// 1. Background image
	scene.add.tileSprite(0, 0, width, height, 'bg').setOrigin(0, 0).setDepth(-100)

	// 2. Physics & Wandering Entities
	if (scene.physics) {
		scene.physics.world.setBounds(0, 0, width, height)

		const entityTypes = [
			{ key: 'player', size: 112 },
			{ key: 'friendly1', size: 70 },
			{ key: 'friendly2', size: 70 },
			{ key: 'neutral1', size: 70 },
			{ key: 'enemy1', size: 70 },
			{ key: 'enemy2', size: 70 },
			{ key: 'enemy3', size: 70 },
		]

		const bouncers: AIImage[] = []
		const bullets = scene.physics.add.group();

		entityTypes.forEach(({ key, size }) => {
			const b = scene.physics.add.image(
				Phaser.Math.Between(100, width - 100),
				Phaser.Math.Between(100, height - 100),
				key
			) as AIImage;

			b.team = TEAM_MAP[key] ?? Team.NEUTRAL;
			b.lastFired = 0;
			b.fireRate = Phaser.Math.Between(2000, 5000); 

			b.setDisplaySize(size, size);
			b.setCollideWorldBounds(true);
			b.setBounce(0.8, 0.8);
			
			// Initial velocity
			let vx = Phaser.Math.Between(30, 60);
			let vy = Phaser.Math.Between(30, 60);
			if (Math.random() > 0.5) vx *= -1;
			if (Math.random() > 0.5) vy *= -1;
			b.setVelocity(vx, vy);
			
			bouncers.push(b);
		});

		// 3. Pixel Particles
		const pColors = [0x4a90e2, 0xff4444, 0x48bb78, 0xffdd44]
		const particles = scene.add.particles(0, 0, 'friendly1', {
			x: { min: 0, max: width },
			y: { min: 0, max: height },
			speed: { min: 5, max: 25 },
			angle: { min: 0, max: 360 },
			scale: { start: 0.05, end: 0 },
			lifespan: 5000,
			blendMode: 'ADD',
			frequency: 180,
			tint: pColors,
			alpha: { start: 0.5, end: 0 }
		})
		particles.setDepth(-10)

		// 4. AI Behavior Update Loop
		const updateListener = (time: number, delta: number) => {
			const dt = delta / 1000;
			bouncers.forEach(b => {
				if (!b.active || !b.body) return;

				// A. Find Nearest Enemy Target
				let nearestEnemy: AIImage | null = null;
				let minDist = Infinity;

				for (const other of bouncers) {
					if (other === b || !other.active) continue;
					
					const isHostile = (b.team === Team.ENEMY && other.team === Team.FRIENDLY) ||
						              (b.team === Team.FRIENDLY && other.team === Team.ENEMY) ||
									  (b.team === Team.NEUTRAL && other.team !== Team.NEUTRAL);
					
					if (isHostile) {
						const dist = Phaser.Math.Distance.Between(b.x, b.y, other.x, other.y);
						if (dist < minDist) {
							minDist = dist;
							nearestEnemy = other;
						}
					}
				}

				// B. Steering Force Calculation
				const steerForce = new Phaser.Math.Vector2(0, 0);

				if (nearestEnemy) {
					const angleToTarget = Phaser.Math.Angle.Between(b.x, b.y, nearestEnemy.x, nearestEnemy.y);
					const toTarget = new Phaser.Math.Vector2(nearestEnemy.x - b.x, nearestEnemy.y - b.y).normalize();
					
					// 1. Maintain Distance
					if (minDist > 350) {
						steerForce.add(toTarget.scale(40)); // Seek
					} else if (minDist < 200) {
						steerForce.add(toTarget.scale(-60)); // Flee
					} else {
						// Orbit/Sidestep slightly
						const tangent = new Phaser.Math.Vector2(-toTarget.y, toTarget.x);
						steerForce.add(tangent.scale(20));
					}
					
					// Smoothly rotate to face target
					const targetRotation = angleToTarget + Math.PI / 2;
					b.rotation = Phaser.Math.Angle.RotateTo(b.rotation, targetRotation, 0.05);

					// 2. Fire Logic
					if (time > b.lastFired + b.fireRate && minDist < 600) {
						const bulletColor = b.team === Team.FRIENDLY ? 0x4fb9ff : (b.team === Team.ENEMY ? 0xff4f4f : 0xffffff);
						const bullet = scene.add.circle(b.x, b.y, 5, bulletColor) as any;
						scene.physics.add.existing(bullet);
						bullets.add(bullet);
						
						const shootAngle = angleToTarget + (Math.random() - 0.5) * 0.1;
						const speed = 300;
						if (bullet.body) {
							(bullet.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(shootAngle) * speed, Math.sin(shootAngle) * speed);
						}
						
						scene.time.delayedCall(3000, () => { if (bullet.active) bullet.destroy(); });
						b.lastFired = time + Phaser.Math.Between(-500, 500); 
					}
				} else {
					// Idle Wander
					b.rotation += 0.01;
					const wanderDir = new Phaser.Math.Vector2().setToPolar(b.rotation - Math.PI/2);
					steerForce.add(wanderDir.scale(10));
				}

				// 3. Separation from other bouncers
				bouncers.forEach(other => {
					if (other === b) return;
					const d = Phaser.Math.Distance.Between(b.x, b.y, other.x, other.y);
					if (d < 120) {
						const repel = new Phaser.Math.Vector2(b.x - other.x, b.y - other.y).normalize().scale(80 * (1 - d/120));
						steerForce.add(repel);
					}
				});

				// 4. Bullet Avoidance
				bullets.getChildren().forEach((bullet: any) => {
					const d = Phaser.Math.Distance.Between(b.x, b.y, bullet.x, bullet.y);
					if (d < 100) {
						// Perpendicular dodge
						const bulletVel = (bullet.body as Phaser.Physics.Arcade.Body).velocity;
						const toBullet = new Phaser.Math.Vector2(bullet.x - b.x, bullet.y - b.y);
						if (toBullet.dot(bulletVel) < 0) { // Bullet coming towards us
							const dodgeDir = new Phaser.Math.Vector2(-bulletVel.y, bulletVel.x).normalize();
							steerForce.add(dodgeDir.scale(100));
						}
					}
				});

				// Apply integrated acceleration
				const body = b.body as Phaser.Physics.Arcade.Body;
				body.velocity.x += steerForce.x * dt;
				body.velocity.y += steerForce.y * dt;
				
				// Max speed limit
				const maxSpeed = 150;
				const currentSpeed = body.velocity.length();
				if (currentSpeed > maxSpeed) {
					body.velocity.normalize().scale(maxSpeed);
				}
				// Drag/Friction to prevent infinite acceleration
				body.velocity.scale(0.995);
			});
		};

		scene.events.on('update', updateListener);
		scene.events.once('shutdown', () => {
			scene.events.off('update', updateListener);
		});
	}
}

export function preloadPixelBackground(scene: Phaser.Scene) {
	const base = import.meta.env.BASE_URL || '/'
	scene.load.image('enemy1', base + 'assets/enemy1.png')
	scene.load.image('enemy2', base + 'assets/enemy2.png')
	scene.load.image('enemy3', base + 'assets/enemy3.png')
	scene.load.image('friendly1', base + 'assets/friendly1.png')
	scene.load.image('friendly2', base + 'assets/friendly2.png')
	scene.load.image('neutral1', base + 'assets/neutral1.png')
	scene.load.image('player', base + 'assets/player.png')
	scene.load.image('bg', base + 'assets/bg.png')
}
