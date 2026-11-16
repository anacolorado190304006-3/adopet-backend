# Azure Pipelines — preparación y operación

Estado: YAML preparado para GitHub. **No se ha ejecutado en Azure ni se han creado
el proyecto, la conexión, las políticas o los PR.** Los resultados locales están
en `RESUMEN-TRABAJO-NOCTURNO.md`; no sustituyen las evidencias de Azure.

## Estructura de `azure-pipelines.yml`

`trigger: none` evita ejecuciones CI por push. `pr.branches.include` contiene solo
develop, integration y main, sin filtros de rutas que pudieran omitir validaciones.
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

## Pasos manuales para el 17 de noviembre de 2026

1. En Azure DevOps, crear proyecto **AdoPet — Guía 4**, proceso **Agile**. Invitar
   integrantes con los permisos/licencias necesarios. Registrar evidencia de membresía.
2. Crear EP-01 → FE-01 → HU-01 → T-01…T-06 conforme a `02-historia-usuario.md`.
   Asignar responsables y estimaciones; los códigos locales no son IDs de Azure.
3. En GitHub, crear develop e integration desde
   `816406a38ee9a985dd8ce2daf02f3e409e538453`. Mantener main existente. No tocar
   development, staging ni production. Confirmar diferencias antes de cada PR.
4. En Azure Pipelines → New pipeline → GitHub, instalar/autorizar Azure Pipelines
   GitHub App solo para este repositorio. Seleccionar **Existing Azure Pipelines YAML**,
   rama `feature/hu-01-validacion-mascotas`, archivo `/azure-pipelines.yml`.
   Evitar la opción que crea un YAML o commit en la rama predeterminada development.
5. Nombrar el pipeline `AdoPet-Guia4`; configurar `NVD_API_KEY` secreta en Variables.
   Autorizar la conexión de servicio solo al pipeline. Confirmar acceso al pool
   hospedado y cuota de trabajos paralelos; cuatro jobs pueden ejecutarse en serie
   si solo hay un agente disponible. Revisar que la interfaz no sobrescriba triggers YAML.
6. No habilitar secretos para builds de forks no confiables. Revisar cambios al YAML
   y scripts antes de ejecutar código de PR con secretos. Estos PR usan ramas del mismo repo.
7. Crear PR 1 sin fusionarlo, según `05-plan-pull-requests.md`. Dejar ejecutar el
   pipeline para conocer el nombre exacto del check publicado por la aplicación Azure.
8. En GitHub Settings → Rulesets/Branches, configurar para **develop, integration,
   main**: exigir PR, revisión, checks de Azure realmente observados y rama actualizada;
   restringir pushes directos, impedir force push y eliminación y no permitir bypass
   que eluda los gates académicos. No alterar las reglas del flujo de despliegue.
9. El check requerido debe representar el pipeline completo (o todos sus checks
   obligatorios si la integración los separa). No seleccionar solamente Tests.
   Verificar que la fuente sea Azure Pipelines y que el check esté en el SHA vigente.
10. Probar bloqueo: en una rama temporal feature de ensayo, introducir una prueba
    fallida y abrir un PR académico; capturar integración bloqueada. Revertir el fallo
    mediante commit normal, volver a ejecutar y capturar éxito. Nunca usar secretos
    reales como fixture ni integrar el ensayo fallido. También puede demostrarse la
    cobertura por debajo del umbral sin modificar permanentemente el umbral.
11. Solo cuando políticas/checks estén activos y verdes, revisar e integrar PR 1.
    Luego crear PR 2 y PR 3 secuencialmente; cada uno necesita su propia ejecución
    sobre el commit combinado y sus propias evidencias. Conservar la rama feature
    hasta terminar la trazabilidad y la evaluación.
12. Vincular commits, URLs de PR y ejecuciones a HU/Tareas en Azure Boards mediante
    la integración GitHub o vínculos manuales. No inventar `AB#` ni reescribir commits.

El código vive en GitHub: configurar políticas de Azure Repos no impide merges aquí.
YAML fallido impide integración **solo cuando** GitHub exige el check correspondiente.
Azure usa la configuración de PR según su integración con GitHub; comprobar en cada
run la rama, el YAML utilizado y el SHA del merge de validación. No copiar el pipeline
a development para intentar activar los PR académicos.

## Fuentes oficiales

- [Azure Pipelines y PR de GitHub](https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/github?view=azure-devops).
- [CLI de Dependency-Check](https://dependency-check.github.io/DependencyCheck/dependency-check-cli/arguments.html).
- [Release Dependency-Check 13.0.0](https://github.com/dependency-check/DependencyCheck/releases/tag/v13.0.0).
- [Semgrep CLI](https://semgrep.dev/docs/cli-reference).
- [Gitleaks](https://github.com/gitleaks/gitleaks).
- [c8 y controles de cobertura](https://github.com/bcoe/c8).
