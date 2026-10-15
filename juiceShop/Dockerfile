# syntax=docker/dockerfile:1
# =============================================================================
#  SUT (System Under Test) - Laboratorio 2.3.2
#  Asignatura: ISY1102 - Seguridad y Calidad en el Desarrollo de Software
#
#  OWASP Juice Shop: aplicación web real y "rota por diseño" para practicar
#  ejecución de pruebas, evidencia y reporte de defectos.
#
#  IMPORTANTE
#  ----------
#  NO necesitas construir la aplicación desde cero ni escribir código Node.js.
#  OWASP publica una IMAGEN OFICIAL YA FUNCIONANDO. Aquí la EXTENDEMOS para
#  dejar el entorno de laboratorio reproducible y observable.
#
#  La imagen oficial es MINIMALISTA (sin shell, sin wget/curl):
#    Entrypoint: /nodejs/bin/node
#    Cmd:        /juice-shop/build/app.js
#  Por eso el healthcheck se escribe en forma "exec" usando el binario de Node.
#
#  ADVERTENCIA DE USO
#  ------------------
#  Esta aplicación es DELIBERADAMENTE INSEGURA. Úsala SOLO en el laboratorio
#  y en tu equipo local. NO la expongas a Internet ni la uses para atacar
#  sistemas que no te pertenecen.
# =============================================================================

FROM bkimminich/juice-shop:latest

# ---- Metadatos del entorno de laboratorio --------------------------------
LABEL org.opencontainers.image.title="Juice Shop - Laboratorio ISY1102"
LABEL org.opencontainers.image.description="SUT deliberadamente vulnerable para la Actividad 2.3.2 (QA y seguridad)"
LABEL isy1102.actividad="2.3.2"
LABEL isy1102.uso="Solo laboratorio local - NO exponer a Internet"

# ---- Configuración del entorno -------------------------------------------
# Juice Shop es una app Node.js/Express y escucha en el puerto 3000.
EXPOSE 3000

# Entorno de ejecución normal de la aplicación.
ENV NODE_ENV=production

# ---- Healthcheck ---------------------------------------------------------
# Verifica que el SUT responde ANTES de empezar a probar (humo automático).
# Forma "exec" (sin shell) porque la imagen no incluye /bin/sh.
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD ["/nodejs/bin/node", "-e", "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]

# ---- Comando de inicio ---------------------------------------------------
# La imagen base ya define Entrypoint (/nodejs/bin/node) y Cmd
# (/juice-shop/build/app.js). No los sobreescribimos para no romper el arranque.
# ---------------------------------------------------------------------------
