// ---------------------------------------------------------------------------
// generar-test.js
// Convierte la grabacion cruda de Playwright Codegen en un test limpio,
// comentado y educativo (tests/test-generado.spec.js).
//
// Idea didactica:
//   1. El docente graba acciones en el navegador (grabar.js).
//   2. Este modulo TRADUCE esas acciones a codigo Playwright Test.
//   3. El estudiante lee el codigo y entiende QUE se automatizo.
//
// Uso directo:
//   node src/generar-test.js [resultados/grabacion-cruda.js] --esperado="Login exitoso"
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const RUTA_CRUDA = path.join(RAIZ, 'resultados', 'grabacion-cruda.js');
const RUTA_TEST = path.join(RAIZ, 'tests', 'test-generado.spec.js');
const RUTA_JSON = path.join(RAIZ, 'resultados', 'grabacion.json');

// Acciones que sabemos traducir. Si aparece otra, el parser simplemente la ignora.
const ACCIONES = [
  'click',
  'dblclick',
  'fill',
  'type',
  'press',
  'selectOption',
  'check',
  'uncheck',
  'hover',
  'focus',
  'setInputFiles',
];

// ---------------------------------------------------------------------------
// 1) Interpretar el codigo crudo de Codegen -> lista de acciones
// ---------------------------------------------------------------------------
function parsearGrabacion(codigo, urlPorDefecto = '') {
  const acciones = [];
  const lineas = String(codigo).split('\n');

  for (const linea of lineas) {
    const texto = linea.trim();

    // Navegacion:  await page.goto('http://localhost:3000');
    const coincideGoto = texto.match(/await\s+page\.goto\(\s*(['"])(.*?)\1\s*\)/);
    if (coincideGoto) {
      acciones.push({
        tipo: 'goto',
        accion: 'goto',
        url: coincideGoto[2],
        locator: null,
        args: '',
        valor: null,
        descripcion: 'Navegacion a la pagina',
      });
      continue;
    }

    // Accion sobre un elemento:
    //   await page.getByLabel('Usuario').fill('admin');
    //   await page.getByRole('button', { name: 'Ingresar' }).click();
    const regex = new RegExp(
      `await\\s+page\\.(.+?)\\.(${ACCIONES.join('|')})\\((.*)\\)\\s*;?\\s*$`
    );
    const coincide = texto.match(regex);
    if (coincide) {
      const locator = coincide[1];
      const accion = coincide[2];
      const args = coincide[3];
      const valor = extraerValor(args);
      acciones.push({
        tipo: 'accion',
        accion,
        locator,
        args,
        valor,
        descripcion: describirAccion(accion, locator, valor),
      });
    }
  }

  // Si la grabacion no registro ninguna navegacion, usamos la url por defecto.
  if (acciones.length > 0 && acciones[0].tipo !== 'goto' && urlPorDefecto) {
    acciones.unshift({
      tipo: 'goto',
      accion: 'goto',
      url: urlPorDefecto,
      locator: null,
      args: '',
      valor: null,
      descripcion: 'Navegacion a la pagina',
    });
  }

  return acciones;
}

// Convierte  'admin'  o  "admin"  en  admin
function extraerValor(args) {
  const limpio = String(args).trim();
  const coincidencia = limpio.match(/^(['"])(.*)\1$/s);
  return coincidencia ? coincidencia[2] : limpio || null;
}

// Construye una frase legible en espanol a partir de la accion y el locator.
function describirAccion(accion, locator, valor) {
  const nombre = humanizarLocator(locator);

  switch (accion) {
    case 'click':
      return `Click en ${nombre}`;
    case 'dblclick':
      return `Doble click en ${nombre}`;
    case 'fill':
    case 'type':
      return `Ingreso de datos en ${nombre}`;
    case 'press':
      return `Presionar la tecla ${valor} en ${nombre}`;
    case 'selectOption':
      return `Seleccionar la opcion "${valor}" en ${nombre}`;
    case 'check':
      return `Marcar ${nombre}`;
    case 'uncheck':
      return `Desmarcar ${nombre}`;
    case 'hover':
      return `Pasar el mouse por ${nombre}`;
    case 'focus':
      return `Enfocar ${nombre}`;
    case 'setInputFiles':
      return `Adjuntar archivo en ${nombre}`;
    default:
      return `${accion} sobre ${nombre}`;
  }
}

// Roles ARIA -> texto legible en espanol
const ROLES = {
  button: 'boton',
  link: 'enlace',
  textbox: 'campo de texto',
  checkbox: 'casilla',
  radio: 'opcion',
  combobox: 'lista',
  heading: 'titulo',
  img: 'imagen',
  listitem: 'item',
  menuitem: 'opcion de menu',
};

// Traduce un locator de Playwright a texto humano.
// Ej: getByRole('button', { name: 'Ingresar' })  ->  boton 'Ingresar'
function humanizarLocator(locator) {
  const rol = String(locator).match(
    /getByRole\(\s*['"]([^'"]+)['"]\s*,\s*\{[^}]*name:\s*['"]([^'"]+)['"]/
  );
  if (rol) return `${ROLES[rol[1]] || rol[1]} '${rol[2]}'`;

  const patrones = [
    [/getByLabel\(\s*['"]([^'"]+)['"]/, (v) => `campo '${v}'`],
    [/getByPlaceholder\(\s*['"]([^'"]+)['"]/, (v) => `campo '${v}'`],
    [/getByText\(\s*['"]([^'"]+)['"]/, (v) => `texto '${v}'`],
    [/getByTestId\(\s*['"]([^'"]+)['"]/, (v) => `elemento de prueba '${v}'`],
    [/getByAltText\(\s*['"]([^'"]+)['"]/, (v) => `imagen '${v}'`],
    [/locator\(\s*['"]([^'"]+)['"]/, (v) => `elemento '${v}'`],
  ];
  for (const [regex, formatear] of patrones) {
    const m = String(locator).match(regex);
    if (m) return formatear(m[1]);
  }
  return `elemento (${locator})`;
}

// ---------------------------------------------------------------------------
// 2) Generar el archivo de test Playwright
// ---------------------------------------------------------------------------
function construirTest({ acciones, url, esperado }) {
  const urlDemo = url || (acciones.find((a) => a.tipo === 'goto') || {}).url || 'http://localhost:3000';
  const textoEsperado = esperado || 'Login exitoso';

  const lineas = [];
  lineas.push('// ===========================================================================');
  lineas.push('//  test-generado.spec.js');
  lineas.push('//  ARCHIVO GENERADO AUTOMATICAMENTE por src/generar-test.js');
  lineas.push('//  No lo edites a mano: vuelve a grabar con  ->  node src/grabar.js');
  lineas.push('// ===========================================================================');
  lineas.push('');
  lineas.push("const { test, expect } = require('@playwright/test');");
  lineas.push("const path = require('path');");
  lineas.push('');
  lineas.push(`const URL_DEMO = ${JSON.stringify(urlDemo)};`);
  lineas.push('const RESULTADOS = path.join(__dirname, \'..\', \'resultados\');');
  lineas.push('');
  lineas.push('// Helper: guarda una captura de evidencia en resultados/');
  lineas.push('function evidencia(nombre) {');
  lineas.push('  return path.join(RESULTADOS, nombre);');
  lineas.push('}');
  lineas.push('');
  lineas.push('// Helper: reporta en consola cada etapa ejecutada');
  lineas.push('function paso(descripcion) {');
  lineas.push('  console.log(`  \\u2713 ${descripcion}`);');
  lineas.push('}');
  lineas.push('');
  lineas.push("test.describe('Flujo generado a partir de la grabacion manual', () => {");
  lineas.push('');

  // ---- Test PASS ----------------------------------------------------------
  lineas.push("  test('flujo generado automaticamente (PASS)', async ({ page }) => {");
  let n = 0;
  for (const accion of acciones) {
    n += 1;
    const numero = String(n).padStart(2, '0');

    lineas.push(`    // --- ${n}. ${accion.descripcion} ---`);
    lineas.push(`    await test.step('${escapar(accion.descripcion)}', async () => {`);
    if (accion.tipo === 'goto') {
      lineas.push(`      await page.goto(${JSON.stringify(accion.url)});`);
    } else {
      lineas.push(`      await page.${accion.locator}.${accion.accion}(${accion.args});`);
    }
    lineas.push(`      paso('${escapar(accion.descripcion)}');`);
    lineas.push('    });');
    lineas.push(
      `    await page.screenshot({ path: evidencia('${accion.tipo === 'goto' ? 'inicio.png' : `paso-${numero}.png`}'), fullPage: true });`
    );
    lineas.push('');
  }

  lineas.push('    // --- Validacion: la automatizacion NO solo hace clicks, tambien VERIFICA ---');
  lineas.push("    await test.step('Validacion del resultado esperado', async () => {");
  lineas.push(`      await expect(page.getByText(${JSON.stringify(textoEsperado)})).toBeVisible();`);
  lineas.push("      paso('Validacion del resultado esperado');");
  lineas.push('    });');
  lineas.push("    await page.screenshot({ path: evidencia('resultado-final.png'), fullPage: true });");
  lineas.push('  });');
  lineas.push('');

  // ---- Test FAIL (desactivado por defecto) --------------------------------
  lineas.push('  // -------------------------------------------------------------------');
  lineas.push('  //  Demostracion de FALLO: mismas acciones, credenciales incorrectas.');
  lineas.push('  //  Se activa con:  node src/ejecutar.js --fail');
  lineas.push('  // -------------------------------------------------------------------');
  lineas.push("  test('demostracion de fallo (FAIL esperado)', async ({ page }) => {");
  lineas.push("    test.skip(!process.env.DEMO_FAIL, 'Activa esta prueba con: node src/ejecutar.js --fail');");
  lineas.push('');
  lineas.push("    await test.step('Ingreso de credenciales incorrectas', async () => {");
  lineas.push(`      await page.goto(URL_DEMO);`);
  lineas.push("      await page.locator('#usuario').fill('admin');");
  lineas.push("      await page.locator('#password').fill('clave-incorrecta');");
  lineas.push("      await page.locator('#btn-ingresar').click();");
  lineas.push("      paso('Ingreso de credenciales incorrectas');");
  lineas.push('    });');
  lineas.push("    await page.screenshot({ path: evidencia('fallo.png'), fullPage: true });");
  lineas.push('');
  lineas.push("    await test.step('Validacion (se espera Login exitoso, pero fallara)', async () => {");
  lineas.push(`      await expect(page.getByText(${JSON.stringify(textoEsperado)})).toBeVisible({ timeout: 3000 });`);
  lineas.push('    });');
  lineas.push('  });');
  lineas.push('});');
  lineas.push('');

  return lineas.join('\n');
}

function escapar(texto) {
  return String(texto).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ---------------------------------------------------------------------------
// 3) Orquestacion: leer crudo, parsear, escribir test + json
// ---------------------------------------------------------------------------
function generar({ rutaCruda = RUTA_CRUDA, url = '', esperado = '', escribir = true } = {}) {
  if (!fs.existsSync(rutaCruda)) {
    throw new Error(`No existe la grabacion cruda: ${rutaCruda}. Primero ejecuta: node src/grabar.js`);
  }
  const codigoCrudo = fs.readFileSync(rutaCruda, 'utf8');
  const acciones = parsearGrabacion(codigoCrudo, url);
  const codigoTest = construirTest({ acciones, url, esperado });

  if (escribir) {
    fs.mkdirSync(path.dirname(RUTA_TEST), { recursive: true });
    fs.mkdirSync(path.dirname(RUTA_JSON), { recursive: true });
    fs.writeFileSync(RUTA_TEST, codigoTest, 'utf8');
    fs.writeFileSync(RUTA_JSON, JSON.stringify({ url, esperado, acciones }, null, 2), 'utf8');
  }

  return { acciones, codigoTest };
}

module.exports = { parsearGrabacion, construirTest, generar, humanizarLocator };

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
if (require.main === module) {
  const args = process.argv.slice(2);
  const rutaCruda = args.find((a) => !a.startsWith('--')) || RUTA_CRUDA;
  const esperadoArg = args.find((a) => a.startsWith('--esperado='));
  const urlArg = args.find((a) => a.startsWith('--url='));
  const esperado = esperadoArg ? esperadoArg.split('=')[1] : '';
  const url = urlArg ? urlArg.split('=')[1] : '';

  try {
    const { acciones } = generar({ rutaCruda, url, esperado });
    console.log(`> Se genero ${path.relative(RAIZ, RUTA_TEST)} con ${acciones.length} acciones.`);
    console.log(`> Evidencia JSON en ${path.relative(RAIZ, RUTA_JSON)}.`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}
