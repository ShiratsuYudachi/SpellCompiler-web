import { AVAILABLE_FUNCTIONS } from './availableFunctions';

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

export function buildVibePrompt(userText: string): string {
	const fnList = AVAILABLE_FUNCTIONS.map((f) => `${f.fullName}(${f.params.join(', ')})`).join('\n');

	return `You are a code generator for a visual "Spell" editor. The user describes what they want in plain English. You must output a single JSON object with two keys: "nodes" and "edges".

${NODE_SCHEMA}

Available functions (use exactly these fullName in dynamicFunction nodes):
${fnList}

Rules:
- Output ONLY valid JSON. No markdown, no explanation. Start with { and end with }.
- Each node needs: id (unique string), type (one of the types above), position: { x: number, y: number }, data: (object as above).
- Place nodes with reasonable positions (e.g. x: 0,100,200... and y: 0,80,160... so they don't overlap).
- Edges connect nodes: source/target are node ids; use sourceHandle and targetHandle when needed (e.g. targetHandle "value" for the output, "arg0"/"arg1" for function args, "condition"/"then"/"else" for if).
- For game spells, include one spellInput node with params: ["state"] and connect state to game:: functions as first argument.
- The final result must flow into the output node's "value" handle.

User request:
${userText}

Respond with JSON only:`;
}

export function buildAskPrompt(question: string, nodes: unknown[], edges: unknown[]): string {
	const graphSummary = JSON.stringify({ nodes, edges }, null, 0);
	return `The user has a visual "Spell" graph (node-based editor). Here is the current graph as JSON:\n\n${graphSummary}\n\nUser question: ${question}\n\nProvide a clear, concise explanation in plain English. Do not output JSON.`;
}
