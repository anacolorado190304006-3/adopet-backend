# Validación local y entrega de la migración

> Snapshot anterior a la apertura automática de PR. Consultar
> [09-auto-promotion-pr.md](09-auto-promotion-pr.md) para la ampliación y el estado
> remoto posterior del workflow antiguo: disabled_manually.

16 de noviembre de 2026. Rama: `feature/preparacion-flujo-existente`.
Base HU: `462ab0e3f9e60cfe330ffd2b1719eb6e982439af`.

## Resultados ejecutados

| Comprobación | Resultado |
| --- | --- |
| `npm run test:coverage`, Node 22.23.3 | 112 pruebas aprobadas, 0 fallidas/omitidas |
| Cobertura HU | 100 % líneas/sentencias/funciones/ramas en validador, servicio y controlador; umbral 70 % intacto |
| Semgrep 1.185.0 | 68 reglas sobre 25 archivos src, 0 hallazgos |
| Gitleaks 8.30.1 | Historial Git disponible y diffs preparados sin secretos detectados; redacción completa |
| Parseo de ambos YAML | Correcto con ruamel.yaml; claves `on` interpretadas como YAML 1.2 |
| Comparación estructural Azure contra base | Solo cambiaron tres destinos PR; todo el resto del documento es idéntico |
| Integridad del alcance | Sin diferencias en src, test, package.json/lock, .c8rc.json o wrapper OWASP frente a la base HU |
| Comparación workflow | Solo trigger, permisos, condiciones inertes y comentarios; mismos pasos, environments y dependencia de jobs |
| Sintaxis Bash del pipeline | `bash -n` correcto en todos los bloques |
| Mermaid CLI 11.12.0 | Tres diagramas renderizados; SVG locales `.tools/migration-diagrams-1.svg` a `-3.svg` |
| OWASP | Wrapper devuelve 2 por NVD_API_KEY ausente; análisis completo no ejecutado |
| Lint del backend | No hay lint configurado; no se presenta como ejecutado |
| Azure | Compilación/ejecución y publicación de checks no verificadas remotamente |

**Actionlint 1.7.12 no termina en verde:** devuelve 1 con exactamente dos avisos
`if-cond: constant expression "false" in condition`, uno por job archivado. Son
las condiciones deliberadas de desactivación. No se eliminan para satisfacer su
recomendación ni se añaden exclusiones de lint. No se observaron otros diagnósticos.
Se comprobó por separado que ambos jobs tienen `${{ false }}`, solo existe el evento
workflow_dispatch, el token es read y el resto de cada job coincide con la base.
Esto valida la preparación local, no acredita ejecución en GitHub.

Las reglas de Azure y los cuatro gates no se debilitaron para resolver esos avisos.
La falta de clave NVD sigue siendo un bloqueo real del job de dependencias. Los cinco
avisos moderados documentados en la sesión anterior no se remediaron en esta migración;
el lockfile y la política CVSS >= 7 permanecen intactos.

## Publicación y límites

| Commit | Cambio |
| --- | --- |
| `48e8ce1` | Workflow inerte, sin trigger push, con permisos read; commit aislado |
| `543d2d9` | Filtros PR de Azure a development, staging y production |
| Commit documental posterior | Plan de activación/rollback, diagramas, evidencias y este registro; consultar `git log -1 -- docs/guia4/08-validacion-migracion.md` |

Push realizado solo a esta rama feature por bloques, sin force push. Los documentos
históricos llevan avisos de sustitución; los planes operativos apuntan al nuevo flujo.
El blob preparado de promote.yml es `6f6658c31351c7b7b73addfc86e120802c69e148`;
el original es `5d4c6bc6d30b06b02226372849cb5814f513e2e6`.

La comprobación remota del workflow sigue mostrando **active**: no se deshabilitó
el servicio, no se cambiaron políticas, no se crearon/fusionaron PR ni se modificaron
development/staging/production/main o la feature original. El cierre comprueba que
la rama de preparación coincide con GitHub y que el árbol queda limpio.

## Pendiente antes de afirmar que la migración está activa

1. Aceptación docente del mapeo de ramas y responsables de activación.
2. Workflow deshabilitado en GitHub; runs antiguos cancelados/completados; SHAs revisados.
3. Azure conectado, NVD configurada y YAML efectivo de PR verificado.
4. Checks/revisiones obligatorios en GitHub y prueba real de integración bloqueada.
5. Tres PR secuenciales con cuatro jobs ejecutados, reportes, revisiones y evidencias propias.

Seguir [07-migracion-flujo-existente.md](07-migracion-flujo-existente.md). No fusionar
para probar si el pipeline arranca ni reactivar la promoción antigua como rollback.
