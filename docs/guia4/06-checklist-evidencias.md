# Checklist de evidencias — Guía 4

Todas las capturas quedan **pendientes para el 17 de noviembre de 2026**.
Los archivos y resultados locales son preparación técnica, no capturas de Azure.
No hay imágenes ni ejecuciones Azure inventadas.

| Evidencia requerida | Contenido verificable | Estado |
| --- | --- | --- |
| Proyecto Azure DevOps | Nombre, proceso Agile, equipo | Pendiente |
| Invitación de integrantes | Usuarios/roles, ocultando datos innecesarios | Pendiente |
| Épica | EP-01 real, descripción y propietario | Pendiente |
| Feature | FE-01 y relación padre con épica | Pendiente |
| Historia de usuario | HU-01, criterios, estimación, prioridad y responsable | Pendiente |
| Tareas y asignaciones | T-01…T-06, horas, estado, responsables y vínculos | Pendiente |
| Commits | Hashes y mensajes reales de feature, relación con work items | Pendiente de captura; Git disponible |
| Ramas | Dos flujos diferenciados; origen y destino de cada PR | Pendiente |
| YAML | azure-pipelines.yml, cuatro jobs y filtros de PR | Pendiente de captura; archivo preparado |
| Configuración de pipeline | Conexión GitHub, YAML, pool y variable NVD marcada secreta sin valor visible | Pendiente |
| Políticas de protección | Revisión, checks obligatorios y restricciones para los tres destinos | Pendiente |
| PR 1 | feature → develop, diff, HU, revisión, estado y SHA | Pendiente |
| PR 2 | develop → integration, diff, HU, revisión, estado y SHA | Pendiente |
| PR 3 | integration → main, diff histórico, HU, revisión, estado y SHA | Pendiente |
| Ejecuciones exitosas | Un run Azure propio por cada PR, cuatro jobs verdes | Pendiente |
| Reportes SAST | Reglas, hallazgos, alcance, SARIF/JSON y run por PR | Pendiente en Azure |
| Reportes OWASP | Versión, actualización NVD, componentes, CVSS y HTML/JSON/SARIF por PR | Pendiente |
| Cobertura | Pruebas, 70 % exigido y porcentaje real por archivo en cada PR | Pendiente en Azure |
| Detección de secretos | Gitleaks completo, resultado y reporte redactado por PR | Pendiente en Azure |
| Integración bloqueada | PR de ensayo con validación fallida y botón de merge bloqueado por política | Pendiente |
| Recuperación del gate | Commit de corrección y nuevo run exitoso | Pendiente |

## Cómo conservar evidencia

Para cada captura anotar fecha, PR, SHA y URL del run. Descargar los artefactos
`unit-coverage`, `sast-reports`, `dependency-check-reports` y `secret-reports`
antes de vencer su retención en Azure. Guardarlos en la entrega académica con
nombres que distingan PR1, PR2 y PR3; no reutilizar una captura para los tres.

Los reportes locales están ignorados por Git (`coverage/`, `reports/`,
`test-results.xml`). Consultar el resumen nocturno para resultados y bloqueos reales.
No adjuntar archivos temporales de NVD ni mostrar claves, tokens o contraseñas.

Cerrar T-06 y la Definition of Done únicamente cuando las políticas funcionen,
los tres PR tengan validaciones exitosas y todas las evidencias sean verificables.
