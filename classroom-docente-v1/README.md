# Classroom Docente v1.2

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
3. Importar un paquete portable o rellenar COLA.
4. Crear los temas faltantes desde COLA si procede.
5. Ejecutar **Validar cola y adjuntos**.
6. Corregir cualquier error.
7. Ejecutar **Crear borradores pendientes**.
8. Revisar manualmente Classroom.
9. Publicar manualmente cuando corresponda.

## Portabilidad entre docentes y cursos

La v1.1 permite exportar la COLA actual como una Google Sheet `CLASSROOM_PACKAGE_v1`.

El paquete incluye:
- `PUBLICACIONES`: datos portables de tareas/materiales/anuncios.
- `MANIFEST`: versión y procedencia.
- `ADJUNTOS_PLAN`: inventario de materiales, si existe.

No incluye `courseId`, `topicId`, `RESULT_ID` ni correo del profesor.

Otro docente, desde su propia copia de Classroom Docente, puede:
1. configurar uno de sus cursos;
2. importar el paquete;
3. sincronizar temas;
4. crear los temas que falten;
5. validar;
6. crear borradores.

Los adjuntos de Drive se auditan para comprobar que la cuenta del docente puede acceder a ellos. Si el paquete procede de otro profesor, deberán compartirse previamente o copiarse al Drive del profesor receptor.

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


## Aislamiento entre cursos

La v1.2 introduce una protección adicional para docentes que usen una misma copia con varios cursos:

- cada fila de COLA conserva su `COURSE_ID`;
- la auditoría marca error si una fila pertenece a un curso distinto del curso activo;
- el procesado no crea nada en Classroom si detecta esa discrepancia;
- la recreación tampoco borra ni recrea elementos si la fila no pertenece al curso activo.

Esto evita publicar accidentalmente en otro curso al cambiar de curso activo.

## Publicación programada

`PROGRAMAR_PARA` queda deliberadamente deshabilitado en v1.2.

La herramienta sólo crea `DRAFT`. La publicación al alumnado, inmediata o programada, se realiza manualmente desde Google Classroom por el docente.

## Recreación segura

La recreación es ahora fila a fila:

1. se crea un backup completo de COLA;
2. para cada fila marcada se comprueba curso, tipo y RESULT_ID;
3. se borra sólo ese objeto;
4. se recrea inmediatamente como DRAFT;
5. se registra el nuevo RESULT_ID;
6. si una fila falla, las demás pueden continuar y el error queda registrado.
