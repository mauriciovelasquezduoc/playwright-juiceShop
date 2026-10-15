// ---------------------------------------------------------------------------
// servidor.js
// Servidor estatico minimo (sin dependencias) para publicar la carpeta demo/.
// Se usa para que la pagina de prueba viva en http://localhost:3000 y no en
// file://, de modo que la grabacion y el test generado sean portables.
//
// Si el puerto ya esta ocupado por otra aplicacion (por ejemplo, cuando
// Juice Shop corre en 3000), NO se levanta la demo: se reutiliza el servidor
// existente, igual que hace el webServer de playwright.config.js
// (reuseExistingServer: true). Asi  node src/grabar.js  no muere con
// EADDRINUSE y se puede grabar directamente contra http://localhost:3000.
// ---------------------------------------------------------------------------

const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', 'demo');
const PUERTO = Number(process.env.PORT || 3000);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function crearServidor() {
  return http.createServer((req, res) => {
    const urlLimpia = decodeURIComponent(req.url.split('?')[0]);
    const relativo = urlLimpia === '/' ? 'index.html' : urlLimpia.replace(/^\/+/, '');
    const rutaArchivo = path.join(RAIZ, relativo);

    // Evita salir de la carpeta demo/ (path traversal)
    if (!rutaArchivo.startsWith(RAIZ)) {
      res.writeHead(403);
      return res.end('Prohibido');
    }

    fs.readFile(rutaArchivo, (error, contenido) => {
      if (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Recurso no encontrado: ' + relativo);
      }
      const tipo = TIPOS[path.extname(rutaArchivo)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': tipo });
      res.end(contenido);
    });
  });
}

// Comprueba si ya hay algun servidor respondiendo en el puerto.
function puertoOcupado(puerto = PUERTO) {
  return new Promise((resolver) => {
    const consulta = http.get(
      { host: 'localhost', port: puerto, path: '/', timeout: 2000 },
      (respuesta) => {
        respuesta.resume();
        resolver(true); // respondio: hay un servidor arriba
      }
    );
    consulta.on('timeout', () => {
      consulta.destroy();
      resolver(false);
    });
    consulta.on('error', () => resolver(false)); // nadie escucha ahi
  });
}

// Permite iniciar el servidor en segundo plano desde otro script (grabar.js).
// Devuelve el servidor creado, o null si el puerto ya estaba ocupado.
async function iniciar() {
  if (await puertoOcupado()) return null;
  return new Promise((resolver, rechazar) => {
    const servidor = crearServidor();
    servidor.on('error', (error) => {
      // Si alguien ocupo el puerto mientras tanto, se reutiliza igual.
      if (error.code === 'EADDRINUSE') resolver(null);
      else rechazar(error);
    });
    servidor.listen(PUERTO, () => resolver(servidor));
  });
}

module.exports = { crearServidor, iniciar, puertoOcupado, PUERTO };

// Si se ejecuta directamente: node src/servidor.js
if (require.main === module) {
  iniciar()
    .then((servidor) => {
      if (servidor) console.log(`> Pagina de demo disponible en http://localhost:${PUERTO}`);
      else console.log(`> El puerto ${PUERTO} ya esta ocupado: se reutiliza ese servidor.`);
    })
    .catch((error) => {
      console.error('No se pudo iniciar el servidor:', error.message);
      process.exit(1);
    });
}
