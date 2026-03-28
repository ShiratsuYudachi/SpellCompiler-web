import { useCallback, useState, type CSSProperties } from 'react'
import { replacePhaserScene } from '../gameInstance'
import { crispDomTextRootStyle, CSS_FONT_STACK } from '../ui/inGameTextStyle'
import { SaveManager } from '../../storage/SaveManager'
import type { SaveFileInfo } from '../../storage/types'
import { LevelProgress } from '../scenes/base/LevelProgress'
import { eventQueue } from '../events/EventQueue'

function getTimeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000)
	let interval = Math.floor(seconds / 31536000)
	if (interval > 1) return `${interval} years ago`
	if (interval === 1) return `${interval} year ago`
	interval = Math.floor(seconds / 2592000)
	if (interval > 1) return `${interval} months ago`
	if (interval === 1) return `${interval} month ago`
	interval = Math.floor(seconds / 86400)
	if (interval > 1) return `${interval} days ago`
	if (interval === 1) return `${interval} day ago`
	interval = Math.floor(seconds / 3600)
	if (interval > 1) return `${interval} hours ago`
	if (interval === 1) return `${interval} hour ago`
	interval = Math.floor(seconds / 60)
	if (interval > 1) return `${interval} minutes ago`
	if (interval === 1) return `${interval} minute ago`
	return `${Math.floor(seconds)} seconds ago`
}

export function SaveSelectOverlay() {
	const [saves, setSaves] = useState<SaveFileInfo[]>(() => SaveManager.listAllSaves())
	const [errorMsg, setErrorMsg] = useState<string | null>(null)
	const [confirmDelete, setConfirmDelete] = useState<{ name: string; id: string } | null>(null)

	const refresh = useCallback(() => {
		setSaves(SaveManager.listAllSaves())
	}, [])

	const reloadGameSystems = () => {
		LevelProgress.init()
		eventQueue.init()
	}

	const loadSave = (id: string) => {
		const save = SaveManager.loadSaveFile(id)
		if (save) {
			reloadGameSystems()
			replacePhaserScene('SaveSelectScene', 'LevelSelectInterface')
		}
	}

	const exportSave = (id: string, saveName: string) => {
		const json = SaveManager.exportSave(id)
		if (!json) {
			setErrorMsg('Failed to export save.')
			return
		}
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `spellcompiler-save-${id.slice(-8)}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)
	}

	const importSaveFromFile = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.json'
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return
			const reader = new FileReader()
			reader.onload = (event) => {
				try {
					const jsonString = event.target?.result as string
					const newId = SaveManager.importSave(jsonString)
					if (newId) {
						refresh()
					} else {
						setErrorMsg('Failed to import save file. Invalid format.')
					}
				} catch {
					setErrorMsg('Failed to import save file. Invalid format.')
				}
			}
			reader.readAsText(file)
		}
		input.click()
	}

	const createNewSave = () => {
		const timestamp = new Date().toLocaleString()
		const name = `Save ${timestamp}`
		SaveManager.createNewSave(name)
		refresh()
	}

	const deleteSave = (id: string) => {
		SaveManager.deleteSave(id)
		setConfirmDelete(null)
		refresh()
	}

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				zIndex: 22,
				...crispDomTextRootStyle,
				pointerEvents: 'auto',
				overflowY: 'auto',
				paddingBottom: 40,
			}}
		>
			<h1
				style={{
					textAlign: 'center',
					fontSize: 36,
					fontWeight: 800,
					color: '#fff',
					margin: '24px 0 16px',
					textShadow: '0 1px 2px rgba(0,0,0,0.55)',
					fontFamily: CSS_FONT_STACK,
				}}
			>
				SELECT SAVE FILE
			</h1>

			<div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px' }}>
				{saves.map((save) => {
					const shortId = save.id.slice(-4)
					return (
						<div
							key={save.id}
							style={{
								display: 'flex',
								flexWrap: 'wrap',
								alignItems: 'center',
								justifyContent: 'space-between',
								gap: 12,
								padding: '16px 20px',
								marginBottom: 16,
								background: '#1a1f2e',
								border: '2px solid #2d3748',
								borderRadius: 8,
								fontFamily: CSS_FONT_STACK,
							}}
						>
							<div style={{ flex: '1 1 200px' }}>
								<div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>Save #{shortId}</div>
								<div style={{ fontSize: 14, color: '#989898', marginTop: 4 }}>
									Level {save.currentLevel} • Last saved: {getTimeAgo(save.lastSaved)}
								</div>
							</div>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
								<button
									type="button"
									onClick={() => loadSave(save.id)}
									style={btnBlue}
								>
									LOAD
								</button>
								<button
									type="button"
									onClick={() => exportSave(save.id, save.name)}
									style={btnGreen}
								>
									EXPORT
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete({ id: save.id, name: save.name })}
									style={btnRedSm}
								>
									Delete
								</button>
							</div>
						</div>
					)
				})}
			</div>

			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					justifyContent: 'center',
					gap: 24,
					marginTop: 24,
					marginBottom: 24,
				}}
			>
				<button type="button" onClick={createNewSave} style={btnNew}>
					+ NEW SAVE
				</button>
				<button type="button" onClick={importSaveFromFile} style={btnImport}>
					📥 IMPORT SAVE
				</button>
			</div>

			<p
				style={{
					textAlign: 'center',
					fontSize: 16,
					color: '#9098a8',
					fontFamily: CSS_FONT_STACK,
					marginBottom: 24,
				}}
			>
				Load a save, create new one, or import/export for backup
			</p>

			{errorMsg ? (
				<div
					style={{
						position: 'fixed',
						inset: 0,
						background: 'rgba(0,0,0,0.7)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 50,
					}}
					onClick={() => setErrorMsg(null)}
				>
					<div
						style={{
							background: '#1a1f2e',
							border: '3px solid #e53e3e',
							borderRadius: 12,
							padding: 32,
							maxWidth: 400,
							textAlign: 'center',
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
						<p style={{ color: '#f0f0f0', fontSize: 16, marginBottom: 20 }}>{errorMsg}</p>
						<button type="button" onClick={() => setErrorMsg(null)} style={btnBlue}>
							OK
						</button>
					</div>
				</div>
			) : null}

			{confirmDelete ? (
				<div
					style={{
						position: 'fixed',
						inset: 0,
						background: 'rgba(0,0,0,0.7)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 50,
					}}
				>
					<div
						style={{
							background: '#1a1f2e',
							border: '3px solid #e53e3e',
							borderRadius: 12,
							padding: 32,
							maxWidth: 500,
							textAlign: 'center',
						}}
					>
						<div style={{ fontSize: 48, marginBottom: 8 }}>⚠️</div>
						<h2 style={{ color: '#fff', fontSize: 28, margin: '0 0 12px' }}>Delete Save File?</h2>
						<p style={{ color: '#d0d0d0', fontSize: 16, marginBottom: 8 }}>
							Are you sure you want to delete &quot;{confirmDelete.name}&quot;?
						</p>
						<p style={{ color: '#e88888', fontSize: 14, fontStyle: 'italic', marginBottom: 24 }}>
							This action cannot be undone!
						</p>
						<div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
							<button type="button" onClick={() => setConfirmDelete(null)} style={btnGray}>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => deleteSave(confirmDelete.id)}
								style={btnRed}
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	)
}

const btnBlue: CSSProperties = {
	padding: '8px 20px',
	fontSize: 14,
	fontWeight: 700,
	color: '#fff',
	background: '#4299e1',
	border: '2px solid #63b3ed',
	borderRadius: 6,
	cursor: 'pointer',
	fontFamily: CSS_FONT_STACK,
}

const btnGreen: React.CSSProperties = {
	...btnBlue,
	background: '#48bb78',
	borderColor: '#68d391',
}

const btnRedSm: React.CSSProperties = {
	padding: '6px 16px',
	fontSize: 12,
	fontWeight: 700,
	color: '#fff',
	background: '#e53e3e',
	border: '1px solid #fc8181',
	borderRadius: 6,
	cursor: 'pointer',
	fontFamily: CSS_FONT_STACK,
}

const btnNew: React.CSSProperties = {
	minWidth: 250,
	padding: '14px 24px',
	fontSize: 20,
	fontWeight: 700,
	color: '#fff',
	background: '#48bb78',
	border: '3px solid #68d391',
	borderRadius: 8,
	cursor: 'pointer',
	fontFamily: CSS_FONT_STACK,
}

const btnImport: React.CSSProperties = {
	...btnNew,
	background: '#9f7aea',
	borderColor: '#b794f4',
}

const btnGray: React.CSSProperties = {
	padding: '12px 24px',
	fontSize: 18,
	fontWeight: 700,
	color: '#fff',
	background: '#4a5568',
	border: '2px solid #718096',
	borderRadius: 8,
	cursor: 'pointer',
	fontFamily: CSS_FONT_STACK,
}

const btnRed: React.CSSProperties = {
	...btnGray,
	background: '#e53e3e',
	borderColor: '#fc8181',
}
