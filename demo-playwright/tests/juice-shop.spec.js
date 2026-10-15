// ===========================================================================
//  juice-shop.spec.js
//
//  10 pruebas automatizadas que buscan los ERRORES DE SEGURIDAD tipicos de
//  OWASP Juice Shop (https://owasp.org/www-project-juice-shop/).
//
//  Cada prueba reproduce lo que haria una PERSONA en el navegador:
//  abre la pagina, escribe, hace click... y luego VERIFICA el resultado
//  con assertions (PASS / FAIL), guardando capturas como evidencia en
//  resultados/juice-shop/.
//
//  Requisito: Juice Shop corriendo en http://localhost:3000
//             (docker compose up -d en la carpeta juiceShop)
//
//  Ejecucion:
//    npx playwright test tests/juice-shop.spec.js --headed     -> navegador VISIBLE (para la clase)
//    SLOWMO=700 npx playwright test tests/juice-shop.spec.js --headed  -> camara lenta
//    npx playwright test tests/juice-shop.spec.js              -> headless (como CI/CD)
//    npx playwright test tests/juice-shop.spec.js --headed --grep "SQL"  -> solo algunas
//    npx playwright show-report                                 -> reporte HTML
//
//  Las 10 pruebas (categorias OWASP clasicas):
//    01 Credenciales por defecto del administrador   (Security Misconfiguration)
//    02 Inyeccion SQL en el login                    (Injection)
//    03 Seccion de administracion con sesion robada  (Broken Access Control)
//    04 Inyeccion SQL en el buscador + stack trace   (Injection + Info Disclosure)
//    05 XSS en el buscador ejecuta JavaScript        (Cross-Site Scripting)
//    06 Directorio /ftp/ expuesto                   (Sensitive Data Exposure)
//    07 Documento confidencial accesible             (Sensitive Data Exposure)
//    08 Registro con email vacio                    (Validacion solo en el frontend)
//    09 Ver el carrito de otro usuario (IDOR)       (Broken Access Control)
//    10 Panel oculto /#/score-board                 (Security by Obscurity)
//
//  NOTA: cada prueba recibe un navegador NUEVO y aislado (como si fuera
//  una persona distinta entrando por primera vez a la tienda).
// ===========================================================================

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const URL_JUICE = 'http://localhost:3000';
const RESULTADOS = path.join(__dirname, '..', 'resultados', 'juice-shop');

// Helper: guarda una captura de evidencia en resultados/juice-shop/
function evidencia(nombre) {
  return path.join(RESULTADOS, nombre);
}

// Helper: reporta en consola cada etapa ejecutada
function paso(descripcion) {
  console.log(`  \u2713 ${descripcion}`);
}

// Helper: abre una pagina de Juice Shop y cierra los banners que estorban
// (dialogo de bienvenida + aviso de cookies), igual que haria una persona
// la primera vez que entra a la tienda. Ambos aparecen en cualquier momento
// de los primeros segundos de carga, por eso se espera en un bucle.
async function prepararPagina(page, ruta) {
  await page.goto(`${URL_JUICE}${ruta}`, { waitUntil: 'domcontentloaded' });
  const bienvenida = page.getByRole('button', { name: 'Close Welcome Banner' });
  const cookies = page.locator('.cc-dismiss');
  const plazo = Date.now() + 15000;
  let cerroBienvenida = false;
  let cerroCookies = false;
  while (Date.now() < plazo && !(cerroBienvenida && cerroCookies)) {
    if (!cerroBienvenida && (await bienvenida.isVisible().catch(() => false))) {
      await bienvenida.click().catch(() => {});
      cerroBienvenida = true;
      continue;
    }
    if (!cerroCookies && (await cookies.isVisible().catch(() => false))) {
      // force: true porque el dialogo de bienvenida puede tapar el banner
      await cookies.click({ force: true }).catch(() => {});
      cerroCookies = true;
      continue;
    }
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(300);
}

// Helper: inicia sesion por la interfaz, como lo haria una persona
async function iniciarSesion(page, email, contrasena) {
  await prepararPagina(page, '/#/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(contrasena);
  await page.locator('#loginButton').click();
  // Espera a que la app guarde el token de sesion en el navegador
  await expect
    .poll(async () => page.evaluate(() => Boolean(localStorage.getItem('token'))), { timeout: 15000 })
    .toBe(true);
  // Deja que la navegacion post-login termine antes de seguir
  await page.waitForTimeout(1500);
}

// Helper: abre el menu "Account" y verifica quien inicio sesion.
// Se combina con :visible porque el menu tiene una copia oculta para
// moviles que tambien contiene el email (no hay que confundirse con ella).
async function abrirMenuCuenta(page, email) {
  await page.getByRole('button', { name: 'Show/hide account menu' }).click();
  await page.waitForTimeout(1200);
  await expect(page.getByText(email).and(page.locator(':visible'))).toBeVisible();
}

// Helper: decodifica el payload del JWT guardado en localStorage
async function decodificarToken(page) {
  return page.evaluate(() => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    try {
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  });
}

fs.mkdirSync(RESULTADOS, { recursive: true });

test.describe('Juice Shop: errores tipicos de seguridad', () => {
  // ------------------------------------------------------------------ 01 ---
  test('01 - Credenciales por defecto del administrador (admin123)', async ({ page }) => {
    await test.step('Abrir la pagina de login', async () => {
      await prepararPagina(page, '/#/login');
      paso('Pagina de login abierta');
    });

    await test.step('Iniciar sesion con credenciales por defecto', async () => {
      // admin@juice-sh.op / admin123: la pareja clasica que viene de fabrica.
      // Un sistema bien configurado obliga a cambiarla en el primer arranque.
      await page.locator('#email').fill('admin@juice-sh.op');
      await page.locator('#password').fill('admin123');
      await page.locator('#loginButton').click();
      await expect
        .poll(async () => page.evaluate(() => Boolean(localStorage.getItem('token'))), { timeout: 15000 })
        .toBe(true);
      paso('Login aceptado con la contrasena por defecto');
      await page.waitForTimeout(1500);
    });

    await test.step('Verificar que entro como el administrador', async () => {
      await abrirMenuCuenta(page, 'admin@juice-sh.op');
      paso('El menu Account muestra la cuenta del ADMINISTRADOR');
    });

    await page.screenshot({ path: evidencia('01-credenciales-por-defecto.png'), fullPage: true });
  }, 45000);

  // ------------------------------------------------------------------ 02 ---
  test('02 - Inyeccion SQL en el login permite entrar sin contrasena', async ({ page }) => {
    await test.step('Abrir la pagina de login', async () => {
      await prepararPagina(page, '/#/login');
      paso('Pagina de login abierta');
    });

    await test.step('Escribir el payload de inyeccion SQL', async () => {
      // La consulta del servidor es del tipo:
      //   SELECT * FROM Users WHERE email = '<email>' AND password = '<password>'
      // Al escribir  ' OR 1=1--   como email, la condicion siempre es verdadera
      // y el "--" convierte el resto en comentario: la contrasena NO se revisa.
      await page.locator('#email').fill("' OR 1=1--");
      await page.locator('#password').fill('contrasena-que-no-es');
      await page.locator('#loginButton').click();
      await expect
        .poll(async () => page.evaluate(() => Boolean(localStorage.getItem('token'))), { timeout: 15000 })
        .toBe(true);
      paso('El servidor acepto el login SIN credenciales validas');
      await page.waitForTimeout(1500);
    });

    await test.step('Verificar que entro como el administrador', async () => {
      const token = await decodificarToken(page);
      expect(token.data.email).toBe('admin@juice-sh.op');
      expect(token.data.role).toBe('admin');
      paso('La sesion robada pertenece a: admin@juice-sh.op (rol: admin)');
      await abrirMenuCuenta(page, 'admin@juice-sh.op');
      paso('El menu Account confirma la identidad robada');
    });

    await page.screenshot({ path: evidencia('02-sqli-login-admin.png'), fullPage: true });
  }, 45000);

  // ------------------------------------------------------------------ 03 ---
  test('03 - Seccion de administracion accesible con la sesion robada', async ({ page }) => {
    await test.step('Entrar con la inyeccion SQL de la prueba 02', async () => {
      await iniciarSesion(page, "' OR 1=1--", 'contrasena-que-no-es');
      paso('Sesion iniciada como administrador (via SQL injection)');
    });

    await test.step('Abrir la seccion de administracion', async () => {
      // Esta seccion solo deberia verse con permisos de admin (/api/Users).
      // Con la sesion robada, un atacante lee TODA la lista de usuarios.
      await page.goto(`${URL_JUICE}/#/administration`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);
      const tabla = page.locator('mat-cell, td');
      await expect(tabla.filter({ hasText: 'admin@juice-sh.op' }).first()).toBeVisible();
      await expect(tabla.filter({ hasText: 'jim@juice-sh.op' }).first()).toBeVisible();
      paso('La tabla de usuarios aparece: escalada de privilegios lograda');
    });

    await page.screenshot({ path: evidencia('03-administracion-sqli.png'), fullPage: true });
  }, 60000);

  // ------------------------------------------------------------------ 04 ---
  test('04 - Inyeccion SQL en el buscador filtra el error del servidor', async ({ page }) => {
    await test.step('Buscar un texto que rompe la consulta SQL', async () => {
      // Como haria una persona: escribir en el buscador y presionar Enter.
      // El  %  rompe la consulta LIKE del servidor.
      await prepararPagina(page, '/#/search');
      const buscar = page.locator('mat-toolbar input').first();
      await buscar.fill("'%");
      await buscar.press('Enter');
      await page.waitForTimeout(1500);
      expect(page.url()).toContain('q=');
      paso(`Busqueda enviada (URL: ${decodeURIComponent(page.url()).slice(0, 60)}...)`);
    });

    await test.step('Ver el error crudo que devuelve el servidor', async () => {
      // La misma busqueda, vista directamente en el navegador: la respuesta
      // incluye el error SQL interno de la base de datos (informacion que
      // nunca deberia llegar al usuario final).
      const respuesta = await page.goto(`${URL_JUICE}/rest/products/search?q=%27%25`, {
        waitUntil: 'domcontentloaded',
      });
      expect(respuesta.status()).toBe(500);
      await expect(page.getByText('SQLITE_ERROR')).toBeVisible();
      paso('El servidor respondio 500 y mostro el error interno SQLITE_ERROR');
    });

    await page.screenshot({ path: evidencia('04-sqli-buscador-stacktrace.png'), fullPage: true });
  }, 45000);

  // ------------------------------------------------------------------ 05 ---
  test('05 - XSS en el buscador ejecuta JavaScript en el navegador', async ({ page }) => {
    const dialogos = [];
    // Antes de disparar el XSS hay que registrar el manejador de ventanas
    // emergentes (alert) para poder leer su contenido. La pausa de 1200 ms
    // permite VER la alerta cuando el navegador corre en modo visible.
    page.on('dialog', async (dialogo) => {
      dialogos.push({ tipo: dialogo.type(), mensaje: dialogo.message() });
      await page.waitForTimeout(1200);
      await dialogo.accept().catch(() => {});
    });

    await test.step('Escribir el payload XSS en el buscador', async () => {
      await prepararPagina(page, '/#/search');
      const buscar = page.locator('mat-toolbar input').first();
      await buscar.fill('<iframe src="javascript:alert(`xss`)">');
      await buscar.press('Enter');
      paso('Payload XSS enviado desde el buscador');
    });

    await test.step('Verificar que la alerta se ejecuto', async () => {
      await expect
        .poll(async () => dialogos.length, { timeout: 10000 })
        .toBeGreaterThan(0);
      expect(dialogos[0].tipo).toBe('alert');
      expect(dialogos[0].mensaje).toBe('xss');
      paso('El navegador ejecuto JavaScript inyectado: alert("xss")');
    });

    await page.screenshot({ path: evidencia('05-xss-buscador.png'), fullPage: true });
  }, 45000);

  // ------------------------------------------------------------------ 06 ---
  test('06 - Directorio /ftp/ expuesto con archivos internos', async ({ page }) => {
    await test.step('Navegar directo al directorio /ftp/', async () => {
      // Esta pagina no es la aplicacion: es el listado crudo de archivos
      // que sirve el servidor de estaticos, sin pedir ninguna sesion.
      await page.goto(`${URL_JUICE}/ftp/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      paso('El listado de archivos del servidor es publico');
    });

    await test.step('Verificar archivos sensibles en el listado', async () => {
      await expect(page.getByText('acquisitions.md')).toBeVisible();
      await expect(page.getByText('coupons_2013.md.bak')).toBeVisible();
      await expect(page.getByText('incident-support.kdbx')).toBeVisible();
      paso('Se ven backups, coupons y hasta una base de contrasenas (.kdbx)');
    });

    await page.screenshot({ path: evidencia('06-ftp-expuesto.png'), fullPage: true });
  });

  // ------------------------------------------------------------------ 07 ---
  test('07 - Documento confidencial accesible sin autenticacion', async ({ page }) => {
    await test.step('Abrir el documento confidencial por URL directa', async () => {
      // Nadie inicio sesion en esta prueba y aun asi se puede leer
      // el documento interno "Planned Acquisitions".
      await page.goto(`${URL_JUICE}/ftp/acquisitions.md`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText(/confidential/i)).toBeVisible();
      paso('El documento marca "confidential" se lee SIN iniciar sesion');
    });

    await test.step('Verificar que es el contenido interno de la empresa', async () => {
      await expect(page.getByText(/Planned Acquisitions/i)).toBeVisible();
      paso('Contenido interno de fusiones y adquisiciones expuesto');
    });

    await page.screenshot({ path: evidencia('07-ftp-doc-confidencial.png'), fullPage: true });
  });

  // ------------------------------------------------------------------ 08 ---
  test('08 - Registro de usuario con email VACIO (validacion solo en el frontend)', async ({ page }) => {
    await test.step('Intentar registrarse con email en blanco en la pagina', async () => {
      await prepararPagina(page, '/#/register');
      // La interfaz SI valida: llena todo, pero con un email de solo espacios.
      await page.locator('#emailControl').fill(' ');
      await page.locator('#passwordControl').fill('Xy1#alumnopass');
      await page.locator('#repeatPasswordControl').fill('Xy1#alumnopass');
      await page.locator('mat-select').first().click();
      await page.locator('mat-option').first().click();
      await page.locator('#securityAnswerControl').fill('perro');
      // El boton queda deshabilitado: la validacion existe SOLO en el navegador.
      await expect(page.locator('#registerButton')).toBeDisabled();
      paso('El frontend bloquea el registro: pero eso no protege al servidor');
    });

    await test.step('Repetir el registro directo contra la API', async () => {
      // La misma persona, pero saltandose la interfaz (como haria con curl
      // o con la pestana de red del navegador). El servidor NO repite
      // la validacion del email.
      const respuesta = await page.request.post(`${URL_JUICE}/api/Users/`, {
        data: {
          email: ' ',
          password: 'Xy1#alumnopass',
          passwordRepeat: 'Xy1#alumnopass',
          role: 'customer',
        },
      });
      const cuerpo = await respuesta.json().catch(() => null);

      if (respuesta.status() === 201) {
        // Primer caso: el servidor acepta crear la cuenta sin email.
        expect(String(cuerpo?.data?.email ?? '').trim()).toBe('');
        paso('El servidor ACEPTO crear un usuario SIN email (201 Created)');
      } else {
        // Corridas siguientes: el email " " ya esta ocupado por una cuenta
        // en blanco creada antes. Que EXISTA esa cuenta prueba lo mismo.
        expect(respuesta.status()).toBe(400);
        expect(JSON.stringify(cuerpo)).toMatch(/unique/i);
        paso('Ya existe una cuenta con email VACIO: el servidor nunca valido esto');
      }
    });

    await page.screenshot({ path: evidencia('08-registro-email-vacio.png'), fullPage: true });
  }, 45000);

  // ------------------------------------------------------------------ 09 ---
  test('09 - IDOR: leer el carrito de compras de OTRO usuario', async ({ page }) => {
    const email = `alumno-${Date.now()}@test.com`;
    const contrasena = 'Prueba#12345';

    await test.step('Crear una cuenta normal (sin privilegios)', async () => {
      const registro = await page.request.post(`${URL_JUICE}/api/Users/`, {
        data: { email, password: contrasena, passwordRepeat: contrasena, role: 'customer' },
      });
      expect(registro.status()).toBe(201);
      paso(`Cuenta comun creada: ${email}`);
    });

    await test.step('Iniciar sesion con esa cuenta', async () => {
      await iniciarSesion(page, email, contrasena);
      paso('Sesion iniciada como cliente normal');
    });

    await test.step('Pedir el carrito de otro usuario (ID 2)', async () => {
      // IDOR (Insecure Direct Object Reference): cambiar el numero del
      // carrito en la peticion. El servidor NO verifica que el carrito 2
      // pertenezca a quien pregunta.
      const token = await page.evaluate(() => localStorage.getItem('token'));
      const respuesta = await page.request.get(`${URL_JUICE}/rest/basket/2`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(respuesta.status()).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo.data.UserId).toBe(2);
      paso(`Carrito ajeno leido: pertenece al usuario 2 (no a ${email})`);
    });

    await page.screenshot({ path: evidencia('09-idor-carrito.png'), fullPage: true });
  }, 60000);

  // ------------------------------------------------------------------ 10 ---
  test('10 - Panel de desafios oculto accesible por URL (/#/score-board)', async ({ page }) => {
    await test.step('Navegar a la URL "secreta" del panel de desafios', async () => {
      // No aparece en ningun menu: se confia en que "nadie la conoce".
      // Eso es security by obscurity: la seguridad NO debe depender de
      // que un atacante no adivine una URL.
      await prepararPagina(page, '/#/score-board');
      await page.waitForTimeout(2500);
      await expect(page.getByText(/Challenges Solved/)).toBeVisible();
      paso('El panel oculto cargo sin problemas');
    });

    await test.step('Ver el listado de los errores de seguridad', async () => {
      // El panel lista los desafios de hacking... incluidos los que
      // acabamos de demostrar en las pruebas 01 a 09.
      await expect(page.getByText('Login Admin')).toBeVisible();
      paso('El panel publica los desafios (ej: "Login Admin") = mapa del atacante');
    });

    await page.screenshot({ path: evidencia('10-score-board.png'), fullPage: true });
  }, 45000);
});
