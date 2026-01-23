import type { ASTNode, FunctionDefinition, Spell } from '../../editor/ast/ast'

export type CompiledSpell = Spell

// Legacy format for backward compatibility
export type LegacyCompiledSpell = {
	ast: ASTNode
	dependencies: FunctionDefinition[]
}



