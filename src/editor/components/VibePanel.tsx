// =============================================
// Vibe Panel - Ask (explain) and Build (generate nodes) via OpenRouter
// =============================================

import { useState, useEffect } from 'react';
import { Paper, Textarea, Button, Text, Collapse, TextInput, Select, SegmentedControl, ScrollArea, Tooltip } from '@mantine/core';
import { OPENROUTER_MODELS, MOCK_MODEL_ID } from '../../lib/vibe/vibeApi';
import { FULL_REGEN_INSTRUCTION } from '../../lib/vibe/vibePrompt';

const API_KEY_STORAGE_KEY = 'spellcompiler-openrouter-api-key';
const MODEL_STORAGE_KEY = 'spellcompiler-openrouter-model';
const MODE_STORAGE_KEY = 'spellcompiler-vibe-mode';

function sanitizeApiKey(key: string): string {
	return key.trim().replace(/\s*\/?\s*$/i, '').trim();
}

export type VibeMode = 'ask' | 'build';

export type VibePanelProps = {
	mode?: VibeMode;
	onGenerate: (text: string, apiKey?: string, model?: string, options?: { isFullRegen?: boolean }) => Promise<{
		nodes: unknown[];
		edges: unknown[];
		wasUpdate?: boolean;
		/** Node count BEFORE this build (for computing diff in the UI) */
		prevNodeCount?: number;
		/** Edge count BEFORE this build (for computing diff in the UI) */
		prevEdgeCount?: number;
		/** Optional plain-English summary from the AI about what changed */
		summary?: string;
	}>;
	onApplyFlow: (nodes: unknown[], edges: unknown[], options?: { replace?: boolean }) => void;
	onAsk?: (text: string, apiKey?: string, model?: string) => Promise<{ explanation: string }>;
	disabled?: boolean;
};

const MODEL_OPTIONS = OPENROUTER_MODELS.map((m) => ({ value: m.value, label: m.label }));

export function VibePanel({ onGenerate, onApplyFlow, onAsk, disabled }: VibePanelProps) {
	const [mode, setMode] = useState<VibeMode>('build');
	/** Ask mode only — Build uses Full Regen without free-form text */
	const [askText, setAskText] = useState('');
	const [apiKey, setApiKey] = useState('');
	const [model, setModel] = useState<string>('openai/gpt-4o-mini');
	const [askLoading, setAskLoading] = useState(false);
	const [regenLoading, setRegenLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [summaryMsg, setSummaryMsg] = useState<string | null>(null);
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
		setSuccessMsg(null);
		setSummaryMsg(null);
		try {
			localStorage.setItem(MODE_STORAGE_KEY, value);
		} catch {
			// ignore
		}
	};

	const useMock = model === MOCK_MODEL_ID;

	const handleFullRegen = async () => {
		if (useMock) {
			setError('Full Regen needs a real AI model. Select an OpenRouter model and enter your API key at openrouter.ai/keys.');
			setSuccessMsg(null);
			setSummaryMsg(null);
			return;
		}
		if (!sanitizeApiKey(apiKey)) {
			setError('Please enter your API key (or choose Mock for testing without API).');
			return;
		}
		setError(null);
		setSuccessMsg(null);
		setSummaryMsg(null);
		setRegenLoading(true);
		try {
			const result = await onGenerate(
				FULL_REGEN_INSTRUCTION,
				sanitizeApiKey(apiKey),
				model,
				{ isFullRegen: true }
			);
			onApplyFlow(result.nodes, result.edges, result.wasUpdate ? { replace: true } : undefined);
			setSuccessMsg(`⚡ Regenerated: ${result.nodes.length} nodes, ${result.edges.length} edges`);
			if (result.summary) setSummaryMsg(result.summary);
		} catch (e) {
			console.error('[Vibe] Full Regen failed', e);
			const msg = e instanceof Error ? e.message : String(e);
			setError(msg + ' (See F12 Console for details.)');
		} finally {
			setRegenLoading(false);
		}
	};

	const handleAsk = async () => {
		const trimmed = askText.trim();
		if (!trimmed || !onAsk) return;
		if (!useMock && !sanitizeApiKey(apiKey)) {
			setError('Please enter your API key (or choose Mock for testing without API).');
			return;
		}
		setError(null);
		setSuccessMsg(null);
		setSummaryMsg(null);
		setExplanation(null);
		setAskLoading(true);
		try {
			const { explanation: result } = await onAsk(trimmed, useMock ? '' : sanitizeApiKey(apiKey), model);
			setExplanation(result);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setAskLoading(false);
		}
	};

	const canUseApi = !disabled && !askLoading && !regenLoading && (useMock || !!sanitizeApiKey(apiKey));

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
					description={useMock ? 'Mock: no API key needed. Use to test Ask / Full Regen without spending credits.' : 'OpenRouter model. Get a key at openrouter.ai/keys'}
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
					<Tooltip
						label="Discards the current graph and generates a brand-new complete spell from scratch based on the level objective."
						position="left"
						multiline
						w={240}
						withArrow
					>
						<Button
							size="xs"
							variant="filled"
							color="orange"
							onClick={handleFullRegen}
							loading={regenLoading}
							disabled={!canUseApi}
							fullWidth
						>
							⚡ Full Regen
						</Button>
					</Tooltip>
				) : (
					<>
						<Textarea
							placeholder="Ask about the current graph... e.g. What does this spell do? Explain the flow."
							value={askText}
							onChange={(e) => setAskText(e.currentTarget.value)}
							minRows={2}
							disabled={disabled}
						/>
						<Button
							size="xs"
							variant="light"
							onClick={handleAsk}
							loading={askLoading}
							disabled={!askText.trim() || (!useMock && !apiKey.trim()) || !onAsk || disabled}
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
				{!error && successMsg && (
					<Text size="xs" c="teal" fw={500}>
						{successMsg}
					</Text>
				)}
				{!error && summaryMsg && (
					<div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 10px' }}>
						<Text size="xs" fw={600} style={{ color: '#15803d', marginBottom: 4 }}>✨ Spell Effect</Text>
						<ScrollArea type="auto" offsetScrollbars style={{ maxHeight: 100 }}>
							<Text size="xs" className="whitespace-pre-wrap" style={{ color: '#166534' }}>
								{summaryMsg}
							</Text>
						</ScrollArea>
					</div>
				)}
			</Collapse>
		</Paper>
	);
}
