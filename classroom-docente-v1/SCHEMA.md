# CLASSROOM_PACKAGE_v1

El paquete portable contiene únicamente datos docentes; no contiene courseId ni topicId.

## Campos mínimos de publicación

- id
- action
- topic
- title
- description
- attachments[]

Opcionales:

- maxPoints
- dueDate
- dueTime
- scheduledTime

## Regla de portabilidad

Nunca incluir en un paquete:

- courseId
- topicId
- email del profesor
- RESULT_ID
- RESULT_URL

Esos valores pertenecen a la instancia individual del docente.

## Tipos

### assignment

`CREATE_ASSIGNMENT`

### material

`CREATE_MATERIAL`

### announcement

`CREATE_ANNOUNCEMENT`

## Adjuntos

Cada adjunto usa:

```json
{"url":"...","title":"..."}
```

v1 utiliza enlaces. Una versión posterior podrá distinguir DriveFile, YouTube y Link para aprovechar capacidades específicas de Classroom.
