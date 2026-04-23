# AST Node Editor - text

## 🎨 text

```
┌──────────────────────────────────────────────────────────┐
│  [Node Palette]  │    [Canvas]    │  [Code Preview]      │
│  text       │    text      │   text        │
└──────────────────────────────────────────────────────────┘
```

## 🚀 text

### textonetext:`x + 5`

#### text 1: text
1. text **"+ Variable"** text
2. onetext
3. text `x`

#### text 2: text
1. text **"+ Literal"** text
2. onetext
3. text `5`

#### text 3: text
1. text **"+ Binary Op"** text
2. onetext
3. text `+` Operators

#### text 4: text
1. text **text x text** text
2. text **Binary Op text** text `left` text
3. text **text 5 text** text
4. text **Binary Op text** text `right` text

#### text 5: Spawnedtext
1. text **"Generate Preview"** text
2. textSpawnedtext:`(x + 5)`

---

## 🎯 text

### 🟧 Literal (text)
- **text**: text
- **type**: text,text,text
- **text**: 1text (text)
- **text**: `5`, `"hello"`, `true`

### 🟪 Variable (text)
- **text**: text
- **text**: 1text (text)
- **text**: `x`, `count`, `name`

### 🟨 Binary Op (text)
- **text**: text
- **text**: 2text (left, right)
- **text**: 1text (text)
- **Operators**:
  - text: `+`, `-`, `*`, `/`
  - text: `>`, `<`, `==`
  - logic: `&&`, `||`

### 🔷 Unary Op (text)
- **text**: text
- **text**: 1text (operand)
- **text**: 1text (text)
- **Operators**: `!` (not), `-` (negative sign), `+` (positive sign)

### 🟩 Assignment (text)
- **text**: text
- **text**: 2text (variable, value)
- **text**: 1text (text)
- **Spawnedtext**: `x = 5;`

---

## 📝 text

### text 1: text `result = (10 + 5) * 2`

**text:**
```
Literal(10) ──┐
              ├─→ Binary(+) ─→ Binary(*) ─→ Assignment
Literal(5)  ──┘                   ↑             ↑
                                   │             │
                              Literal(2)    Variable(result)
```

**text:**
1. create 3 text Literal text: `10`, `5`, `2`
2. create 1 text Variable text: `result`
3. Create 2 Binary Op nodes: one `+`, one `*`
4. create 1 text Assignment text
5. text:
   - `10` and `5` → `+` to left/right
   - `+` output of → `*` text left
   - `2` → `*` text right
   - `*` output of → Assignment text value
   - `result` → Assignment text variable

**Spawnedtext:**
```javascript
result = ((10 + 5) * 2);
```

### text 2: text `x > 0 && y < 10`

**text:**
```
Variable(x) ─→ Binary(>) ─┐
                 ↑         │
            Literal(0)     ├─→ Binary(&&)
                           │       ↑
Variable(y) ─→ Binary(<) ──┘  Literal(10)
```

---

## 🎮 text

### textandtext
- **text**: text
- **text**: text +/- text
- **text**: text

### text
- **text**: text
- **text**: text Delete text
- **text**: text Delete text

### text
- **text**: text
- **textOperators**: text

---

## 🎨 text

| color | text | text |
|------|---------|------|
| 🟧 text | Literal | text |
| 🟪 purple | Variable | text |
| 🟨 yellow | Binary Op | text |
| 🔷 text | Unary Op | text |
| 🟩 text | Assignment | text |
| 🔵 text | text | text |
| 🟠 text | text | text |

---

## 💡 text

### Q: text?
A: text.textoutput oftext.

### Q: text?
A: text Delete text.

### Q: text?
A: text "Generate Preview" textSpawnedtext.

### Q: text?
A: text "Fit View" text.

---

## 🚧 text

- text If Statement and While Loop text
- text/text AST
- text/text

---

## 🎯 text

text,text!

Happy Coding! 🎉
