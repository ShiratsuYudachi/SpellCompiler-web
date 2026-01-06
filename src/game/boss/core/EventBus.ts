/**
 * EventBus - Boss事件总线
 * 用于组件间通信，解耦各个模块
 */

export type BossEvent = 
  | { type: 'healthChanged'; health: number }
  | { type: 'phaseChanged'; phase: number }
  | { type: 'stateChanged'; state: string; oldState: string }
  | { type: 'attackStarted'; attackName: string }
  | { type: 'attackEnded'; attackName: string }
  | { type: 'damaged'; amount: number; isCritical: boolean }
  | { type: 'died' };

type EventCallback = (event: BossEvent) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback>>();
  
  emit(event: BossEvent): void {
    const listeners = this.listeners.get(event.type);
    if (!listeners) return;
    
    listeners.forEach(callback => callback(event));
  }
  
  on(eventType: BossEvent['type'], callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
    
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }
  
  once(eventType: BossEvent['type'], callback: EventCallback): void {
    const unsubscribe = this.on(eventType, (event) => {
      callback(event);
      unsubscribe();
    });
  }
  
  clear(): void {
    this.listeners.clear();
  }
}
