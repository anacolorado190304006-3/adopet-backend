# Auditoría inicial — Guía 4

Fecha: 16 de noviembre de 2026 (America/Bogota). Alcance exclusivo: `adopet-backend`.

## Git y sincronización

Antes de editar se ejecutaron `git status --short --branch`, `git branch -a`,
`git remote -v`, `git log --all --oneline --decorate --graph`, `git ls-files`,
`git fetch origin` y `git ls-remote --symref origin HEAD` / `--heads origin`.
Árbol limpio, sin cambios preexistentes ni hooks activos. Remoto SSH:
`git@github.com:anacolorado190304006-3/adopet-backend.git`.

| Rama | Estado inicial / SHA |
| --- | --- |
| `development` | Predeterminada, local y remota sincronizadas en `816406a38ee9a985dd8ce2daf02f3e409e538453` |
| `staging` | Remota, mismo SHA que development |
| `production` | Remota, mismo SHA que development |
| `main` | Remota, `0e778c69f40e90202b510360d75b5dbcb59b3e4d` (commit inicial) |
| `develop`, `integration` | No existen localmente ni en GitHub |
| `master` | No existe |

Base elegida: `origin/development`, por contener la implementación vigente. Se crea
únicamente `feature/hu-01-validacion-mascotas`, sin tracking de development.
Historial previo: creación Node 22, promoción, integración Auth0/PostgreSQL, CRUD
de usuarios y organizaciones, ajustes SonarQube. No hay configuración SonarQube
versionada ni reportes que permitan acreditar ese análisis.

## Automatización y permisos observables

Único workflow: `.github/workflows/promote.yml`, nombre
`Promote AdoPet Backend🐕❤️`. Blob Git original:
`5d4c6bc6d30b06b02226372849cb5814f513e2e6`.

- Disparador: push exclusivamente a `development`.
- Primer job: environment `staging`, merge `origin/development --ff-only`, push a staging.
- Segundo job: depende del primero, environment `production`, merge `origin/staging --ff-only`, push a production.
- `contents: write`, checkout completo y `GITHUB_TOKEN`; no pruebas ni controles de seguridad.
- Consulta REST pública: las cuatro ramas existentes reportan `protected: false`;
  `/rulesets` devuelve `[]`. Endpoints detallados `/protection` responden 401 sin
  autenticación: no se atribuyen permisos administrativos no comprobados.
- Environment staging sin reglas; production requiere revisión de
  `anacolorado190304006-3`, permite auto-revisión y bypass administrativo según la API.
- El commit base tiene checks de promoción completados en success. Son ejecuciones
  anteriores, **no evidencia de esta HU ni de Azure**.
- El conector GitHub informa lectura sin push/admin. La credencial SSH local es
  independiente; el resultado real de push se registra en el resumen final.

El workflow se conserva byte por byte. `--ff-only` falla ante divergencia y no
resuelve conflictos. Un push accidental a development puede promover cambios;
el gate del environment production no reemplaza controles de calidad previos.

## Arquitectura y funcionalidad

Backend CommonJS con Express 5, PostgreSQL (`pg`), JWT Auth0
(`express-oauth2-jwt-bearer`), Axios, CORS y dotenv. Única dependencia de desarrollo
inicial: nodemon. `package-lock.json` permite `npm ci`.

Ruta de mascotas: `routes → controllers → services → repositories → PostgreSQL`.
`POST /api/pets` exige JWT y llama `createPet`; el servicio delega directamente al
repositorio. INSERT parametrizado con `name`, `age`, `specie`, `size`,
`description`, `pet_state`, `user_identification`. Éxito: 201 con mascota creada.
Todos los errores se convierten en 500 genérico. No hay validación de entrada,
pruebas, framework de tests, lint, cobertura ni herramientas de seguridad.

No hay DDL/migraciones ni catálogo de especies/estados/tamaños en el repositorio.
Por ello la HU evitará inventar enums, longitudes máximas o nuevas restricciones
SQL. Se explicitan las reglas de presencia/tipo en `02-historia-usuario.md`.

Otras rutas: usuarios, roles, perfil, administración y organizaciones. Organizaciones
accede a SQL desde el controlador; mascotas sí tiene capas separadas. Hallazgos
fuera de alcance: montaje duplicado de `/api/me`, ausencia de autorización por rol
en mascotas (solo JWT), falta de esquema versionado y pruebas del resto del backend.
No se alteran autenticación, permisos ni despliegue como parte de esta HU.

WSL dispone de Node 18 por defecto y Node 22.23.3 mediante NVM; se usará este último.
Java local: OpenJDK 21. No existe Azure Pipeline inicial.

## Convivencia de los flujos

**Despliegue existente:** `development → staging → production`.
**Propuesta académica:** `feature/* → develop → integration → main`.

Pueden coexistir porque `develop` y `development` son nombres distintos y el
workflow solo escucha development. La coexistencia no sincroniza ambos flujos:
main académico no representa automáticamente producción. No añadir puentes,
merges ni pushes entre ellos durante la guía.

Propuesta manual para el 17 de noviembre: crear develop e integration desde el
SHA base auditado, conservar main existente y promover mediante los tres PR.
El PR integration → main mostrará también el backend histórico, pues main sigue
en el commit inicial; requiere revisar su diff completo y explicarlo en la evidencia.
No crear destinos desde la feature terminada: dejaría PR sin diferencia de la HU.
Los PR deben usar las comprobaciones obligatorias de Azure en **GitHub**, donde
reside el código. Las políticas de Azure Repos no protegen este repositorio GitHub.

Riesgos: confusión develop/development; promoción accidental; divergencia que rompe
fast-forward; ramas académicas desactualizadas; controles aún sin activar;
dependencia de credenciales NVD y disponibilidad de agentes. Ninguna rama compartida,
protección ni workflow se modifica durante este trabajo.

Fuentes: [metadatos del repositorio](https://github.com/anacolorado190304006-3/adopet-backend),
[Azure Pipelines con GitHub](https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/github?view=azure-devops).
