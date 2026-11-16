# Resumen de trabajo — Guía 4

Fecha: 16 de noviembre de 2026, America/Bogota. Preparación local y publicación en
`feature/hu-01-validacion-mascotas`. **Azure y los tres PR no se han ejecutado/creado.**

## Diagnóstico y solución

El árbol inicial estaba limpio y development era la rama predeterminada y vigente.
Development, staging y production coincidían en
`816406a38ee9a985dd8ce2daf02f3e409e538453`; main seguía en el commit inicial.
No existían develop/integration ni tests, lint, cobertura o Azure Pipeline.
El único workflow promociona por fast-forward al recibir un push a development.

Se eligió HU-01, validación del registro de mascotas, porque `POST /api/pets` ya
existía pero enviaba datos sin validar a PostgreSQL. La arquitectura conservada es
`ruta JWT → controlador → servicio → repositorio SQL parametrizado`.
El nuevo validador puro comprueba cuerpo, presencia y tipos antes de persistir;
un error de validación produce 400 con campos y mensajes, sin valores recibidos.
Se conservan 201 para creación y 500 genérico para fallos inesperados.
No se tocaron frontend, autenticación, otras rutas ni despliegue.

No se inventaron enums o límites SQL: el repositorio no tiene DDL ni catálogos.
Confirmar el contrato documentado con el esquema real antes de integrar. Las pruebas
usan persistencia simulada; no acreditan una ejecución contra PostgreSQL/Auth0 reales.

## Archivos entregados

- `src/validators/pet.validator.js`: validación y error específico.
- `src/services/pet.service.js`, `src/controllers/pet.controller.js`: integración mínima.
- `test/fixtures/pet.js` y cuatro archivos `test/pet.*.test.js`: validador, servicio,
  controlador y comportamiento HTTP; incluyen regresión y JWT ausente.
- `.c8rc.json`, `package.json`, `package-lock.json`, `.gitignore`: tests, cobertura,
  instalación reproducible y exclusión de artefactos locales.
- `azure-pipelines.yml`, `scripts/dependency-check.py`: cuatro validaciones de PR;
  wrapper que no expone la clave NVD en argv ni logs.
- `docs/guia4/01-auditoria.md` a `06-checklist-evidencias.md` y este resumen.
- Tres diagramas Mermaid en `03-diagramas.md`: jerarquía, validación y flujos de ramas.

## Validaciones realmente ejecutadas

| Validación | Resultado y alcance |
| --- | --- |
| Instalación | `npm ci --no-audit --no-fund` con Node 22.23.3 completado |
| Pruebas | 112 aprobadas, 0 fallidas, 0 omitidas; `npm run test:coverage` |
| Cobertura | 100 % en líneas, sentencias, funciones y ramas para los tres archivos de la HU |
| Gate de cobertura | Prueba negativa ejecutando solo el validador: salida 1 al quedar servicio/controlador por debajo de 70 %; umbral sin cambios |
| Sintaxis JS | `node --check` sobre src y test: correcto |
| Lint | No existe configuración; no se reporta como ejecutado |
| SAST | Semgrep 1.185.0, 68 reglas JS, 25 archivos src, 0 hallazgos; incluye el nuevo validador |
| Secretos | Gitleaks 8.30.1: historial completo disponible y cambios preparados sin hallazgos; salida redactada |
| OWASP | Release 13.0.0 descargada y checksum verificado; Java 21, versión y opciones CLI comprobadas |
| Análisis OWASP completo | **Bloqueado por falta de NVD_API_KEY**; wrapper falla con salida 2, no hay reporte de vulnerabilidades OWASP acreditado |
| Wrapper OWASP | Prueba aislada confirma archivo temporal 0600, clave fuera de argv/environment hijo, eliminación del temporal y propagación de salida de error |
| npm audit complementario | 0 altas/críticas; 5 avisos moderados; salida 0 con umbral high. No reemplaza OWASP |
| YAML | Parseo YAML correcto; verificados cuatro jobs, destinos, ausencia de continueOnError y sintaxis Bash. Compilación en Azure pendiente |
| Mermaid | Los tres diagramas renderizados con mermaid-cli 11.12.0 a SVG local |
| Git/workflow | Diff revisado; workflow sin cambios, blob `5d4c6bc6d30b06b02226372849cb5814f513e2e6` |

Cobertura real **del alcance HU**, no del backend completo:

| Archivo | Líneas | Sentencias | Funciones | Ramas |
| --- | --- | --- | --- | --- |
| pet.validator.js | 100 % | 100 % | 100 % | 100 % |
| pet.service.js | 100 % | 100 % | 100 % | 100 % |
| pet.controller.js | 100 % | 100 % | 100 % | 100 % |

Reportes locales ignorados: `coverage/` (HTML, Cobertura, LCOV, JSON),
`test-results.xml`, `reports/sast/`, `reports/secrets/`, `reports/npm-audit.json`.
SVG locales en `.tools/diagrams-1.svg`, `diagrams-2.svg`, `diagrams-3.svg`.
No se versionan dependencias, herramientas descargadas ni archivos temporales.

## Seguridad, problemas y riesgos pendientes

La primera auditoría npm mostró 8 avisos, incluidos 2 altos. Se actualizaron
dependencias transitivas de runtime (body-parser, follow-redirects y qs) dentro de
los rangos permitidos; no se cambiaron los contratos ni dependencias directas de runtime.
Se usa c8 12.0.0 como herramienta de cobertura actual compatible con Node 22.
Persisten cinco avisos moderados asociados a c8, glob, test-exclude, minimatch y
nodemon. Son avisos de la cadena de desarrollo, no cinco fallos independientes de runtime.
No se aplicaron suppressions, force updates ni downgrades sugeridos automáticamente
por npm. Revisar versiones compatibles corregidas y conservar seguimiento de
[glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4) y
[minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249).

El pipeline bloquea CVSS >= 7 y errores operativos. Los hallazgos menores siguen
visibles: este trabajo no certifica ausencia total de vulnerabilidades.

El disco C: se agotó durante la primera sesión y WSL pasó a solo lectura. El usuario
liberó espacio; se reinició Ubuntu, se verificaron los archivos y se reinstalaron
herramientas afectadas. Las pruebas se repitieron tras la recuperación. No se borraron
archivos ajenos al repositorio. La validación genérica con el esquema JSON publicado
por la extensión Azure no completó por diferencias de tipado/catálogo de tareas;
se validaron sintaxis y estructura y se deja la compilación real para Azure.

El controlador ya usaba CRLF: se conservó su formato. La revisión de whitespace
usó `git -c core.whitespace=trailing-space,space-before-tab,cr-at-eol diff --check`
para reconocer ese formato sin ignorar espacios finales reales.

Riesgos funcionales pendientes: DDL no versionado, catálogo sin enums conocidos,
autorización de mascotas solo por JWT y resto del backend sin cobertura completa.
Riesgos operativos: clave NVD, disponibilidad/cuota de agentes, caché inicial lenta,
políticas aún no activadas y confusión develop/development. main académico no es producción.

## Commits y push

Todos estos bloques se publicaron por SSH en la misma rama feature, sin force push:

| Commit | Contenido |
| --- | --- |
| `5e6b578` | Auditoría y estrategia de ramas |
| `25f62e1` | HU y tres diagramas |
| `bed4de8` | Validación del registro |
| `d80001a` | Pruebas, cobertura y lockfile |
| `eafc376` | Pipeline y wrapper OWASP |
| `9a0326b` | Configuración manual Azure, plan PR y checklist |

Este resumen se publica en un commit documental posterior. Su hash exacto se
consulta con `git log -1 --format='%h %s' -- docs/guia4/RESUMEN-TRABAJO-NOCTURNO.md`
o en el historial de GitHub; un archivo no puede incluir el hash de su propio commit.
El resultado del último push y la sincronización se verifican al cerrar la sesión.

La consulta remota tras publicar los bloques confirmó development, staging y
production en el SHA base original y main en
`0e778c69f40e90202b510360d75b5dbcb59b3e4d`. Develop/integration siguen sin crear.
No se abrieron PR, ejecutaron merges, cambiaron protecciones ni modificaron workflows.

## Qué hacer para finalizar la entrega

1. Crear proyecto Azure DevOps con proceso Agile e invitar/asignar integrantes.
2. Crear y vincular épica, feature, HU y tareas usando `02-historia-usuario.md`.
3. Crear manualmente develop e integration desde el SHA base auditado; conservar
   main existente y dejar intacto el flujo development → staging → production.
4. Conectar Azure Pipelines a GitHub, elegir el YAML existente de la rama feature,
   configurar NVD_API_KEY secreta y confirmar acceso al agente. No generar un nuevo YAML.
5. Abrir PR 1, ejecutar el pipeline y seleccionar su check real como obligatorio
   en las protecciones GitHub de develop, integration y main. Exigir revisión y
   probar que un fallo bloquea el merge antes de integrar.
6. Resolver cualquier fallo real, revisar las dependencias moderadas y confirmar
   el contrato con el esquema SQL. Integrar PR 1 solo con checks/revisión aprobados.
7. Crear PR 2 develop → integration y PR 3 integration → main secuencialmente,
   ejecutando nuevamente los cuatro gates para cada uno. Revisar el diff histórico
   adicional del PR 3, porque main conserva el commit inicial.
8. Vincular work items, commits, PR, SHA y runs. Descargar cuatro artefactos por PR
   y completar todas las capturas de `06-checklist-evidencias.md`.

Los pasos de interfaz y políticas están detallados en `04-azure-pipelines.md`;
objetivos, criterios, riesgos y plantilla de los tres PR en `05-plan-pull-requests.md`.

| Actividad | Estado final de preparación |
| --- | --- |
| Auditoría, HU, implementación y pruebas | Completadas |
| Cobertura >= 70 %, SAST y detección local de secretos | Completadas |
| Mermaid y documentación de Guía 4 | Completados |
| YAML y configuración OWASP | Preparados; ejecución Azure pendiente |
| Commits y push exclusivos de feature | Publicados por bloques; cierre documental verificado al terminar |
| Incidencia de espacio/WSL | Resuelta; validaciones repetidas |
| Análisis OWASP completo | Bloqueado hasta configurar NVD_API_KEY |
| Avisos moderados de dependencias | Pendientes de seguimiento |
| Proyecto, integrantes y work items Azure | Pendientes manuales |
| Políticas y comprobación de bloqueo | Pendientes manuales |
| Tres PR, runs exitosos y capturas | Pendientes manuales |
