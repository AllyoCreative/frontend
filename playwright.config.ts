import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'line',
  outputDir: '/private/tmp/allyo-playwright',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    },
  },
})
