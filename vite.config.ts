import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { zenPlazaWsPlugin } from './src/server/plaza-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), zenPlazaWsPlugin()],
})
