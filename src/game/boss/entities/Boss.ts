/**
 * Bossentity - textBosslogic
 * text,textandtext
 */

import Phaser from 'phaser';
import { clearBossDomHud, setBossDomHud } from '../../ui/gameDomUiStore';
import { BossStore } from '../core/BossStore';
import { EventBus } from '../core/EventBus';
import type { BossConfig, PhaseConfig } from '../configs/BossConfig';
import { FragmentedPhantomBoss } from '../visuals/FragmentedPhantomBoss';
import { BossEffects } from '../visuals/BossEffects';
import { BossWeapon } from '../visuals/BossWeapon';
import { SkillManager } from '../skills/SkillManager';
import { SkillSelector } from '../ai/SkillSelector';
import { HitboxManager } from '../collision/HitboxManager';
import { SkillPhase } from '../skills/BossSkill';

// text
import { LinearCutSkill } from '../skills/phase1/LinearCutSkill';
import { GeometricBladeSkill } from '../skills/phase1/GeometricBladeSkill';
import { FragmentDecoySkill } from '../skills/phase1/FragmentDecoySkill';
import { RotatingShieldSkill } from '../skills/phase1/RotatingShieldSkill';

// text
import { ShadowEchoSkill } from '../skills/phase2/ShadowEchoSkill';
import { SpaceCollapseSkill } from '../skills/phase2/SpaceCollapseSkill';
import { CloakTrackingSkill } from '../skills/phase2/CloakTrackingSkill';
import { ZigzagRushSkill } from '../skills/phase2/ZigzagRushSkill';
import { RedMoonSlashSkill } from '../skills/phase2/RedMoonSlashSkill';

// text
import { FullScreenPurgeSkill } from '../skills/phase3/FullScreenPurgeSkill';
import { TripleIllusionSkill } from '../skills/phase3/TripleIllusionSkill';
import { FinalCollapseSkill } from '../skills/phase3/FinalCollapseSkill';

export class Boss {
  private store: BossStore;
  private eventBus: EventBus;
  private scene: Phaser.Scene;
  private config: BossConfig;
  
  // text
  private visualBoss: FragmentedPhantomBoss;
  private effects: BossEffects;
  private weapon: BossWeapon;
  
  // text
  private skillManager: SkillManager;
  private skillSelector: SkillSelector;
  private hitboxManager: HitboxManager;
  
  
  // bounds
  private bounds: { left: number; right: number; top: number; bottom: number };
  
  // text
  private currentPhaseConfig: PhaseConfig;
  
  // text
  private lastBasicAttackTime: number = 0;
  private nextBasicAttackDelay: number = 0;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: BossConfig) {
    this.scene = scene;
    this.config = config;
    this.eventBus = new EventBus();
    this.store = new BossStore(config.maxHealth);
    this.currentPhaseConfig = config.phases[0];
    
    // text
    this.skillManager = new SkillManager(scene);
    this.skillSelector = new SkillSelector();
    this.hitboxManager = new HitboxManager(scene);
    
    // text
    this.bounds = {
      left: 50,
      right: 910,
      top: 50,
      bottom: 490,
    };
    
    // text
    this.visualBoss = new FragmentedPhantomBoss(scene, x, y);
    this.effects = new BossEffects(scene);
    this.weapon = new BossWeapon(scene);
    this.nextBasicAttackDelay = 3000 + Math.random() * 3000;
    
    // createUI
    this.createUI(x, y);
    
    // text
    this.store.dispatch({ type: 'SET_POSITION', payload: { x, y } });
    
    // text
    this.setupListeners();
    
    // Register skill(phaseAtext,textBtext)
    this.registerSkills();
    
    console.log('[Boss] Fragmented Phantom Boss created');
  }
  
  private createUI(_x: number, _y: number): void {
    this.syncDomHud();
  }

  private syncDomHud(): void {
    const health = this.store.get('health');
    const maxHealth = this.store.get('maxHealth');
    const percent = maxHealth > 0 ? health / maxHealth : 0;
    const state = this.store.get('currentState');
    const phase = this.store.get('currentPhase') + 1;
    const isInvincible = this.store.get('isInvincible');
    let stateLine = `Phase ${phase} - ${String(state).toUpperCase()}`;
    if (isInvincible) {
      stateLine += ' (INVINCIBLE)';
    }
    setBossDomHud(`${Math.ceil(health)} / ${maxHealth}`, stateLine, percent);
  }
  
  private setupListeners(): void {
    // text
    this.store.subscribe('position', (pos) => {
      this.visualBoss.updatePosition(pos.x, pos.y);
      this.weapon.setPosition(pos.x, pos.y);
      this.updateHealthBar();
      this.updateStateText();
    });
    
    // text
    this.store.subscribe('health', (health) => {
      this.updateHealthBar();
      this.checkPhaseTransition(health);
      this.eventBus.emit({ type: 'healthChanged', health });
    });
    
    // text
    this.store.subscribe('currentState', (state, oldState) => {
      this.updateStateText();
      this.eventBus.emit({ type: 'stateChanged', state, oldState });
    });
    
    // text
    this.store.subscribe('currentPhase', (phase) => {
      this.currentPhaseConfig = this.config.phases[phase];
      this.visualBoss.updatePhase(phase);
      this.skillManager.setPhase(phase as SkillPhase);
      this.eventBus.emit({ type: 'phaseChanged', phase });
    });
  }
  
  /**
   * Register skill
   */
  private registerSkills(): void {
    // text
    const linearCut = new LinearCutSkill(this.scene);
    const geometricBlade = new GeometricBladeSkill(this.scene);
    const fragmentDecoy = new FragmentDecoySkill(this.scene);
    const rotatingShield = new RotatingShieldSkill(this.scene);
    
    // text
    const shadowEcho = new ShadowEchoSkill(this.scene);
    const spaceCollapse = new SpaceCollapseSkill(this.scene);
    const cloakTracking = new CloakTrackingSkill(this.scene);
    const zigzagRush = new ZigzagRushSkill(this.scene);
    const redMoonSlash = new RedMoonSlashSkill(this.scene);
    
    // text
    const fullScreenPurge = new FullScreenPurgeSkill(this.scene);
    const tripleIllusion = new TripleIllusionSkill(this.scene);
    const finalCollapse = new FinalCollapseSkill(this.scene);
    
    this.skillManager.registerSkills([
      // Phase 1
      linearCut,
      geometricBlade,
      fragmentDecoy,
      rotatingShield,
      // Phase 2
      shadowEcho,
      spaceCollapse,
      cloakTracking,
      zigzagRush,
      redMoonSlash,
      // Phase 3
      fullScreenPurge,
      tripleIllusion,
      finalCollapse,
    ]);
    
    console.log('[Boss] Registered 12 skills (4 phase-1 + 5 phase-2 + 3 phase-3)');
    
    // listenBosstext(text)
    this.scene.events.on('boss-teleport', this.onTeleport, this);
  }
  
  update(delta: number, playerX: number, playerY: number): void {
    if (this.store.get('currentState') === 'dead') return;
    
    const deltaSeconds = delta / 1000;
    const pos = this.store.get('position');
    
    // text
    const dx = playerX - pos.x;
    const dy = playerY - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    this.store.dispatch({ type: 'UPDATE_TARGET_DISTANCE', payload: distance });
    
    // text
    const lastAttackTime = this.store.get('lastAttackTime');
    const attackCooldown = this.config.attackCooldown * 
      (this.currentPhaseConfig?.attackIntervalMultiplier || 1);
    
    // simpleAItext
    this.updateAI(distance, dx, dy, deltaSeconds, attackCooldown, lastAttackTime);
    
    // text
    this.applyVelocity(deltaSeconds);
    
    // textBossposition
    const currentPos = this.store.get('position');
    this.visualBoss.setPosition(currentPos.x, currentPos.y);
  }
  
  private updateAI(
    distance: number,
    dx: number,
    dy: number,
    _deltaSeconds: number,
    attackCooldown: number,
    lastAttackTime: number
  ): void {
    const state = this.store.get('currentState');
    const isAttacking = this.store.get('isAttacking');
    
    switch (state) {
      case 'idle':
        if (distance < this.config.detectionRange) {
          this.store.dispatch({ type: 'CHANGE_STATE', payload: 'chase' });
        } else {
          this.store.dispatch({ type: 'SET_VELOCITY', payload: { x: 0, y: 0 } });
        }
        break;
        
      case 'chase':
        if (distance < this.config.attackRange) {
          this.store.dispatch({ type: 'CHANGE_STATE', payload: 'attack' });
          this.store.dispatch({ type: 'SET_VELOCITY', payload: { x: 0, y: 0 } });
        } 
        else if (distance > this.config.detectionRange * 1.2) {
          this.store.dispatch({ type: 'CHANGE_STATE', payload: 'idle' });
          this.store.dispatch({ type: 'SET_VELOCITY', payload: { x: 0, y: 0 } });
        }
        else if (distance > this.config.stopDistance) {
          const speed = this.config.moveSpeed * (this.currentPhaseConfig?.moveSpeedMultiplier || 1);
          const vx = (dx / distance) * speed;
          const vy = (dy / distance) * speed;
          this.store.dispatch({ type: 'SET_VELOCITY', payload: { x: vx, y: vy } });
        } else {
          this.store.dispatch({ type: 'SET_VELOCITY', payload: { x: 0, y: 0 } });
        }
        break;
        
      case 'attack':
        this.store.dispatch({ type: 'SET_VELOCITY', payload: { x: 0, y: 0 } });
        
        if (distance > this.config.attackRange * 1.5) {
          this.store.dispatch({ type: 'CHANGE_STATE', payload: 'chase' });
          break;
        }
        
        // text
        if (!isAttacking && !this.skillManager.isExecuting()) {
          const timeSinceLastAttack = (Date.now() - lastAttackTime) / 1000;
          if (timeSinceLastAttack >= attackCooldown) {
            this.executeSkillAttack(dx, dy, distance);
          }
        }
        break;
        
      case 'dead':
        this.store.dispatch({ type: 'SET_VELOCITY', payload: { x: 0, y: 0 } });
        break;
    }
  }
  
  /**
   * text
   */
  private async executeSkillAttack(dx: number, dy: number, distance: number): Promise<void> {
    this.store.dispatch({ type: 'START_ATTACK' });

    const pos = this.store.get('position');

    // Get player from ECS world (Level2 scene)
    const level2Scene = this.scene as any;
    const player = level2Scene.world?.resources?.bodies?.get(level2Scene.world?.resources?.playerEid);

    if (!player) {
      console.log('[Boss] Player entity not found');
      this.store.dispatch({ type: 'END_ATTACK' });
      return;
    }

    // text
    const availableSkills = this.skillManager.getAvailableSkills(Date.now());
    
    if (availableSkills.length === 0) {
      console.log('[Boss] No available skill, using basic attack');
      this.executeSimpleAttack(dx, dy, distance);
      return;
    }
    
    // useAISelected skill
    const selectedSkill = this.skillSelector.selectSkill(availableSkills, {
      bossX: pos.x,
      bossY: pos.y,
      playerX: player.x,
      playerY: player.y,
      bossHealth: this.store.get('health'),
      bossMaxHealth: this.store.get('maxHealth'),
      currentPhase: this.store.get('currentPhase'),
      isAttacking: this.store.get('isAttacking'),
    });
    
    if (!selectedSkill) {
      console.log('[Boss] Skill selection failed, using basic attack');
      this.executeSimpleAttack(dx, dy, distance);
      return;
    }
    
    console.log(`[Boss] Selected skill: ${selectedSkill.getName()}`);
    
    // Execute skill
    await this.skillManager.executeSkill(
      selectedSkill,
      pos.x,
      pos.y,
      player.x,
      player.y
    );
    
    this.store.dispatch({ type: 'END_ATTACK' });
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.scene.time.delayedCall(ms, resolve));
  }
  
  private async executeSimpleAttack(_dx: number, _dy: number, distance: number): Promise<void> {
    this.store.dispatch({ type: 'START_ATTACK' });

    const pos = this.store.get('position');

    // Get player from ECS world (Level2 scene)
    const level2Scene = this.scene as any;
    const player = level2Scene.world?.resources?.bodies?.get(level2Scene.world?.resources?.playerEid);

    if (!player) {
      console.log('[Boss] Player entity not found (basic attack)');
      this.store.dispatch({ type: 'END_ATTACK' });
      return;
    }
    
    // text
    const now = Date.now();
    if (now - this.lastBasicAttackTime < this.nextBasicAttackDelay) {
      this.store.dispatch({ type: 'END_ATTACK' });
      return;
    }
    
    this.lastBasicAttackTime = now;
    this.nextBasicAttackDelay = 3000 + Math.random() * 3000; // next time3-6sec
    
    const isRanged = distance > 150;
    
    if (isRanged) {
      // === Ranged shot ===
      console.log('[Boss] Ranged shot');
      
      const chargeCircle = this.scene.add.circle(pos.x, pos.y, 20, 0xff00ff, 0.5);
      this.scene.tweens.add({
        targets: chargeCircle,
        scale: 2,
        alpha: 0,
        duration: 500,
      });
      
      await this.delay(500);
      chargeCircle.destroy();
      
      // text
      const bullet = this.scene.add.circle(pos.x, pos.y, 8, 0x8b00ff);
      bullet.setStrokeStyle(2, 0xff00ff);
      
      this.scene.tweens.add({
        targets: bullet,
        x: player.x,
        y: player.y,
        duration: (distance / 400) * 1000,
        onUpdate: () => {
          if (Math.random() < 0.3) {
            const trail = this.scene.add.circle(bullet.x, bullet.y, 4, 0x8b00ff, 0.5);
            this.scene.tweens.add({
              targets: trail,
              alpha: 0,
              scale: 0.5,
              duration: 200,
              onComplete: () => trail.destroy(),
            });
          }
          
          const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, player.x, player.y);
          if (dist < 30) {
            if (player.takeDamage) player.takeDamage(40);
            this.effects.createImpactFlash(bullet.x, bullet.y, 0xff00ff);
            bullet.destroy();
          }
        },
        onComplete: () => bullet.destroy(),
      });
      
    } else {
      // === Melee slash(text) ===
      console.log('[Boss] Melee slash');
      
      // warning
      const telegraphCircle = this.scene.add.circle(pos.x, pos.y, 120, 0x8b00ff, 0.3);
      telegraphCircle.setStrokeStyle(3, 0x8b00ff);
      
      await this.delay(800);
      telegraphCircle.destroy();
      
      // text
      await this.weapon.slash(120);
      
      // text
      const currentDist = Phaser.Math.Distance.Between(pos.x, pos.y, player.x, player.y);
      if (currentDist < 120) {
        if (player.takeDamage) player.takeDamage(60);
        this.effects.createImpactFlash(player.x, player.y, 0xff0066);
        this.scene.cameras.main.shake(200, 0.015);
      }
    }
    
    this.store.dispatch({ type: 'END_ATTACK' });
  }
  
  private applyVelocity(deltaSeconds: number): void {
    const velocity = this.store.get('velocity');
    const pos = this.store.get('position');
    
    let newX = pos.x + velocity.x * deltaSeconds;
    let newY = pos.y + velocity.y * deltaSeconds;
    
    newX = Phaser.Math.Clamp(newX, this.bounds.left, this.bounds.right);
    newY = Phaser.Math.Clamp(newY, this.bounds.top, this.bounds.bottom);
    
    if (newX !== pos.x || newY !== pos.y) {
      this.store.dispatch({ type: 'SET_POSITION', payload: { x: newX, y: newY } });
    }
  }
  
  private checkPhaseTransition(currentHealth: number): void {
    const maxHealth = this.store.get('maxHealth');
    const healthPercent = currentHealth / maxHealth;
    const currentPhase = this.store.get('currentPhase');
    
    for (let i = this.config.phases.length - 1; i > currentPhase; i--) {
      if (healthPercent <= this.config.phases[i].healthThreshold) {
        this.transitionToPhase(i);
        break;
      }
    }
  }
  
  private transitionToPhase(phaseIndex: number): void {
    const phase = this.config.phases[phaseIndex];
    console.log(`[Boss] Entered phase ${phase.phaseNumber}`);
    
    this.store.dispatch({ type: 'CHANGE_PHASE', payload: phaseIndex });
    
    if (phase.screenShake) {
      this.scene.cameras.main.shake(
        (phase.shakeDuration || 1) * 1000,
        (phase.shakeIntensity || 5) * 0.01
      );
    }
    
    // text - fix:flashEffect() text flash()
    this.visualBoss.flash(200);
    
    if (phase.invincibleDuration > 0) {
      this.scene.time.delayedCall(phase.invincibleDuration * 1000, () => {
        this.store.dispatch({ type: 'SET_INVINCIBLE', payload: false });
      });
    }
  }
  
  takeDamage(amount: number, isCritical: boolean = false): void {
    const finalAmount = isCritical ? amount * this.config.criticalMultiplier : amount;
    
    // text(text)
    const fragmentDecoy = this.skillManager.getSkill('FragmentDecoy');
    if (fragmentDecoy && fragmentDecoy.canUse(Date.now())) {
      console.log('[Boss] Fragment decoy triggered!');
      
      const pos = this.store.get('position');
      const player = this.scene.children.getByName('player') as any;
      
      if (player) {
        // asyncExecute skill(non-blocking)
        this.skillManager.executeSkill(
          fragmentDecoy,
          pos.x,
          pos.y,
          player.x,
          player.y
        );
      }
      
      // text,no damage
      return;
    }
    
    // text
    this.store.dispatch({ type: 'TAKE_DAMAGE', payload: finalAmount });
    
    // text
    this.visualBoss.flash(100);
    
    this.eventBus.emit({ type: 'damaged', amount: finalAmount, isCritical });
    
    if (this.store.get('health') === 0) {
      this.onDeath();
    }
  }
  
  private onDeath(): void {
    console.log('[Boss] Died');
    this.visualBoss.explode();
    this.eventBus.emit({ type: 'died' });
  }
  
  private updateHealthBar(): void {
    this.syncDomHud();
  }
  
  private updateStateText(): void {
    this.syncDomHud();
  }
  
  getPosition(): { x: number; y: number } {
    return this.store.get('position');
  }
  
  getVisualBoss(): FragmentedPhantomBoss {
    return this.visualBoss;
  }
  
  getHitboxManager(): HitboxManager {
    return this.hitboxManager;
  }
  
  /**
   * text
   */
  private onTeleport(data: { x: number; y: number }): void {
    console.log(`[Boss] Teleported to (${data.x}, ${data.y})`);
    this.store.dispatch({ type: 'SET_POSITION', payload: { x: data.x, y: data.y } });
  }
  
  on(eventType: string, callback: (event: any) => void): () => void {
    return this.eventBus.on(eventType as any, callback);
  }
  
  destroy(): void {
    this.visualBoss.destroy();
    this.weapon.destroy();
    clearBossDomHud();
    this.skillManager.destroy();
    this.hitboxManager.destroy();
    this.eventBus.clear();
  }
}
