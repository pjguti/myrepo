# Google Classroom MCP · Pablo

Conector MCP remoto privado para Google Classroom, restringido a pfgutierrez@fpconstruccion.es.

Herramientas:
- listar cursos;
- listar/crear temas;
- listar tareas;
- crear tareas, materiales y anuncios;
- listar entregas.

Las operaciones de creación usan DRAFT por defecto.

Despliegue:
1. habilitar Google Classroom API en Google Cloud;
2. crear cliente OAuth 2.0 tipo Web;
3. desplegar en Railway;
4. usar URL Railway como APP_ORIGIN;
5. registrar https://TU-DOMINIO/oauth/google/callback en Google OAuth;
6. configurar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET y ALLOWED_GOOGLE_EMAILS;
7. conectar https://TU-DOMINIO/mcp en ChatGPT;
8. después de identificar el curso 0669, fijar ALLOWED_COURSE_IDS a su ID.
