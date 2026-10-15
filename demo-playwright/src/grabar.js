// ---------------------------------------------------------------------------
// grabar.js
// PASO 1 de la demostracion: GRABAR una prueba manual.
//
//   node src/grabar.js
//
// Abre Chromium con Playwright Codegen. El docente/estudiante realiza las
// acciones a mano (escribir, hacer click, etc.). Al CERRAR la ventana del
// navegador, la grabacion termina y este programa:
//   - traduce las acciones a un test Playwright (tests/test-generado.spec.js)
//   - guarda un JSON con las acciones (resultados/grabacion.json)
//   - toma una captura inicial (resultados/inicio.png)
//
// Opciones:
//   --url=http://localhost:3000     URL a grabar
//   --esperado="Login exitoso"      Texto que se espera ver al final
//   --salida=tests/test-generado.spec.js
// ---------------------------------------------------------------------------

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const servidor = require('./servidor');
const { generar } = require('./generar-test');

const RAIZ = path.join(__dirname, '..');
const RUTA_CRUDA = path.join(RAIZ, 'resultados', 'grabacion-cruda.js');

function leerArgumento(nombre, porDefecto) {
  const prefijo = `--${nombre}=`;
  const encontrado = process.argv.slice(2).find((a) => a.startsWith(prefijo));
  return encontrado ? encontrado.slice(prefijo.length) : porDefecto;
}

function preguntar(texto, porDefecto) {
  return new Promise((resolver) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${texto} [${porDefecto}]: `, (respuesta) => {
      rl.close();
      resolver(respuesta.trim() || porDefecto);
    });
  });
}

async function tomarCapturaInicial(url) {
  // Usamos la API de Playwright directamente para dejar evidencia visual.
  const { chromium } = require('playwright');
  const navegador = await chromium.launch({ headless: true });
  const pagina = await navegador.newPage();
  await pagina.goto(url, { waitUntil: 'domcontentloaded' });
  await pagina.screenshot({ path: path.join(RAIZ, 'resultados', 'inicio.png'), fullPage: true });
  await navegador.close();
}

async function main() {
  fs.mkdirSync(path.join(RAIZ, 'resultados'), { recursive: true });

  const url = leerArgumento('url', 'http://localhost:3000');
  let esperado = leerArgumento('esperado', '');

  // Si la URL es local, levantamos el servidor de la pagina demo.
  let proceso = null;
  if (/localhost|127\.0\.0\.1/.test(url)) {
    proceso = await servidor.iniciar();
    console.log(`> Pagina demo servida en ${url}`);
  }

  console.log('');
  console.log('===========================================================');
  console.log('  GRABACION DE ACCIONES (Playwright Codegen)');
  console.log('===========================================================');
  console.log('  1. Se abrira Chromium en modo visible.');
  console.log('  2. Realiza el flujo a mano (usuario, contrasena, click...).');
  console.log('  3. CIERRA la ventana del navegador para terminar.');
  console.log('===========================================================');
  console.log('');

  const comando = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  await new Promise((resolver, rechazar) => {
    const codegen = spawn(
      comando,
      ['playwright', 'codegen', '--target=javascript', '-o', RUTA_CRUDA, url],
      { cwd: RAIZ, stdio: 'inherit' }
    );
    codegen.on('close', (codigo) => (codigo === 0 ? resolver() : rechazar(new Error(`codegen termino con codigo ${codigo}`))));
    codegen.on('error', rechazar);
  });

  if (proceso) proceso.close();

  if (!fs.existsSync(RUTA_CRUDA) || fs.readFileSync(RUTA_CRUDA, 'utf8').trim() === '') {
    console.error('\nNo se registro ninguna accion. Intenta de nuevo.');
    process.exit(1);
  }

  // Texto esperado: por argumento, o se pregunta al usuario.
  if (!esperado) {
    if (process.stdin.isTTY) {
      esperado = await preguntar('\n¿Que texto esperas ver al final del flujo?', 'Login exitoso');
    } else {
      esperado = 'Login exitoso';
    }
  }

  const { acciones } = generar({ rutaCruda: RUTA_CRUDA, url, esperado });

  await tomarCapturaInicial(url);

  console.log('');
  console.log('===========================================================');
  console.log('  GRABACION FINALIZADA');
  console.log('===========================================================');
  console.log(`  Acciones registradas : ${acciones.length}`);
  console.log(`  Validacion esperada  : "${esperado}"`);
  console.log(`  Test generado        : tests/test-generado.spec.js`);
  console.log(`  Evidencia inicial    : resultados/inicio.png`);
  console.log('===========================================================');
  console.log('  Siguiente paso:  node src/ejecutar.js');
  console.log('');
}

main().catch((error) => {
  console.error('\nError durante la grabacion:', error.message);
  process.exit(1);
});
