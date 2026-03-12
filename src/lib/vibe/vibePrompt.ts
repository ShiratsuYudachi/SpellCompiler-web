import { AVAILABLE_FUNCTIONS } from './availableFunctions';

/** Minimal level context passed to the AI so it understands the current challenge. */
export type LevelContext = {
	key: string
	objectives?: Array<{ description?: string; id?: string; type?: string }>
	hints?: string[]
	allowedNodeTypes?: string[]
	maxSpellCasts?: number
	editorRestrictions?: RegExp
	/** Complete working answer for this level — injected as structural reference during Full Regen. */
	referenceSolution?: { nodes: unknown[]; edges: unknown[] }
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

/** Build a human-readable list of source handles available on each node (for the AI to wire FROM). */
function buildNodeOutputsText(nodes: StrippedNode[], edges: StrippedEdge[]): string {
	const lines: string[] = []
	for (const n of nodes) {
		const d = (n.data ?? {}) as Record<string, unknown>
		if (n.type === 'literal') {
			lines.push(`  "${n.id}" (literal ${JSON.stringify(d.value)}) → no sourceHandle needed`)
		} else if (n.type === 'vector') {
			lines.push(`  "${n.id}" (vector {x:${d.x}, y:${d.y}}) → no sourceHandle needed`)
		} else if (n.type === 'spellInput') {
			const params = Array.isArray(d.params) ? (d.params as string[]) : []
			params.forEach((pName, i) => {
				lines.push(`  "${n.id}" (spellInput) → sourceHandle: "param-${i}" = ${pName} (GameState)`)
			})
		} else if (n.type === 'lambdaDef') {
			const params = Array.isArray(d.params) ? (d.params as string[]) : []
			params.forEach((pName, i) => {
				lines.push(`  "${n.id}" (lambdaDef "${String(d.functionName ?? '')}") → sourceHandle: "param${i}" = ${pName}`)
			})
		} else if (n.type === 'dynamicFunction') {
			const fname = String(d.functionName ?? '?')
			lines.push(`  "${n.id}" (${fname}) → sourceHandle: "result"`)
		} else if (n.type === 'functionOut') {
			lines.push(`  "${n.id}" (functionOut, lambda "${String(d.lambdaId ?? '')}") → sourceHandle: "function" (the lambda itself)`)
		} else if (n.type === 'if') {
			lines.push(`  "${n.id}" (if) → sourceHandle: "result"`)
		} else if (n.type === 'applyFunc') {
			lines.push(`  "${n.id}" (applyFunc) → sourceHandle: "result"`)
		}
		// output node has no source handles
	}
	return lines.length > 0 ? lines.join('\n') : '  (no source nodes)'
}

/**
 * Analyse an existing graph and return:
 * - A human-readable node inventory (id → what it does)
 * - A list of unconnected required handles ("missing connections")
 * - The flat list of existing node IDs (so the AI can't claim ignorance)
 */
export function analyzeExistingGraph(nodes: unknown[], edges: unknown[]): {
	inventoryText: string
	missingText: string
	nodeOutputsText: string
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
		nodeOutputsText: buildNodeOutputsText(nodeList, edgeList),
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
- lambdaDef: data = { functionName?: string, params: string[] } (e.g. params: ["arg0"]); sourceHandles: param0, param1, ... WARNING: the UI shows an "env" port on lambdaDef — DO NOT wire anything to env. It is automatic. State from spellInput wires directly to each game:: node inside the lambda.
- functionOut: data = { lambdaId: string } (id of the lambdaDef node); targetHandle: value, sourceHandle: function. WARNING: functionOut is MANDATORY for every lambda — it is the lambda's return node AND the way to pass the lambda to forEach/filter. Without functionOut the lambda cannot run.
- applyFunc: data = { paramCount: number }; targetHandles: func, arg0, arg1, ...
- dynamicFunction: data = { functionName: string (fullName e.g. "std::math::add"), displayName: string, namespace: string, params: string[] }; targetHandles: arg0, arg1, ...; sourceHandle: result

Edge: { id: string, source: nodeId, target: nodeId, sourceHandle?: string, targetHandle?: string }
Handles: value, condition, then, else, result, func, arg0, arg1, param0, param-0, param-1 (for spellInput), function (from functionOut).
There must be exactly one "output" node. The main expression connects TO the output's "value" handle.
Spell input parameters come from a spellInput node; use its source handles param-0, param-1 for each parameter.
`;

/**
 * Worked structural examples for common spell patterns.
 * Injected when no level-specific reference solution is available.
 * These examples show the EXACT edge wiring rules that AI frequently gets wrong.
 */
const SPELL_PATTERNS = `
=== SPELL PATTERNS (structurally correct worked examples) ===
FIVE RULES that MUST be followed (AI frequently violates these):
  1. lambdaDef param source handles are "param0", "param1" (NO hyphen — never "param-0").
  2. State from spellInput wires DIRECTLY to every game:: node inside the lambda — no env port.
  3. Every lambda REQUIRES a functionOut node (lambdaId = lambdaDef id). Without it the lambda has no return value and cannot be passed to forEach/filter.
  4. Pass lambda to forEach/filter via: functionOut [sourceHandle="function"] → forEach/filter (arg1).
  5. The LAST node in the lambda body chain connects → functionOut(value). Nothing else goes to output from inside the lambda.

── PATTERN A: pick one enemy and act (no lambda) ──────────────────────────────
Nodes: si(spellInput,params=["state"]), f-gae(game::getAllEnemies), f-head(list::head),
       f-act(game::damageEntity), lit(literal,100), out(output)
Edges:
  si            → f-gae(arg0)           state to getAllEnemies
  f-gae         → f-head(arg0)          enemy list → head
  si            → f-act(arg0)           state to action (arg0 is always state for game:: funcs)
  f-head        → f-act(arg1)           picked eid
  lit           → f-act(arg2)           damage amount
  f-act         → out(value)

── PATTERN B: filter enemies by condition, pick first, act (1-level lambda) ─────
Copy this exactly for "filter then attack" requests (HP threshold, type check, etc).
{"nodes":[
  {"id":"si","type":"spellInput","position":{"x":-200,"y":200},"data":{"label":"Game State","params":["state"]}},
  {"id":"f-gae","type":"dynamicFunction","position":{"x":60,"y":200},"data":{"functionName":"game::getAllEnemies","displayName":"getAllEnemies","namespace":"game","params":["state"]}},
  {"id":"f-flt","type":"dynamicFunction","position":{"x":300,"y":200},"data":{"functionName":"list::filter","displayName":"filter","namespace":"list","params":["l","pred"]}},
  {"id":"f-head","type":"dynamicFunction","position":{"x":520,"y":200},"data":{"functionName":"list::head","displayName":"head","namespace":"list","params":["l"]}},
  {"id":"f-act","type":"dynamicFunction","position":{"x":700,"y":200},"data":{"functionName":"game::damageEntity","displayName":"damageEntity","namespace":"game","params":["state","eid","amount"]}},
  {"id":"lit-amt","type":"literal","position":{"x":600,"y":320},"data":{"value":100}},
  {"id":"out","type":"output","position":{"x":940,"y":200},"data":{}},
  {"id":"lam","type":"lambdaDef","position":{"x":60,"y":420},"data":{"functionName":"predicate","params":["eid"]}},
  {"id":"f-hp","type":"dynamicFunction","position":{"x":220,"y":500},"data":{"functionName":"game::getEntityHealth","displayName":"getEntityHealth","namespace":"game","params":["state","eid"]}},
  {"id":"f-gt","type":"dynamicFunction","position":{"x":420,"y":500},"data":{"functionName":"std::cmp::gt","displayName":"> gt","namespace":"std::cmp","params":["a","b"]}},
  {"id":"lit-thr","type":"literal","position":{"x":320,"y":600},"data":{"value":30}},
  {"id":"fout","type":"functionOut","position":{"x":620,"y":500},"data":{"lambdaId":"lam"}}
],"edges":[
  {"id":"e1","source":"si","target":"f-gae","targetHandle":"arg0"},
  {"id":"e2","source":"f-gae","target":"f-flt","targetHandle":"arg0"},
  {"id":"e3","source":"fout","sourceHandle":"function","target":"f-flt","targetHandle":"arg1"},
  {"id":"e4","source":"f-flt","target":"f-head","targetHandle":"arg0"},
  {"id":"e5","source":"si","target":"f-act","targetHandle":"arg0"},
  {"id":"e6","source":"f-head","target":"f-act","targetHandle":"arg1"},
  {"id":"e7","source":"lit-amt","target":"f-act","targetHandle":"arg2"},
  {"id":"e8","source":"f-act","target":"out","targetHandle":"value"},
  {"id":"e9","source":"si","target":"f-hp","targetHandle":"arg0"},
  {"id":"e10","source":"lam","sourceHandle":"param0","target":"f-hp","targetHandle":"arg1"},
  {"id":"e11","source":"f-hp","target":"f-gt","targetHandle":"arg0"},
  {"id":"e12","source":"lit-thr","target":"f-gt","targetHandle":"arg1"},
  {"id":"e13","source":"f-gt","target":"fout","targetHandle":"value"}
]}

── PATTERN C: forEach — damage ALL enemies (simplest forEach) ──────────────────
Minimum forEach structure. Copy this exactly for "damage/heal all enemies" requests.
{"nodes":[
  {"id":"si","type":"spellInput","position":{"x":-200,"y":200},"data":{"label":"Game State","params":["state"]}},
  {"id":"f-gae","type":"dynamicFunction","position":{"x":60,"y":200},"data":{"functionName":"game::getAllEnemies","displayName":"getAllEnemies","namespace":"game","params":["state"]}},
  {"id":"f-fe","type":"dynamicFunction","position":{"x":300,"y":200},"data":{"functionName":"list::forEach","displayName":"forEach","namespace":"list","params":["l","f"]}},
  {"id":"out","type":"output","position":{"x":540,"y":200},"data":{}},
  {"id":"lam","type":"lambdaDef","position":{"x":60,"y":400},"data":{"functionName":"doAction","params":["eid"]}},
  {"id":"f-dmg","type":"dynamicFunction","position":{"x":250,"y":400},"data":{"functionName":"game::damageEntity","displayName":"damageEntity","namespace":"game","params":["state","eid","amount"]}},
  {"id":"lit","type":"literal","position":{"x":100,"y":520},"data":{"value":100}},
  {"id":"fout","type":"functionOut","position":{"x":480,"y":400},"data":{"lambdaId":"lam"}}
],"edges":[
  {"id":"e1","source":"si","target":"f-gae","targetHandle":"arg0"},
  {"id":"e2","source":"f-gae","target":"f-fe","targetHandle":"arg0"},
  {"id":"e3","source":"fout","sourceHandle":"function","target":"f-fe","targetHandle":"arg1"},
  {"id":"e4","source":"f-fe","target":"out","targetHandle":"value"},
  {"id":"e5","source":"si","target":"f-dmg","targetHandle":"arg0"},
  {"id":"e6","source":"lam","sourceHandle":"param0","target":"f-dmg","targetHandle":"arg1"},
  {"id":"e7","source":"lit","target":"f-dmg","targetHandle":"arg2"},
  {"id":"e8","source":"f-dmg","target":"fout","targetHandle":"value"}
]}

── PATTERN C2: spawnFireball at ALL enemies (map + forEach, two lambdas) ────────
Chain: enemies → map(eid→direction) → forEach(dir→spawnFireball) → out
Copy this exactly for "fire fireball at all enemies" requests.
{"nodes":[
  {"id":"si","type":"spellInput","position":{"x":-200,"y":200},"data":{"label":"Game State","params":["state"]}},
  {"id":"f-gp","type":"dynamicFunction","position":{"x":60,"y":80},"data":{"functionName":"game::getPlayer","displayName":"getPlayer","namespace":"game","params":["state"]}},
  {"id":"f-pp","type":"dynamicFunction","position":{"x":250,"y":80},"data":{"functionName":"game::getEntityPosition","displayName":"getEntityPosition","namespace":"game","params":["state","eid"]}},
  {"id":"f-gae","type":"dynamicFunction","position":{"x":60,"y":200},"data":{"functionName":"game::getAllEnemies","displayName":"getAllEnemies","namespace":"game","params":["state"]}},
  {"id":"f-map","type":"dynamicFunction","position":{"x":280,"y":200},"data":{"functionName":"list::map","displayName":"map","namespace":"list","params":["l","f"]}},
  {"id":"f-fe","type":"dynamicFunction","position":{"x":520,"y":200},"data":{"functionName":"list::forEach","displayName":"forEach","namespace":"list","params":["l","f"]}},
  {"id":"out","type":"output","position":{"x":760,"y":200},"data":{}},
  {"id":"lam1","type":"lambdaDef","position":{"x":60,"y":440},"data":{"functionName":"toDir","params":["eid"]}},
  {"id":"f-ep","type":"dynamicFunction","position":{"x":220,"y":520},"data":{"functionName":"game::getEntityPosition","displayName":"getEntityPosition","namespace":"game","params":["state","eid"]}},
  {"id":"f-sub","type":"dynamicFunction","position":{"x":420,"y":520},"data":{"functionName":"vec::subtract","displayName":"subtract","namespace":"vec","params":["a","b"]}},
  {"id":"f-norm","type":"dynamicFunction","position":{"x":600,"y":520},"data":{"functionName":"vec::normalize","displayName":"normalize","namespace":"vec","params":["v"]}},
  {"id":"f-out1","type":"functionOut","position":{"x":760,"y":520},"data":{"lambdaId":"lam1"}},
  {"id":"lam2","type":"lambdaDef","position":{"x":60,"y":700},"data":{"functionName":"shoot","params":["dir"]}},
  {"id":"f-fb","type":"dynamicFunction","position":{"x":300,"y":700},"data":{"functionName":"game::spawnFireball","displayName":"spawnFireball","namespace":"game","params":["state","position","direction"]}},
  {"id":"f-out2","type":"functionOut","position":{"x":560,"y":700},"data":{"lambdaId":"lam2"}}
],"edges":[
  {"id":"e1","source":"si","target":"f-gp","targetHandle":"arg0"},
  {"id":"e2","source":"si","target":"f-pp","targetHandle":"arg0"},
  {"id":"e3","source":"f-gp","target":"f-pp","targetHandle":"arg1"},
  {"id":"e4","source":"si","target":"f-gae","targetHandle":"arg0"},
  {"id":"e5","source":"f-gae","target":"f-map","targetHandle":"arg0"},
  {"id":"e6","source":"f-out1","sourceHandle":"function","target":"f-map","targetHandle":"arg1"},
  {"id":"e7","source":"f-map","target":"f-fe","targetHandle":"arg0"},
  {"id":"e8","source":"f-out2","sourceHandle":"function","target":"f-fe","targetHandle":"arg1"},
  {"id":"e9","source":"f-fe","target":"out","targetHandle":"value"},
  {"id":"e10","source":"si","target":"f-ep","targetHandle":"arg0"},
  {"id":"e11","source":"lam1","sourceHandle":"param0","target":"f-ep","targetHandle":"arg1"},
  {"id":"e12","source":"f-ep","target":"f-sub","targetHandle":"arg0"},
  {"id":"e13","source":"f-pp","target":"f-sub","targetHandle":"arg1"},
  {"id":"e14","source":"f-sub","target":"f-norm","targetHandle":"arg0"},
  {"id":"e15","source":"f-norm","target":"f-out1","targetHandle":"value"},
  {"id":"e16","source":"si","target":"f-fb","targetHandle":"arg0"},
  {"id":"e17","source":"f-pp","target":"f-fb","targetHandle":"arg1"},
  {"id":"e18","source":"lam2","sourceHandle":"param0","target":"f-fb","targetHandle":"arg2"},
  {"id":"e19","source":"f-fb","target":"f-out2","targetHandle":"value"}
]}

── PATTERN D: conditional action on one enemy (if node) ────────────────────────
Nodes: si, f-gae(getAllEnemies), f-head(list::head),
       f-hp(getEntityHealth), lit-thr(literal,50), f-gt(std::cmp::gt),
       if-node(if), f-hi(damageEntity,lit-100), f-lo(damageEntity,lit-10), out
Edges:
  si            → f-gae(arg0)
  f-gae         → f-head(arg0)
  si            → f-hp(arg0),  f-head → f-hp(arg1)
  f-hp          → f-gt(arg0),  lit-thr → f-gt(arg1)
  f-gt          → if-node(condition)
  si            → f-hi(arg0),  f-head → f-hi(arg1),  lit-100 → f-hi(arg2)
  f-hi          → if-node(then)
  si            → f-lo(arg0),  f-head → f-lo(arg1),  lit-10  → f-lo(arg2)
  f-lo          → if-node(else)
  if-node [sourceHandle="result"] → out(value)

── PATTERN E: forEach — tiered damage with if inside lambda ─────────────────────
Logic: eid → if(hp > 50, deal 200, deal 50). if selects the AMOUNT; one damageEntity call.
Copy this exactly for "different damage per enemy based on HP" requests.
{"nodes":[
  {"id":"si","type":"spellInput","position":{"x":-200,"y":200},"data":{"label":"Game State","params":["state"]}},
  {"id":"f-gae","type":"dynamicFunction","position":{"x":60,"y":200},"data":{"functionName":"game::getAllEnemies","displayName":"getAllEnemies","namespace":"game","params":["state"]}},
  {"id":"f-fe","type":"dynamicFunction","position":{"x":300,"y":200},"data":{"functionName":"list::forEach","displayName":"forEach","namespace":"list","params":["l","f"]}},
  {"id":"out","type":"output","position":{"x":960,"y":200},"data":{}},
  {"id":"lam","type":"lambdaDef","position":{"x":60,"y":440},"data":{"functionName":"tiered","params":["eid"]}},
  {"id":"f-hp","type":"dynamicFunction","position":{"x":210,"y":540},"data":{"functionName":"game::getEntityHealth","displayName":"getEntityHealth","namespace":"game","params":["state","eid"]}},
  {"id":"f-gt","type":"dynamicFunction","position":{"x":400,"y":540},"data":{"functionName":"std::cmp::gt","displayName":"> gt","namespace":"std::cmp","params":["a","b"]}},
  {"id":"lit-thr","type":"literal","position":{"x":300,"y":650},"data":{"value":50}},
  {"id":"f-if","type":"if","position":{"x":600,"y":480},"data":{}},
  {"id":"lit-200","type":"literal","position":{"x":460,"y":390},"data":{"value":200}},
  {"id":"lit-50","type":"literal","position":{"x":460,"y":570},"data":{"value":50}},
  {"id":"f-dmg","type":"dynamicFunction","position":{"x":780,"y":480},"data":{"functionName":"game::damageEntity","displayName":"damageEntity","namespace":"game","params":["state","eid","amount"]}},
  {"id":"f-out","type":"functionOut","position":{"x":980,"y":480},"data":{"lambdaId":"lam"}}
],"edges":[
  {"id":"e1","source":"si","target":"f-gae","targetHandle":"arg0"},
  {"id":"e2","source":"f-gae","target":"f-fe","targetHandle":"arg0"},
  {"id":"e3","source":"f-out","sourceHandle":"function","target":"f-fe","targetHandle":"arg1"},
  {"id":"e4","source":"f-fe","target":"out","targetHandle":"value"},
  {"id":"e5","source":"si","target":"f-hp","targetHandle":"arg0"},
  {"id":"e6","source":"lam","sourceHandle":"param0","target":"f-hp","targetHandle":"arg1"},
  {"id":"e7","source":"f-hp","target":"f-gt","targetHandle":"arg0"},
  {"id":"e8","source":"lit-thr","target":"f-gt","targetHandle":"arg1"},
  {"id":"e9","source":"f-gt","target":"f-if","targetHandle":"condition"},
  {"id":"e10","source":"lit-200","target":"f-if","targetHandle":"then"},
  {"id":"e11","source":"lit-50","target":"f-if","targetHandle":"else"},
  {"id":"e12","source":"si","target":"f-dmg","targetHandle":"arg0"},
  {"id":"e13","source":"lam","sourceHandle":"param0","target":"f-dmg","targetHandle":"arg1"},
  {"id":"e14","source":"f-if","target":"f-dmg","targetHandle":"arg2"},
  {"id":"e15","source":"f-dmg","target":"f-out","targetHandle":"value"}
]}

── PATTERN F: attack the enemy with the lowest HP (list::minBy + 1-level lambda) ──
(minBy takes the SAME lambda pattern as filter — use it to score each element)
Nodes: si, f-gae(getAllEnemies),
       lam(lambdaDef,params=["eid"]), f-hp(game::getEntityHealth), fout(functionOut,lambdaId="lam"),
       f-min(list::minBy), f-act(game::damageEntity), lit-amt(literal,100), out
Edges — main chain:
  si            → f-gae(arg0)
  f-gae         → f-min(arg0)            enemy list → minBy
  fout [sourceHandle="function"] → f-min(arg1)   ← scoring lambda (returns HP per eid)
  si            → f-act(arg0)
  f-min         → f-act(arg1)            lowest-HP enemy eid → damage
  lit-amt       → f-act(arg2)
  f-act         → out(value)
Edges — lambda body (scoring: just return the entity's HP):
  si            → f-hp(arg0)             ← state direct (no env port)
  lam [sourceHandle="param0"] → f-hp(arg1)    ← eid from lambda (NO hyphen)
  f-hp          → fout(value)            ← minBy uses this number to rank elements
=== END SPELL PATTERNS ===
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

/** Instruction injected when the user wants a full regeneration from scratch. */
export const FULL_REGEN_INSTRUCTION =
	'Generate a COMPLETE spell from scratch that correctly achieves the level objective shown above. ' +
	'Ignore the current graph — build a fresh, fully-functional spell. ' +
	'Include ALL necessary nodes: spellInput, every required game/std function, all literals, and the output node. ' +
	'Wire EVERY handle on EVERY node. No orphaned nodes. Every data path must reach the output node. ' +
	'Choose function parameter values (literals) that are appropriate for the level objective.';

export function buildVibePrompt(
	userText: string,
	currentGraph?: { nodes: unknown[]; edges: unknown[] },
	levelContext?: LevelContext
): string {
	const fnList = AVAILABLE_FUNCTIONS.map((f) => {
		const parts = f.fullName.split('::');
		const displayName = (f as { displayName?: string }).displayName ?? parts[parts.length - 1];
		const namespace = parts.slice(0, -1).join('::');
		const sig = `${f.fullName}(${f.params.join(', ')})  [displayName="${displayName}", namespace="${namespace}"]`;
		return (f as { hint?: string }).hint ? `${sig}  --  ${(f as { hint?: string }).hint!}` : sig;
	}).join('\n');

	const hasCurrentGraph =
		currentGraph &&
		Array.isArray(currentGraph.nodes) &&
		Array.isArray(currentGraph.edges) &&
		(currentGraph.nodes.length > 0 || currentGraph.edges.length > 0);

	// Detect "complete/wire/fill" intent to apply stricter node-reuse rules
	const isCompleteIntent = /\b(complet|fill.?in|wire|connect|missing|finish)\b/i.test(userText);

	let currentGraphSection = '';
	let updateRule = '';

	if (hasCurrentGraph) {
		const stripped = stripGraphForPrompt(currentGraph!.nodes, currentGraph!.edges);
		const { inventoryText, missingText, nodeOutputsText } = analyzeExistingGraph(stripped.nodes, stripped.edges);

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

NODE OUTPUTS — exact source info for every existing node (use these when you need to wire FROM a node):
${nodeOutputsText}

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

	const referenceSolutionSection = levelContext?.referenceSolution
		? `\n=== REFERENCE SOLUTION ===
This is a COMPLETE, WORKING spell for this exact level. Use it as your structural blueprint:
- Copy the node types, functionName, displayName, namespace, and edge connections exactly.
- Preserve the overall wiring pattern (especially lambda structure and handle names).
- You may adjust literal values if the level objective clearly requires different numbers.
${JSON.stringify(levelContext.referenceSolution)}
=== END REFERENCE SOLUTION ===\n`
		: '';

	// Inject generic patterns when no level-specific reference solution is available
	const spellPatternsSection = levelContext?.referenceSolution ? '' : SPELL_PATTERNS;

	return `You are a code generator for a visual "Spell" editor. The user describes what they want in plain English. You must output a single JSON object with keys "nodes", "edges", and optionally "summary".
${levelSection}${referenceSolutionSection}${spellPatternsSection}${currentGraphSection}
${NODE_SCHEMA}

Available functions (each entry shows: fullName(params)  [displayName="...", namespace="..."]):
${fnList}

Rules:
- Output ONLY valid JSON. No markdown, no explanation. Start with { and end with }.
${updateRule}- Each node needs: id (unique string), type (one of the types above), position: { x: number, y: number }, data: (object as above).
- Place nodes with reasonable positions (e.g. x: 0,100,200... and y: 0,80,160... so they don't overlap).
- Edges connect nodes: source/target are node ids; use sourceHandle and targetHandle when needed (e.g. targetHandle "value" for the output, "arg0"/"arg1" for function args, "condition"/"then"/"else" for if).
- For game spells, include one spellInput node with params: ["state"] and connect state to game:: functions as first argument.
- The final result must flow into the output node's "value" handle.
- CRITICAL — dynamicFunction nodes: the "functionName" field MUST be one of the exact fullName strings in the list above. The "displayName" field MUST be the exact displayName shown in [displayName="..."] for that function. The "namespace" field MUST be the exact namespace shown in [namespace="..."]. Never invent or paraphrase these values.
- You MUST include a "summary" field: 1-3 sentences describing what this spell will DO in the game from the player's perspective (e.g. "This spell filters enemies with HP above 30, takes the first one, and deals 100 damage to it."). Focus on the game effect, not graph structure.

User request:
${userText}

Respond with JSON only:`;
}

export function buildAskPrompt(question: string, nodes: unknown[], edges: unknown[], levelContext?: LevelContext): string {
	const graphSummary = JSON.stringify({ nodes, edges }, null, 0);
	const levelSection = levelContext ? `\n${buildLevelSection(levelContext)}\n` : '';
	return `The user has a visual "Spell" graph (node-based editor).${levelSection}\nHere is the current graph as JSON:\n\n${graphSummary}\n\nUser question: ${question}\n\nProvide a clear, concise explanation in plain English. Do not output JSON.`;
}
