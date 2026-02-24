/**
 * Pure front-end Vibe API: call LLM providers from the browser.
 * No server required; API key is sent from the client to the provider.
 */

import { buildVibePrompt, buildAskPrompt } from './vibePrompt';

export type VibeProviderId = 'openai' | 'anthropic' | 'deepseek' | 'kimi' | 'groq';

type OpenAIConfig = { type: 'openai'; baseURL: string; model: string };
type AnthropicConfig = { type: 'anthropic'; model: string };

const PROVIDER_CONFIG: Record<VibeProviderId, OpenAIConfig | AnthropicConfig> = {
	openai: { type: 'openai', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
	groq: { type: 'openai', baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
	deepseek: { type: 'openai', baseURL: 'https://api.deepseek.com', model: 'deepseek-chat' },
	kimi: { type: 'openai', baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
	anthropic: { type: 'anthropic', model: 'claude-3-5-haiku-20241022' },
};

function normalizeProvider(v: unknown): VibeProviderId {
	if (typeof v === 'string' && v in PROVIDER_CONFIG) return v as VibeProviderId;
	return 'openai';
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
		return 'Insufficient balance. Please top up your API account and try again.';
	}
	if (res.status === 429 || (typeof msg === 'string' && msg.toLowerCase().includes('rate limit'))) {
		return 'Rate limit exceeded. Please wait a moment and try again.';
	}
	return typeof msg === 'string' ? msg : `Request failed: ${res.status}`;
}

async function callOpenAI(
	baseURL: string,
	model: string,
	apiKey: string,
	systemPrompt: string,
	userContent: string,
	opts: { temperature?: number; maxTokens?: number }
): Promise<string> {
	const url = `${baseURL.replace(/\/$/, '')}/chat/completions`;
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
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

async function callAnthropic(
	apiKey: string,
	model: string,
	systemPrompt: string,
	userContent: string,
	opts: { maxTokens?: number }
): Promise<string> {
	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({
			model,
			max_tokens: opts.maxTokens ?? 4096,
			system: systemPrompt,
			messages: [{ role: 'user', content: userContent }],
		}),
	});
	const data = (await res.json().catch(() => ({}))) as {
		content?: Array<{ type: string; text?: string }>;
		error?: { message?: string };
	};
	if (!res.ok) {
		throw new Error(mapResponseError(res, data));
	}
	const block = data.content?.find((b) => b.type === 'text');
	const text = block?.type === 'text' ? block.text?.trim() ?? '' : '';
	return text;
}

async function callLLM(
	provider: VibeProviderId,
	apiKey: string,
	systemPrompt: string,
	userContent: string,
	opts: { temperature?: number; maxTokens?: number }
): Promise<string> {
	const config = PROVIDER_CONFIG[provider];
	if (config.type === 'anthropic') {
		return callAnthropic(apiKey, config.model, systemPrompt, userContent, { maxTokens: opts.maxTokens });
	}
	return callOpenAI(
		config.baseURL,
		config.model,
		apiKey,
		systemPrompt,
		userContent,
		{ temperature: opts.temperature, maxTokens: opts.maxTokens }
	);
}

/** Build mode: generate nodes and edges from natural language. */
export async function vibeBuild(
	text: string,
	apiKey: string,
	provider?: VibeProviderId
): Promise<{ nodes: unknown[]; edges: unknown[] }> {
	const p = normalizeProvider(provider);
	const prompt = buildVibePrompt(text.trim());
	const systemPrompt = 'You output only valid JSON with keys "nodes" and "edges". No other text.';
	let raw: string;
	try {
		raw = await callLLM(p, apiKey, systemPrompt, prompt, { temperature: 0.2, maxTokens: 4096 });
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
	return { nodes: parsed.nodes, edges: parsed.edges };
}

/** Ask mode: explain the current graph. */
export async function vibeAsk(
	question: string,
	nodes: unknown[],
	edges: unknown[],
	apiKey: string,
	provider?: VibeProviderId
): Promise<{ explanation: string }> {
	const p = normalizeProvider(provider);
	const userContent = buildAskPrompt(question.trim(), nodes, edges);
	const systemPrompt = "You explain visual programming graphs in plain English. Answer the user's question about their graph clearly and concisely. Do not output code or JSON unless asked.";
	const raw = await callLLM(p, apiKey, systemPrompt, userContent, { temperature: 0.3, maxTokens: 2048 });
	if (!raw) {
		throw new Error('Empty response from model');
	}
	return { explanation: raw };
}
