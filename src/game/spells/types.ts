import type { ASTNode, FunctionDefinition } from '../../editor/ast/ast'

export type CompiledSpell = {
	ast: ASTNode
	dependencies: FunctionDefinition[]
}



