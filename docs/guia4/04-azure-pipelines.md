# Azure Pipelines — preparación y operación

Estado: YAML preparado para GitHub. **Esta auditoría no acredita ejecuciones Azure,
conexión ni políticas activas. No se han creado PR durante este trabajo.** Resultados
actuales en `08-validacion-migracion.md`; no sustituyen evidencias de Azure.

## Estructura de `azure-pipelines.yml`

`trigger: none` evita ejecuciones CI por push. `pr.branches.include` contiene solo
development, staging y production, sin filtros de rutas que pudieran omitir validaciones.
Los PR draft no se ejecutan hasta marcarlos listos. Hay cuatro jobs independientes:
un fallo de cualquiera hace fallar el pipeline. No existe `continueOnError`.
No hay comandos de despliegue, merge ni push. Checkout sin credenciales persistidas.

| Job | Validación y criterio de fallo | Reportes |
| --- | --- | --- |
| Tests | Node 22.23.3, `npm ci`, runner nativo `node:test`, c8 12.0.0; cualquier prueba fallida o menos de 70 % por archivo en líneas, sentencias, funciones o ramas | JUnit, Cobertura, HTML, LCOV y resumen JSON |
| SAST | Semgrep 1.185.0 sobre todo `src`, reglas `p/javascript` y `p/nodejs`; `--error --strict` bloquea hallazgos y errores de análisis | SARIF y JSON |
| Dependencies | OWASP Dependency-Check 13.0.0, Java 21; CVSS >= 7 o error operativo bloquea | HTML, JSON y SARIF |
| Secrets | Gitleaks 8.30.1 sobre historial Git descargado completo (`fetchDepth: 0`, `--all`); cualquier secreto bloquea | SARIF con redacción completa |

Los reportes se publican con `succeededOrFailed()`, sin convertir fallos en éxito.
Un fallo durante instalación puede impedir generar el reporte; conservar también
el log del job. Un pipeline cancelado o sin ejecutar no acredita ninguna validación.
Las descargas de Gitleaks y Dependency-Check verifican SHA-256 fijado contra la
release oficial; al actualizar versión se debe actualizar y verificar el checksum.
Los conjuntos de reglas del registro Semgrep pueden evolucionar; registrar versión,
IDs de reglas y fecha de cada ejecución. La instalación de aplicación es reproducible
mediante package-lock; esto no congela los feeds de vulnerabilidades ni reglas remotas.

## Cobertura y ejecución local

No existía framework de tests; se usa el runner incorporado en Node. c8 es solo
dependencia de desarrollo para publicar cobertura compatible con Azure. `.c8rc.json`
incluye completos validador, servicio y controlador de mascotas, con `all: true` y
`per-file: true`, para no ocultar archivos sin ejecutar. No se presenta esa cobertura
como cobertura global del backend. Tests mockean persistencia; no necesitan PostgreSQL
ni secretos Auth0. La prueba de JWT sin credencial usa la ruta real.

```bash
# En WSL con Node 22.23.3 activo
npm ci --no-audit --no-fund
npm test
npm run test:coverage
```

No había lint configurado; no se inventa una ejecución de lint. Se comprobó sintaxis
de JavaScript con `node --check`. SAST es una validación distinta.

## OWASP Dependency-Check y NVD

- Java 21 se selecciona explícitamente en el agente Ubuntu 24.04.
- `scripts/dependency-check.py` analiza package.json y package-lock.json, incluidas
  dependencias de desarrollo. No deshabilita Node Audit ni suprime vulnerabilidades.
- Crear `NVD_API_KEY` como variable secreta del pipeline. No ponerla en YAML,
  archivos .env versionados, capturas o parámetros de línea de comandos.
- El wrapper entrega la clave mediante archivo temporal privado (0600), elimina
  el archivo al terminar y no transmite la clave como argumento al proceso.
  Si falta o Azure deja el marcador sin resolver, falla con código 2 y sin imprimirla.
- Cache@2 conserva el directorio NVD por SO, versión de herramienta y lockfile;
  restoreKeys permite reutilización. Se verifica actualización cada 24 horas;
  no se usa `--noupdate`. Los primeros datos pueden tardar decenas de minutos.
- El job tiene 60 minutos. Si no basta, preparar una carga inicial controlada con
  clave válida/caché; no omitir el análisis ni aceptar un job fallido como evidencia.
  Cachés de Azure son inmutables y el alcance de PR puede limitar su reutilización;
  puede ser necesario actualizar el identificador de caché de forma revisada.
- Sin clave NVD ni base local no se acredita una ejecución OWASP completa. Un
  `npm audit` complementario no reemplaza OWASP Dependency-Check.
- CVSS >= 7 es el umbral inicial explícito. Hallazgos menores siguen en el reporte
  y requieren seguimiento; no se excluyen ni se declaran corregidos.

## Activación manual controlada

El orden obligatorio está en [07-migracion-flujo-existente.md](07-migracion-flujo-existente.md).
Primero suspender el workflow antiguo en GitHub y cancelar/verificar sus ejecuciones.
Esta preparación no ha realizado esas acciones administrativas.

Crear el pipeline desde **Existing Azure Pipelines YAML**, repositorio AdoPet,
rama `feature/preparacion-flujo-existente`, ruta `/azure-pipelines.yml`. Esa rama
incluye HU-01 y la migración. La rama original `feature/hu-01-validacion-mascotas`
mantiene los filtros antiguos y **no debe usarse sin actualizarla**.
No crear develop/integration ni usar main como destino de esta guía.

Configurar `NVD_API_KEY` secreta, pool y conexión GitHub. Tras obtener el nombre
real del check, exigirlo en GitHub para development, staging y production, además
de revisión, actualización de rama y prohibición de bypass/push directo/force push.
Un check requerido sin ejecución debe bloquear; no quitarlo para destrabar el PR.

Azure valida el commit combinado del PR y su YAML combinado: revisar el SHA,
la ruta del YAML, los tres filtros y los cuatro jobs de la ejecución real.
Seleccionar una rama predeterminada para ejecuciones manuales no fuerza el YAML
de todos los PR. Una ejecución manual de feature no sustituye el check del PR.

La compilación real en Azure, las políticas y la prueba de bloqueo siguen pendientes.
No cambiar filtros, omitir jobs ni aceptar `skipped`/`neutral` como prueba de que
se ejecutaron las cuatro validaciones. No habilitar secretos para forks no confiables.
Revisar cambios de YAML y scripts porque la rama origen puede alterar el pipeline.

## Fuentes oficiales

- [Azure Pipelines y PR de GitHub](https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/github?view=azure-devops).
- [CLI de Dependency-Check](https://dependency-check.github.io/DependencyCheck/dependency-check-cli/arguments.html).
- [Release Dependency-Check 13.0.0](https://github.com/dependency-check/DependencyCheck/releases/tag/v13.0.0).
- [Semgrep CLI](https://semgrep.dev/docs/cli-reference).
- [Gitleaks](https://github.com/gitleaks/gitleaks).
- [c8 y controles de cobertura](https://github.com/bcoe/c8).
