/**
 * Frontend-only Vibe API: call OpenRouter from the browser.
 * No server required. Use your OpenRouter API key at https://openrouter.ai/keys
 */

import { buildVibePrompt, buildAskPrompt } from './vibePrompt';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/** Use this as model to skip API and return fixture data (for testing without budget). */
export const MOCK_MODEL_ID = '__mock__';

/** Default and commonly used OpenRouter model IDs. */
export const OPENROUTER_MODELS = [
	{ value: MOCK_MODEL_ID, label: 'Mock (no API — for testing)' },
	{ value: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
	{ value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
	{ value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
	{ value: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
	{ value: 'google/gemini-2.0-flash-001', label: 'Google Gemini 2.0 Flash' },
	{ value: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
	{ value: 'meta-llama/llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
] as const;

export type OpenRouterModelId = (typeof OPENROUTER_MODELS)[number]['value'] | string;

function normalizeModel(v: unknown): string {
	if (typeof v === 'string' && v.trim()) return v.trim();
	return 'openai/gpt-4o-mini';
}

/** Mock build: returns a fixture graph without calling the API. Simulates full-graph response for testing. */
function mockBuild(
	_options?: { nodes?: unknown[]; edges?: unknown[] }
): { nodes: unknown[]; edges: unknown[] } {
	const hasExisting = _options && Array.isArray(_options.nodes) && _options.nodes.length > 0;
	if (hasExisting && _options!.nodes && _options!.edges) {
		const nodes = _options!.nodes as Array<Record<string, unknown>>;
		const edges = _options!.edges as Array<Record<string, unknown>>;
		const maxX = Math.max(0, ...nodes.map((n) => (n.position && typeof n.position === 'object' && 'x' in n.position ? Number((n.position as { x: number }).x) : 0)));
		const maxY = Math.max(0, ...nodes.map((n) => (n.position && typeof n.position === 'object' && 'y' in n.position ? Number((n.position as { y: number }).y) : 0)));
		const newId = `mock-literal-${Date.now()}`;
		const newNodes = [
			...nodes.map((n) => ({ ...n, id: n.id, type: n.type, position: n.position, data: n.data })),
			{ id: newId, type: 'literal', position: { x: maxX + 120, y: maxY }, data: { value: 42 } },
		];
		return normalizeGraphResponse(newNodes, edges as unknown[]);
	}
	const fixture = {
		nodes: [
			{ id: 'output-1', type: 'output', position: { x: 200, y: 80 }, data: {} },
			{ id: 'lit-1', type: 'literal', position: { x: 0, y: 80 }, data: { value: 42 } },
		],
		edges: [{ id: 'e1', source: 'lit-1', target: 'output-1', targetHandle: 'value' }],
	};
	return normalizeGraphResponse(fixture.nodes, fixture.edges);
}

/** Mock ask: returns a fixture explanation without calling the API. */
function mockAsk(question: string, nodes: unknown[], edges: unknown[]): { explanation: string } {
	const n = Array.isArray(nodes) ? nodes.length : 0;
	const e = Array.isArray(edges) ? edges.length : 0;
	return {
		explanation: `[Mock — no API] Your graph has ${n} node(s) and ${e} edge(s).\n\nQuestion: "${question}"\n\nUse a real model (and API key) to get an actual explanation.`,
	};
}

function extractJsonFromRaw(raw: string): string {
	let jsonStr = raw.trim();
	const codeMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/);
	if (codeMatch) jsonStr = codeMatch[1].trim();
	return jsonStr;
}

function mapResponseError(res: Response, body: unknown): string {
	let msg = `Request failed: ${res.status}`;
	if (typeof body === 'object' && body !== null && 'error' in body) {
		const err = (body as { error: unknown }).error;
		if (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message: string }).message === 'string') {
			msg = (err as { message: string }).message;
		} else {
			msg = JSON.stringify(err);
		}
	}
	if (res.status === 402 || (typeof msg === 'string' && (msg.includes('402') || msg.includes('Insufficient Balance')))) {
		return 'Insufficient balance. Please top up your OpenRouter account and try again.';
	}
	if (res.status === 429 || (typeof msg === 'string' && msg.toLowerCase().includes('rate limit'))) {
		return 'Rate limit exceeded. Please wait a moment and try again.';
	}
	return typeof msg === 'string' ? msg : `Request failed: ${res.status}`;
}

async function callOpenRouter(
	apiKey: string,
	model: string,
	systemPrompt: string,
	userContent: string,
	opts: { temperature?: number; maxTokens?: number }
): Promise<string> {
	const res = await fetch(OPENROUTER_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
			'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userContent },
			],
			temperature: opts.temperature ?? 0.2,
			max_tokens: opts.maxTokens ?? 4096,
		}),
	});
	const data = (await res.json().catch(() => ({}))) as { choices?: Array<{ message?: { content?: string } }>; error?: unknown };
	if (!res.ok) {
		throw new Error(mapResponseError(res, data));
	}
	const text = data.choices?.[0]?.message?.content?.trim() ?? '';
	return text;
}

/** Build mode: generate or update nodes and edges from natural language. Sends the full current graph when updating so the model can return the complete updated graph (in-place update). */
export async function vibeBuild(
	text: string,
	apiKey: string,
	model?: OpenRouterModelId | string,
	options?: { nodes?: unknown[]; edges?: unknown[] }
): Promise<{ nodes: unknown[]; edges: unknown[] }> {
	const m = normalizeModel(model);
	if (m === MOCK_MODEL_ID) {
		await new Promise((r) => setTimeout(r, 400));
		return mockBuild(options);
	}
	const prompt = buildVibePrompt(text.trim(), options?.nodes && options?.edges ? { nodes: options.nodes, edges: options.edges } : undefined);
	const systemPrompt = 'You output only valid JSON with keys "nodes" and "edges". No other text.';
	let raw: string;
	try {
		raw = await callOpenRouter(apiKey, m, systemPrompt, prompt, { temperature: 0.2, maxTokens: 4096 });
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		if (message.includes('JSON') || message.includes('valid')) {
			throw new Error('Model did not return valid JSON. Try rephrasing.');
		}
		throw e;
	}
	if (!raw) {
		throw new Error('Empty response from model');
	}
	const jsonStr = extractJsonFromRaw(raw);
	let parsed: { nodes?: unknown; edges?: unknown };
	try {
		parsed = JSON.parse(jsonStr) as { nodes?: unknown; edges?: unknown };
	} catch {
		throw new Error('Model did not return valid JSON. Try rephrasing.');
	}
	if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
		throw new Error('Response must contain "nodes" and "edges" arrays');
	}
	return normalizeGraphResponse(parsed.nodes, parsed.edges);
}

function normalizeGraphResponse(nodes: unknown[], edges: unknown[]): { nodes: unknown[]; edges: unknown[] } {
	return {
		nodes: nodes.map((n, i) => {
			if (typeof n !== 'object' || n === null) return { id: `node-${i}`, type: 'literal', position: { x: 0, y: 0 }, data: {} };
			const o = n as Record<string, unknown>;
			const pos = o.position && typeof o.position === 'object'
				? { x: Number((o.position as { x?: unknown }).x) || 0, y: Number((o.position as { y?: unknown }).y) || 0 }
				: { x: 0, y: 0 };
			return {
				id: typeof o.id === 'string' ? o.id : `node-${i}`,
				type: typeof o.type === 'string' ? o.type : 'literal',
				position: pos,
				data: o.data && typeof o.data === 'object' ? o.data : {},
			};
		}),
		edges: edges.map((e, i) => {
			if (typeof e !== 'object' || e === null) return { id: `e-${i}`, source: '', target: '' };
			const o = e as Record<string, unknown>;
			return {
				id: typeof o.id === 'string' ? o.id : `e-${i}`,
				source: String(o.source ?? ''),
				target: String(o.target ?? ''),
				...(o.sourceHandle != null && { sourceHandle: o.sourceHandle }),
				...(o.targetHandle != null && { targetHandle: o.targetHandle }),
			};
		}),
	};
}

/** Ask mode: explain the current graph. Full graph is sent so the model can answer in context. */
export async function vibeAsk(
	question: string,
	nodes: unknown[],
	edges: unknown[],
	apiKey: string,
	model?: OpenRouterModelId | string
): Promise<{ explanation: string }> {
	const m = normalizeModel(model);
	if (m === MOCK_MODEL_ID) {
		await new Promise((r) => setTimeout(r, 300));
		return mockAsk(question, nodes, edges);
	}
	const userContent = buildAskPrompt(question.trim(), nodes, edges);
	const systemPrompt = "You explain visual programming graphs in plain English. Answer the user's question about their graph clearly and concisely. Do not output code or JSON unless asked.";
	const raw = await callOpenRouter(apiKey, m, systemPrompt, userContent, { temperature: 0.3, maxTokens: 2048 });
	if (!raw) {
		throw new Error('Empty response from model');
	}
	return { explanation: raw };
}
