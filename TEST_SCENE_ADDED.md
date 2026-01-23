# Test Scene 添加完成

## 概述

已成功在主菜单中添加了 Test Scene 按钮，用于展示 Stage 1 新架构的功能。

## 添加的内容

### 1. TestScene 场景类
**文件：** `src/game/scenes/levels/TestScene.ts`

- 继承自 `BaseScene`
- 显示架构说明和使用提示
- 提供一个简洁的测试环境

### 2. 场景配置
**文件：** `src/game/scenes/sceneConfig.ts`

添加了 `TestScene` 配置，包含：
- 15x15 的测试房间
- 预设的示例法术，展示：
  - `vec::create` 创建向量
  - `game::spawnFireball` 生成火球
  - 新的函数式架构使用方式

### 3. 主菜单按钮
**文件：** `src/game/interface/MainInterface.ts`

- 在 "START GAME" 和 "SETTINGS" 按钮下方添加了 "TEST SCENE" 按钮
- 橙色主题以区分常规按钮
- 带有 "NEW" 标签
- 点击后直接进入测试场景

### 4. 游戏配置
**文件：** `src/game/Game.tsx`

- 导入了 TestScene
- 在场景列表中注册了 TestScene

## 示例法术说明

测试场景包含一个预设的示例法术，展示了：

```
vec::create(0, 0)  →  position
vec::create(1, 0)  →  direction
                 ↓
        game::spawnFireball(state, position, direction)
                 ↓
              output
```

这个法术演示了：
1. **Vector2D 函数式实现** - 使用 `vec::create` 创建向量闭包
2. **Mutation Spell** - `game::spawnFireball` 接受 GameState 和向量参数
3. **纯函数风格** - 所有操作看起来都是纯函数调用

## 使用方法

1. 启动游戏
2. 在主菜单点击 "TEST SCENE" 按钮
3. 按 `1` 键施放预设的示例法术
4. 按 `TAB` 打开编辑器查看和修改法术

## 界面提示

测试场景会显示以下提示信息：
- 🎯 Test Scene - Stage 1 Architecture Demo
- 📚 新功能列表（vec::create, list::empty, game::spawnFireball 等）
- 💡 示例法术说明
- 使用说明（按键提示）

## 测试要点

在测试场景中可以尝试：
1. 修改向量参数改变火球方向
2. 添加多个 `spawnFireball` 调用
3. 使用 `list` 函数创建列表
4. 组合不同的函数测试新架构

---

## English Summary

Successfully added Test Scene to the main menu:

- **New Scene**: `TestScene.ts` - Demonstrates Stage 1 architecture
- **Scene Config**: Example spell showing `vec::create` and `game::spawnFireball`
- **Main Menu Button**: Orange "TEST SCENE" button with "NEW" badge
- **Example Spell**: Spawns fireball using functional vectors

Press "TEST SCENE" on main menu to try it!

---

## 中文总结

成功在主菜单添加了测试场景：

- **新场景**: `TestScene.ts` - 展示 Stage 1 架构
- **场景配置**: 包含示例法术，展示 `vec::create` 和 `game::spawnFireball`
- **主菜单按钮**: 橙色 "TEST SCENE" 按钮，带 "NEW" 标签
- **示例法术**: 使用函数式向量生成火球

在主菜单点击 "TEST SCENE" 即可体验！
