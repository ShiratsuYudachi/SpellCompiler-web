/**
 * Vibe API proxy — avoids CORS when the frontend calls DeepSeek/OpenAI/Anthropic etc.
 * Run: npm run dev:server (and keep the Vite dev server running).
 */
import express from 'express';
import cors from 'cors';
import { buildVibePrompt, buildAskPrompt } from '../src/lib/vibe/vibePrompt';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

type ProviderId = 'openai' | 'anthropic' | 'deepseek' | 'kimi' | 'groq';

const PROVIDER_CONFIG: Record<
	ProviderId,
	{ type: 'openai'; baseURL: string; model: string } | { type: 'anthropic'; model: string }
> = {
	openai: { type: 'openai', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
	groq: { type: 'openai', baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
	deepseek: { type: 'openai', baseURL: 'https://api.deepseek.com', model: 'deepseek-chat' },
	kimi: { type: 'openai', baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
	anthropic: { type: 'anthropic', model: 'claude-3-5-haiku-20241022' },
};

function normalizeProvider(v: unknown): ProviderId {
	if (typeof v === 'string' && v in PROVIDER_CONFIG) return v as ProviderId;
	return 'openai';
}

function extractJsonFromRaw(raw: string): string {
	let s = raw.trim();
	const m = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/);
	if (m) s = m[1].trim();
	return s;
}

async function callOpenAI(
	baseURL: string,
	model: string,
	apiKey: string,
	system: string,
	user: string,
	opts: { temperature?: number; maxTokens?: number }
): Promise<string> {
	const url = `${baseURL.replace(/\/$/, '')}/chat/completions`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
		body: JSON.stringify({
			model,
			messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
			temperature: opts.temperature ?? 0.2,
			max_tokens: opts.maxTokens ?? 4096,
		}),
	});
	const data = (await res.json().catch(() => ({}))) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
	if (!res.ok) {
		const msg = data?.error?.message ?? `Request failed: ${res.status}`;
		throw new Error(msg);
	}
	return data?.choices?.[0]?.message?.content?.trim() ?? '';
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string, maxTokens: number): Promise<string> {
	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
	});
	const data = (await res.json().catch(() => ({}))) as { content?: Array<{ type: string; text?: string }>; error?: { message?: string } };
	if (!res.ok) throw new Error(data?.error?.message ?? `Request failed: ${res.status}`);
	const block = data?.content?.find((b) => b.type === 'text');
	return block?.type === 'text' ? (block.text?.trim() ?? '') : '';
}

async function callLLM(
	provider: ProviderId,
	apiKey: string,
	system: string,
	user: string,
	opts: { temperature?: number; maxTokens?: number }
): Promise<string> {
	const config = PROVIDER_CONFIG[provider];
	if (config.type === 'anthropic') {
		return callAnthropic(apiKey, config.model, system, user, opts.maxTokens ?? 4096);
	}
	return callOpenAI(config.baseURL, config.model, apiKey, system, user, opts);
}

app.post('/api/vibe', async (req, res) => {
	const { text, apiKey: bodyKey, provider: bodyProvider, mode, nodes: bodyNodes, edges: bodyEdges } = req.body;
	const provider = normalizeProvider(bodyProvider);
	const apiKey = typeof bodyKey === 'string' && bodyKey.trim() ? bodyKey.trim() : null;

	if (!apiKey) {
		res.status(400).json({ error: 'API key is required. Enter it in the Vibe panel.' });
		return;
	}
	if (typeof text !== 'string' || !text.trim()) {
		res.status(400).json({ error: 'Request body must include a non-empty "text" string.' });
		return;
	}

	try {
		if (mode === 'ask') {
			const nodes = Array.isArray(bodyNodes) ? bodyNodes : [];
			const edges = Array.isArray(bodyEdges) ? bodyEdges : [];
			const userContent = buildAskPrompt(text.trim(), nodes, edges);
			const system = "You explain visual programming graphs in plain English. Answer the user's question. Do not output JSON.";
			const raw = await callLLM(provider, apiKey, system, userContent, { temperature: 0.3, maxTokens: 2048 });
			if (!raw) {
				res.status(502).json({ error: 'Empty response from model.' });
				return;
			}
			res.json({ explanation: raw });
			return;
		}

		// Build
		const hasGraph = Array.isArray(bodyNodes) && Array.isArray(bodyEdges) && (bodyNodes.length > 0 || bodyEdges.length > 0);
		const prompt = buildVibePrompt(text.trim(), hasGraph ? { nodes: bodyNodes, edges: bodyEdges } : undefined);
		const system = 'You output only valid JSON with keys "nodes" and "edges". No other text.';
		const raw = await callLLM(provider, apiKey, system, prompt, { temperature: 0.2, maxTokens: 4096 });
		if (!raw) {
			res.status(502).json({ error: 'Empty response from model.' });
			return;
		}
		const jsonStr = extractJsonFromRaw(raw);
		const parsed = JSON.parse(jsonStr) as { nodes?: unknown[]; edges?: unknown[] };
		if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
			res.status(502).json({ error: 'Response must contain "nodes" and "edges" arrays.' });
			return;
		}
		if (parsed.nodes.length === 0 && hasGraph) {
			res.status(502).json({ error: 'Model returned an empty graph. Try rephrasing your request.' });
			return;
		}
		res.json({ nodes: parsed.nodes, edges: parsed.edges });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[vibe]', message);
		if (message.includes('402') || message.includes('Insufficient')) {
			res.status(402).json({ error: 'Insufficient balance. Please top up your API account.' });
			return;
		}
		if (message.includes('429') || message.toLowerCase().includes('rate limit')) {
			res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
			return;
		}
		res.status(500).json({ error: message });
	}
});

const PORT = Number(process.env.VIBE_PORT) || 3002;
app.listen(PORT, () => {
	console.log(`[vibe] Proxy listening on http://localhost:${PORT} — use from frontend via /api (Vite proxy).`);
});
