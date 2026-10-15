# demo-playwright

Demo educativa: **de una prueba manual a una prueba automatizada de navegador**
usando **Node.js + Playwright**.

Pensada para clases de *Pruebas de Software*, *Calidad de Software* o *DevOps*.

---

## 1. ¿Qué es una prueba automatizada?

Una **prueba manual** es lo que hacemos a diario: abrimos el navegador,
hacemos click, escribimos datos y revisamos con nuestros ojos si el resultado
es el esperado.

Una **prueba automatizada** es ese mismo flujo, pero escrito como **código**
que una herramienta (Playwright) puede **repetir sola**, todas las veces que
queramos, y que además **verifica** si el resultado es correcto (PASS) o no (FAIL).

La prueba automatizada no "solo hace clicks": también **comprueba resultados**.

---

## 2. ¿Qué estamos demostrando?

```text
Prueba manual
      |
      v
Registro de acciones      (node src/grabar.js)
      |
      v
Código Playwright         (tests/test-generado.spec.js)
      |
      v
Ejecución automática      (node src/ejecutar.js)
      |
      v
Assertions (verificaciones)
      |
      v
Evidencia (screenshots en resultados/)
      |
      v
PASS / FAIL
```

Al final del ciclo de vida, este mismo concepto evoluciona así:

```text
Playwright  ->  Tests automatizados  ->  Git  ->  GitHub
            ->  GitHub Actions  ->  Pipeline CI/CD
            ->  Test automático  ->  PASS / FAIL
```

---

## 3. Instalación

Requisitos: **Node.js 18+** y **npm**.

```bash
npm install
npx playwright install chromium
```

> `npm install` instala Playwright Test. `npx playwright install chromium`
> descarga el navegador Chromium que usarán la grabación y los tests.

---

## 4. Uso paso a paso

### 4.1 Grabar las acciones (prueba manual)

```bash
node src/grabar.js
```

Se abre Chromium. Realiza el flujo **a mano**, por ejemplo:

1. Escribe `admin` en **Usuario**.
2. Escribe `admin123` en **Contrasena**.
3. Haz click en **Ingresar**.

Luego **cierra la ventana del navegador**. Al cerrarse, el programa:

* genera `tests/test-generado.spec.js` (código Playwright comentado),
* guarda `resultados/grabacion.json` (las acciones registradas),
* toma `resultados/inicio.png`.

> La página de demo (`demo/index.html`) se publica automáticamente en
> `http://localhost:3000` con un servidor local integrado (`src/servidor.js`).

Si quieres grabar otra URL o definir el texto esperado:

```bash
node src/grabar.js --url=http://localhost:3000 --esperado="Login exitoso"
```

### 4.2 Ejecutar el test generado (prueba automática)

```bash
node src/ejecutar.js
```

Por debajo ejecuta `tests/test-generado.spec.js` con Playwright Test y muestra
en consola cada etapa y el resultado:

```text
===========================================================
  EJECUCION AUTOMATIZADA DEL FLUJO GRABADO
===========================================================
  Modo     : visible
  Velocidad: normal
  Escenario: camino feliz
-----------------------------------------------------------
  ✓ Navegacion a la pagina
  ✓ Ingreso de datos en campo 'Usuario'
  ✓ Ingreso de datos en campo 'Contrasena'
  ✓ Click en boton 'Ingresar'
  ✓ Validacion del resultado esperado

  1 passed

================================
      RESULTADO DE LA PRUEBA
================================
  RESULTADO: PASS
================================
```

### 4.3 Modo lento (para explicar en clase)

```bash
node src/ejecutar.js --slow
```

Cada acción tarda un poco más, para que el curso vea **qué hace** la automatización.

### 4.4 Modo headless (como en CI/CD)

```bash
node src/ejecutar.js --headless
```

No abre ventana. Así se ejecutan las pruebas en un servidor o pipeline.

### 4.5 Demostrar un FAIL

```bash
node src/ejecutar.js --fail
```

Ejecuta el mismo flujo pero con **contraseña incorrecta** y con una
verificación que espera `Login exitoso`. Como el resultado real es
`Credenciales invalidas`, la prueba **falla** a propósito:

```text
================================
      RESULTADO DE LA PRUEBA
================================
  RESULTADO: FAIL
================================
```

Esto demuestra que una automatización **detecta** cuando algo no cumple lo esperado.

---

## 5. Reporte HTML

Playwright genera un reporte navegable con nombre del test, PASS/FAIL, duración,
errores, screenshots y trazas:

```bash
npx playwright show-report
```

---

## 6. Evidencias

Los screenshots se guardan en `resultados/`:

```text
resultados/
├── inicio.png            # página apenas abre
├── paso-02.png           # tras escribir usuario
├── paso-03.png           # tras escribir contraseña
├── paso-04.png           # tras hacer click
├── resultado-final.png   # estado final del flujo
├── fallo.png             # (solo con --fail)
├── grabacion.json        # acciones registradas
└── grabacion-cruda.js    # salida cruda de Codegen
```

---

## 7. Estructura del proyecto

```text
demo-playwright/
├── package.json               # dependencias y scripts
├── playwright.config.js       # config de Playwright Test + servidor de demo
├── README.md
├── src/
│   ├── grabar.js              # 1) graba acciones manuales (Codegen)
│   ├── generar-test.js        # 2) traduce la grabación a un test
│   ├── ejecutar.js            # 3) ejecuta el test y muestra PASS/FAIL
│   └── servidor.js            # servidor estático de la página demo
├── demo/
│   └── index.html             # página de prueba controlada (login)
├── tests/
│   └── test-generado.spec.js  # test Playwright generado
├── screenshots/
└── resultados/
```

---

## 8. Arquitectura (breve)

```text
   ┌────────────┐   acciones   ┌──────────────┐
   │  Usuario   │─────────────▶│  grabar.js   │  Playwright Codegen
   └────────────┘              └──────┬───────┘
                                      │ grabacion-cruda.js
                                      ▼
                               ┌──────────────┐
                               │ generar-test │  parsea y comenta
                               └──────┬───────┘
                                      │ test-generado.spec.js
                                      ▼
   ┌────────────┐   PASS/FAIL  ┌──────────────┐
   │  Usuario   │◀─────────────│ ejecutar.js  │  Playwright Test
   └────────────┘              └──────┬───────┘
                                      │
                        screenshots   ▼        reporte HTML
                     resultados/  ◀────▶  playwright-report/
```

* **`servidor.js`**: sirve `demo/` en `http://localhost:3000` (sin dependencias).
* **`grabar.js`**: usa `playwright codegen` para capturar acciones reales.
* **`generar-test.js`**: convierte cada acción en una línea de código Playwright
  con comentarios y descripciones en español.
* **`ejecutar.js`**: envuelve `playwright test`, activa `--slow` / `--headless`
  y resume el resultado en PASS/FAIL.
* **`playwright.config.js`**: `webServer` levanta la demo automáticamente para
  los tests; `reporter` produce salida en consola y reporte HTML.

---

## 9. Credenciales de la página demo

| Campo      | Valor válido |
|------------|--------------|
| Usuario    | `admin`      |
| Contraseña | `admin123`   |

Cualquier otro valor muestra `Credenciales invalidas`.

---

## 10. Comandos rápidos

```bash
npm install
npx playwright install chromium

node src/grabar.js                 # grabar la prueba manual
node src/ejecutar.js               # ejecutar (navegador visible)
node src/ejecutar.js --slow        # ejecución lenta
node src/ejecutar.js --headless    # sin ventana (CI/CD)
node src/ejecutar.js --fail        # demostrar un FAIL
npx playwright show-report         # ver reporte HTML
```
