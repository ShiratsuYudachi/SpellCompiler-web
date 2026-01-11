/**
 * Boss实体 - 协调所有Boss逻辑
 * 集成破碎幻影视觉、技能系统和碰撞检测
 */

import Phaser from 'phaser';
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

// 导入第一阶段技能
import { LinearCutSkill } from '../skills/phase1/LinearCutSkill';
import { GeometricBladeSkill } from '../skills/phase1/GeometricBladeSkill';
import { FragmentDecoySkill } from '../skills/phase1/FragmentDecoySkill';
import { RotatingShieldSkill } from '../skills/phase1/RotatingShieldSkill';

// 导入第二阶段技能
import { ShadowEchoSkill } from '../skills/phase2/ShadowEchoSkill';
import { SpaceCollapseSkill } from '../skills/phase2/SpaceCollapseSkill';
import { CloakTrackingSkill } from '../skills/phase2/CloakTrackingSkill';
import { ZigzagRushSkill } from '../skills/phase2/ZigzagRushSkill';
import { RedMoonSlashSkill } from '../skills/phase2/RedMoonSlashSkill';

// 导入第三阶段技能
import { FullScreenPurgeSkill } from '../skills/phase3/FullScreenPurgeSkill';
import { TripleIllusionSkill } from '../skills/phase3/TripleIllusionSkill';
import { FinalCollapseSkill } from '../skills/phase3/FinalCollapseSkill';

export class Boss {
  private store: BossStore;
  private eventBus: EventBus;
  private scene: Phaser.Scene;
  private config: BossConfig;
  
  // 新视觉系统
  private visualBoss: FragmentedPhantomBoss;
  private effects: BossEffects;
  private weapon: BossWeapon;
  
  // 技能系统
  private skillManager: SkillManager;
  private skillSelector: SkillSelector;
  private hitboxManager: HitboxManager;
  
  // UI组件
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthBarFill!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  
  // 边界
  private bounds: { left: number; right: number; top: number; bottom: number };
  
  // 阶段管理
  private currentPhaseConfig: PhaseConfig;
  
  // 普攻系统
  private lastBasicAttackTime: number = 0;
  private nextBasicAttackDelay: number = 0;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: BossConfig) {
    this.scene = scene;
    this.config = config;
    this.eventBus = new EventBus();
    this.store = new BossStore(config.maxHealth);
    this.currentPhaseConfig = config.phases[0];
    
    // 初始化技能系统
    this.skillManager = new SkillManager(scene);
    this.skillSelector = new SkillSelector();
    this.hitboxManager = new HitboxManager(scene);
    
    // 计算边界
    this.bounds = {
      left: 50,
      right: 910,
      top: 50,
      bottom: 490,
    };
    
    // 创建视觉效果
    this.visualBoss = new FragmentedPhantomBoss(scene, x, y);
    this.effects = new BossEffects(scene);
    this.weapon = new BossWeapon(scene);
    this.nextBasicAttackDelay = 3000 + Math.random() * 3000;
    
    // 创建UI
    this.createUI(x, y);
    
    // 设置初始位置
    this.store.dispatch({ type: 'SET_POSITION', payload: { x, y } });
    
    // 监听状态变化
    this.setupListeners();
    
    // 注册技能（阶段A暂时为空，等阶段B再添加）
    this.registerSkills();
    
    console.log('[Boss] 破碎幻影Boss已创建');
  }
  
  private createUI(x: number, y: number): void {
    // 血条背景
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.setDepth(1000);

    // 血条填充
    this.healthBarFill = this.scene.add.graphics();
    this.healthBarFill.setDepth(1001);

    // 血量文本
    this.healthText = this.scene.add.text(x, y - 140, '', {
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    });
    this.healthText.setOrigin(0.5);
    this.healthText.setDepth(1002);

    // 状态文本
    this.stateText = this.scene.add.text(x, y - 160, '', {
      fontSize: '14px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.stateText.setOrigin(0.5);
    this.stateText.setDepth(1002);

    this.updateHealthBar();
  }
  
  private setupListeners(): void {
    // 监听位置变化
    this.store.subscribe('position', (pos) => {
      this.visualBoss.updatePosition(pos.x, pos.y);
      this.weapon.setPosition(pos.x, pos.y);
      this.updateHealthBar();
      this.updateStateText();
    });
    
    // 监听血量变化
    this.store.subscribe('health', (health) => {
      this.updateHealthBar();
      this.checkPhaseTransition(health);
      this.eventBus.emit({ type: 'healthChanged', health });
    });
    
    // 监听状态变化
    this.store.subscribe('currentState', (state, oldState) => {
      this.updateStateText();
      this.eventBus.emit({ type: 'stateChanged', state, oldState });
    });
    
    // 监听阶段变化
    this.store.subscribe('currentPhase', (phase) => {
      this.currentPhaseConfig = this.config.phases[phase];
      this.visualBoss.updatePhase(phase);
      this.skillManager.setPhase(phase as SkillPhase);
      this.eventBus.emit({ type: 'phaseChanged', phase });
    });
  }
  
  /**
   * 注册技能
   */
  private registerSkills(): void {
    // 第一阶段技能
    const linearCut = new LinearCutSkill(this.scene);
    const geometricBlade = new GeometricBladeSkill(this.scene);
    const fragmentDecoy = new FragmentDecoySkill(this.scene);
    const rotatingShield = new RotatingShieldSkill(this.scene);
    
    // 第二阶段技能
    const shadowEcho = new ShadowEchoSkill(this.scene);
    const spaceCollapse = new SpaceCollapseSkill(this.scene);
    const cloakTracking = new CloakTrackingSkill(this.scene);
    const zigzagRush = new ZigzagRushSkill(this.scene);
    const redMoonSlash = new RedMoonSlashSkill(this.scene);
    
    // 第三阶段技能
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
    
    console.log('[Boss] 已注册12个技能（4个阶段1 + 5个阶段2 + 3个阶段3）');
    
    // 监听Boss瞬移事件（技能触发）
    this.scene.events.on('boss-teleport', this.onTeleport, this);
  }
  
  update(delta: number, playerX: number, playerY: number): void {
    if (this.store.get('currentState') === 'dead') return;
    
    const deltaSeconds = delta / 1000;
    const pos = this.store.get('position');
    
    // 更新目标距离
    const dx = playerX - pos.x;
    const dy = playerY - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    this.store.dispatch({ type: 'UPDATE_TARGET_DISTANCE', payload: distance });
    
    // 更新攻击冷却
    const lastAttackTime = this.store.get('lastAttackTime');
    const attackCooldown = this.config.attackCooldown * 
      (this.currentPhaseConfig?.attackIntervalMultiplier || 1);
    
    // 简单AI状态机
    this.updateAI(distance, dx, dy, deltaSeconds, attackCooldown, lastAttackTime);
    
    // 应用速度
    this.applyVelocity(deltaSeconds);
    
    // 同步视觉Boss位置
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
        
        // 使用技能系统
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
   * 使用技能系统执行攻击
   */
  private async executeSkillAttack(dx: number, dy: number, distance: number): Promise<void> {
    this.store.dispatch({ type: 'START_ATTACK' });

    const pos = this.store.get('position');

    // Get player from ECS world (Level2 scene)
    const level2Scene = this.scene as any;
    const player = level2Scene.world?.resources?.bodies?.get(level2Scene.world?.resources?.playerEid);

    if (!player) {
      console.log('[Boss] 找不到玩家实体');
      this.store.dispatch({ type: 'END_ATTACK' });
      return;
    }

    // 获取可用技能
    const availableSkills = this.skillManager.getAvailableSkills(Date.now());
    
    if (availableSkills.length === 0) {
      console.log('[Boss] 无可用技能，使用简单攻击');
      this.executeSimpleAttack(dx, dy, distance);
      return;
    }
    
    // 使用AI选择技能
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
      console.log('[Boss] 技能选择失败，使用简单攻击');
      this.executeSimpleAttack(dx, dy, distance);
      return;
    }
    
    console.log(`[Boss] 选择技能: ${selectedSkill.getName()}`);
    
    // 执行技能
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
      console.log('[Boss] 找不到玩家实体 (简单攻击)');
      this.store.dispatch({ type: 'END_ATTACK' });
      return;
    }
    
    // 随机普攻间隔检查
    const now = Date.now();
    if (now - this.lastBasicAttackTime < this.nextBasicAttackDelay) {
      this.store.dispatch({ type: 'END_ATTACK' });
      return;
    }
    
    this.lastBasicAttackTime = now;
    this.nextBasicAttackDelay = 3000 + Math.random() * 3000; // 下次3-6秒
    
    const isRanged = distance > 150;
    
    if (isRanged) {
      // === 远程射击 ===
      console.log('[Boss] 远程射击');
      
      const chargeCircle = this.scene.add.circle(pos.x, pos.y, 20, 0xff00ff, 0.5);
      this.scene.tweens.add({
        targets: chargeCircle,
        scale: 2,
        alpha: 0,
        duration: 500,
      });
      
      await this.delay(500);
      chargeCircle.destroy();
      
      // 发射追踪弹
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
      // === 近战斩击（使用武器） ===
      console.log('[Boss] 近战斩击');
      
      // 预警
      const telegraphCircle = this.scene.add.circle(pos.x, pos.y, 120, 0x8b00ff, 0.3);
      telegraphCircle.setStrokeStyle(3, 0x8b00ff);
      
      await this.delay(800);
      telegraphCircle.destroy();
      
      // 武器斩击动画
      await this.weapon.slash(120);
      
      // 检测伤害
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
    console.log(`[Boss] 进入阶段 ${phase.phaseNumber}`);
    
    this.store.dispatch({ type: 'CHANGE_PHASE', payload: phaseIndex });
    
    if (phase.screenShake) {
      this.scene.cameras.main.shake(
        (phase.shakeDuration || 1) * 1000,
        (phase.shakeIntensity || 5) * 0.01
      );
    }
    
    // 触发视觉闪烁 - 修复：flashEffect() 改为 flash()
    this.visualBoss.flash(200);
    
    if (phase.invincibleDuration > 0) {
      this.scene.time.delayedCall(phase.invincibleDuration * 1000, () => {
        this.store.dispatch({ type: 'SET_INVINCIBLE', payload: false });
      });
    }
  }
  
  takeDamage(amount: number, isCritical: boolean = false): void {
    const finalAmount = isCritical ? amount * this.config.criticalMultiplier : amount;
    
    // 尝试触发碎片替身（被动技能）
    const fragmentDecoy = this.skillManager.getSkill('FragmentDecoy');
    if (fragmentDecoy && fragmentDecoy.canUse(Date.now())) {
      console.log('[Boss] 碎片替身触发！');
      
      const pos = this.store.get('position');
      const player = this.scene.children.getByName('player') as any;
      
      if (player) {
        // 异步执行技能（不阻塞）
        this.skillManager.executeSkill(
          fragmentDecoy,
          pos.x,
          pos.y,
          player.x,
          player.y
        );
      }
      
      // 闪避成功，不受伤
      return;
    }
    
    // 正常受伤
    this.store.dispatch({ type: 'TAKE_DAMAGE', payload: finalAmount });
    
    // 受击闪烁
    this.visualBoss.flash(100);
    
    this.eventBus.emit({ type: 'damaged', amount: finalAmount, isCritical });
    
    if (this.store.get('health') === 0) {
      this.onDeath();
    }
  }
  
  private onDeath(): void {
    console.log('[Boss] 死亡');
    this.visualBoss.explode();
    this.eventBus.emit({ type: 'died' });
  }
  
  private updateHealthBar(): void {
    const health = this.store.get('health');
    const maxHealth = this.store.get('maxHealth');
    const percent = health / maxHealth;
    const pos = this.store.get('position');
    
    this.healthBarBg.clear();
    this.healthBarFill.clear();
    
    this.healthBarBg.fillStyle(0x000000, 0.5);
    this.healthBarBg.fillRect(pos.x - 60, pos.y - 100, 120, 12);
    
    const color = percent > 0.5 ? 0x00ff00 : percent > 0.25 ? 0xffff00 : 0xff0000;
    this.healthBarFill.fillStyle(color, 1);
    this.healthBarFill.fillRect(pos.x - 60, pos.y - 100, 120 * percent, 12);
    
    this.healthText.setPosition(pos.x, pos.y - 140);
    this.healthText.setText(`${Math.ceil(health)} / ${maxHealth}`);
  }
  
  private updateStateText(): void {
    const pos = this.store.get('position');
    const state = this.store.get('currentState');
    const phase = this.store.get('currentPhase') + 1;
    const isInvincible = this.store.get('isInvincible');
    
    this.stateText.setPosition(pos.x, pos.y - 160);
    
    let text = `Phase ${phase} - ${state.toUpperCase()}`;
    if (isInvincible) {
      text += ' (INVINCIBLE)';
    }
    
    this.stateText.setText(text);
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
   * 技能触发的瞬移
   */
  private onTeleport(data: { x: number; y: number }): void {
    console.log(`[Boss] 瞬移到 (${data.x}, ${data.y})`);
    this.store.dispatch({ type: 'SET_POSITION', payload: { x: data.x, y: data.y } });
  }
  
  on(eventType: string, callback: (event: any) => void): () => void {
    return this.eventBus.on(eventType as any, callback);
  }
  
  destroy(): void {
    this.visualBoss.destroy();
    this.weapon.destroy();
    this.healthBarBg.destroy();
    this.healthBarFill.destroy();
    this.healthText.destroy();
    this.stateText.destroy();
    this.skillManager.destroy();
    this.hitboxManager.destroy();
    this.eventBus.clear();
  }
}
