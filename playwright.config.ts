import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'**/*.spec.ts',fullyParallel:false,reporter:'list',use:{baseURL:'http://127.0.0.1:5174',headless:true,screenshot:'only-on-failure'},webServer:{command:'npx vite --config vite.qa.config.ts',url:'http://127.0.0.1:5174/tests/ui.html',reuseExistingServer:true}});
