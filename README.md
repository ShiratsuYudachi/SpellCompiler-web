# SpellCompiler Web

A web-based AST (Abstract Syntax Tree) interpreter with a React frontend.

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **UI**: Mantine + Tailwind CSS
- **Build Tool**: Vite
- **AST Engine**: Custom TypeScript implementation

## Project Structure

```
SpellCompiler-web/
├── src/
│   ├── ast/                              # AST Engine
│   │   ├── ast.ts                        # Core AST type definitions
│   │   ├── example_basic_evaluator.ts    # Basic evaluator (no variables)
│   │   └── evaluator_with_storage.ts     # Evaluator with global variables
│   ├── App.tsx                           # Main React component
│   ├── main.tsx                          # React entry point
│   └── index.css                         # Global styles (Tailwind)
├── index.html                            # HTML entry
├── vite.config.ts                        # Vite configuration
├── tailwind.config.js                    # Tailwind configuration
├── tsconfig.json                         # TypeScript configuration
└── package.json
```

## Installation

```bash
npm install
```

## Usage

### Development Server

Start the React development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Test AST Engine

Test basic evaluator (no variables):
```bash
npm run test:basic
```

Test evaluator with variable storage:
```bash
npm run test:storage
```

## AST Engine Features

### `src/ast/ast.ts`
Core AST node type definitions:
- **Statements**: AssignmentStatement, IfStatement, WhileStatement, BlockStatement, ExpressionStatement
- **Expressions**: Literal, Identifier, BinaryExpression, UnaryExpression, FunctionCall
- **Program**: Root node type
- **EvaluationResult**: Return type for evaluators

### `src/ast/example_basic_evaluator.ts`
Basic evaluator supporting:
- ✅ Literals (numbers, strings, booleans)
- ✅ Binary expressions (+, -, *, /, >, <, ==, &&, ||)
- ✅ Unary expressions (!, -, +)
- ✅ If statements with else branches
- ✅ Block statements
- ❌ Variables (not implemented)
- ❌ Functions (not implemented)

### `src/ast/evaluator_with_storage.ts`
Enhanced evaluator with:
- ✅ All features from basic evaluator
- ✅ Variable assignment and retrieval
- ✅ While loops
- ✅ Global variable storage (no scope support yet)
- ❌ Functions (not implemented)
- ❌ Local scopes (not implemented)

## Scope Design

Currently, **all variables are global**. There is no scope concept yet:
- No local scope
- No block scope
- No function scope

All variables are stored in a single global Map.

## Future Enhancements

### AST Engine
- [ ] Add scope chain for local variables
- [ ] Implement function definitions and calls
- [ ] Add return statements
- [ ] Add break/continue statements
- [ ] Add more operators (%, **, etc.)
- [ ] Add type checking

### Web Interface
- [ ] Visual AST tree display
- [ ] Code editor with syntax highlighting
- [ ] Step-by-step execution debugger
- [ ] Variable state visualization
- [ ] Example code snippets
