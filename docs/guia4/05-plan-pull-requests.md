# Plan de tres Pull Requests — pendientes de creación manual

No se creó ni fusionó ningún PR durante la preparación. Azure Boards y checks aún
requieren configuración. Ninguna URL o ID de PR se presenta como existente.

## Preparación común

Crear develop e integration desde `816406a38ee9a985dd8ce2daf02f3e409e538453`,
no desde la feature terminada. main ya existe en el commit inicial. Se conserva
development como rama predeterminada y no se cambia el workflow de promoción.
Abrir los PR secuencialmente: el siguiente después de integrar el anterior.
Comprobar siempre destino exacto; GitHub podría sugerir development por defecto.

En los tres PR, exigir SAST, Dependency-Check, pruebas/cobertura >= 70 % por archivo
y Gitleaks, con check requerido de Azure sobre el SHA vigente. Si falla un gate,
corregir en feature mediante commits normales, nunca rebajar umbrales o saltar políticas.
Antes de integrar, comprobar diff y que `.github/workflows/promote.yml` no tenga cambios.

## PR 1 — Validar el registro de mascotas

| Campo | Plan |
| --- | --- |
| Origen → destino | `feature/hu-01-validacion-mascotas → develop` |
| Objetivo | Incorporar validación de POST /api/pets, pruebas y preparación de la Guía 4 |
| HU | HU-01; reemplazar por enlace real de Azure Boards |
| Tareas | T-01 auditoría, T-02 implementación, T-03 pruebas, T-04 pipeline, T-05 documentos; T-06 ejecución manual |
| Validaciones | Los cuatro gates comunes, contrato 201/400/500, JWT preservado, diff del lockfile |
| Aprobación | Revisor asignado, CA de HU confirmados, checks obligatorios verdes y contrato cotejado con esquema SQL |
| Evidencias | URL/ID PR, diff, commits, vínculo HU/Tareas, aprobación, SHA, run Azure y cuatro reportes |
| Riesgos | Supuestos por falta de DDL, dependencias moderadas pendientes, credencial NVD, posible selección accidental de development |

Descripción sugerida: «POST /api/pets enviaba datos inválidos directamente a
PostgreSQL y respondía 500. Ahora valida presencia y tipos antes de persistir,
responde 400 con campos inválidos y conserva 201/500. Incluye pruebas y pipeline
académico; consultar resultados locales y limitaciones en docs/guia4».

## PR 2 — Validar integración académica

| Campo | Plan |
| --- | --- |
| Origen → destino | `develop → integration` |
| Objetivo | Promover la HU aprobada al entorno lógico de integración académica |
| HU | La misma HU-01, sin crear una historia duplicada |
| Tareas | T-03 regresión, T-04 gates y T-06 evidencias/aprobación |
| Validaciones | Nueva ejecución de los cuatro gates sobre el merge de este PR; verificar que incluye PR 1 |
| Aprobación | PR 1 integrado, sin cambios inesperados ni conflictos, políticas activas y revisión aprobada |
| Evidencias | PR y run propios, SHA, cuatro reportes, relación con HU y PR 1, aprobación |
| Riesgos | integration creada desde base incorrecta, PR vacío, divergencia o confusión con staging |

Descripción sugerida: «Promueve a integration el registro validado de mascotas de
HU-01, aprobado en PR 1. Se reejecutan las cuatro validaciones sobre este merge.
No activa el workflow development → staging → production».

## PR 3 — Consolidar entrega académica

| Campo | Plan |
| --- | --- |
| Origen → destino | `integration → main` |
| Objetivo | Consolidar la entrega académica y su trazabilidad |
| HU | HU-01 vinculada a los tres PR |
| Tareas | T-03 regresión, T-04 gates, T-05 revisión documental y T-06 cierre de evidencias |
| Validaciones | Nueva ejecución de cuatro gates, revisión completa del backend histórico y configuración |
| Aprobación | PR 2 integrado, revisión completa del diff contra main, checks vigentes exitosos y evidencias completas |
| Evidencias | URL/ID y SHA propios, diff, revisión, run Azure, cuatro reportes y checklist completado |
| Riesgos | main sigue en commit inicial: el diff incluye el backend histórico además de HU-01; main académico no equivale a producción |

Descripción sugerida: «Consolida la entrega de Guía 4 en main. Esta rama conserva
el commit inicial, por lo que el diff incluye el backend existente y HU-01.
La aprobación requiere revisar ambos alcances y los cuatro reportes de este PR».

## Registro para completar mañana

| PR | URL / ID | Work items | SHA validado | Run Azure | Revisor | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Pendiente | Pendiente | Pendiente | Pendiente | Por asignar | No creado |
| 2 | Pendiente | Pendiente | Pendiente | Pendiente | Por asignar | No creado |
| 3 | Pendiente | Pendiente | Pendiente | Pendiente | Por asignar | No creado |

Las aprobaciones y políticas deben impedir integración ante fallo; un reporte local
verde no autoriza omitir el run de ninguno de los tres PR.
