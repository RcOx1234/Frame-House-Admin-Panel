import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig({plugins:[{name:'isolated-ui-fixtures',enforce:'pre',resolveId(source){if(/services\/(cotizaciones|projectsFirestore|settingsFirestore|sessions)$/.test(source)) return path.resolve('tests/fixtures.ts');}},react()],server:{host:'127.0.0.1',port:5174}});
