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

── PATTERN B: filter enemies by condition, pick one, act (1-level lambda) ──────
Nodes: si, f-gae(getAllEnemies), lam(lambdaDef,params=["eid"]),
       f-hp(game::getEntityHealth), f-gt(std::cmp::gt), lit-N(literal,30),
       f-out(functionOut,lambdaId="lam"), f-flt(list::filter),
       f-head(list::head), f-act(game::damageEntity), lit-amt(literal,100), out
Edges — main chain:
  si            → f-gae(arg0)
  f-gae         → f-flt(arg0)           enemy list → filter
  f-out [sourceHandle="function"] → f-flt(arg1)    ← pass lambda as predicate
  f-flt         → f-head(arg0)
  si            → f-act(arg0)
  f-head        → f-act(arg1)
  lit-amt       → f-act(arg2)
  f-act         → out(value)
Edges — lambda body (state wires FROM si DIRECTLY, NOT through any env port):
  si            → f-hp(arg0)            ← state crosses lambda boundary directly
  lam [sourceHandle="param0"] → f-hp(arg1)   ← lambda's eid param (NO hyphen!)
  f-hp          → f-gt(arg0)
  lit-N         → f-gt(arg1)
  f-gt          → f-out(value)          ← lambda return value

── PATTERN C: forEach — damage ALL enemies (simplest forEach, no sub-calculations) ──
This is the MINIMUM correct forEach structure. Study this before Pattern C2.
Nodes: si(spellInput,params=["state"]), f-gae(game::getAllEnemies), f-fe(list::forEach),
       lam(lambdaDef,params=["eid"]), f-dmg(game::damageEntity), lit(literal,100),
       fout(functionOut,lambdaId="lam"), out(output)
Edges — setup (OUTSIDE lambda):
  si    → f-gae(arg0)
  f-gae → f-fe(arg0)                   enemy list → forEach
  fout  [sourceHandle="function"] → f-fe(arg1)   ← pass lambda to forEach (REQUIRED)
  f-fe  → out(value)                   ← forEach result is the spell output
Edges — lambda body (INSIDE lambda):
  si    → f-dmg(arg0)                  ← state DIRECTLY (no env port)
  lam   [sourceHandle="param0"] → f-dmg(arg1)    ← eid from lambda param (NO hyphen)
  lit   → f-dmg(arg2)                  damage amount
  f-dmg → fout(value)                  ← lambda RETURN (must connect last body node to fout)
Key data flow: si→f-gae→f-fe→out  AND  fout[function]→f-fe  AND  f-dmg→fout(value)

── PATTERN C2: forEach — fire at ALL enemies (complex lambda, spawnFireball) ─────
MANDATORY nodes: lambdaDef + functionOut are BOTH required. No functionOut = broken.
Node list:
  si     (spellInput, params=["state"])
  f-gp   (game::getPlayer)
  f-pp   (game::getEntityPosition)        ← player position (computed OUTSIDE lambda)
  f-gae  (game::getAllEnemies)
  f-fe   (list::forEach)
  out    (output)
  lam    (lambdaDef, params=["eid"])      ← ONE param; sourceHandle = "param0"
  f-ep   (game::getEntityPosition)        ← enemy position (computed INSIDE lambda)
  f-sub  (vec::subtract)
  f-norm (vec::normalize)
  f-sfb  (game::spawnFireball)
  fout   (functionOut, lambdaId="lam")   ← REQUIRED; lambdaId must match lam's id
Edges — setup (OUTSIDE lambda):
  si    → f-gp(arg0)               get player eid
  si    → f-pp(arg0)               state → getEntityPosition for PLAYER
  f-gp  → f-pp(arg1)               player eid → position
  si    → f-gae(arg0)              get all enemies
  f-gae → f-fe(arg0)               enemy list → forEach
  fout  [sourceHandle="function"] → f-fe(arg1)   ← THIS is how lambda is passed; arg1 not arg0
  f-fe  → out(value)               forEach result → spell output
Edges — lambda body (INSIDE lambda; state from si wires directly, env port unused):
  si    → f-ep(arg0)               ← state DIRECTLY to getEntityPosition (no env port!)
  lam   [sourceHandle="param0"] → f-ep(arg1)   ← eid param (NO hyphen in "param0")
  f-ep  → f-sub(arg0)             enemy position
  f-pp  → f-sub(arg1)             player position (cross-scope wire is fine)
  f-sub → f-norm(arg0)            direction vector
  si    → f-sfb(arg0)             ← state DIRECTLY to spawnFireball
  f-pp  → f-sfb(arg1)             launch from player position
  f-norm → f-sfb(arg2)            normalized direction
  f-sfb → fout(value)             ← lambda return: fout collects the result
CHECKLIST before outputting Pattern C2 (ALL must be true or the spell is broken):
  ✓ fout node exists with data.lambdaId="lam"
  ✓ fout [sourceHandle="function"] → f-fe(arg1)   ← lambda passed to forEach
  ✓ f-sfb → fout(value)   ← lambda body ends at fout, NOT at out
  ✓ f-fe  → out(value)    ← forEach result goes to spell output
  ✓ lam [sourceHandle="param0"] → f-ep(arg1)   ← NO hyphen in "param0"

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

── PATTERN E: forEach — different action per enemy based on HP (if inside lambda) ──
(forEach with an if node INSIDE the lambda body — state wires directly as always)
Nodes: si, f-gae(getAllEnemies), f-fe(list::forEach), out,
       lam(lambdaDef,params=["eid"]),
       f-hp(game::getEntityHealth), lit-thr(literal,50), f-gt(std::cmp::gt),
       f-hi(game::damageEntity), lit-hi(literal,100),
       f-lo(game::damageEntity), lit-lo(literal,10),
       if-n(if), fout(functionOut,lambdaId="lam")
Edges — setup (outside lambda):
  si            → f-gae(arg0)
  f-gae         → f-fe(arg0)             enemy list → forEach
  fout [sourceHandle="function"] → f-fe(arg1)    ← pass lambda
  f-fe          → out(value)
Edges — lambda body (EVERY game:: call needs state wired in from si directly):
  si            → f-hp(arg0)             ← state crosses lambda boundary directly
  lam [sourceHandle="param0"] → f-hp(arg1)    ← eid from lambda (NO hyphen)
  f-hp          → f-gt(arg0)
  lit-thr       → f-gt(arg1)
  f-gt          → if-n(condition)
  si            → f-hi(arg0)             ← state to high-damage action
  lam [sourceHandle="param0"] → f-hi(arg1)
  lit-hi        → f-hi(arg2)
  f-hi          → if-n(then)             ← high-HP branch: big damage
  si            → f-lo(arg0)             ← state to low-damage action
  lam [sourceHandle="param0"] → f-lo(arg1)
  lit-lo        → f-lo(arg2)
  f-lo          → if-n(else)             ← low-HP branch: small damage
  if-n [sourceHandle="result"] → fout(value)    ← lambda return value

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
