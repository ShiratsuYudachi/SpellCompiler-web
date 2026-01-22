# Sequence 节点功能文档

## 概述

Sequence 节点是一个顺序执行多个表达式的控制流节点，支持异步操作的等待机制。它允许多个魔法效果按顺序执行，并且能够处理需要延迟的操作（如 `deflectAfterTime`）。

## 功能特性

- ✅ **顺序执行**：按照 Step 1, Step 2, Step 3... 的顺序执行多个表达式
- ✅ **异步等待**：自动检测异步操作（返回 `AsyncOperation`）并累计延迟
- ✅ **延迟传递**：将累计的延迟传递给后续操作，确保时序正确
- ✅ **动态步骤**：支持 1-10 个步骤，可以通过 UI 动态添加/删除
- ✅ **可视化支持**：在 Mermaid 图表中显示为橙色的顺序节点

---

## 实现架构

### 1. AST 类型定义

**文件**: `src/editor/ast/ast.ts`

#### 新增 Sequence 接口
```typescript
export interface Sequence extends BaseASTNode {
  type: 'Sequence';
  expressions: ASTNode[];  // 按顺序执行的表达式列表
}
```

#### 新增 AsyncOperation 类型
```typescript
export interface AsyncOperation {
  type: 'async';
  waitUntil: number;  // 时间戳：操作何时完成
}

export function isAsyncOperation(value: any): value is AsyncOperation {
  return value && typeof value === 'object' && value.type === 'async' &&
    typeof value.waitUntil === 'number';
}
```

#### 更新 Value 类型
```typescript
export type Value =
  | number
  | string
  | boolean
  | Value[]
  | FunctionValue
  | Vector2D
  | AsyncOperation;  // ← 新增
```

---

### 2. UI 组件

**文件**: `src/editor/components/nodes/SequenceNode.tsx`

#### 功能
- 显示橙色节点，带有 📜 图标
- 动态生成 Step 1, Step 2, ... 输入 handles
- 提供 `+ Add` 和 `- Remove` 按钮管理步骤数量
- 限制步骤数量：最少 1 个，最多 10 个

#### 关键代码
```typescript
export const SequenceNode = memo(({ id, data }: NodeProps<SequenceNodeData>) => {
  const { setNodes } = useReactFlow();
  const stepCount = data.stepCount || 2;

  // 渲染多个输入 handle
  {Array.from({ length: stepCount }).map((_, i) => (
    <Handle
      type="target"
      position={Position.Left}
      id={`step${i}`}
      style={{ top: `${40 + i * 28}px` }}
    />
  ))}
});
```

---

### 3. 编译器集成

**文件**: `src/editor/utils/flowToIR.ts`

#### Sequence 转换逻辑
```typescript
case 'sequence': {
  const edges = incomingEdges.get(node.id) || [];

  // 获取所有 step 边并按 step 编号排序
  const sortedEdges = edges
    .filter(e => e.targetHandle?.startsWith('step'))
    .sort((a, b) => {
      const aIndex = parseInt(a.targetHandle?.replace('step', '') || '0');
      const bIndex = parseInt(b.targetHandle?.replace('step', '') || '0');
      return aIndex - bIndex;
    });

  // 递归转换每个步骤
  const expressions: ASTNode[] = sortedEdges.map((edge, index) => {
    const sourceNode = allNodes.find(n => n.id === edge.source);
    return convertNode(sourceNode as FlowNode, allNodes, incomingEdges, edge.sourceHandle);
  });

  return {
    type: 'Sequence',
    expressions
  } as Sequence;
}
```

---

### 4. 解释器（Evaluator）

**文件**: `src/editor/ast/evaluator.ts`

#### 新增字段
```typescript
export class Evaluator {
  public sequenceDelay: number = 0;  // 累计延迟（由 Sequence 管理）
}
```

#### evalSequence 方法
```typescript
private evalSequence(node: Sequence, env: Environment): Value {
  const seqNode = node as Sequence;

  if (seqNode.expressions.length === 0) {
    throw new Error('Sequence node has no expressions');
  }

  let lastResult: Value = 0;
  const savedDelay = this.sequenceDelay;
  this.sequenceDelay = 0;  // 重置延迟

  // 依次执行每个表达式
  for (const expr of seqNode.expressions) {
    lastResult = this.evaluate(expr, env);

    // 检查是否是异步操作
    if (isAsyncOperation(lastResult)) {
      const operationDelay = lastResult.waitUntil - Date.now();
      if (operationDelay > 0) {
        this.sequenceDelay += operationDelay;  // 累计延迟
        console.log(`[Sequence] Step returned async operation, cumulative delay now: ${this.sequenceDelay}ms`);
      }
    }
  }

  // 恢复之前的延迟
  const finalDelay = this.sequenceDelay;
  this.sequenceDelay = savedDelay;

  // 如果有累计延迟，返回 AsyncOperation
  if (finalDelay > 0 && !isAsyncOperation(lastResult)) {
    return {
      type: 'async',
      waitUntil: Date.now() + finalDelay
    } as Value;
  }

  return lastResult;
}
```

---

### 5. 延迟执行系统

**文件**: `src/editor/library/game.ts`

#### 延迟动作队列
```typescript
interface DelayedAction {
  executeAt: number;   // 执行时间戳
  action: () => void;  // 要执行的动作
}

const delayedActionQueue: DelayedAction[] = [];

function scheduleDelayedAction(delayMs: number, action: () => void) {
  const executeAt = Date.now() + delayMs;
  delayedActionQueue.push({ executeAt, action });
  console.log(`[scheduleDelayedAction] Scheduled action to execute at ${executeAt} (in ${delayMs}ms)`);
}

export function processDelayedActions() {
  const now = Date.now();
  let i = 0;
  while (i < delayedActionQueue.length) {
    const delayed = delayedActionQueue[i];
    if (now >= delayed.executeAt) {
      console.log(`[processDelayedActions] Executing delayed action`);
      delayed.action();
      delayedActionQueue.splice(i, 1);
    } else {
      i++;
    }
  }
}
```

#### 在游戏主循环调用
**文件**: `src/game/gameWorld.ts`

```typescript
export function updateGameWorld(world: GameWorld, dt: number) {
  playerInputSystem(world);
  enemyAISystem(world);
  fireballSystem(world, dt);
  velocitySystem(world);
  deathSystem(world);
  triggerSystem(world);
  processDelayedActions();  // ← 每帧处理延迟操作
  hudSystem(world);
}
```

---

### 6. 支持延迟的魔法函数

目前已实现延迟支持的函数：

#### `game::deflectAfterTime`
**文件**: `src/editor/library/game.ts`

```typescript
{
  fullName: 'game::deflectAfterTime',
  params: { angle: 'number', delayMs: 'number' },
  returns: 'value',  // ← 改为 'value'（之前是 'boolean'）
  getFn: (evaluator) => {
    const ctx = getRuntimeContext(evaluator);
    const { world, casterEid } = ctx;

    return (angle: Value, delayMs: Value) => {
      // ... 注册偏转到队列 ...

      // 返回 AsyncOperation
      return {
        type: 'async',
        waitUntil: Date.now() + delayMs
      } as Value;
    };
  }
}
```

#### `game::teleportRelative`
**文件**: `src/editor/library/game.ts`

```typescript
{
  fullName: 'game::teleportRelative',
  params: { entityId: 'string', offset: 'value' },
  returns: 'value',
  getFn: (evaluator) => {
    const ctx = getRuntimeContext(evaluator);
    const { world, casterEid } = ctx;

    return (entityId: Value, offset: Value) => {
      const targetEid = entityId === 'player' ? world.resources.playerEid : casterEid;
      const delay = evaluator.sequenceDelay;  // ← 检查累计延迟

      if (delay > 0) {
        // 延迟执行
        scheduleDelayedAction(delay, () => {
          const body = world.resources.bodies.get(targetEid);
          // ... 执行传送 ...
        });
        return { type: 'async', waitUntil: Date.now() + delay } as Value;
      } else {
        // 立即执行
        const body = world.resources.bodies.get(targetEid);
        // ... 执行传送 ...
        return [x, y] as Value;
      }
    };
  }
}
```

#### `game::teleportToPosition`
同样的延迟支持逻辑。

---

## 如何为其他魔法添加延迟支持

### 步骤 1：修改函数返回类型

将 `returns` 从特定类型改为 `'value'`：

```typescript
{
  fullName: 'game::yourMagicFunction',
  params: { /* ... */ },
  returns: 'value',  // ← 改为 'value'
  // ...
}
```

### 步骤 2：检查 `evaluator.sequenceDelay`

在函数实现中检查是否有累计延迟：

```typescript
getFn: (evaluator) => {
  const ctx = getRuntimeContext(evaluator);
  // ...

  return (/* 参数 */) => {
    // 检查累计延迟
    const delay = evaluator.sequenceDelay;

    if (delay > 0) {
      // 情况1：有延迟，需要延迟执行
      scheduleDelayedAction(delay, () => {
        // 在这里执行实际的魔法效果
        // 注意：此时可能需要重新获取实体引用
      });

      // 返回 AsyncOperation
      return {
        type: 'async',
        waitUntil: Date.now() + delay
      } as Value;
    } else {
      // 情况2：无延迟，立即执行
      // 执行魔法效果...
      return someResult;
    }
  };
}
```

### 步骤 3：处理实体引用

⚠️ **重要**：延迟执行时，实体可能已经不存在，需要安全检查：

```typescript
scheduleDelayedAction(delay, () => {
  const body = world.resources.bodies.get(entityId);
  if (!body) {
    console.error('[yourMagicFunction] Entity not found at execution time');
    return;
  }
  // 执行魔法效果...
});
```

---

## 示例：添加 `game::damageAfterTime` 延迟支持

假设你有一个 `damageAfterTime` 函数，想让它支持 Sequence 延迟：

### 原始版本（不支持延迟）
```typescript
{
  fullName: 'game::damageAfterTime',
  params: { targetId: 'string', damage: 'number', delayMs: 'number' },
  returns: 'boolean',
  getFn: (evaluator) => {
    const ctx = getRuntimeContext(evaluator);
    const { world } = ctx;

    return (targetId: Value, damage: Value, delayMs: Value) => {
      setTimeout(() => {
        // 造成伤害...
      }, delayMs);
      return true;
    };
  }
}
```

### 修改后（支持延迟）
```typescript
{
  fullName: 'game::damageAfterTime',
  params: { targetId: 'string', damage: 'number', delayMs: 'number' },
  returns: 'value',  // ← 步骤1：改为 'value'
  getFn: (evaluator) => {
    const ctx = getRuntimeContext(evaluator);
    const { world } = ctx;

    return (targetId: Value, damage: Value, delayMs: Value) => {
      if (typeof targetId !== 'string' || typeof damage !== 'number' || typeof delayMs !== 'number') {
        throw new Error('Invalid parameters');
      }

      const sequenceDelay = evaluator.sequenceDelay;  // ← 步骤2：检查延迟
      const totalDelay = sequenceDelay + delayMs;  // 总延迟 = Sequence 累计延迟 + 自身延迟

      // 使用延迟动作队列而不是 setTimeout
      scheduleDelayedAction(totalDelay, () => {
        const targetEid = world.resources.playerEid; // 或根据 targetId 查找
        const body = world.resources.bodies.get(targetEid);

        if (!body) {  // ← 步骤3：安全检查
          console.error('[damageAfterTime] Target not found');
          return;
        }

        // 造成伤害...
        applyDamage(world, targetEid, damage);
        console.log(`[damageAfterTime] Applied ${damage} damage to ${targetId}`);
      });

      // 返回 AsyncOperation
      return {
        type: 'async',
        waitUntil: Date.now() + totalDelay
      } as Value;
    };
  }
}
```

---

## 使用示例

### 场景：偏转后传送

```
[deflectAfterTime(30, 1000)] → [Step 1] ──┐
                                          │
[getPlayer] ──┐                           │
              ├→ [teleportToPosition] → [Step 2] ──→ [Sequence] → [Output]
[Vector2D(0,50)] ─┘
```

**执行流程**：
1. **Time 0ms**: 释放法术
2. **Time 0ms**: `deflectAfterTime(30, 1000)` 注册偏转，返回 `AsyncOperation { waitUntil: 1000 }`
3. **Time 0ms**: Sequence 累计延迟 = 1000ms
4. **Time 0ms**: `teleportToPosition` 检测到延迟，调度延迟传送到 1000ms 后
5. **Time 1000ms**: 偏转执行 ✅
6. **Time 1000ms**: 传送执行 ✅

---

## 调试技巧

### 查看控制台日志

启用详细日志来追踪 Sequence 的执行：

```
[deflectAfterTime] Queued deflection 30° with delay 1000ms for fireball 123
[Sequence] Step returned async operation, cumulative delay now: 1000ms
[teleportToPosition] Scheduling teleport with 1000ms delay
[scheduleDelayedAction] Scheduled action to execute at 1737648123456 (in 1000ms)
... 1000ms 后 ...
[processDelayedActions] Executing delayed action
[Fireball] Deflected by 30° at position (500, 300)
[teleportToPosition] Teleported to (0, 50)
```

### 常见问题

#### Q1: 第二个魔法立即执行，没有等待？
**A**: 检查该魔法函数是否已添加延迟支持。确保：
- `returns: 'value'`
- 检查 `evaluator.sequenceDelay`
- 使用 `scheduleDelayedAction` 而不是直接执行

#### Q2: 延迟时间不正确？
**A**: 确保：
- 异步函数返回 `AsyncOperation` 时使用正确的 `waitUntil` 时间戳
- 同步函数在有延迟时使用 `sequenceDelay + 自身延迟`

#### Q3: 实体在延迟执行时不存在？
**A**: 在延迟回调中添加安全检查：
```typescript
const body = world.resources.bodies.get(eid);
if (!body) {
  console.error('Entity not found at execution time');
  return;
}
```

---

## 架构优势

1. **非阻塞**: 不使用 `await` 或阻塞等待，不会卡住 UI 线程
2. **可扩展**: 任何函数都可以轻松添加延迟支持
3. **类型安全**: 使用 TypeScript 类型守卫确保类型正确
4. **调试友好**: 详细的控制台日志便于追踪执行流程
5. **向后兼容**: 不支持延迟的函数仍然可以在 Sequence 中使用（会立即执行）

---

## 文件清单

### 核心文件
- `src/editor/ast/ast.ts` - AST 类型定义（Sequence, AsyncOperation）
- `src/editor/ast/evaluator.ts` - 解释器（evalSequence, sequenceDelay）
- `src/editor/library/game.ts` - 游戏函数库（延迟支持）
- `src/editor/utils/flowToIR.ts` - 编译器（Sequence 转换）
- `src/editor/utils/astToMermaid.ts` - 可视化支持

### UI 文件
- `src/editor/components/nodes/SequenceNode.tsx` - Sequence 节点 UI
- `src/editor/components/FunctionalEditor.tsx` - 注册 Sequence 节点
- `src/editor/components/menus/NodeSelectionMenu.tsx` - 节点选择菜单

### 类型文件
- `src/editor/types/flowTypes.ts` - Flow 节点类型定义

### 游戏集成
- `src/game/gameWorld.ts` - 游戏主循环（调用 processDelayedActions）

---

## 贡献者

- **实现日期**: 2026-01-23
- **功能**: Sequence 节点 + 异步等待机制
- **测试**: Level11 (偏转 + 传送场景)

---

## 未来改进

1. **嵌套 Sequence**: 支持 Sequence 内嵌套 Sequence
2. **并行执行**: 添加 Parallel 节点，支持并行执行多个操作
3. **条件等待**: 支持 `waitUntil(condition)` 等待特定条件
4. **可视化调试**: 在编辑器中显示当前执行到哪一步
5. **性能优化**: 使用优先队列优化 `processDelayedActions`

---

**License**: MIT
