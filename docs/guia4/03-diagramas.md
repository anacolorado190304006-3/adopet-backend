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

## Flujos independientes de ramas

```mermaid
flowchart TB
  subgraph EXISTENTE["Promoción existente - sin modificaciones"]
    D["development"] -->|"push dispara GitHub Actions"| J1["Job staging: merge ff-only"]
    J1 --> ST["staging"]
    ST -->|"segundo job depende del primero"| J2["Environment production: aprobación"]
    J2 -->|"merge ff-only"| P["production"]
  end
  subgraph ACADEMICO["Propuesta académica - PR manuales pendientes"]
    F["feature/hu-01-validacion-mascotas"] --> PR1["PR 1: cuatro validaciones obligatorias"]
    PR1 -->|"solo con checks y revisión aprobados"| DEV["develop"]
    DEV --> PR2["PR 2: cuatro validaciones obligatorias"]
    PR2 -->|"solo con checks y revisión aprobados"| INT["integration"]
    INT --> PR3["PR 3: cuatro validaciones obligatorias"]
    PR3 -->|"solo con checks y revisión aprobados"| MAIN["main"]
    G["SAST + OWASP Dependency-Check + cobertura + secretos"] -.-> PR1
    G -.-> PR2
    G -.-> PR3
    BLOCK["Cualquier fallo bloquea integración mediante checks requeridos"] -.-> G
  end
```

No hay conexión automática entre ambos flujos. Los gates del diagrama académico
describen la configuración por realizar en GitHub/Azure; el YAML por sí solo no
activa la protección. `main` existe desde el inicio; develop e integration deben
crearse manualmente desde la base auditada, sin tocar development.
