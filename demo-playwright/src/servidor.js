// ---------------------------------------------------------------------------
// servidor.js
// Servidor estatico minimo (sin dependencias) para publicar la carpeta demo/.
// Se usa para que la pagina de prueba viva en http://localhost:3000 y no en
// file://, de modo que la grabacion y el test generado sean portables.
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

// Permite iniciar el servidor en segundo plano desde otro script (grabar.js)
function iniciar() {
  return new Promise((resolver, rechazar) => {
    const servidor = crearServidor();
    servidor.on('error', rechazar);
    servidor.listen(PUERTO, () => resolver(servidor));
  });
}

module.exports = { crearServidor, iniciar, PUERTO };

// Si se ejecuta directamente: node src/servidor.js
if (require.main === module) {
  iniciar()
    .then(() => console.log(`> Pagina de demo disponible en http://localhost:${PUERTO}`))
    .catch((error) => {
      console.error('No se pudo iniciar el servidor:', error.message);
      process.exit(1);
    });
}
