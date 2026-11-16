# Migración controlada a las ramas existentes

Fecha: 16 de noviembre de 2026, America/Bogota. Alcance: solo adopet-backend.
**Estado: preparación en feature; no activada en GitHub/Azure.** Sustituye el plan
de crear develop/integration y promover a main.

> Ampliación posterior: [09-auto-promotion-pr.md](09-auto-promotion-pr.md) prepara
> la apertura automática de PR 2/3 sin merge ni aprobación. En esa auditoría el
> workflow antiguo ya figura disabled_manually; la tabla siguiente es histórica.

## Auditoría antes de editar

Se revisaron status, ramas, remotos, fetch, historial reciente, historial de promote.yml,
referencias remotas, ambos YAML, scripts npm y cobertura. Árbol limpio, sin cambios
ajenos que aislar. No se encontraron AGENTS.md adicionales en la auditoría inicial.

| Elemento | Estado observado |
| --- | --- |
| development (predeterminada), staging, production | `816406a38ee9a985dd8ce2daf02f3e409e538453` |
| feature/hu-01-validacion-mascotas | `462ab0e3f9e60cfe330ffd2b1719eb6e982439af` |
| main | `0e778c69f40e90202b510360d75b5dbcb59b3e4d` |
| develop / integration | No existen |
| Workflow | Único: Promote AdoPet Backend🐕❤️; ID `368470090`; **active** en API |
| Runs observados | Seis devueltos, todos completed; último `39717303778`, success. Reconsultar antes de activar |
| Protecciones | Ramas: protected=false; rulesets=[]; detalle de protection: HTTP 401 |
| Checks de HU original | check-runs vacío; combined status sin estados (pending, total_count=0) |
| Azure | Sin conexión consultable en esta sesión ni evidencia de ejecución en ese SHA; estado interno no comprobado |

El workflow nació en `68bef52`, cambió en `91cd602` y `c0b980c`. Se mantiene archivo,
nombre, jobs y pasos. El original se activa por push a development y hace merge
ff-only a staging y luego production, con environments y contents:write/GITHUB_TOKEN.
La aprobación de environment no reemplaza checks ni PR.

## Rama y cambio mínimo

Nueva rama `feature/preparacion-flujo-existente`, basada en la feature HU auditada:
incluye implementación y pruebas sin alterarlas. La feature original queda intacta.
No se modifican ramas compartidas ni configuraciones remotas.

Commit aislado `48e8ce1`, solo `.github/workflows/promote.yml`:

1. Sustituye `on.push` por `workflow_dispatch`.
2. Añade `if: ${{ false }}` a ambos jobs: tampoco promueven manualmente.
3. Reduce el token a `contents: read` como defensa adicional.

Conserva código histórico, environments, dependencia de jobs y formato CRLF.
El archivo queda inerte; mantener además el estado remoto disabled_manually.
Así tampoco se pueden reejecutar runs antiguos con configuración de escritura.

En Azure solo cambian los destinos PR a development, staging y production.
Jobs, flags, versiones, reportes, timeouts, CVSS >= 7 y cobertura >= 70 % por archivo
permanecen iguales. `trigger: none` sigue evitando CI por push.

## Activación manual, en orden (no ejecutada)

### 0. Condiciones de entrada

- Acordar ventana sin merges/pushes a las tres ramas. Designar administrador,
  revisor y responsable de evidencias. No activar auto-merge durante la transición.
- Registrar SHAs; si difieren de la tabla, auditar el nuevo diff y los runs.
- Crear/vincular backlog HU-01, tarea de migración y aceptación docente del mapeo
  Develop=development, Integration=staging, main=production.
- Conservar protecciones existentes; nunca retirarlas para resolver el bootstrap.

### 1. Desactivar primero en GitHub, sin escribir ramas

**Antes de cualquier merge a development**, un administrador debe ir a GitHub →
Actions → Promote AdoPet Backend🐕❤️ → Disable workflow. Alternativa CLI manual:

```bash
gh workflow disable 368470090 --repo anacolorado190304006-3/adopet-backend
gh api repos/anacolorado190304006-3/adopet-backend/actions/workflows/368470090 --jq .state
```

Exigir `disabled_manually` y capturarlo. Deshabilitar no cancela runs existentes.
Enumerarlos todos, incluyendo queued, in_progress, waiting, requested y pending:

```bash
gh api --paginate 'repos/anacolorado190304006-3/adopet-backend/actions/workflows/368470090/runs?per_page=100' \
  --jq '.workflow_runs[] | select(.status != "completed") | [.id, .status, .head_sha]'
```

Cancelar cada run no completado (también si espera aprobación de environment), con
la interfaz o `gh run cancel ID --repo anacolorado190304006-3/adopet-backend`.
Reconsultar hasta que no quede ninguno. No aprobar ni reejecutar runs antiguos.
Si uno no puede cancelarse o cambia una rama durante la suspensión, **detenerse**,
registrar incidente y reconciliar SHAs; no reset ni force push.

Esta suspensión introduce primero el bloqueo operativo sin push/merge a development.
Es indispensable. [GitHub distingue deshabilitar de cancelar ejecuciones](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows).

### 2. Preparar Azure y el origen correcto

- Crear/conectar `AdoPet-Guia4` con GitHub App y **Existing Azure Pipelines YAML**:
  rama `feature/preparacion-flujo-existente`, ruta `/azure-pipelines.yml`.
- No usar el asistente que añade un YAML mediante commit a la rama predeterminada.
- Configurar NVD_API_KEY secreta, agente y acceso a feeds. No entregar secretos a
  forks ni imprimirlos. Confirmar que la interfaz no sobrescribe los triggers YAML.
- Una ejecución manual de esta feature sirve de diagnóstico, no como check del PR.
- Esta rama ya incluye HU-01 + workflow seguro + YAML nuevo. **Usarla en PR 1**;
  no usar la HU original congelada con filtros develop/integration/main.
- Si se exige el nombre original de feature, primero integrar esta preparación en
  aquella feature mediante operación revisada y push solo a feature, sin force push
  (trabajo futuro, no realizado aquí). Verificar archivos/SHA, no solo el nombre.

### 3. Primer PR y protecciones antes de integrarlo

Abrir PR 1 feature de preparación → development, sin fusionar ni auto-merge.
Verificar los cuatro jobs Azure en el SHA vigente. Con el check real ya registrado,
configurar GitHub Rulesets/Branches para development, staging y production:

- Exigir PR, revisión, conversaciones resueltas, invalidar aprobación tras cambios
  y checks del pipeline completo emitidos por Azure Pipelines.
- Si se publican varios checks necesarios, exigir todos; no seleccionar solo Tests.
  Registrar nombres/IDs observados, no inventados.
- Exigir rama actualizada y restringir push directo, force push y eliminación;
  impedir bypass administrativo/de bots que eluda los controles. No rebajar reglas.
- Revisar YAML, cobertura, scripts npm y wrapper OWASP: la rama origen puede alterar
  sus gates. Los permisos/revisiones son necesarios además del contenido del YAML.

Probar bloqueo en un PR de ensayo desde feature: test o cobertura fallido debe impedir
merge. Corregir por commit normal y verificar nuevo run. No usar secretos reales.
Exigir cuatro jobs ejecutados, no aceptar skipped/neutral como evidencia de análisis.

Solo tras suspensión, checks vigentes, revisión y cuatro validaciones aprobadas,
fusionar PR 1. Instala **atómicamente** el commit del workflow y la HU. No hay un merge
previo sin controles: el bloqueo operativo ya se introdujo en el paso 1. Comprobar
que staging/production no cambiaron y que no apareció una promoción nueva.

El commit workflow-only está separado para revisión y portabilidad, **no autoriza**
fusionarlo sin gates. Si se exige instalar primero ese archivo por un PR administrativo
adicional, detener el plan y preparar validaciones compatibles con esa base (aún sin
tests/YAML). No validar otra rama ni omitir gates para simular que ese PR pasó.

### 4. Segundo y tercer PR

Tras PR 1, abrir development → staging. Validar su propio merge, cuatro jobs,
reportes y revisión; integrar solo con checks obligatorios aprobados. Confirmar que
production no cambió. Después abrir staging → production y repetir todo.
Los environments heredados no ejecutan estos PR ni reemplazan sus revisiones.
Mantener el workflow deshabilitado incluso cuando las tres ramas ya tengan el YAML inerte.

## Garantizar el YAML correcto de la HU

Azure para GitHub valida la referencia de merge del PR y su YAML combinado: la rama
origen puede modificar el comportamiento. La selección inicial de rama no congela
el YAML de futuros PR. [Documentación de Azure](https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/github?view=azure-devops).

Antes de aprobar cada PR:

1. Identificar SHA de origen, destino y merge. Resolver conflictos en una feature
   revisada, preservando workflow inerte y los cuatro gates.
2. Inspeccionar `/azure-pipelines.yml` del merge: tres destinos nuevos,
   Tests/SAST/Dependencies/Secrets, sin exclusiones de rutas ni bypasses.
3. En Azure confirmar Build.Reason=PullRequest, ID PR, destino, Build.SourceVersion
   y checkout de referencia PR (habitualmente `refs/pull/ID/merge`). Registrar revisión
   utilizada y cuatro ejecuciones; no aceptar un run manual de feature.
4. En GitHub comprobar que el check enlazado corresponde a ese PR/estado vigente.
   Todo cambio de origen/destino exige revalidar antes de integrar.
5. En PR 2/3 confirmar que resolver el merge no restauró YAML o workflow antiguo.

Inspección manual, reemplazando ID; no escribe ramas compartidas:

```bash
git fetch origin refs/pull/ID/merge
git show FETCH_HEAD:azure-pipelines.yml
git show FETCH_HEAD:.github/workflows/promote.yml
git rev-parse FETCH_HEAD
```

Si no dispara el pipeline, revisar App/conexión, ruta, origen, conflictos, drafts y
overrides de interfaz. **No fusionar para intentar activarlo.**

## Rollback seguro

| Momento / problema | Acción | Condición para continuar |
| --- | --- | --- |
| Antes del primer merge | Suspender migración; mantener disabled_manually y ramas sin cambios | Corregir en feature y revalidar |
| Pipeline falla o falta NVD | Mantener PR bloqueado; corregir infraestructura/feature | Cuatro jobs pasan en SHA vigente |
| Error en HU tras PR 1/2 | Detener siguientes PR; feature de corrección/reversión selectiva sobre destino afectado | Preservar workflow/YAML/gates, pruebas coherentes y umbrales |
| Configuración incorrecta | Corregir configuración por feature/PR revisado | Tres destinos y cuatro gates completos |
| Promoción antigua o cambio inesperado de SHA | Cancelar runs, mantener workflow deshabilitado y registrar incidente; reconciliar por PR | Revisión del responsable y nuevas evidencias; nunca reset/force push |

No revertir globalmente PR 1: podría restaurar on.push/contents:write y quitar gates.
Si revertir HU elimina código cubierto, adaptar pruebas y alcance a la funcionalidad
restante con revisión, sin bajar umbrales ni simular éxito. Si no es viable, bloquear
la entrega hasta resolverlo. **No reactivar promoción automática como rollback**:
restaurarla sería otro cambio arquitectónico explícitamente autorizado, fuera de alcance.

## Evidencias y límites

Completar `06-checklist-evidencias.md`: SHAs iniciales/finales, active antes y
disabled_manually después, runs cancelados/completados, diff `48e8ce1`, YAML efectivo,
checks requeridos, bloqueo negativo, tres PR con cuatro reportes propios, revisiones,
work items y aceptación docente del mapeo de nombres.

Resultados locales: `08-validacion-migracion.md`. No acreditan políticas activas,
suspensión remota ni runs Azure. Hasta completar el paso 1, el workflow **sigue activo**
en development aunque esta feature contenga el archivo inerte.
