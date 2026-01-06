/**
 * BossStore - Boss状态管理中心
 * 集中管理Boss的所有状态数据
 */

export interface BossState {
  // 基础属性
  health: number;
  maxHealth: number;
  
  // 位置与移动
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  
  // 状态标识
  currentState: 'idle' | 'chase' | 'attack' | 'dead';
  currentPhase: number;
  isAttacking: boolean;
  isInvincible: boolean;
  
  // 攻击相关
  attackCooldown: number;
  lastAttackTime: number;
  
  // 目标追踪
  targetDistance: number;
}

export type BossAction = 
  | { type: 'TAKE_DAMAGE'; payload: number }
  | { type: 'HEAL'; payload: number }
  | { type: 'SET_POSITION'; payload: { x: number; y: number } }
  | { type: 'SET_VELOCITY'; payload: { x: number; y: number } }
  | { type: 'CHANGE_STATE'; payload: BossState['currentState'] }
  | { type: 'CHANGE_PHASE'; payload: number }
  | { type: 'START_ATTACK' }
  | { type: 'END_ATTACK' }
  | { type: 'SET_INVINCIBLE'; payload: boolean }
  | { type: 'UPDATE_TARGET_DISTANCE'; payload: number };

type Subscriber<K extends keyof BossState> = (
  value: BossState[K],
  oldValue: BossState[K]
) => void;

export class BossStore {
  private state: BossState;
  private listeners = new Map<keyof BossState, Set<Subscriber<any>>>();
  
  constructor(maxHealth: number) {
    this.state = {
      health: maxHealth,
      maxHealth,
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      currentState: 'idle',
      currentPhase: 0,
      isAttacking: false,
      isInvincible: false,
      attackCooldown: 0,
      lastAttackTime: 0,
      targetDistance: 0
    };
  }
  
  get<K extends keyof BossState>(key: K): BossState[K] {
    return this.state[key];
  }
  
  getState(): Readonly<BossState> {
    return { ...this.state };
  }
  
  dispatch(action: BossAction): void {
    switch (action.type) {
      case 'TAKE_DAMAGE':
        if (this.state.isInvincible) return;
        const newHealth = Math.max(0, this.state.health - action.payload);
        this.setState('health', newHealth);
        if (newHealth === 0) {
          this.setState('currentState', 'dead');
        }
        break;
        
      case 'HEAL':
        this.setState('health', Math.min(
          this.state.maxHealth,
          this.state.health + action.payload
        ));
        break;
        
      case 'SET_POSITION':
        this.setState('position', action.payload);
        break;
        
      case 'SET_VELOCITY':
        this.setState('velocity', action.payload);
        break;
        
      case 'CHANGE_STATE':
        this.setState('currentState', action.payload);
        break;
        
      case 'CHANGE_PHASE':
        this.setState('currentPhase', action.payload);
        this.setState('isInvincible', true);
        break;
        
      case 'START_ATTACK':
        this.setState('isAttacking', true);
        this.setState('lastAttackTime', Date.now());
        break;
        
      case 'END_ATTACK':
        this.setState('isAttacking', false);
        break;
        
      case 'SET_INVINCIBLE':
        this.setState('isInvincible', action.payload);
        break;
        
      case 'UPDATE_TARGET_DISTANCE':
        this.setState('targetDistance', action.payload);
        break;
    }
  }
  
  subscribe<K extends keyof BossState>(
    key: K,
    callback: Subscriber<K>
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(callback);
    
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }
  
  private setState<K extends keyof BossState>(key: K, value: BossState[K]): void {
    const oldValue = this.state[key];
    if (oldValue === value) return;
    
    this.state[key] = value;
    this.listeners.get(key)?.forEach(cb => cb(value, oldValue));
  }
}
