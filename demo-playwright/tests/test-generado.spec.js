// ===========================================================================
//  test-generado.spec.js
//  ARCHIVO GENERADO AUTOMATICAMENTE por src/generar-test.js
//  No lo edites a mano: vuelve a grabar con  ->  node src/grabar.js
// ===========================================================================

const { test, expect } = require('@playwright/test');
const path = require('path');

const URL_DEMO = "http://localhost:3000";
const RESULTADOS = path.join(__dirname, '..', 'resultados');

// Helper: guarda una captura de evidencia en resultados/
function evidencia(nombre) {
  return path.join(RESULTADOS, nombre);
}

// Helper: reporta en consola cada etapa ejecutada
function paso(descripcion) {
  console.log(`  \u2713 ${descripcion}`);
}

test.describe('Flujo generado a partir de la grabacion manual', () => {

  test('flujo generado automaticamente (PASS)', async ({ page }) => {
    // --- 1. Navegacion a la pagina ---
    await test.step('Navegacion a la pagina', async () => {
      await page.goto("http://localhost:3000");
      paso('Navegacion a la pagina');
    });
    await page.screenshot({ path: evidencia('inicio.png'), fullPage: true });

    // --- 2. Ingreso de datos en campo 'Usuario' ---
    await test.step('Ingreso de datos en campo \'Usuario\'', async () => {
      await page.getByLabel('Usuario').fill('admin');
      paso('Ingreso de datos en campo \'Usuario\'');
    });
    await page.screenshot({ path: evidencia('paso-02.png'), fullPage: true });

    // --- 3. Ingreso de datos en campo 'Contrasena' ---
    await test.step('Ingreso de datos en campo \'Contrasena\'', async () => {
      await page.getByLabel('Contrasena').fill('admin123');
      paso('Ingreso de datos en campo \'Contrasena\'');
    });
    await page.screenshot({ path: evidencia('paso-03.png'), fullPage: true });

    // --- 4. Click en boton 'Ingresar' ---
    await test.step('Click en boton \'Ingresar\'', async () => {
      await page.getByRole('button', { name: 'Ingresar' }).click();
      paso('Click en boton \'Ingresar\'');
    });
    await page.screenshot({ path: evidencia('paso-04.png'), fullPage: true });

    // --- Validacion: la automatizacion NO solo hace clicks, tambien VERIFICA ---
    await test.step('Validacion del resultado esperado', async () => {
      await expect(page.getByText("Login exitoso")).toBeVisible();
      paso('Validacion del resultado esperado');
    });
    await page.screenshot({ path: evidencia('resultado-final.png'), fullPage: true });
  });

  // -------------------------------------------------------------------
  //  Demostracion de FALLO: mismas acciones, credenciales incorrectas.
  //  Se activa con:  node src/ejecutar.js --fail
  // -------------------------------------------------------------------
  test('demostracion de fallo (FAIL esperado)', async ({ page }) => {
    test.skip(!process.env.DEMO_FAIL, 'Activa esta prueba con: node src/ejecutar.js --fail');

    await test.step('Ingreso de credenciales incorrectas', async () => {
      await page.goto(URL_DEMO);
      await page.locator('#usuario').fill('admin');
      await page.locator('#password').fill('clave-incorrecta');
      await page.locator('#btn-ingresar').click();
      paso('Ingreso de credenciales incorrectas');
    });
    await page.screenshot({ path: evidencia('fallo.png'), fullPage: true });

    await test.step('Validacion (se espera Login exitoso, pero fallara)', async () => {
      await expect(page.getByText("Login exitoso")).toBeVisible({ timeout: 3000 });
    });
  });
});
