import { useState, useEffect } from 'react';
import { Paper, Textarea, Button, Text, Collapse, TextInput, Select, SegmentedControl, ScrollArea, Tooltip } from '@mantine/core';
import { vibeBuild, vibeAsk, MOCK_MODEL_ID, OPENROUTER_MODELS, type LevelContext } from '../../lib/vibe/vibeApi';
import { EditorColors, PIXEL_FONT } from '../utils/EditorTheme';
import { FULL_REGEN_INSTRUCTION } from '../../lib/vibe/vibePrompt';

export type VibeMode = 'ask' | 'build';

const API_KEY_STORAGE_KEY = 'spellcompiler-openrouter-api-key';
const MODEL_STORAGE_KEY = 'spellcompiler-openrouter-model';
const MODE_STORAGE_KEY = 'spellcompiler-vibe-mode';

function sanitizeApiKey(key: string): string {
	return key.trim().replace(/\s*\/?\s*$/i, '').trim();
}

export type VibePanelProps = {
	mode?: VibeMode;
	onGenerate: (text: string, apiKey?: string, model?: string, options?: { isFullRegen?: boolean }) => Promise<{
		nodes: unknown[];
		edges: unknown[];
		wasUpdate?: boolean;
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
	const [askText, setAskText] = useState('');
	const [buildText, setBuildText] = useState('');
	const [apiKey, setApiKey] = useState('');
	const [model, setModel] = useState<string>('openai/gpt-4o-mini');
	const [askLoading, setAskLoading] = useState(false);
	const [modifyLoading, setModifyLoading] = useState(false);
	const [regenLoading, setRegenLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [summaryMsg, setSummaryMsg] = useState<string | null>(null);
	const [elapsedMs, setElapsedMs] = useState<number | null>(null);
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
		setElapsedMs(null);
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
		setElapsedMs(null);
		setRegenLoading(true);
		const t0Regen = Date.now();
		try {
			const result = await onGenerate(
				FULL_REGEN_INSTRUCTION,
				sanitizeApiKey(apiKey),
				model,
				{ isFullRegen: true }
			);
			setElapsedMs(Date.now() - t0Regen);
			onApplyFlow(result.nodes, result.edges, result.wasUpdate ? { replace: true } : undefined);
			setSuccessMsg('⚡ Spell regenerated.');
			if (result.summary) setSummaryMsg(result.summary);
		} catch (e) {
			setElapsedMs(Date.now() - t0Regen);
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

	const handleModify = async () => {
		const trimmed = buildText.trim();
		if (!trimmed) return;
		if (!useMock && !sanitizeApiKey(apiKey)) {
			setError('Please enter your API key (or choose Mock for testing without API).');
			return;
		}
		setError(null);
		setSuccessMsg(null);
		setSummaryMsg(null);
		setElapsedMs(null);
		setModifyLoading(true);
		const t0Mod = Date.now();
		try {
			const result = await onGenerate(trimmed, sanitizeApiKey(apiKey), model, { isFullRegen: false });
			setElapsedMs(Date.now() - t0Mod);
			onApplyFlow(result.nodes, result.edges, { replace: true });
			setSuccessMsg('✏️ Spell updated.');
			if (result.summary) setSummaryMsg(result.summary);
		} catch (e) {
			setElapsedMs(Date.now() - t0Mod);
			console.error('[Vibe] Modify failed', e);
			const msg = e instanceof Error ? e.message : String(e);
			setError(msg + ' (See F12 Console for details.)');
		} finally {
			setModifyLoading(false);
		}
	};

	const canUseApi = !disabled && !askLoading && !regenLoading && !modifyLoading && (useMock || !!sanitizeApiKey(apiKey));

	return (
		<Paper 
			p="sm" 
			style={{ 
				backgroundColor: 'rgba(10, 15, 20, 0.4)', 
				backdropFilter: 'blur(16px)',
				border: '1px solid rgba(255,255,255,0.08)', 
				borderRadius: 0,
				display: 'flex',
				flexDirection: 'column',
				gap: '12px',
				height: '100%',
				overflow: 'hidden',
				boxShadow: 'inset 0 0 20px rgba(0, 210, 255, 0.05), 0 20px 50px rgba(0,0,0,0.3)'
			}}
		>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					width: '100%',
					background: 'transparent',
					border: 'none',
					color: EditorColors.data.border,
					fontFamily: PIXEL_FONT,
					fontSize: '9px',
					letterSpacing: '1px',
					cursor: 'pointer',
					padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    marginBottom: 4,
					textShadow: `0 0 8px ${EditorColors.data.glow}`
				}}
			>
				<span>{open ? '▼' : '▶'} VIBE_CODING_CORE</span>
				<span style={{ opacity: 0.5, fontSize: '7px' }}>[V.02.AUTO]</span>
			</button>

			<Collapse in={open} className="flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
				<div className="flex flex-col gap-4 overflow-auto pr-1">
					<div className="flex flex-col gap-2">
						<Select
							label="NEURAL_MODEL"
							size="xs"
							data={OPENROUTER_MODELS as any}
							value={model}
							onChange={saveModel}
							disabled={disabled}
							styles={{
								input: { backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' },
								label: { color: 'rgba(255,255,255,0.4)', fontSize: '7px', letterSpacing: '1px' }
							}}
						/>
						<TextInput
							type="password"
							placeholder="AUTH_TOKEN_REQUIRED"
							value={apiKey}
							onChange={(e) => saveApiKey(e.currentTarget.value)}
							size="xs"
							disabled={disabled}
							label="ACCESS_KEY"
							styles={{
								input: { backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' },
								label: { color: 'rgba(255,255,255,0.4)', fontSize: '7px', letterSpacing: '1px' }
							}}
						/>
					</div>

					<SegmentedControl
						size="xs"
						value={mode}
						onChange={(v) => saveMode(v as VibeMode)}
						data={[
							{ label: 'ANALYZE', value: 'ask' },
							{ label: 'CONSTRUCT', value: 'build' },
						]}
						disabled={disabled}
						styles={{
							root: { backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' },
							control: { border: 'none' },
							indicator: { backgroundColor: 'rgba(255,255,255,0.05)' },
							label: { fontSize: '7px', letterSpacing: '1px' }
						}}
					/>

					{mode === 'build' ? (
						<div className="flex flex-col gap-3">
							<Textarea
								placeholder="ENTER_OBJECTIVE_INSTRUCTIONS..."
								value={buildText}
								onChange={(e) => setBuildText(e.currentTarget.value)}
								minRows={3}
								disabled={disabled}
								size="xs"
								styles={{
									input: { 
										backgroundColor: 'rgba(0,0,0,0.4)', 
										border: '1px solid rgba(255,255,255,0.1)',
										fontSize: '10px',
										lineHeight: 1.5
									}
								}}
							/>
							<div className="flex flex-col gap-2">
								<Button
									size="xs"
									variant="filled"
									onClick={handleModify}
									loading={modifyLoading}
									disabled={!buildText.trim() || !canUseApi}
									fullWidth
									style={{
										backgroundColor: EditorColors.logic.bg,
										color: EditorColors.logic.border,
										border: `1px solid ${EditorColors.logic.border}44`,
										boxShadow: `0 0 15px ${EditorColors.logic.glow}`,
										fontSize: '8px'
									}}
								>
									EXECUTE_CONSTRUCTION
								</Button>
								<Tooltip
									label="FORCE_RESET_AND_REBUILD"
									position="left"
									withArrow
								>
									<Button
										size="xs"
										variant="subtle"
										onClick={handleFullRegen}
										loading={regenLoading}
										disabled={!canUseApi}
										fullWidth
										style={{
											color: EditorColors.control.border,
											border: `1px solid ${EditorColors.control.border}22`,
											fontSize: '7px',
											letterSpacing: '1px',
											opacity: 0.8
										}}
									>
										SYSTEM_TOTAL_REGEN
									</Button>
								</Tooltip>
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							<Textarea
								placeholder="QUERY_CURRENT_LOGIC_FLOW..."
								value={askText}
								onChange={(e) => setAskText(e.currentTarget.value)}
								minRows={3}
								disabled={disabled}
								size="xs"
								styles={{
									input: { 
										backgroundColor: 'rgba(0,0,0,0.4)', 
										border: '1px solid rgba(255,255,255,0.1)',
										fontSize: '10px'
									}
								}}
							/>
							<Button
								size="xs"
								variant="subtle"
								onClick={handleAsk}
								loading={askLoading}
								disabled={!askText.trim() || (!useMock && !apiKey.trim()) || !onAsk || disabled}
								style={{
									color: EditorColors.data.border,
									border: `1px solid ${EditorColors.data.border}22`,
									fontSize: '8px'
								}}
							>
								RUN_DIAGNOSTICS
							</Button>
							{explanation !== null && (
								<ScrollArea className="flex-1 min-h-0" type="auto" offsetScrollbars style={{ height: 200 }}>
									<div style={{ 
										padding: '12px', 
										backgroundColor: 'rgba(255,255,255,0.02)', 
										border: '1px solid rgba(255,255,255,0.05)',
										color: 'rgba(255,255,255,0.85)',
										fontSize: '10px',
										lineHeight: 1.6,
										fontFamily: 'monospace'
									}}>
										{explanation}
									</div>
								</ScrollArea>
							)}
						</div>
					)}
				</div>

				<div className="mt-auto pt-4 flex flex-col gap-2 border-t border-white/5">
					{error && (
						<div style={{ padding: '8px', backgroundColor: `${EditorColors.control.border}11`, border: `1px solid ${EditorColors.control.border}33` }}>
							<Text size="xs" style={{ color: EditorColors.control.border, fontFamily: PIXEL_FONT, fontSize: '7px' }}>
								[ERR] // {error.toUpperCase()}
							</Text>
						</div>
					)}
					{!error && successMsg && (
						<div style={{ padding: '8px', backgroundColor: `${EditorColors.logic.border}11`, border: `1px solid ${EditorColors.logic.border}33` }}>
							<Text size="xs" style={{ color: EditorColors.logic.border, fontFamily: PIXEL_FONT, fontSize: '7px' }}>
								[OK] // {successMsg.toUpperCase()} {elapsedMs !== null ? `(${(elapsedMs / 1000).toFixed(1)}S)` : ""}
							</Text>
						</div>
					)}
					{!error && summaryMsg && (
						<div style={{ 
							background: 'rgba(10, 15, 20, 0.6)', 
							border: `1px solid ${EditorColors.logic.border}44`, 
							padding: '12px',
							boxShadow: `inset 0 0 10px ${EditorColors.logic.glow}`
						}}>
							<Text size="xs" style={{ color: EditorColors.logic.border, fontFamily: PIXEL_FONT, fontSize: '7px', marginBottom: 8, letterSpacing: '1px' }}>
								► ANALYSIS_COMPLETE
							</Text>
							<ScrollArea type="auto" offsetScrollbars style={{ maxHeight: 120 }}>
								<Text size="xs" style={{ color: '#ffffff', fontSize: '10px', lineHeight: 1.5, opacity: 0.85, fontFamily: 'monospace' }}>
									{summaryMsg}
								</Text>
							</ScrollArea>
						</div>
					)}
				</div>
			</Collapse>
		</Paper>
	);
}
