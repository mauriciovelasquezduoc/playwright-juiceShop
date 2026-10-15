# Pruebas automatizadas de seguridad sobre OWASP Juice Shop

Material del laboratorio (ISY1102): una suite de **10 pruebas automatizadas** con
Playwright que buscan los **errores de seguridad típicos** de Juice Shop, diseñada
para ejecutarse con el **navegador visible**, de modo que los alumnos vean cómo
se levanta un browser y cómo la prueba actúa **como si fuera una persona**
(navega, escribe, hace click) y además **verifica** resultados (PASS / FAIL).

---

## 1. ¿Qué es demo-playwright?

`demo-playwright/` es un proyecto educativo de **Node.js + Playwright** que
demuestra la evolución de una prueba manual a una prueba automatizada:

```text
Prueba manual            (una persona hace el flujo en el navegador)
      |
      v
Grabar las acciones      node src/grabar.js     (Playwright Codegen)
      |
      v
Traducirlas a codigo     src/generar-test.js    -> tests/test-generado.spec.js
      |
      v
Ejecutar solo           node src/ejecutar.js   (navegador visible)
      |
      v
Verificar resultados     assertions -> PASS / FAIL + evidencia (screenshots)
```

Componentes del proyecto:

| Archivo | Rol |
|---|---|
| `src/servidor.js` | Sirve la página demo en el puerto 3000 (sin dependencias) |
| `src/grabar.js` | **Paso 1**: abre Chromium con Playwright Codegen para grabar acciones manuales |
| `src/generar-test.js` | **Paso 2**: traduce la grabación cruda a un test Playwright limpio y comentado |
| `src/ejecutar.js` | **Paso 3**: ejecuta el test generado (`--slow`, `--headless`, `--fail`) |
| `playwright.config.js` | Configuración: workers=1, reporte HTML y `webServer` en el puerto 3000 |
| `tests/` | Los archivos de prueba (`.spec.js`) |
| `resultados/` | Evidencia: capturas PNG y grabaciones |

> Nota: como Juice Shop **ya ocupa el puerto 3000**, Playwright lo detecta con
> `reuseExistingServer: true` y lo reutiliza (no levanta la página demo).

---

## 2. ¿Cómo se genera una prueba?

### 2.1 El flujo de la demo (grabar → generar → ejecutar)

1. **Grabar** (`node src/grabar.js`): se abre Chromium en modo visible. La
   persona realiza el flujo a mano (escribir usuario, contraseña, click en
   "Ingresar"...). Al **cerrar la ventana**, Codegen deja la grabación cruda en
   `resultados/grabacion-cruda.js`.

2. **Generar** (`src/generar-test.js`): el traductor convierte cada acción
   grabada (`goto`, `fill`, `click`...) en una línea de código Playwright con
   comentarios en español, y agrega la **validación final** (el texto esperado).
   El resultado es `tests/test-generado.spec.js`.

3. **Ejecutar** (`node src/ejecutar.js`): corre el test con el navegador
   visible, imprime cada paso en consola (`✓ Ingreso de datos en campo
   'Usuario'`...) y resume el resultado: **PASS** o **FAIL**.

### 2.2 Anatomía de una prueba Playwright

Toda prueba (la generada y las de Juice Shop) tiene la misma estructura:

```js
const { test, expect } = require('@playwright/test');

test('lo que se esta probando', async ({ page }) => {
  // 1) Navegar: abrir la pagina (como escribir la URL en el navegador)
  await page.goto('http://localhost:3000/#/login');

  // 2) Actuar: escribir y hacer click, como lo haria una persona
  await page.locator('#email').fill('admin@juice-sh.op');
  await page.locator('#password').fill('admin123');
  await page.locator('#loginButton').click();

  // 3) VERIFICAR: la automatizacion no solo hace clicks, tambien comprueba
  await expect(page.getByText('admin@juice-sh.op')).toBeVisible();
});
```

* `test('...')` — define UN caso de prueba. Playwright le entrega un
  **navegador nuevo y aislado** (como una persona entrando por primera vez).
* `await page.goto(...)` — navegar a una URL.
* `await page.locator(...).fill(...)` / `.click()` — actuar sobre elementos.
* `await expect(...).toBeVisible()` — **assertion**: la verificación que decide
  PASS / FAIL.
* `await test.step('...', ...)` — agrupa acciones con un nombre legible
  (aparece en consola y en el reporte).
* `await page.screenshot({ path: ... })` — guarda **evidencia** (PNG).

---

## 3. La suite: 10 errores típicos de Juice Shop

Archivo: `demo-playwright/tests/juice-shop.spec.js`. Cada prueba reproduce el
ataque clásico "a mano" y verifica la falla:

| # | Prueba | Qué demuestra | Categoría OWASP |
|---|---|---|---|
| 01 | Credenciales por defecto (`admin123`) | El administrador sigue usando la contraseña de fábrica | Security Misconfiguration |
| 02 | Inyección SQL en el login (`' OR 1=1--`) | Entra **sin contraseña** y termina siendo el admin | Injection |
| 03 | Sección de administración con sesión robada | Con el login inyectado lee la lista completa de usuarios | Broken Access Control |
| 04 | Inyección SQL en el buscador (`'%%`) | El servidor responde 500 y filtra el error interno `SQLITE_ERROR` | Injection + Info Disclosure |
| 05 | XSS en el buscador (`<iframe src="javascript:alert(...)">`) | El navegador **ejecuta** JavaScript inyectado (`alert`) | Cross-Site Scripting |
| 06 | Directorio `/ftp/` expuesto | Listado público de archivos internos (backups, `.kdbx`) | Sensitive Data Exposure |
| 07 | Documento confidencial accesible | `acquisitions.md` se lee sin iniciar sesión | Sensitive Data Exposure |
| 08 | Registro con email **vacío** | La validación existe solo en el frontend; el servidor acepta | Validación de entradas |
| 09 | IDOR: carrito ajeno | Un usuario común lee el carrito de otro usuario | Broken Access Control |
| 10 | Panel oculto `/#/score-board` | URL "secreta" accesible: security by obscurity | Misconfiguration |

Detalles didácticos incluidos:

* Cada prueba abre **cerrando los banners de bienvenida y cookies**, como haría
  una persona la primera vez que entra a la tienda.
* Cada acción está agrupada en `test.step` y comentada en español: la prueba se
  puede **leer como un guion**.
* Al final de cada prueba se guarda una captura como evidencia.

---

## 4. Requisitos

1. **Juice Shop corriendo** en `http://localhost:3000`:

   ```bash
   cd juiceShop
   docker compose up -d --build
   docker compose ps     # debe aparecer "healthy"
   ```

2. **Node.js funcional**. En este equipo el `node` de `/usr/local` está roto
   (`libllhttp`); usar el de **nvm** (v24.15.0):

   ```bash
   source ~/.nvm/nvm.sh
   nvm use default        # resuelve a v24.15.0
   node --version         # sanity check
   ```

3. Dependencias del proyecto (ya instaladas en `demo-playwright/node_modules`):

   ```bash
   cd demo-playwright
   npm install                       # solo si falta node_modules
   npx playwright install chromium    # solo si falta el navegador
   ```

> Todas los comandos siguientes se ejecutan **dentro de `demo-playwright/`**
> y con el Node de nvm activado.

---

## 5. Cómo ejecutar la suite (guion para la clase)

### 5.1 Navegador visible (la demo principal)

```bash
npx playwright test tests/juice-shop.spec.js --headed
```

Los alumnos verán:

1. Se **levanta Chromium** en una ventana.
2. La prueba **navega, escribe y hace click como una persona** (login, búsquedas,
   banners...). En la prueba 05 aparece una **alerta de XSS** real.
3. La consola imprime cada paso (`✓ El servidor acepto el login SIN
   credenciales validas`).
4. Al final: `10 passed` y las evidencias PNG.

### 5.2 Modo cámara lenta (para explicar mientras ocurre)

```bash
SLOWMO=700 npx playwright test tests/juice-shop.spec.js --headed
```

Cada acción tarda ~0,7 s más: ideal para narrar el ataque en pantalla.

### 5.3 Solo una prueba (ej. la de SQL injection)

```bash
npx playwright test tests/juice-shop.spec.js --headed --grep "SQL"
npx playwright test tests/juice-shop.spec.js --headed --grep "IDOR"
npx playwright test tests/juice-shop.spec.js --headed --grep "01"
```

### 5.4 Modo invisible (como en un pipeline CI/CD)

```bash
npx playwright test tests/juice-shop.spec.js
```

### 5.5 Reporte HTML navegable

```bash
npx playwright show-report
```

Muestra cada prueba con PASS/FAIL, duración, pasos, errores, capturas y trazas.

> **No usar** `npm test` a secas: ejecuta también la demo original
> (`test-generado.spec.js`), que apunta a la página demo de login y fallaría
> con Juice Shop en el puerto 3000. Indicar siempre el archivo
> `tests/juice-shop.spec.js`.

---

## 6. Estructura de archivos generados

```text
captura/
├── juiceShop/                          # SUT (docker compose)
├── demo-playwright/
│   ├── tests/
│   │   ├── test-generado.spec.js       # demo original (no tocar)
│   │   └── juice-shop.spec.js           # <-- LA SUITE DE 10 PRUEBAS
│   ├── resultados/
│   │   └── juice-shop/                 # evidencia PNG de cada prueba
│   │       ├── 01-credenciales-por-defecto.png
│   │       ├── 02-sqli-login-admin.png
│   │       ├── 03-administracion-sqli.png
│   │       ├── 04-sqli-buscador-stacktrace.png
│   │       ├── 05-xss-buscador.png
│   │       ├── 06-ftp-expuesto.png
│   │       ├── 07-ftp-doc-confidencial.png
│   │       ├── 08-registro-email-vacio.png
│   │       ├── 09-idor-carrito.png
│   │       └── 10-score-board.png
│   └── playwright-report/               # reporte HTML (npx playwright show-report)
└── salida/
    └── README.md                       # este documento
```

---

## 7. Notas para re-ejecución

* La suite es **re-ejecutable** sin configurar nada.
* Efectos esperables sobre la instancia (es un laboratorio, es normal):
  * Cada corrida de la prueba 09 crea un usuario desechable
    `alumno-<fecha>@test.com`.
  * La prueba 08 demuestra el registro sin email: la primera corrida que lo
    logre **crea** la cuenta en blanco; las siguientes la **detectan**
    ("email must be unique"), lo que prueba exactamente lo mismo.
* Para dejar la instancia como nueva (datos de fábrica):

  ```bash
  cd juiceShop
  docker compose down -v     # detiene y borra los volúmenes (reset de datos)
  docker compose up -d --build
  ```

---

## 8. Relación con el flujo de demo-playwright

Esta suite no reemplaza la demo `grabar → generar → ejecutar`: la complementa.

1. Con `node src/grabar.js` los alumnos ven que una **prueba nace de acciones
   humanas** grabadas en el navegador.
2. Con `node src/ejecutar.js` ven la automatización de esa grabación.
3. Con `tests/juice-shop.spec.js` ven el mismo concepto aplicado a un
   **objetivo real** (Juice Shop): las mismas acciones (`goto`, `fill`,
   `click`) y el mismo tipo de verificaciones (`expect`) escritas a mano por
   un tester, cazando vulnerabilidades web clásicas.
