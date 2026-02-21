import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { buildVibePrompt } from './buildVibePrompt';

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Provider config: add new OpenAI-compatible providers here (or Anthropic).
// All supported providers use API keys that are alphanumeric/hyphen (e.g. sk-...)
// and do not end with English words or URL path segments.
// ---------------------------------------------------------------------------

type ProviderId = 'openai' | 'anthropic' | 'deepseek' | 'kimi' | 'groq';

const PROVIDER_CONFIG: Record<
	ProviderId,
	{ envKey: string; type: 'openai'; baseURL: string; model: string } | { envKey: string; type: 'anthropic'; model: string }
> = {
	openai:   { type: 'openai', envKey: 'OPENAI_API_KEY',   baseURL: '',                    model: 'gpt-4o-mini' },
	groq:     { type: 'openai', envKey: 'GROQ_API_KEY',     baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.1-8b-instant' },
	deepseek: { type: 'openai', envKey: 'DEEPSEEK_API_KEY', baseURL: 'https://api.deepseek.com',       model: 'deepseek-chat' },
	kimi:     { type: 'openai', envKey: 'KIMI_API_KEY',     baseURL: 'https://api.moonshot.cn/v1',     model: 'moonshot-v1-8k' },
	anthropic:{ type: 'anthropic', envKey: 'ANTHROPIC_API_KEY', model: 'claude-3-5-haiku-20241022' },
};

function normalizeProvider(v: unknown): ProviderId {
	if (typeof v === 'string' && v in PROVIDER_CONFIG) return v as ProviderId;
	return 'openai';
}

// ---------------------------------------------------------------------------
// API key sanitization: we cannot know all possible "junk" users might paste.
// We also cannot assume all API keys match a known format (providers change;
// new providers may use other prefixes or no prefix).
//
// Strategy:
// - If the input contains a substring matching a known key format (allowlist),
//   use only that substring so any unknown junk before/after is dropped.
// - If no pattern matches, do NOT discard the key: only trim and strip
//   observed trailing junk (fallback). Keys with unknown or future formats
//   still work; we just cannot strip unknown junk in that case.
// Keep TRAILING_KEY_JUNK in sync with the frontend (VibePanel).
// ---------------------------------------------------------------------------

/** Known key formats (OpenAI sk-/sk-proj-, Anthropic sk-ant-, Groq gsk_, etc.). Not exhaustive. */
const KEY_PATTERN = /(sk-ant-[a-zA-Z0-9_-]+|gsk_[a-zA-Z0-9_-]+|sk-[a-zA-Z0-9_-]+)/;

/** Fallback when no key pattern matches: strip only these trailing fragments. Keep in sync with frontend. */
const TRAILING_KEY_JUNK: RegExp[] = [
	/\s*\/?web\/?\s*$/i,
	/\s*ance\s*$/i,
	/\s*balance\s*$/i,
	/\s*insufficient\s*$/i,
	/\s*invalid\s*$/i,
	/\s*key\s*$/i,
	/\/+\s*$/,
];

function sanitizeApiKey(key: string): string {
	const s = key.trim();
	const allowMatch = s.match(KEY_PATTERN);
	if (allowMatch) return allowMatch[1];
	let out = s;
	for (const re of TRAILING_KEY_JUNK) {
		out = out.replace(re, '').trim();
	}
	return out;
}

// ---------------------------------------------------------------------------

function extractJsonFromRaw(raw: string): string {
	let jsonStr = raw.trim();
	const codeMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)```$/);
	if (codeMatch) jsonStr = codeMatch[1].trim();
	return jsonStr;
}

type VibeMode = 'ask' | 'build';

function buildAskPrompt(question: string, nodes: unknown[], edges: unknown[]): string {
	const graphSummary = JSON.stringify({ nodes, edges }, null, 0);
	return `The user has a visual "Spell" graph (node-based editor). Here is the current graph as JSON:\n\n${graphSummary}\n\nUser question: ${question}\n\nProvide a clear, concise explanation in plain English. Do not output JSON.`;
}

async function callLLM(
	provider: ProviderId,
	apiKey: string,
	systemPrompt: string,
	userContent: string,
	opts: { temperature?: number; maxTokens?: number }
): Promise<string> {
	const config = PROVIDER_CONFIG[provider];

	if (config.type === 'anthropic') {
		const anthropic = new Anthropic({ apiKey });
		const msg = await anthropic.messages.create({
			model: config.model,
			max_tokens: opts.maxTokens ?? 4096,
			system: systemPrompt,
			messages: [{ role: 'user', content: userContent }],
		});
		const block = msg.content.find((b) => b.type === 'text');
		return block && block.type === 'text' ? block.text : '';
	}

	const openai = new OpenAI({
		apiKey,
		...(config.baseURL && { baseURL: config.baseURL }),
	});
	const completion = await openai.chat.completions.create({
		model: config.model,
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userContent },
		],
		temperature: opts.temperature ?? 0.2,
	});
	return completion.choices[0]?.message?.content?.trim() ?? '';
}

app.post('/api/vibe', async (req, res) => {
	const { text, apiKey: bodyApiKey, provider: bodyProvider, mode: bodyMode, nodes: bodyNodes, edges: bodyEdges } = req.body;
	const mode: VibeMode = bodyMode === 'ask' ? 'ask' : 'build';
	const provider = normalizeProvider(bodyProvider);
	const config = PROVIDER_CONFIG[provider];
	const envKey = process.env[config.envKey];
	const apiKey = (typeof bodyApiKey === 'string' && bodyApiKey.trim())
		? sanitizeApiKey(bodyApiKey)
		: envKey;

	if (!apiKey) {
		res.status(400).json({
			error: `API key is required. Enter it in the Vibe panel or set ${config.envKey} on the server.`,
		});
		return;
	}

	if (typeof text !== 'string' || !text.trim()) {
		res.status(400).json({ error: 'Request body must include a non-empty "text" string' });
		return;
	}

	try {
		if (mode === 'ask') {
			const nodes = Array.isArray(bodyNodes) ? bodyNodes : [];
			const edges = Array.isArray(bodyEdges) ? bodyEdges : [];
			const askPrompt = buildAskPrompt(text.trim(), nodes, edges);
			const systemPrompt = 'You explain visual programming graphs in plain English. Answer the user\'s question about their graph clearly and concisely. Do not output code or JSON unless asked.';
			const raw = await callLLM(provider, apiKey, systemPrompt, askPrompt, { temperature: 0.3, maxTokens: 2048 });
			if (!raw) {
				res.status(502).json({ error: 'Empty response from model' });
				return;
			}
			res.json({ explanation: raw });
			return;
		}

		// Build mode
		const prompt = buildVibePrompt(text.trim());
		const systemPrompt = 'You output only valid JSON with keys "nodes" and "edges". No other text.';
		const raw = await callLLM(provider, apiKey, systemPrompt, prompt, { temperature: 0.2, maxTokens: 4096 });

		if (!raw) {
			res.status(502).json({ error: 'Empty response from model' });
			return;
		}

		const jsonStr = extractJsonFromRaw(raw);
		const parsed = JSON.parse(jsonStr) as { nodes?: unknown[]; edges?: unknown[] };
		if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
			res.status(502).json({ error: 'Response must contain "nodes" and "edges" arrays' });
			return;
		}

		res.json({ nodes: parsed.nodes, edges: parsed.edges });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error('[vibe] Error:', message);
		if (message.includes('JSON')) {
			res.status(502).json({ error: 'Model did not return valid JSON. Try rephrasing.' });
			return;
		}
		if (message.includes('402') || message.includes('Insufficient Balance')) {
			res.status(402).json({
				error: 'Insufficient balance. Please top up your API account and try again.',
			});
			return;
		}
		if (message.includes('429') || message.includes('rate limit')) {
			res.status(429).json({
				error: 'Rate limit exceeded. Please wait a moment and try again.',
			});
			return;
		}
		res.status(500).json({ error: message });
	}
});

const PORT = Number(process.env.VIBE_PORT) || 3002;
app.listen(PORT, () => {
	console.log(`[vibe] Server listening on http://localhost:${PORT}`);
});
