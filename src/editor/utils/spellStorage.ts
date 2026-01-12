export type SpellMeta = {
	id: string
	name: string
	savedAt: number
}

export type StoredSpell = SpellMeta & {
	flow: unknown
}

const INDEX_KEY = 'spellcompiler:spells:index'
const SPELL_KEY_PREFIX = 'spellcompiler:spells:'

function readJson<T>(raw: string | null): T | null {
	if (!raw) return null
	try {
		return JSON.parse(raw) as T
	} catch {
		return null
	}
}

function writeJson(key: string, value: unknown) {
	localStorage.setItem(key, JSON.stringify(value))
}

function readIndex(): SpellMeta[] {
	const data = readJson<SpellMeta[]>(localStorage.getItem(INDEX_KEY))
	if (!data || !Array.isArray(data)) return []
	return data
}

function writeIndex(index: SpellMeta[]) {
	writeJson(INDEX_KEY, index)
}

export function listSpells(): SpellMeta[] {
	return readIndex().slice().sort((a, b) => b.savedAt - a.savedAt)
}

export function loadSpell(id: string): StoredSpell | null {
	const key = `${SPELL_KEY_PREFIX}${id}`
	const data = readJson<StoredSpell>(localStorage.getItem(key))
	if (!data || data.id !== id) return null
	return data
}

export function deleteSpell(id: string) {
	localStorage.removeItem(`${SPELL_KEY_PREFIX}${id}`)
	const nextIndex = readIndex().filter((m) => m.id !== id)
	writeIndex(nextIndex)
}

export function upsertSpell(params: { id?: string | null; name: string; flow: unknown }): string {
	const now = Date.now()
	const id = params.id || `spell-${now}`
	const spell: StoredSpell = { id, name: params.name, savedAt: now, flow: params.flow }

	writeJson(`${SPELL_KEY_PREFIX}${id}`, spell)

	const index = readIndex()
	const existing = index.find((m) => m.id === id)
	if (existing) {
		existing.name = spell.name
		existing.savedAt = spell.savedAt
		writeIndex(index)
		return id
	}

	writeIndex([{ id: spell.id, name: spell.name, savedAt: spell.savedAt }, ...index])
	return id
}


