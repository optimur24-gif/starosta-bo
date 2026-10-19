import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const base = process.env.E2E_BASE_PATH || '/';
const systemChromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: 2,
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:4173${base}`, trace: 'retain-on-failure', screenshot: 'only-on-failure', launchOptions: { executablePath: systemChromium, args: ['--enable-unsafe-swiftshader'] } },
  projects: [{ name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }],
  webServer: { command: 'node scripts/serve.mjs', env: { PORT: '4173', BASE_PATH: base }, url: `http://127.0.0.1:4173${base}`, reuseExistingServer: !process.env.CI },
});
