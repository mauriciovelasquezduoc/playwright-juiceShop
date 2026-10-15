// ---------------------------------------------------------------------------
// playwright.config.js
// Configuracion de Playwright Test.
// Levanta automaticamente la pagina demo (src/servidor.js) antes de los tests
// y genera un reporte HTML que se abre con: npx playwright show-report
// ---------------------------------------------------------------------------

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,

  // list = salida en consola | html = reporte navegable
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    // slowMo se activa con:  node src/ejecutar.js --slow
    launchOptions: { slowMo: Number(process.env.SLOWMO || 0) },
  },

  // Publica la pagina demo en http://localhost:3000 antes de ejecutar.
  webServer: {
    command: 'node src/servidor.js',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
