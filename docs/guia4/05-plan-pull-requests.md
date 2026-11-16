# Plan vigente de tres PR — ramas existentes

Sustituye la propuesta develop → integration → main. No se ha creado ni fusionado
ningún PR. Completar primero la suspensión administrativa y las comprobaciones de
[07-migracion-flujo-existente.md](07-migracion-flujo-existente.md).

La rama `feature/preparacion-flujo-existente` contiene toda HU-01 y el YAML actualizado.
Usarla como origen del primer PR; la feature original conserva el YAML anterior.
Mantener main fuera de esta entrega y no crear develop/integration.

| PR | Origen → destino | Objetivo | HU / tareas |
| --- | --- | --- | --- |
| 1 | feature/preparacion-flujo-existente → development | Introducir HU-01 y configuración segura con promoción ya suspendida administrativamente | HU-01; T-01…T-06 y tarea de migración CI |
| 2 | development → staging | Validar integración de la misma HU con una nueva ejecución de Azure | HU-01; T-03, T-04, T-06 |
| 3 | staging → production | Consolidar entrega tras una tercera ejecución independiente | HU-01; T-03, T-04, T-05, T-06 |

## Validaciones y aprobación comunes

- Semgrep sin hallazgos bloqueantes ni errores de análisis.
- OWASP Dependency-Check completo, sin CVSS >= 7 ni errores operativos.
- Pruebas aprobadas y cobertura >= 70 % por archivo HU en las cuatro métricas.
- Gitleaks sin secretos en el historial descargado.
- Check Azure requerido en GitHub sobre el SHA vigente; cuatro jobs ejecutados,
  no omitidos. Revisión aprobada y conversaciones resueltas.
- Workflow antiguo deshabilitado en GitHub, sin runs pendientes; árbol combinado
  sin trigger push, jobs con `if: ${{ false }}` y token de lectura.
- Si falta o falla una validación, detenerse. No rebajar gates ni umbrales.

## Evidencias y riesgos por PR

| PR | Evidencias propias | Riesgos específicos |
| --- | --- | --- |
| 1 | disabled_manually antes del merge, cero runs antiguos pendientes, diff HU/migración, YAML combinado, run, cuatro reportes, revisión, work items y SHA | Carrera con run antiguo; feature con filtros incorrectos; contrato SQL pendiente; falta de NVD |
| 2 | SHA/YAML del merge, nuevo run, cuatro artefactos, aprobación y comparación con PR 1 | Restaurar workflow antiguo en conflictos; reutilizar run de PR 1 |
| 3 | SHA/YAML del merge, nuevo run, cuatro artefactos, aprobación y cierre | Confundir environment con revisión PR; restaurar push/write |

Los tres destinos parten del mismo SHA auditado; no hay el diff histórico adicional
del plan contra main. Si cambian, repetir la auditoría. Abrir PR 2 después de PR 1
y PR 3 después de PR 2. Preferir merge commits entre ramas duraderas para conservar
ascendencia; no merges locales hacia destinos ni pushes directos. Revalidar cambios
de origen o destino.

Descripciones sugeridas:

- PR 1: «Valida POST /api/pets antes de persistir y conserva 201/500. Retira promoción
  automática y configura cuatro gates Azure para development/staging/production».
- PR 2: «Promueve HU-01 a staging mediante PR revisado y cuatro validaciones nuevas».
- PR 3: «Consolida HU-01 en production tras revisión y cuatro validaciones de este PR».

| PR | URL/ID | HU/Tareas reales | SHA validado | Run Azure | Revisor | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Pendiente | Pendiente | Pendiente | Pendiente | Por asignar | No creado |
| 2 | Pendiente | Pendiente | Pendiente | Pendiente | Por asignar | No creado |
| 3 | Pendiente | Pendiente | Pendiente | Pendiente | Por asignar | No creado |

Adjuntar aceptación docente del mapeo Develop=development, Integration=staging,
main=production. Se conservan tres PR y cuatro gates, pero cambian los nombres
literales de la guía; no afirmar aceptación sin evidencia.
