# Classroom Docente v1

Plantilla **individual por docente** para preparar Google Classroom desde una Google Sheet con Apps Script vinculado.

## Principios

- Una copia independiente por docente.
- Sin servidor central, Railway ni secretos compartidos.
- El docente autoriza su propia cuenta Google.
- Puede gestionar uno o varios cursos cambiando el curso activo.
- Todo se crea como **DRAFT**.
- La publicación al alumnado es manual.
- Los temas se resuelven por nombre; el usuario no necesita conocer `topicId`.
- Las operaciones destructivas se limitan a elementos con `RESULT_ID` registrados por la propia hoja y requieren marca `RECREAR=SI` + confirmación.

## Instalación de la plantilla maestra

1. Crear una Google Sheet vacía.
2. Extensiones → Apps Script.
3. Copiar `Code.gs`, `Setup.html` y `appsscript.json`.
4. Activar el servicio avanzado **Google Classroom API**.
5. Ejecutar `instalarClassroomDocente` una vez y autorizar.
6. Volver a la Sheet. Aparecerá el menú **Classroom Docente**.
7. Configurar el curso desde el menú.

Una vez preparada la Sheet maestra, distribuirla mediante **Archivo → Hacer una copia**. Google indica que al copiar una hoja que contiene un script vinculado, el script adjunto se copia también.

## Hojas

- `CONFIG`: curso activo y versión.
- `TEMAS`: nombres de tema ↔ IDs reales de Classroom.
- `COLA`: publicaciones.
- `ADJUNTOS_PLAN`: inventario de materiales.
- `AUDITORIA`: resultado de la prevalidación.
- `AUDIT_LOG`: trazabilidad de acciones.

## COLA

Columnas:

`ID | ESTADO | ACCION | COURSE_ID | TEMA | TITULO | DESCRIPCION | PUNTOS | FECHA_LIMITE | HORA_LIMITE | PROGRAMAR_PARA | ENLACES_JSON | RESULT_ID | RESULT_URL | ERROR | CREADO | PROCESADO | RECREAR`

Valores de ACCION soportados:

- `CREATE_ASSIGNMENT`
- `CREATE_MATERIAL`
- `CREATE_ANNOUNCEMENT`

Para una nueva publicación: `ESTADO=PENDIENTE`.

`TEMA` puede ser el nombre exacto del tema, un prefijo único o un topicId numérico.

`ENLACES_JSON`:

```json
[
  {"url":"https://drive.google.com/...","title":"Dosier alumno"},
  {"url":"https://docs.google.com/spreadsheets/...","title":"Plantilla E3"}
]
```

## Flujo docente recomendado

1. Configurar curso.
2. Sincronizar temas.
3. Importar/rellenar COLA.
4. Ejecutar **Validar cola y adjuntos**.
5. Corregir cualquier error.
6. Ejecutar **Crear borradores pendientes**.
7. Revisar manualmente Classroom.
8. Publicar manualmente cuando corresponda.

## Recreación

Marcar `RECREAR=SI` únicamente en las filas deseadas y ejecutar **Recrear filas marcadas**.

El sistema:

1. pide confirmación;
2. crea una copia de seguridad de COLA;
3. borra solamente los objetos cuyo RESULT_ID está registrado en esas filas;
4. limpia los IDs antiguos;
5. los vuelve a crear como DRAFT;
6. registra la operación en AUDIT_LOG.

## Notas de seguridad

Google Classroom asocia el CourseWork creado a un proyecto de desarrollador. Las operaciones posteriores sobre ese CourseWork deben hacerse desde el proyecto que lo creó. Por eso cada copia docente debe conservar su propio Apps Script y no mezclar RESULT_ID generados por otras herramientas.

No se publica automáticamente al alumnado en v1.
