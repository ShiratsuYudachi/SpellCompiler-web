# Functional Workflow Editor - Test Guide

## 🎯 Overview

This guide will help you test the functional workflow editor which converts visual node graphs into executable IR and displays the AST visualization.

## 🚀 Quick Start

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Open browser**: Navigate to `http://localhost:5173`

3. **See the default example**: A simple `add(10, 20)` workflow is pre-loaded

## 📚 Available Node Types

### 1. **Literal Node** (Green)
- 🔢 Represents a constant value
- Can be: number, string, or boolean
- **Example**: `10`, `"hello"`, `true`

### 2. **Function Call Node** (Yellow)
- ⚙️ Calls a function from the core library
- Select function from dropdown
- Connect up to 4 arguments to `arg0`, `arg1`, `arg2`, `arg3`

**Available Functions**:
- **Arithmetic**: `add`, `subtract`, `multiply`, `divide`, `negate`, `abs`, `mod`
- **Comparison**: `gt`, `lt`, `gte`, `lte`, `eq`
- **Logical**: `and`, `or`, `not`
- **Math**: `max`, `min`
- **List**: `list`, `cons`, `empty`, `head`, `tail`, `length`

### 3. **If Expression Node** (Red)
- 🔀 Conditional branching (like ternary operator)
- Connect three inputs:
  - `condition`: boolean expression
  - `then`: value if true
  - `else`: value if false
- **Lazy evaluation**: Only evaluates the chosen branch

### 4. **Output Node** (Purple)
- 📤 Marks the final result
- **Required**: Every graph must have exactly one output node
- Connect the final expression to this node

## 🧪 Test Examples

### Example 1: Simple Arithmetic
**Goal**: Calculate `(3 + 5) * 2 = 16`

**Steps**:
1. Add three Literal nodes: `3`, `5`, `2`
2. Add Function node: set to `add`
3. Connect `3` → `arg0`, `5` → `arg1` of add
4. Add Function node: set to `multiply`
5. Connect add result → `arg0`, `2` → `arg1` of multiply
6. Connect multiply result → Output
7. Click **▶️ Evaluate**

**Expected**: Result `16`, AST visualization on the right

---

### Example 2: Conditional Expression
**Goal**: `abs(x) = if x > 0 then x else -x`

**Steps**:
1. Add Literal node: `-5`
2. Add Literal node: `0`
3. Add Function node: `gt` (greater than)
4. Connect `-5` → `arg0`, `0` → `arg1` of gt
5. Add If node
6. Connect gt result → `condition` of If
7. Add Literal node: `-5` (for then branch)
8. Add Function node: `negate`
9. Add Literal node: `-5`
10. Connect Literal → `arg0` of negate
11. Connect Literal → `then` of If
12. Connect negate result → `else` of If
13. Connect If result → Output
14. Click **▶️ Evaluate**

**Expected**: Result `5` (absolute value)

---

### Example 3: Nested Function Calls
**Goal**: `max(10, 20) + 5`

**Steps**:
1. Add Literals: `10`, `20`, `5`
2. Add Function: `max`
3. Connect `10` → `arg0`, `20` → `arg1`
4. Add Function: `add`
5. Connect max result → `arg0`, `5` → `arg1`
6. Connect to Output
7. Evaluate

**Expected**: Result `25`

---

### Example 4: List Operations
**Goal**: Create list `[1, 2, 3]` and get its length

**Steps**:
1. Add Literals: `1`, `2`, `3`
2. Add Function: `list`
3. Connect `1` → `arg0`, `2` → `arg1`, `3` → `arg2`
4. Add Function: `length`
5. Connect list result → `arg0`
6. Connect to Output
7. Evaluate

**Expected**: Result `3`

---

### Example 5: Complex Expression
**Goal**: `if (5 > 3) then (10 + 20) else (10 - 20)`

**Steps**:
1. Build condition: `gt(5, 3)`
2. Build then branch: `add(10, 20)` = 30
3. Build else branch: `subtract(10, 20)` = -10
4. Connect all to If node
5. Connect If to Output
6. Evaluate

**Expected**: Result `30` (since 5 > 3 is true)

## 🎨 UI Features

### Adding Nodes
- Click buttons in header: `+ Literal`, `+ Function`, `+ If`, `+ Output`
- Nodes appear at random positions
- Drag them around to organize

### Connecting Nodes
- Drag from output handle (right side) to input handle (left side)
- Handles are colored circles
- Connection shows data flow direction

### Editing Values
- **Literal nodes**: Type directly in the input field
- **Function nodes**: Select from dropdown

### Evaluating
- Click **▶️ Evaluate** button
- Result appears in green alert
- Errors appear in red alert
- AST visualization appears in right sidebar

### AST Visualization
- **Mermaid diagram** showing the IR structure
- 🔢 Green = Literal
- 📌 Blue = Identifier
- ⚙️ Yellow = Function Call
- 🔀 Red = If Expression
- Arrows show data flow

## ⚠️ Common Errors

### "No output node found in the graph"
- **Solution**: Add an Output node

### "Output node has no input"
- **Solution**: Connect an expression to the Output node

### "If node X missing required inputs"
- **Solution**: Connect all three inputs (condition, then, else) to the If node

### "Function X expects N arguments, got M"
- **Solution**: Connect the correct number of arguments
  - Most math functions: 2 args
  - Unary functions (negate, not, abs): 1 arg
  - List function: 0+ args (variadic)

## 💡 Tips

1. **Start simple**: Begin with literal + function + output
2. **Build incrementally**: Add nodes one at a time
3. **Organize visually**: Arrange nodes left-to-right (inputs → output)
4. **Check connections**: Make sure edges point in the right direction
5. **Use AST view**: Verify your structure matches your intent
6. **Test frequently**: Click Evaluate after each change

## 🔍 Understanding the IR

The visual graph is converted to a pure functional IR:
- **No statements**, only expressions
- **No variables**, only values
- **No mutations**, only transformations
- **Lazy evaluation** for If expressions
- **Memoization** for performance

## 📖 Architecture

```
React Flow Graph
      ↓
   flowToIR converter
      ↓
   Pure Functional IR (AST)
      ↓
   Evaluator
      ↓
   Result Value
```

## 🎯 Next Steps

After testing basic workflows:
1. Try building recursive functions (when implemented)
2. Experiment with higher-order functions
3. Create complex nested conditions
4. Build data transformation pipelines with lists

Happy testing! 🚀

