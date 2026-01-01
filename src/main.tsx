import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import './index.css'
import Game from './game/Game'
import Editor from './editor/Editor'

function getRoutePath() {
	const base = import.meta.env.BASE_URL || '/'
	let path = window.location.pathname

	if (base !== '/' && path.startsWith(base)) {
		path = path.slice(base.length - 1)
	}

	if (path.length > 1 && path.endsWith('/')) {
		path = path.slice(0, -1)
	}

	return path
}

function Root() {
	const path = getRoutePath()

	if (path === '/editor') {
		return (
			<div style={{ position: 'fixed', inset: 0 }}>
				<Editor />
			</div>
		)
	}

	return <Game />
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<MantineProvider>
			<Root />
		</MantineProvider>
	</StrictMode>,
)
