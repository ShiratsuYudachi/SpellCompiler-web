import { AVAILABLE_FUNCTIONS } from './availableFunctions';

/** Minimal level context passed to the AI so it understands the current challenge. */
export type LevelContext = {
	key: string
	objectives?: Array<{ description?: string; id?: string; type?: string }>
	hints?: string[]
	allowedNodeTypes?: string[]
	maxSpellCasts?: number
	editorRestrictions?: RegExp
}

function buildLevelSection(level: LevelContext): string {
	const lines: string[] = [
		`=== LEVEL CONTEXT: ${level.key} ===`,
	];
	if (level.objectives?.length) {
		lines.push(`Objectives: ${level.objectives.map(o => o.description ?? o.id ?? '').filter(Boolean).join('; ')}`);
	}
	if (level.hints?.length) {
		lines.push('Hints from the level designer:');
		level.hints.forEach(h => lines.push(`  - ${h}`));
	}
	if (level.maxSpellCasts !== undefined) {
		lines.push(`Max spell casts: ${level.maxSpellCasts} (keep the spell efficient!)`);
	}
	if (level.allowedNodeTypes?.length) {
		lines.push(`Allowed node types: ${level.allowedNodeTypes.join(', ')}`);
	}
	if (level.editorRestrictions) {
		lines.push(`Allowed function name pattern: ${level.editorRestrictions.toString()}`);
	}
	lines.push('=== END LEVEL CONTEXT ===');
	return lines.join('\n');
}

// ─── Typed helpers for graph analysis ────────────────────────────────────────
type StrippedNode = { id: string; type: string; data: Record<string, unknown> }
type StrippedEdge = { id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }

/**
 * Analyse an existing graph and return:
 * - A human-readable node inventory (id → what it does)
 * - A list of unconnected required handles ("missing connections")
 * - The flat list of existing node IDs (so the AI can't claim ignorance)
 */
function analyzeExistingGraph(nodes: unknown[], edges: unknown[]): {
	inventoryText: string
	missingText: string
	nodeIds: string[]
} {
	const nodeList = (Array.isArray(nodes) ? nodes : []) as StrippedNode[]
	const edgeList = (Array.isArray(edges) ? edges : []) as StrippedEdge[]

	// Build set of occupied target handles: "nodeId::handleName"
	const connectedTargets = new Set(
		edgeList.map(e => `${e.target}::${e.targetHandle ?? 'value'}`)
	)

	// ── Node inventory ────────────────────────────────────────────────────────
	const invLines: string[] = []
	for (const n of nodeList) {
		const d = (n.data ?? {}) as Record<string, unknown>
		let desc = ''
		if (n.type === 'dynamicFunction') {
			const params = Array.isArray(d.params) ? (d.params as string[]) : []
			const argList = params.map((p, i) => `arg${i}=${p}`).join(', ')
			desc = `${String(d.functionName ?? '?')} (${argList})`
		} else if (n.type === 'literal') {
			desc = `value = ${JSON.stringify(d.value)}`
		} else if (n.type === 'spellInput') {
			const params = Array.isArray(d.params) ? (d.params as string[]) : []
			desc = `inputs: [${params.join(', ')}] → source handles: ${params.map((_, i) => `param-${i}`).join(', ')}`
		} else if (n.type === 'lambdaDef') {
			const params = Array.isArray(d.params) ? (d.params as string[]) : []
			desc = `"${String(d.functionName ?? '')}" params=[${params.join(', ')}] → source handles: ${params.map((_, i) => `param${i}`).join(', ')}`
		} else if (n.type === 'functionOut') {
			desc = `return value for lambda "${String(d.lambdaId ?? '')}" — needs "value" target handle`
		} else if (n.type === 'output') {
			desc = `final spell output — needs "value" target handle`
		} else if (n.type === 'if') {
			desc = `condition/then/else branches → source handle: result`
		} else if (n.type === 'vector') {
			desc = `x=${d.x}, y=${d.y}`
		}
		invLines.push(`  "${n.id}" → ${n.type}${desc ? ': ' + desc : ''}`)
	}

	// ── Missing connections ───────────────────────────────────────────────────
	const missing: string[] = []
	for (const n of nodeList) {
		const d = (n.data ?? {}) as Record<string, unknown>

		if (n.type === 'dynamicFunction') {
			const params = Array.isArray(d.params) ? (d.params as string[]) : []
			params.forEach((pName, i) => {
				if (!connectedTargets.has(`${n.id}::arg${i}`)) {
					missing.push(`  "${n.id}" (${String(d.functionName ?? '?')}): arg${i} (${pName}) — no incoming edge`)
				}
			})
		} else if (n.type === 'output') {
			if (!connectedTargets.has(`${n.id}::value`)) {
				missing.push(`  "${n.id}" (output): "value" handle — no incoming edge  ← spell has no result!`)
			}
		} else if (n.type === 'functionOut') {
			if (!connectedTargets.has(`${n.id}::value`)) {
				missing.push(`  "${n.id}" (functionOut for "${String(d.lambdaId ?? '')}"): "value" handle — lambda body is empty!`)
			}
		} else if (n.type === 'if') {
			for (const h of ['condition', 'then', 'else'] as const) {
				if (!connectedTargets.has(`${n.id}::${h}`)) {
					missing.push(`  "${n.id}" (if): "${h}" handle — no incoming edge`)
				}
			}
		} else if (n.type === 'applyFunc') {
			const count = typeof d.paramCount === 'number' ? d.paramCount : 0
			if (!connectedTargets.has(`${n.id}::func`)) {
				missing.push(`  "${n.id}" (applyFunc): "func" handle — no function connected`)
			}
			for (let i = 0; i < count; i++) {
				if (!connectedTargets.has(`${n.id}::arg${i}`)) {
					missing.push(`  "${n.id}" (applyFunc): arg${i} — no incoming edge`)
				}
			}
		}
	}

	return {
		inventoryText: invLines.length > 0 ? invLines.join('\n') : '  (empty graph)',
		missingText: missing.length > 0
			? missing.join('\n')
			: '  (none — graph may already be complete)',
		nodeIds: nodeList.map(n => n.id),
	}
}

/** Strip to minimal shape for the LLM (no ReactFlow internals); keeps prompt smaller and structure clear. */
export function stripGraphForPrompt(nodes: unknown[], edges: unknown[]): { nodes: unknown[]; edges: unknown[] } {
	const nodeList = Array.isArray(nodes) ? nodes : [];
	const edgeList = Array.isArray(edges) ? edges : [];
	return {
		nodes: nodeList.map((n) => {
			if (typeof n !== 'object' || n === null) return n;
			const o = n as Record<string, unknown>;
			return {
				id: o.id,
				type: o.type,
				position: o.position && typeof o.position === 'object' ? { x: (o.position as { x?: number }).x ?? 0, y: (o.position as { y?: number }).y ?? 0 } : { x: 0, y: 0 },
				data: o.data && typeof o.data === 'object' ? o.data : {},
			};
		}),
		edges: edgeList.map((e) => {
			if (typeof e !== 'object' || e === null) return e;
			const o = e as Record<string, unknown>;
			return {
				id: o.id ?? `e-${o.source}-${o.target}`,
				source: o.source,
				target: o.target,
				...(o.sourceHandle != null && { sourceHandle: o.sourceHandle }),
				...(o.targetHandle != null && { targetHandle: o.targetHandle }),
			};
		}),
	};
}

const NODE_SCHEMA = `
Node types and their "data" shape (each node has id, type, position: {x,y}, data):
- literal: data = { value: number | string | boolean }
- vector: data = { x: number, y: number }
- spellInput: data = { label?: string, params: string[] } (e.g. params: ["state"])
- if: data = {} (has targetHandles: condition, then, else; sourceHandle: result)
- output: data = {} (has targetHandle: value - the main expression feeds here)
- lambdaDef: data = { functionName?: string, params: string[] } (e.g. params: ["arg0"]); sourceHandles: param0, param1, ...
- functionOut: data = { lambdaId: string } (id of the lambdaDef node); targetHandle: value, sourceHandle: function
- applyFunc: data = { paramCount: number }; targetHandles: func, arg0, arg1, ...
- dynamicFunction: data = { functionName: string (fullName e.g. "std::math::add"), displayName: string, namespace: string, params: string[] }; targetHandles: arg0, arg1, ...; sourceHandle: result

Edge: { id: string, source: nodeId, target: nodeId, sourceHandle?: string, targetHandle?: string }
Handles: value, condition, then, else, result, func, arg0, arg1, param0, param-0, param-1 (for spellInput), function (from functionOut).
There must be exactly one "output" node. The main expression connects TO the output's "value" handle.
Spell input parameters come from a spellInput node; use its source handles param-0, param-1 for each parameter.
`;

/** Instruction injected when the user explicitly wants to complete/wire an existing graph. */
export const COMPLETE_SPELL_INSTRUCTION =
	'Complete all missing connections in the current spell to make it fully functional. ' +
	'For EVERY item listed under MISSING CONNECTIONS: add an edge that resolves it. ' +
	'For any new node you add: wire ALL its input handles AND route its output to the correct downstream node — never leave a new node orphaned. ' +
	'Trace every data path from source nodes all the way to the output node — no dead ends. ' +
	'You may add literal/lambdaDef/functionOut/if/vector nodes as needed values. ' +
	'You may add dynamicFunction nodes ONLY from the Available Functions list. ' +
	'Reuse existing nodes — do not duplicate any node that already serves the same purpose.';

export function buildVibePrompt(
	userText: string,
	currentGraph?: { nodes: unknown[]; edges: unknown[] },
	levelContext?: LevelContext
): string {
	const fnList = AVAILABLE_FUNCTIONS.map((f) => `${f.fullName}(${f.params.join(', ')})`).join('\n');

	const hasCurrentGraph =
		currentGraph &&
		Array.isArray(currentGraph.nodes) &&
		Array.isArray(currentGraph.edges) &&
		(currentGraph.nodes.length > 0 || currentGraph.edges.length > 0);

	// Detect "complete/wire/fill" intent to apply stricter node-reuse rules
	const isCompleteIntent = /\b(complet|fill.?in|wire|connect|补全|补齐|缺失|finish)\b/i.test(userText);

	let currentGraphSection = '';
	let updateRule = '';

	if (hasCurrentGraph) {
		const stripped = stripGraphForPrompt(currentGraph!.nodes, currentGraph!.edges);
		const { inventoryText, missingText } = analyzeExistingGraph(stripped.nodes, stripped.edges);

		currentGraphSection = `
⚠️  EXISTING GRAPH — RULES (violations will break the spell):
1. FUNCTION NAME VALIDITY: For every dynamicFunction node, the "functionName" field MUST be a name from the "Available functions" list below. Never invent a function name (e.g. "game::getLevel" is not in the list → forbidden).
2. NO DUPLICATES: If an existing node already serves the same purpose (same functionName OR same logical role), REUSE it — don't create a second copy.
3. ${isCompleteIntent
	? `COMPLETE MODE — resolve EVERY item in "MISSING CONNECTIONS" below:
   · For each missing handle: add an edge using the exact node id and handle name from NODE INVENTORY.
   · For any NEW node you add: wire ALL its input handles AND connect its output to the correct downstream node (no orphaned nodes).
   · After adding everything, trace each data path end-to-end — every path must eventually reach the "output" node's "value" handle.
   · Allowed new nodes: literal, lambdaDef, functionOut, if, vector; dynamicFunction ONLY if from Available Functions list and no equivalent exists.`
	: 'Only change what the user asked for. Keep everything else — nodes and edges — exactly as-is.'}
4. Include ALL edges in your output: copy every EXISTING edge unchanged, PLUS add every NEW edge for the missing connections. Never drop an existing edge.
5. Use the EXACT same node ids for existing nodes — do not rename or recreate them.

NODE INVENTORY — every node that currently exists (reuse these exact ids):
${inventoryText}

MISSING CONNECTIONS — handles that have no incoming edge yet (resolve ALL of these):
${missingText}

Full graph JSON (reference):
\`\`\`json
${JSON.stringify(stripped)}
\`\`\`

`;
		updateRule = isCompleteIntent
			? '- Return the COMPLETE graph: all existing nodes (same ids) + any new nodes, ALL existing edges + ALL new edges.\n' +
			  '- ⚠️ VERIFY before outputting: every item from "MISSING CONNECTIONS" must have a corresponding edge in your output.\n'
			: '- Output the FULL graph (all nodes + all edges). Preserve existing node ids. Only add/remove/edit as the user requested.\n';
	}

	const levelSection = levelContext ? `\n${buildLevelSection(levelContext)}\n` : '';

	return `You are a code generator for a visual "Spell" editor. The user describes what they want in plain English. You must output a single JSON object with keys "nodes", "edges", and optionally "summary".
${levelSection}${currentGraphSection}
${NODE_SCHEMA}

Available functions (use exactly these fullName in dynamicFunction nodes):
${fnList}

Rules:
- Output ONLY valid JSON. No markdown, no explanation. Start with { and end with }.
${updateRule}- Each node needs: id (unique string), type (one of the types above), position: { x: number, y: number }, data: (object as above).
- Place nodes with reasonable positions (e.g. x: 0,100,200... and y: 0,80,160... so they don't overlap).
- Edges connect nodes: source/target are node ids; use sourceHandle and targetHandle when needed (e.g. targetHandle "value" for the output, "arg0"/"arg1" for function args, "condition"/"then"/"else" for if).
- For game spells, include one spellInput node with params: ["state"] and connect state to game:: functions as first argument.
- The final result must flow into the output node's "value" handle.
- CRITICAL — dynamicFunction nodes: the "functionName" field MUST be one of the exact strings in the "Available functions" list above. Never use a function name that does not appear in that list.
- You MAY include a "summary" field: a 1-3 sentence plain English description of what you connected or added (helps the user understand what changed).

User request:
${userText}

Respond with JSON only:`;
}

export function buildAskPrompt(question: string, nodes: unknown[], edges: unknown[], levelContext?: LevelContext): string {
	const graphSummary = JSON.stringify({ nodes, edges }, null, 0);
	const levelSection = levelContext ? `\n${buildLevelSection(levelContext)}\n` : '';
	return `The user has a visual "Spell" graph (node-based editor).${levelSection}\nHere is the current graph as JSON:\n\n${graphSummary}\n\nUser question: ${question}\n\nProvide a clear, concise explanation in plain English. Do not output JSON.`;
}
