import type { 
	ASTNode, 
	Expression, 
	Statement,
	Literal,
	Identifier,
	BinaryExpression,
	UnaryExpression,
	AssignmentStatement,
	IfStatement,
	WhileStatement,
	BlockStatement,
	ExpressionStatement
} from '../ast/ast'

export function astToCode(node: ASTNode | null | undefined, indent: number = 0): string {
	if (!node) return ''
	
	const indentStr = '  '.repeat(indent)
	
	switch (node.type) {
		case 'Program':
			const program = node as any
			return program.body.map((stmt: Statement) => astToCode(stmt, indent)).join('\n')
		
		case 'Literal':
			const literal = node as Literal
			if (literal.dataType === 'string') {
				return `"${literal.value}"`
			}
			return String(literal.value)
		
		case 'Identifier':
			const identifier = node as Identifier
			return identifier.name
		
		case 'BinaryExpression':
			const binary = node as BinaryExpression
			const left = astToCode(binary.left)
			const right = astToCode(binary.right)
			return `(${left} ${binary.operator} ${right})`
		
		case 'UnaryExpression':
			const unary = node as UnaryExpression
			const operand = astToCode(unary.operand)
			return `${unary.operator}${operand}`
		
		case 'AssignmentStatement':
			const assignment = node as AssignmentStatement
			return `${indentStr}${astToCode(assignment.left)} = ${astToCode(assignment.right)};`
		
		case 'IfStatement':
			const ifStmt = node as IfStatement
			let code = `${indentStr}if (${astToCode(ifStmt.condition)}) {\n`
			code += astToCode(ifStmt.thenBranch, indent + 1) + '\n'
			code += `${indentStr}}`
			if (ifStmt.elseBranch) {
				code += ` else {\n`
				code += astToCode(ifStmt.elseBranch, indent + 1) + '\n'
				code += `${indentStr}}`
			}
			return code
		
		case 'WhileStatement':
			const whileStmt = node as WhileStatement
			let whileCode = `${indentStr}while (${astToCode(whileStmt.condition)}) {\n`
			whileCode += astToCode(whileStmt.body, indent + 1) + '\n'
			whileCode += `${indentStr}}`
			return whileCode
		
		case 'BlockStatement':
			const block = node as BlockStatement
			return block.statements.map(stmt => astToCode(stmt, indent)).join('\n')
		
		case 'ExpressionStatement':
			const exprStmt = node as ExpressionStatement
			return `${indentStr}${astToCode(exprStmt.expression)};`
		
		default:
			return `${indentStr}// Unknown node type: ${node.type}`
	}
}
