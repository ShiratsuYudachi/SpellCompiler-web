import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	base: '/SpellCompiler-web/',
	server: {
		port: 3001,
	},
})
