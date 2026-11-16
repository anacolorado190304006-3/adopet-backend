# Diagramas — Guía 4

## Jerarquía del trabajo

```mermaid
flowchart TD
  EP["EP-01 Calidad del catálogo"] --> FE["FE-01 Registro confiable"]
  FE --> HU["HU-01 Validación de mascotas"]
  HU --> T1["T-01 Auditoría"]
  HU --> T2["T-02 Validación y HTTP"]
  HU --> T3["T-03 Pruebas y cobertura"]
  HU --> T4["T-04 Pipeline y seguridad"]
  HU --> T5["T-05 Documentación y diagramas"]
  HU --> T6["T-06 Azure, PR y evidencias pendientes"]
```

## Flujo de registro

```mermaid
flowchart TD
  A["POST /api/pets"] --> JSON["Express: parsear JSON"]
  JSON --> JWT{"JWT válido"}
  JWT -->|No| AUTH["Rechazo de autenticación existente"]
  JWT -->|Sí| C["Controlador createPet"]
  C --> S["Servicio createPet"]
  S --> V["Validador: presencia y tipos"]
  V --> OK{"Datos válidos"}
  OK -->|No| E["PetValidationError con campos"]
  E --> BAD["Controlador responde 400, sin INSERT"]
  OK -->|Sí| R["Repositorio: INSERT parametrizado"]
  R --> DB[("PostgreSQL")]
  DB --> RESULT{"Persistencia exitosa"}
  RESULT -->|Sí| CREATED["201 con mascota creada"]
  RESULT -->|No| FAIL["500 con mensaje genérico"]
```

JSON malformado lo rechaza Express antes del controlador; su parser no se modifica.
La validación de la HU no consulta PostgreSQL ni Auth0.

## Migración controlada y tres PR

```mermaid
flowchart TB
  subgraph ANTES["Observado en GitHub antes de activar la migración"]
    D0["Push a development"] --> OLD["Workflow antiguo activo"]
    OLD -->|ff-only| S0["staging"]
    S0 -->|segundo job y environment| P0["production"]
  end
  subgraph PREPARACION["Prerequisito administrativo - pendiente"]
    OFF["Deshabilitar workflow en GitHub"] --> CANCEL["Cancelar ejecuciones antiguas"]
    CANCEL --> VERIFY["Verificar estado deshabilitado y cero ejecuciones pendientes"]
    VERIFY --> AZ["Conectar Azure y exigir checks en GitHub"]
  end
  subgraph PROPUESTA["Después de completar los prerequisitos"]
    F["feature/preparacion-flujo-existente con HU y YAML actualizado"] --> G1["PR 1: cuatro gates y revisión"]
    G1 --> D["development"]
    D --> G2["PR 2: cuatro gates y revisión"]
    G2 --> S["staging"]
    S --> G3["PR 3: cuatro gates y revisión"]
    G3 --> P["production"]
    RULE["SAST + OWASP + cobertura >= 70% + Gitleaks"] -.-> G1
    RULE -.-> G2
    RULE -.-> G3
    BLOCK["Fallo o falta de ejecución: bloquear integración"] -.-> RULE
    INERT["promote.yml conservado: sin push, jobs false, token read"] -.-> D
  end
  AZ --> F
```

El gráfico ANTES es evidencia del estado observado, no una ruta permitida durante
la entrega. No existe una promoción automática en el flujo propuesto. El workflow
continúa activo en GitHub hasta que un administrador complete la suspensión.
La rama original de HU conserva su YAML anterior: usar la rama de preparación
como origen de PR 1 o actualizar explícitamente la original antes de usarla.
Ver `07-migracion-flujo-existente.md` para activación, rollback y verificaciones.
