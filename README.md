# AdoPet Backend

API de adopción de mascotas: Node.js 22, Express 5, PostgreSQL y JWT de Auth0.

## Desarrollo y pruebas

Requisitos: Node.js 22.12 o posterior de la serie 22 (CI usa 22.23.3), npm y Python 3 para las pruebas del empaquetador. Trabajar en Linux/WSL.

```bash
npm ci
cp -n .env.example .env
# Completar .env con la configuración local; no versionarlo.
npm start
npm test
npm run test:coverage
```

El servidor escucha en `0.0.0.0` y utiliza `PORT` (3000 por defecto). El modo local conserva los valores anteriores de audiencia, emisor y CORS cuando no se suministran; los valores `example.invalid` de la plantilla deben sustituirse antes de probar Auth0.

c8 exige 70 % por archivo en líneas, funciones, sentencias y ramas de `pet.validator.js`, `pet.service.js` y `pet.controller.js`. Esta medición no representa todo el backend. Las pruebas de configuración, salud y despliegue se ejecutan en la misma suite.

## Configuración de producción

En modo normal con `NODE_ENV=production` se exigen:

| Variables | Uso |
| --- | --- |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL con esquema y permisos existentes |
| `DB_PORT` | Puerto; 5432 por defecto |
| `DB_SSL=true` | TLS con verificación del certificado; obligatorio en producción |
| `DB_SSL_CA_FILE` | Opcional: ruta a una CA confiable disponible en el servidor |
| `CORS_ORIGINS` | Orígenes HTTPS exactos separados por comas, sin rutas ni comodines |
| `AUTH0_AUDIENCE`, `AUTH0_ISSUER_BASE_URL` | Audiencia y emisor HTTPS para verificar JWT RS256 |
| `AUTH0_DOMAIN`, `AUTH0_MGMT_CLIENT_ID`, `AUTH0_MGMT_CLIENT_SECRET`, `AUTH0_CONNECTION` | Integración administrativa con Auth0 |

No registrar secretos ni copiarlos al ZIP. Configurarlos mediante los ajustes seguros del servicio. PostgreSQL debe aceptar la conexión TLS desde la aplicación; Auth0 requiere salida HTTPS y autorización de la aplicación Management API. El backend actual no usa Kafka ni requiere un contenedor.

El arranque rechaza una configuración incompleta o metadatos de release ausentes en producción. SIGTERM/SIGINT drenan HTTP y el pool de PostgreSQL, con límite de diez segundos.

## Demostración sin persistencia

`DEMO_MODE=true` permite desplegar el proceso sin configurar PostgreSQL ni Auth0 Management API. Por defecto es `false`. Es una declaración explícita de persistencia no disponible: las operaciones de BD responden HTTP 503, no se ejecutan consultas ni acciones administrativas de Auth0 y no se generan datos ficticios. Al desactivarlo se recuperan las validaciones y funcionalidades normales.

La configuración de JWT sigue siendo obligatoria en producción: `AUTH0_AUDIENCE` y `AUTH0_ISSUER_BASE_URL` deben corresponder a la API/tenant reales. Las rutas protegidas conservan su middleware JWT; solicitudes sin token válido reciben 401 antes de la barrera de persistencia. No usar valores `example.invalid` en App Service. `CORS_ORIGINS` debe ser un origen HTTPS real.

Ajustes de la demostración en ambas apps: `NODE_ENV=production`, `DEMO_MODE=true`, JWT real, CORS HTTPS y `SCM_DO_BUILD_DURING_DEPLOYMENT=false`. No suministrar credenciales ficticias de BD/M2M. Dejar PORT a la plataforma. Configurar Health check de App Service con `/health/live`: readiness permanece 503 porque no se ofrece persistencia.

## Salud y artefacto

- `GET /health/live`: HTTP 200 si el proceso sirve HTTP; no consulta PostgreSQL.
- `GET /health/ready`: ejecuta `SELECT 1`; responde 200 o 503 (siempre 503 en demo, sin intentar una conexión) e incluye `version`, el SHA del artefacto.
- `GET /api/health` conserva su contrato en modo normal y responde 503 en demo.

Readiness no prueba el esquema, las operaciones de negocio ni Auth0. Deben verificarse adicionalmente con datos y credenciales de prueba autorizados.

```bash
# En un checkout limpio del commit que se va a desplegar:
npm ci --omit=dev --no-audit --no-fund
python3 scripts/package-deployment.py --output dist/backend.zip --commit "$(git rev-parse HEAD)"
```

El ZIP contiene código, manifiestos, `release.json` y dependencias de producción; excluye pruebas, documentos y `.env`. No se debe ejecutar `npm ci --omit=dev` sobre el entorno de desarrollo si se desean mantener las herramientas de pruebas; los pipelines usan un job independiente. No hay un paso de compilación de JavaScript.

Para Azure App Service Linux, seleccionar Node 22 LTS y `npm start`, desplegar el ZIP listo para ejecutar y mantener `SCM_DO_BUILD_DURING_DEPLOYMENT=false`. No configurar una segunda instalación/compilación remota. Usar el hostname HTTPS real del recurso; no presuponer su formato.

## CI y despliegue

`azure-pipelines.yml` y `.github/workflows/ci-cd.yml` validan push a todas las ramas y PR hacia development, staging y production. El commit debe publicarse para disparar CI remota. Los cuatro gates son:

1. Pruebas y cobertura c8.
2. Semgrep: hallazgos o errores bloquean.
3. OWASP Dependency-Check 13.0.0 con Java 21: CVSS >= 7 bloquea.
4. Gitleaks: historial completo obtenido por checkout, hallazgos redactados y bloqueo.

Azure y GitHub requieren cada uno su secreto `NVD_API_KEY`; el secreto de Azure no se comparte automáticamente. El wrapper Python lo suministra mediante un archivo temporal privado. No añadirlo a las variables del backend. Los reportes se publican como artefactos, incluso después de fallos cuando están disponibles.

| Sistema | Rama para CD | Destino | Activación |
| --- | --- | --- | --- |
| Azure Pipelines | staging, solo CI por push | `adopet-backend-integration` | Parámetro `enableAzureDeployment`, por defecto false |
| GitHub Actions | production, solo push | `adopet-backend-production` | Variable de repositorio `ENABLE_GITHUB_DEPLOYMENT=true`, ausente por defecto |

No hay CD en PR, feature ni workflow dispatch. Los jobs de despliegue dependen de los cuatro gates y del artefacto del mismo run. Antes de desplegar se verifican configuración y SHA actual de la rama; después se comprueban liveness y SHA servido, con `DEPLOY_HEALTH_CHECK=liveness` explícito en ambos YAML. Esto acredita despliegue del proceso, no funcionamiento integral. El script conserva readiness por defecto si no se selecciona liveness. Una URL que sirve la versión anterior no produce éxito.

Antes de activar Azure: crear el Environment `adopet-azure-integration` con aprobación, control de rama staging y bloqueo exclusivo; crear una conexión ARM con identidad federada y permisos restringidos a la aplicación. Configurar los valores predeterminados `azureServiceConnection`, `azureAppName` y `azureHealthUrl` mediante revisión. Activar el parámetro en ese mismo cambio revisado; la activación no se obtiene con una ejecución manual, porque la condición excluye `Manual`.

Antes de activar GitHub: crear el Environment `adopet-github-demo` con aprobación y restricción a production. Configurar la identidad federada de Azure con sujeto `repo:anacolorado190304006-3/adopet-backend:environment:adopet-github-demo`. Añadir las variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `AZURE_APP_NAME` y `AZURE_HEALTH_URL`. Conceder `id-token: write` solo al job de CD, como establece el workflow. Mantener el interruptor ENABLE en el repositorio para que esté disponible al evaluar la condición del job.

Usar aplicaciones distintas. Si solo se dispone de una, habilitar un único sistema de CD a la vez y retirar el acceso de despliegue del otro; la concurrencia de GitHub no coordina ejecuciones de Azure.

El preflight rechaza usar la app de integración desde GitHub o la app de producción desde Azure. Ambas están en `adopet-backend-integration_group`, Brazil South. Copiar sus Default hostnames reales del Portal; no deducir la URL a partir del nombre.

El bot existente abre PR development → staging → production; no integra ni despliega. El workflow antiguo de promoción debe permanecer inerte y deshabilitado. En los PR creados por `GITHUB_TOKEN`, comprobar el aviso de aprobación de workflows y aprobar su ejecución como usuario con escritura. Comprobar por separado los checks de Azure sobre el commit del PR. Una ejecución de push o manual no sustituye la validación del PR.

Las políticas externas son necesarias para impedir merges con checks fallidos. Conservar los cinco checks existentes de Azure y añadir los cuatro checks de GitHub después de observar sus nombres y aplicación emisora en un PR real. No retirar los anteriores durante la transición.

## Detener o revertir CD

Desactivar `ENABLE_GITHUB_DEPLOYMENT` y devolver `enableAzureDeployment` a false mediante un PR revisado. Para detener inmediatamente CD de Azure, rechazar aprobaciones pendientes o revocar únicamente el acceso de su conexión de despliegue, conservando CI. Cancelar cualquier despliegue ya iniciado antes de una recuperación manual autorizada.

Revertir código mediante un nuevo commit y el flujo normal de PR; no hacer force push. Si se restaura un ZIP anterior por emergencia autorizada, verificar su SHA esperado, salud y compatibilidad de base de datos y registrar el incidente. No rehabilitar la promoción automática antigua.
