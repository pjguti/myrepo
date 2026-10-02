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


## Transporte recomendado en v1.1

`CLASSROOM_PACKAGE_v1` se transporta como una Google Sheet con estas hojas:

- `PUBLICACIONES`
- `MANIFEST`
- `ADJUNTOS_PLAN` (opcional)

### PUBLICACIONES

Columnas:

`ID | ACCION | TEMA | TITULO | DESCRIPCION | PUNTOS | FECHA_LIMITE | HORA_LIMITE | PROGRAMAR_PARA | ENLACES_JSON`

Al importar, la instancia del profesor receptor añade automáticamente:
- su `courseId`;
- estado `PENDIENTE`;
- campos locales de resultado vacíos.

### Regla de colisión

Si un `ID` del paquete ya existe en la COLA de destino, la importación se detiene para evitar mezclar o sobrescribir publicaciones.
