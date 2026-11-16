# HU-01 — Validación de datos en el registro de mascotas

## Backlog propuesto para Azure Boards

Los identificadores siguientes son referencias locales, no IDs reales de Azure.
Proceso recomendado: **Agile**, para disponer de Epic, Feature, User Story y Task.

| Nivel | Referencia | Descripción | Prioridad | Estimación | Responsable |
| --- | --- | --- | --- | --- | --- |
| Épica | EP-01 | Calidad y confiabilidad del catálogo de mascotas | 1 | Pendiente | Por asignar |
| Feature | FE-01 | Registro confiable de mascotas | 1 | Pendiente | Por asignar |
| User Story | HU-01 | Validación de datos al registrar mascotas | 1 | 3 story points | Por asignar |
| Task | T-01 | Auditar arquitectura, contrato y ramas | 1 | 1 h | Por asignar |
| Task | T-02 | Validar entrada y traducir errores HTTP | 1 | 2 h | Por asignar |
| Task | T-03 | Pruebas unitarias, HTTP y cobertura | 1 | 2 h | Por asignar |
| Task | T-04 | Preparar cuatro gates de Azure Pipelines | 1 | 3 h | Por asignar |
| Task | T-05 | Documentación, Mermaid y trazabilidad | 2 | 1 h | Por asignar |
| Task | T-06 | Configuración manual, tres PR y evidencias | 1 | 2 h | Por asignar |

Como administrador de AdoPet, quiero validar la información obligatoria de las
mascotas antes de registrarlas para evitar datos incompletos o inválidos.

Justificación: `POST /api/pets` existe y carece de validación en controlador,
servicio y repositorio. La HU corrige una carencia real sin incorporar otra ruta.
El actor describe el uso; la autorización actual sigue siendo JWT, sin inventar
un nuevo control de roles dentro de esta historia.

## Contrato de entrada

| Campo | Regla |
| --- | --- |
| body | Objeto JSON, no null ni arreglo |
| `name`, `specie`, `size`, `pet_state` | Texto obligatorio con al menos un carácter distinto de espacio |
| `age` | Número finito mayor o igual a cero, o texto decimal no negativo convertible a número finito |
| `user_identification` | Texto no vacío o entero positivo seguro de JavaScript |
| `description` | Opcional; si está presente acepta texto o null |

Se admiten edad cero, edades decimales y cadenas numéricas (compatibilidad con
formularios y conversión previa de PostgreSQL); no se fuerza una unidad de edad
que el backend no documenta. No se convierte ni recorta el objeto original.
Identificaciones en texto preservan ceros iniciales y formatos existentes.
Campos adicionales conservan el comportamiento previo del repositorio, que solo
inserta su lista explícita. No se definen enums, máximos de longitud/edad ni nuevas
reglas de claves foráneas sin DDL. Contrastar estos supuestos con el esquema real
durante la revisión funcional manual, antes de integrar.

## Criterios de aceptación

1. CA-01: una entrada válida llega al repositorio una vez, sin modificación, y
   responde 201 con la mascota retornada por PostgreSQL.
2. CA-02: campos obligatorios ausentes, vacíos o con tipos inválidos producen 400
   con `{ message: "Datos de mascota inválidos", errors: [{ field, message }] }`.
   Se acumulan los errores; no se incluyen valores recibidos ni detalles SQL.
3. CA-03: edad negativa, no finita, booleano, objeto, arreglo o texto no decimal
   se rechaza; cero y decimal no negativo se aceptan.
4. CA-04: un body ausente/null/arreglo se rechaza sin acceder al repositorio.
5. CA-05: description omitida/null/texto es válida; otros tipos se rechazan.
6. CA-06: errores inesperados de persistencia mantienen 500 y el mensaje
   `Error creando mascota`, sin devolver detalles internos al cliente.
7. CA-07: el servicio también valida cuando se invoca fuera del controlador;
   no hay escritura si la entrada es inválida.
8. CA-08: cada archivo de producción relevante (validador, servicio y controlador
   de mascotas) cumple al menos 70 % en líneas, sentencias, funciones y ramas.
9. CA-09: JWT y operaciones GET/PUT/DELETE conservan su comportamiento.

## Definition of Done

- Implementación mínima en las capas existentes, sin dependencias de runtime nuevas.
- Casos válidos, inválidos, límites y errores inesperados probados sin DB/Auth0 reales.
- Gates preparados y fallos propagados: SAST, Dependency-Check, cobertura y secretos.
- Promoción automática retirada según `07-migracion-flujo-existente.md`;
  solo commits/push de feature durante preparación; documentación revisada.
- Revisión funcional del contrato, checks obligatorios activos, tres PR aprobados,
  ejecuciones Azure exitosas y evidencias vinculadas: **pendientes de trabajo manual**.

La preparación local no equivale a completar esta Definition of Done en Azure.
Crear los work items mañana, enlazarlos padre/hijo y sustituir referencias locales
por enlaces reales. Adjuntar los commits y los tres PR como vínculos del trabajo;
no inventar IDs `AB#` ni reescribir commits publicados para añadirlos.
