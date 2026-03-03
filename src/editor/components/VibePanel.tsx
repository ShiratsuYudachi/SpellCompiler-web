// =============================================
// Vibe Panel - Ask (explain) and Build (generate nodes) via OpenRouter
// =============================================

import { useState, useEffect } from 'react';
import { Paper, Textarea, Button, Text, Collapse, TextInput, Select, SegmentedControl, ScrollArea } from '@mantine/core';
import { OPENROUTER_MODELS, MOCK_MODEL_ID } from '../../lib/vibe/vibeApi';

const API_KEY_STORAGE_KEY = 'spellcompiler-openrouter-api-key';
const MODEL_STORAGE_KEY = 'spellcompiler-openrouter-model';
const MODE_STORAGE_KEY = 'spellcompiler-vibe-mode';

function sanitizeApiKey(key: string): string {
	return key.trim().replace(/\s*\/?\s*$/i, '').trim();
}

export type VibeMode = 'ask' | 'build';

export type VibePanelProps = {
	mode?: VibeMode;
	onGenerate: (text: string, apiKey?: string, model?: string) => Promise<{ nodes: unknown[]; edges: unknown[]; wasUpdate?: boolean }>;
	onApplyFlow: (nodes: unknown[], edges: unknown[], options?: { replace?: boolean }) => void;
	onAsk?: (text: string, apiKey?: string, model?: string) => Promise<{ explanation: string }>;
	disabled?: boolean;
};

const MODEL_OPTIONS = OPENROUTER_MODELS.map((m) => ({ value: m.value, label: m.label }));

export function VibePanel({ onGenerate, onApplyFlow, onAsk, disabled }: VibePanelProps) {
	const [mode, setMode] = useState<VibeMode>('build');
	const [text, setText] = useState('');
	const [apiKey, setApiKey] = useState('');
	const [model, setModel] = useState<string>('openai/gpt-4o-mini');
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
			const storedModel = localStorage.getItem(MODEL_STORAGE_KEY);
			if (storedModel) setModel(storedModel);
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

	const saveModel = (value: string | null) => {
		if (value) {
			setModel(value);
			try {
				localStorage.setItem(MODEL_STORAGE_KEY, value);
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

	const useMock = model === MOCK_MODEL_ID;

	const handleBuild = async () => {
		const trimmed = text.trim();
		if (!trimmed) return;
		if (!useMock && !sanitizeApiKey(apiKey)) {
			setError('Please enter your API key (or choose Mock for testing without API).');
			return;
		}
		setError(null);
		setLoading(true);
		try {
			const result = await onGenerate(trimmed, useMock ? '' : sanitizeApiKey(apiKey), model);
			onApplyFlow(result.nodes, result.edges, result.wasUpdate ? { replace: true } : undefined);
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
		if (!useMock && !sanitizeApiKey(apiKey)) {
			setError('Please enter your API key (or choose Mock for testing without API).');
			return;
		}
		setError(null);
		setExplanation(null);
		setLoading(true);
		try {
			const { explanation: result } = await onAsk(trimmed, useMock ? '' : sanitizeApiKey(apiKey), model);
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
					label="Model"
					description={useMock ? 'Mock: no API key needed. Use to test Ask/Build without spending credits.' : 'OpenRouter model. Get a key at openrouter.ai/keys'}
					size="xs"
					data={MODEL_OPTIONS}
					value={model}
					onChange={saveModel}
					disabled={disabled}
					searchable
					allowDeselect={false}
				/>
				<TextInput
					type="password"
					placeholder="OpenRouter API key"
					value={apiKey}
					onChange={(e) => saveApiKey(e.currentTarget.value)}
					size="xs"
					disabled={disabled}
					label="OpenRouter API Key"
					description="Key is stored locally. Get one at openrouter.ai/keys"
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
							disabled={!text.trim() || (!useMock && !apiKey.trim()) || disabled}
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
							disabled={!text.trim() || (!useMock && !apiKey.trim()) || !onAsk || disabled}
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
