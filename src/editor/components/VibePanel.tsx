// =============================================
// Vibe Panel - Ask (explain) and Build (generate nodes)
// =============================================

import { useState, useEffect } from 'react';
import { Paper, Textarea, Button, Text, Collapse, TextInput, Select, SegmentedControl, ScrollArea } from '@mantine/core';

const API_KEY_STORAGE_KEY = 'spellcompiler-vibe-api-key';
const PROVIDER_STORAGE_KEY = 'spellcompiler-vibe-provider';
const MODE_STORAGE_KEY = 'spellcompiler-vibe-mode';

// Allowlist is best-effort (not all keys use these formats); unknown-format keys still pass through with fallback cleanup.
const KEY_PATTERN = /(sk-ant-[a-zA-Z0-9_-]+|gsk_[a-zA-Z0-9_-]+|sk-[a-zA-Z0-9_-]+)/;
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
	const out = allowMatch ? allowMatch[1] : (() => {
		let fallback = s;
		for (const re of TRAILING_KEY_JUNK) {
			fallback = fallback.replace(re, '').trim();
		}
		return fallback;
	})();
	if (out !== s && typeof console !== 'undefined' && console.warn) {
		console.warn('[Vibe] API key was cleaned (allowlist extract or trailing junk removed).', { beforeLength: s.length, afterLength: out.length });
	}
	return out;
}

export type VibeProvider = 'openai' | 'anthropic' | 'deepseek' | 'kimi' | 'groq';

export type VibeMode = 'ask' | 'build';

export type VibePanelProps = {
	mode?: VibeMode;
	onGenerate: (text: string, apiKey?: string, provider?: VibeProvider) => Promise<{ nodes: unknown[]; edges: unknown[] }>;
	onApplyFlow: (nodes: unknown[], edges: unknown[]) => void;
	onAsk?: (text: string, apiKey?: string, provider?: VibeProvider) => Promise<{ explanation: string }>;
	disabled?: boolean;
};

const PROVIDER_OPTIONS = [
	{ value: 'openai', label: 'OpenAI (GPT)' },
	{ value: 'groq', label: 'Groq (free tier)' },
	{ value: 'anthropic', label: 'Anthropic (Claude)' },
	{ value: 'deepseek', label: 'DeepSeek' },
	{ value: 'kimi', label: 'Kimi (Moonshot)' },
] as const;

export function VibePanel({ onGenerate, onApplyFlow, onAsk, disabled }: VibePanelProps) {
	const [mode, setMode] = useState<VibeMode>('build');
	const [text, setText] = useState('');
	const [apiKey, setApiKey] = useState('');
	const [provider, setProvider] = useState<VibeProvider>('openai');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [open, setOpen] = useState(true);
	const [explanation, setExplanation] = useState<string | null>(null);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(API_KEY_STORAGE_KEY);
			if (raw) {
				const cleaned = sanitizeApiKey(raw);
				setApiKey(cleaned);
				if (cleaned !== raw) {
					localStorage.setItem(API_KEY_STORAGE_KEY, cleaned);
				}
			}
			const storedProvider = localStorage.getItem(PROVIDER_STORAGE_KEY) as VibeProvider | null;
			if (storedProvider === 'openai' || storedProvider === 'anthropic' || storedProvider === 'deepseek' || storedProvider === 'kimi' || storedProvider === 'groq') setProvider(storedProvider);
			const storedMode = localStorage.getItem(MODE_STORAGE_KEY) as VibeMode | null;
			if (storedMode === 'ask' || storedMode === 'build') setMode(storedMode);
		} catch {
			// ignore
		}
	}, []);

	const saveApiKey = (value: string) => {
		setApiKey(value);
		try {
			if (value) localStorage.setItem(API_KEY_STORAGE_KEY, value);
			else localStorage.removeItem(API_KEY_STORAGE_KEY);
		} catch {
			// ignore
		}
	};

	const saveProvider = (value: string) => {
		const p = value as VibeProvider;
		if (p === 'openai' || p === 'anthropic' || p === 'deepseek' || p === 'kimi' || p === 'groq') {
			setProvider(p);
			try {
				localStorage.setItem(PROVIDER_STORAGE_KEY, p);
			} catch {
				// ignore
			}
		}
	};

	const saveMode = (value: VibeMode) => {
		setMode(value);
		setExplanation(null);
		setError(null);
		try {
			localStorage.setItem(MODE_STORAGE_KEY, value);
		} catch {
			// ignore
		}
	};

	const handleBuild = async () => {
		const trimmed = text.trim();
		if (!trimmed) return;
		const key = sanitizeApiKey(apiKey);
		if (!key) {
			setError('Please enter your API key.');
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const { nodes, edges } = await onGenerate(trimmed, key, provider);
			onApplyFlow(nodes, edges);
			setText('');
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	};

	const handleAsk = async () => {
		const trimmed = text.trim();
		if (!trimmed || !onAsk) return;
		const key = sanitizeApiKey(apiKey);
		if (!key) {
			setError('Please enter your API key.');
			return;
		}
		setError(null);
		setExplanation(null);
		setLoading(true);
		try {
			const { explanation: result } = await onAsk(trimmed, key, provider);
			setExplanation(result);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	};

	return (
		<Paper p="sm" shadow="sm" withBorder className="flex flex-col gap-2 h-full overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex items-center justify-between w-full text-left font-semibold text-sm"
			>
				<span>Vibe coding</span>
				<span aria-hidden>{open ? '▼' : '▶'}</span>
			</button>
			<Collapse in={open} className="flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
				<Select
					label="Provider"
					size="xs"
					data={PROVIDER_OPTIONS}
					value={provider}
					onChange={(v) => v && saveProvider(v)}
					disabled={disabled}
				/>
				<TextInput
					type="password"
					placeholder="Paste key only (no URL or trailing text)"
					value={apiKey}
					onChange={(e) => saveApiKey(e.currentTarget.value)}
					size="xs"
					disabled={disabled}
					label="API Key"
					description="Key is cleaned on save and send (trailing 'web/', 'ance', etc. removed). If auth still fails, re-paste the key from the provider."
				/>
				<SegmentedControl
					size="xs"
					value={mode}
					onChange={(v) => saveMode(v as VibeMode)}
					data={[
						{ label: 'Ask', value: 'ask' },
						{ label: 'Build', value: 'build' },
					]}
					disabled={disabled}
				/>
				{mode === 'build' ? (
					<>
						<Textarea
							placeholder="Describe what the spell should do... e.g. return 42, or if state then move player left else do nothing"
							value={text}
							onChange={(e) => setText(e.currentTarget.value)}
							minRows={3}
							disabled={disabled}
							className="flex-1 min-h-0"
						/>
						<Button
							size="xs"
							variant="light"
							onClick={handleBuild}
							loading={loading}
							disabled={!text.trim() || !apiKey.trim() || disabled}
						>
							Generate
						</Button>
					</>
				) : (
					<>
						<Textarea
							placeholder="Ask about the current graph... e.g. What does this spell do? Explain the flow."
							value={text}
							onChange={(e) => setText(e.currentTarget.value)}
							minRows={2}
							disabled={disabled}
						/>
						<Button
							size="xs"
							variant="light"
							onClick={handleAsk}
							loading={loading}
							disabled={!text.trim() || !apiKey.trim() || !onAsk || disabled}
						>
							Ask
						</Button>
						{explanation !== null && (
							<ScrollArea className="flex-1 min-h-0" type="auto" offsetScrollbars>
								<Text size="xs" className="whitespace-pre-wrap p-2 rounded bg-gray-100">
									{explanation}
								</Text>
							</ScrollArea>
						)}
					</>
				)}
				{error && (
					<Text size="xs" c="red">
						{error}
					</Text>
				)}
			</Collapse>
		</Paper>
	);
}
