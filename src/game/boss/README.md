# Boss System Architecture

## Overview

The Boss system is a comprehensive, modular combat system built for Level 2 (Emergency Battle). It features a **Fragmented Phantom Boss** with multiple phases, skill-based attacks, and a state-driven AI.

## Core Architecture

### 1. **Boss Entity** ([entities/Boss.ts](entities/Boss.ts))
The main controller that orchestrates all Boss systems.

**Key Responsibilities:**
- State management through BossStore
- AI behavior and decision-making
- Phase transitions
- Skill execution coordination
- UI management (health bar, state display)

**State Machine:**
```
idle → chase → attack → dead
```

### 2. **State Management** ([core/BossStore.ts](core/BossStore.ts))
Redux-inspired immutable state store with subscription system.

**State Structure:**
```typescript
{
  health: number
  maxHealth: number
  position: { x, y }
  velocity: { x, y }
  currentState: 'idle' | 'chase' | 'attack' | 'dead'
  currentPhase: 0 | 1 | 2
  isAttacking: boolean
  isInvincible: boolean
  lastAttackTime: number
  targetDistance: number
}
```

**Actions:**
- `TAKE_DAMAGE` - Reduce health (respects invincibility)
- `SET_POSITION` - Update Boss position
- `CHANGE_STATE` - Transition between AI states
- `CHANGE_PHASE` - Trigger phase transition
- `START_ATTACK` / `END_ATTACK` - Manage attack state

### 3. **Visual System** ([visuals/FragmentedPhantomBoss.ts](visuals/FragmentedPhantomBoss.ts))
Container-based visual representation using geometric fragments.

**Components:**
- **Head Fragments**: 3 triangular pieces
- **Body Fragments**: 5 quadrilateral pieces (torso, shoulders, waist, lower)
- **Cloak Fragments**: 12 animated triangular pieces orbiting the body
- **Blades**: Two weapon graphics
- **Phantoms**: Trail effects during movement

**Features:**
- Idle floating animation
- Phase-based color changes
- Flash effect on damage
- Explosion death animation
- Container-relative positioning (fixes coordinate bugs)

### 4. **Skill System**

#### Skill Manager ([skills/SkillManager.ts](skills/SkillManager.ts))
- Registers and executes all skills
- Manages cooldowns and availability
- Filters skills by phase
- Coordinates skill execution lifecycle

#### Skill Selector ([ai/SkillSelector.ts](ai/SkillSelector.ts))
AI decision-making for skill selection based on:
- Distance to player
- Boss health percentage
- Current phase
- Skill cooldowns
- Random weighting

#### Skill Types by Phase

**Phase 1 (100% - 60% HP):**
- `LinearCutSkill` - Straight-line dash attack
- `GeometricBladeSkill` - Geometric pattern projectiles
- `FragmentDecoySkill` - Teleport + decoy (passive defense)
- `RotatingShieldSkill` - Spinning shield defense

**Phase 2 (60% - 30% HP):**
- `ShadowEchoSkill` - Creates shadow clones
- `SpaceCollapseSkill` - Area collapse attack
- `CloakTrackingSkill` - Homing cloak projectiles
- `ZigzagRushSkill` - Zigzag dash pattern
- `RedMoonSlashSkill` - Crescent moon slash

**Phase 3 (30% - 0% HP):**
- `FullScreenPurgeSkill` - Screen-wide attack
- `TripleIllusionSkill` - Three simultaneous illusions
- `FinalCollapseSkill` - Ultimate collapse attack

### 5. **Collision System** ([collision/HitboxManager.ts](collision/HitboxManager.ts))
Manages hitboxes for Boss attacks.

### 6. **Effects System** ([visuals/BossEffects.ts](visuals/BossEffects.ts))
Visual effects including:
- Impact flashes
- Explosions
- Particle effects

### 7. **Configuration** ([configs/BossConfig.ts](configs/BossConfig.ts))
Centralized Boss parameters:

```typescript
{
  maxHealth: 1000
  moveSpeed: 100
  detectionRange: 400
  attackRange: 150
  attackCooldown: 2.0

  phases: [
    Phase 1: Normal stats
    Phase 2: 1.5x damage, 1.2x speed, 0.8x cooldown, 2s invincibility
    Phase 3: 2.0x damage, 1.5x speed, 0.6x cooldown, 3s invincibility
  ]
}
```

## Combat Flow

### AI Update Loop (Boss.update())
1. Calculate distance to player
2. Update state machine:
   - **Idle**: Wait for player in detection range
   - **Chase**: Move toward player until in attack range
   - **Attack**: Execute skills or basic attacks
   - **Dead**: Stop all behavior
3. Apply velocity and clamp to bounds
4. Sync visual position

### Attack Execution
1. Check if ready to attack (cooldown complete, not currently attacking)
2. Get available skills from SkillManager
3. Use SkillSelector to choose best skill
4. Execute skill through SkillManager
5. Fall back to basic attack if no skills available

### Basic Attacks
- **Ranged** (distance > 150): Purple tracking bullet
- **Melee** (distance ≤ 150): Weapon slash with AOE damage

### Phase Transitions
Triggered automatically when health crosses thresholds:
1. Change phase in BossStore
2. Set temporary invincibility
3. Screen shake effect
4. Visual flash and color change
5. Update skill availability

## Integration with Level 2

[Level2.ts](../../scenes/levels/Level2.ts) handles:
- Boss instantiation with config
- Player movement (WASD)
- Shooting mechanics (Left Click)
- **Bullet collision detection** (now fixed to use Boss position correctly)
- Event listeners:
  - `defeated` - Transition to level select
  - `attackHit` - Camera shake on damage

## Bug Fixes

### Fixed: Bullet Collision Bug
**Issue**: Bullets weren't hitting the Boss
**Root Cause**: Collision detection used `container.x, container.y` which are always `(0, 0)` in container-relative space
**Solution**: Use `boss.getPosition()` to get absolute world coordinates

```typescript
// Before (broken):
const container = visualBoss.getContainer()
const distance = Phaser.Math.Distance.Between(b.x, b.y, container.x, container.y)

// After (fixed):
const bossPos = this.boss.getPosition()
const distance = Phaser.Math.Distance.Between(b.x, b.y, bossPos.x, bossPos.y)
```

## Event System

[core/EventBus.ts](core/EventBus.ts) provides type-safe event emission:

**Events:**
- `healthChanged` - When Boss takes damage or heals
- `stateChanged` - AI state transitions
- `phaseChanged` - Phase transitions
- `damaged` - Damage dealt with amount and critical flag
- `died` - Boss death

**Usage:**
```typescript
boss.on('defeated', () => {
  console.log('Boss defeated!')
})
```

## Directory Structure

```
boss/
├── ai/
│   └── SkillSelector.ts       # Skill selection AI
├── collision/
│   └── HitboxManager.ts       # Hitbox management
├── configs/
│   └── BossConfig.ts          # Boss parameters
├── core/
│   ├── BossStore.ts           # State management
│   └── EventBus.ts            # Event system
├── entities/
│   └── Boss.ts                # Main Boss controller
├── skills/
│   ├── BossSkill.ts           # Base skill interface
│   ├── SkillManager.ts        # Skill coordinator
│   ├── phase1/                # Phase 1 skills (4 skills)
│   ├── phase2/                # Phase 2 skills (5 skills)
│   └── phase3/                # Phase 3 skills (3 skills)
└── visuals/
    ├── BossEffects.ts         # Visual effects
    ├── BossFragment.ts        # Fragment primitives
    ├── BossWeapon.ts          # Weapon visuals
    └── FragmentedPhantomBoss.ts  # Main visual container
```

## Usage Example

```typescript
import { Boss } from './boss/entities/Boss'
import { defaultBossConfig } from './boss/configs/BossConfig'

// Create Boss
const boss = new Boss(scene, x, y, defaultBossConfig)

// Listen to events
boss.on('defeated', () => {
  console.log('Victory!')
})

// Update in game loop
update(delta: number, playerX: number, playerY: number) {
  boss.update(delta, playerX, playerY)
}

// Damage Boss
boss.takeDamage(10)  // Normal damage
boss.takeDamage(10, true)  // Critical damage (2x multiplier)
```

## Design Patterns

1. **State Pattern**: BossStore manages state transitions
2. **Observer Pattern**: EventBus for event-driven architecture
3. **Strategy Pattern**: Skill system with interchangeable attacks
4. **Composite Pattern**: Visual system with fragment composition
5. **Facade Pattern**: Boss entity simplifies complex subsystem interactions

## Performance Considerations

- Container-based rendering reduces draw calls
- State subscription system prevents unnecessary updates
- Skill cooldowns prevent spam
- Fragment count optimized for 60fps
- Tween-based animations use Phaser's optimized engine

## Programming Magic Integration (Level 2)

Level 2 now includes a **Programming Magic Puzzle System** that teaches core programming concepts through gameplay:

### Features
- **Real-time Spell Editor**: Press [E] to open during battle
- **4 Preset Spell Programs**:
  1. **Basic Burst**: Sequential execution
  2. **Phase Adaptive**: Conditional logic (if/else)
  3. **Escalating Barrage**: Loops and state persistence
  4. **Pattern Hunter**: Array operations and pattern recognition

### Programming Concepts Taught
- Conditional branching (`if/else`)
- Loop iteration and recursion
- Variable state management
- Array operations (`push`, `shift`, `slice`)
- Pattern matching algorithms

### Files
- [Level2.ts](../../scenes/levels/Level2.ts) - Enhanced boss battle with spell system
- [SpellProgramEditor.ts](../../systems/SpellProgramEditor.ts) - In-game spell editor
- [Programming Magic Guide](../../../docs/PROGRAMMING_MAGIC_GUIDE.md) - Complete player guide

### How It Works
1. Player opens spell editor ([E] key)
2. Selects a spell program (1-4)
3. Views the code and logic
4. Casts spells that execute the program
5. Spell behavior adapts based on Boss state (phase, health, patterns)

**Example**: The "Pattern Hunter" spell records the last 5 Boss skills. If it detects the Boss using the same skill 3 times in a row, it automatically switches to a heavy 7-bullet burst attack to exploit the pattern!

See [Programming Magic Guide](../../../docs/PROGRAMMING_MAGIC_GUIDE.md) for complete details.

## Future Extensions

To add new phases or skills:
1. Create skill class extending `BossSkill`
2. Register in `Boss.registerSkills()`
3. Add phase config to `BossConfig.phases`
4. Update `SkillSelector` weighting if needed
5. Add visual effects in `BossEffects` if needed

To add new spell programs:
1. Add to `PRESET_SPELLS` in `SpellProgramEditor.ts`
2. Implement execution logic in `executeSpell()`
3. Add UI button for selection
