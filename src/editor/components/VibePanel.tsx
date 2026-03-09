// =============================================
// Vibe Panel - Ask (explain) and Build (generate nodes) via OpenRouter
// =============================================

import { useState, useEffect } from 'react';
import { Paper, Textarea, Button, Text, Collapse, TextInput, Select, SegmentedControl, ScrollArea, Tooltip } from '@mantine/core';
import { OPENROUTER_MODELS, MOCK_MODEL_ID } from '../../lib/vibe/vibeApi';
import { COMPLETE_SPELL_INSTRUCTION } from '../../lib/vibe/vibePrompt';

const API_KEY_STORAGE_KEY = 'spellcompiler-openrouter-api-key';
const MODEL_STORAGE_KEY = 'spellcompiler-openrouter-model';
const MODE_STORAGE_KEY = 'spellcompiler-vibe-mode';

function sanitizeApiKey(key: string): string {
	return key.trim().replace(/\s*\/?\s*$/i, '').trim();
}

export type VibeMode = 'ask' | 'build';

export type VibePanelProps = {
	mode?: VibeMode;
	onGenerate: (text: string, apiKey?: string, model?: string) => Promise<{
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
	/** Whether the canvas already has nodes — enables the "Complete Spell" quick action */
	hasExistingNodes?: boolean;
};

const MODEL_OPTIONS = OPENROUTER_MODELS.map((m) => ({ value: m.value, label: m.label }));

export function VibePanel({ onGenerate, onApplyFlow, onAsk, disabled, hasExistingNodes }: VibePanelProps) {
	const [mode, setMode] = useState<VibeMode>('build');
	const [text, setText] = useState('');
	const [apiKey, setApiKey] = useState('');
	const [model, setModel] = useState<string>('openai/gpt-4o-mini');
	const [loading, setLoading] = useState(false);
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

	useEffect(() => {
		console.warn('[Vibe] Panel ready. Click Generate and watch for [Vibe] logs here.');
	}, []);

	/** Shared submit logic — accepts explicit instruction text so Complete can bypass the textarea. */
	const submitBuild = async (instruction: string, opts?: { isComplete?: boolean }) => {
		const isComplete = opts?.isComplete ?? false;
		// Mock model can't actually wire connections — inform the user
		if (isComplete && useMock) {
			setError('Complete Spell needs a real AI model to wire connections. Select an OpenRouter model and enter your API key at openrouter.ai/keys.');
			setSuccessMsg(null);
			setSummaryMsg(null);
			return;
		}
		if (!useMock && !sanitizeApiKey(apiKey)) {
			setError('Please enter your API key (or choose Mock for testing without API).');
			return;
		}
		setError(null);
		setSuccessMsg(null);
		setSummaryMsg(null);
		setLoading(true);
		try {
			const result = await onGenerate(instruction, useMock ? '' : sanitizeApiKey(apiKey), model);
			onApplyFlow(result.nodes, result.edges, result.wasUpdate ? { replace: true } : undefined);
			// Compute diff for the success headline
			const addedNodes = result.nodes.length - (result.prevNodeCount ?? 0);
			const addedEdges = result.edges.length - (result.prevEdgeCount ?? 0);
			if (isComplete) {
				const parts: string[] = [];
				if (addedNodes > 0) parts.push(`+${addedNodes} node${addedNodes !== 1 ? 's' : ''}`);
				if (addedEdges > 0) parts.push(`+${addedEdges} edge${addedEdges !== 1 ? 's' : ''}`);
				setSuccessMsg(`✓ Spell completed!${parts.length > 0 ? ' ' + parts.join(', ') : ''}`);
			} else {
				setSuccessMsg(`✓ Applied: ${result.nodes.length} node${result.nodes.length !== 1 ? 's' : ''}, ${result.edges.length} edge${result.edges.length !== 1 ? 's' : ''}`);
			}
			// Show AI-provided explanation if available
			if (result.summary) setSummaryMsg(result.summary);
		} catch (e) {
			console.error('[Vibe] Build failed', e);
			const msg = e instanceof Error ? e.message : String(e);
			setError(msg + ' (See F12 Console for details.)');
		} finally {
			setLoading(false);
		}
	};

	const handleBuild = async () => {
		const trimmed = text.trim();
		if (!trimmed) return;
		await submitBuild(trimmed);
		setText('');
	};

	/** One-click "Complete Spell" — wires up missing connections using existing nodes only. */
	const handleComplete = async () => {
		await submitBuild(COMPLETE_SPELL_INSTRUCTION, { isComplete: true });
	};

	const handleAsk = async () => {
		const trimmed = text.trim();
		if (!trimmed || !onAsk) return;
		if (!useMock && !sanitizeApiKey(apiKey)) {
			setError('Please enter your API key (or choose Mock for testing without API).');
			return;
		}
		setError(null);
		setSuccessMsg(null);
		setSummaryMsg(null);
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

	const canSubmit = !disabled && !loading && (useMock || !!sanitizeApiKey(apiKey));

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
						{/* ── Quick action: complete existing spell ── */}
						{hasExistingNodes && (
							<Tooltip
								label="Analyses the current nodes, detects missing connections, and wires them up automatically. No new nodes are created."
								position="left"
								multiline
								w={240}
								withArrow
							>
								<Button
									size="xs"
									variant="filled"
									color="teal"
									onClick={handleComplete}
									loading={loading}
									disabled={!canSubmit}
									fullWidth
								>
									✓ Complete Spell
								</Button>
							</Tooltip>
						)}

						<Textarea
							placeholder={
								hasExistingNodes
									? 'Modify the spell... e.g. "also heal the player after attacking" or "change damage to 50"'
									: 'Describe what the spell should do... e.g. "move player left by 80 pixels"'
							}
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
							disabled={!text.trim() || !canSubmit}
						>
							{hasExistingNodes ? 'Modify' : 'Generate'}
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
				{!error && successMsg && (
					<Text size="xs" c="teal" fw={500}>
						{successMsg}
					</Text>
				)}
				{!error && summaryMsg && (
					<div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 10px' }}>
						<Text size="xs" fw={600} style={{ color: '#15803d', marginBottom: 4 }}>✨ 法术效果</Text>
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
