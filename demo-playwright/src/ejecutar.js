// ---------------------------------------------------------------------------
// ejecutar.js
// PASO 2 de la demostracion: EJECUTAR automaticamente el test generado.
//
//   node src/ejecutar.js              -> navegador visible (para la clase)
//   node src/ejecutar.js --slow       -> acciones lentas (explicar paso a paso)
//   node src/ejecutar.js --headless   -> sin ventana (como en CI/CD)
//   node src/ejecutar.js --fail       -> demuestra un caso que falla (FAIL)
//
// Por debajo usa Playwright Test, por lo que genera el reporte HTML que se
// abre con:  npx playwright show-report
// ---------------------------------------------------------------------------

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const TEST = path.join('tests', 'test-generado.spec.js');

function main() {
  const args = process.argv.slice(2);
  const lento = args.includes('--slow');
  const sinVentana = args.includes('--headless');
  const demostrarFallo = args.includes('--fail');

  fs.mkdirSync(path.join(RAIZ, 'resultados'), { recursive: true });

  if (!fs.existsSync(path.join(RAIZ, TEST))) {
    console.error('No existe el test generado. Ejecuta primero:  node src/grabar.js');
    process.exit(1);
  }

  const argsPlaywright = ['playwright', 'test', TEST];

  // Por defecto abrimos el navegador para ver la automatizacion en vivo.
  // En CI/CD (o con --headless) se ejecuta sin ventana.
  const esCI = Boolean(process.env.CI);
  if (!sinVentana && !esCI) argsPlaywright.push('--headed');

  console.log('');
  console.log('===========================================================');
  console.log('  EJECUCION AUTOMATIZADA DEL FLUJO GRABADO');
  console.log('===========================================================');
  console.log(`  Modo     : ${sinVentana || esCI ? 'headless (sin ventana)' : 'visible'}`);
  console.log(`  Velocidad: ${lento ? 'lenta (--slow)' : 'normal'}`);
  console.log(`  Escenario: ${demostrarFallo ? 'FALLO forzado (--fail)' : 'camino feliz'}`);
  console.log('-----------------------------------------------------------');

  const comando = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const hijo = spawn(comando, argsPlaywright, {
    cwd: RAIZ,
    stdio: 'inherit',
    env: {
      ...process.env,
      SLOWMO: lento ? '700' : '0',
      DEMO_FAIL: demostrarFallo ? '1' : '',
    },
  });

  hijo.on('close', (codigo) => {
    const exito = codigo === 0;
    console.log('');
    console.log('================================');
    console.log('      RESULTADO DE LA PRUEBA');
    console.log('================================');
    console.log(`  RESULTADO: ${exito ? 'PASS' : 'FAIL'}`);
    console.log('================================');
    console.log('');
    console.log('  Evidencias  : resultados/');
    console.log('  Reporte     : npx playwright show-report');
    if (!exito) {
      console.log('  Sugerencia  : revisa el error de arriba (linea del test que fallo).');
    }
    console.log('');
    process.exit(exito ? 0 : 1);
  });

  hijo.on('error', (error) => {
    console.error('No se pudo ejecutar Playwright:', error.message);
    process.exit(1);
  });
}

main();
