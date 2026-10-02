const CD_VERSION = '1.1.0';
const CD_DEFAULT_STATE = 'DRAFT';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Classroom Docente')
    .addItem('1. Configurar / cambiar curso', 'mostrarConfiguracion')
    .addItem('2. Sincronizar temas', 'sincronizarTemas')
    .addItem('3. Crear temas faltantes desde COLA', 'crearTemasFaltantes')
    .addSeparator()
    .addItem('Importar paquete desde otra Sheet', 'importarPaqueteDialogo')
    .addItem('Exportar COLA como paquete portable', 'exportarPaquetePortable')
    .addSeparator()
    .addItem('Validar cola y adjuntos', 'auditarCola')
    .addItem('Crear borradores pendientes', 'procesarCola')
    .addItem('Recrear filas marcadas', 'recrearSeleccionados')
    .addSeparator()
    .addItem('Ver estado', 'mostrarEstado')
    .addToUi();
}

function instalarClassroomDocente() {
  asegurarEstructura_();
  mostrarConfiguracion();
}

function mostrarConfiguracion() {
  asegurarEstructura_();
  const html = HtmlService.createHtmlOutputFromFile('Setup')
    .setTitle('Classroom Docente · Configuración')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function getSetupData() {
  const courses = listarCursosDocente_();
  const props = PropertiesService.getDocumentProperties();
  return {
    version: CD_VERSION,
    email: Session.getEffectiveUser().getEmail() || '',
    selectedCourseId: props.getProperty('COURSE_ID') || '',
    selectedCourseName: props.getProperty('COURSE_NAME') || '',
    courses
  };
}

function guardarCurso(courseId) {
  const course = Classroom.Courses.get(String(courseId));
  const props = PropertiesService.getDocumentProperties();
  props.setProperties({
    COURSE_ID: String(course.id),
    COURSE_NAME: String(course.name || ''),
    TEACHER_EMAIL: Session.getEffectiveUser().getEmail() || ''
  });
  escribirConfig_();
  sincronizarTemas();
  return {ok:true, id:String(course.id), name:String(course.name || '')};
}

function listarCursosDocente_() {
  let out = [];
  let pageToken;
  do {
    const opt = {teacherId:'me', courseStates:['ACTIVE'], pageSize:100};
    if (pageToken) opt.pageToken = pageToken;
    const r = Classroom.Courses.list(opt);
    out = out.concat(r.courses || []);
    pageToken = r.nextPageToken;
  } while (pageToken);
  return out.map(c => ({
    id:String(c.id),
    name:String(c.name || ''),
    section:String(c.section || ''),
    alternateLink:String(c.alternateLink || '')
  })).sort((a,b) => a.name.localeCompare(b.name, 'es'));
}

function sincronizarTemas() {
  asegurarEstructura_();
  const courseId = exigirCurso_();
  const r = Classroom.Courses.Topics.list(courseId, {pageSize:100});
  const topics = (r.topic || []).map(t => [String(t.name || ''), String(t.topicId || '')]);

  const sh = SpreadsheetApp.getActive().getSheetByName('TEMAS');
  sh.clearContents();
  sh.getRange(1,1,1,2).setValues([['TEMA','TOPIC_ID']]);
  if (topics.length) sh.getRange(2,1,topics.length,2).setValues(topics);
  formatearCabecera_(sh, 2);
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1,2);

  const map = {};
  topics.forEach(([name,id]) => map[name] = id);
  PropertiesService.getDocumentProperties().setProperty('TOPICS_JSON', JSON.stringify(map));
  registrarAudit_('SYNC_TOPICS', '', '', 'OK', topics.length + ' temas');
  return topics.length;
}

function resolverTopicId_(topicValue) {
  const raw = String(topicValue || '').trim();
  if (!raw) return '';
  if (/^\d+$/.test(raw)) return raw;
  const props = PropertiesService.getDocumentProperties();
  let map = {};
  try { map = JSON.parse(props.getProperty('TOPICS_JSON') || '{}'); } catch(e) {}
  if (map[raw]) return String(map[raw]);

  const keys = Object.keys(map);
  const exact = keys.find(k => k.toLowerCase() === raw.toLowerCase());
  if (exact) return String(map[exact]);

  const prefix = keys.filter(k => k.toLowerCase().startsWith(raw.toLowerCase()));
  if (prefix.length === 1) return String(map[prefix[0]]);
  throw new Error('Tema no resuelto o ambiguo: ' + raw);
}


function crearTemasFaltantes() {
  asegurarEstructura_();
  const ui = SpreadsheetApp.getUi();
  const sh = SpreadsheetApp.getActive().getSheetByName('COLA');
  const data = sh.getDataRange().getValues();

  sincronizarTemas();
  const props = PropertiesService.getDocumentProperties();
  let map = {};
  try { map = JSON.parse(props.getProperty('TOPICS_JSON') || '{}'); } catch(e) {}

  const faltantes = [];
  for (let i=1; i<data.length; i++) {
    const raw = String(data[i][4] || '').trim();
    if (!raw || /^\d+$/.test(raw)) continue;
    try {
      resolverTopicId_(raw);
    } catch(e) {
      if (!faltantes.includes(raw)) faltantes.push(raw);
    }
  }

  if (!faltantes.length) {
    ui.alert('No hay temas faltantes en COLA.');
    return 0;
  }

  const resp = ui.alert(
    'Crear temas faltantes',
    'Se crearán en Classroom estos temas:\n\n' + faltantes.join('\n') + '\n\n¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return 0;

  const courseId = exigirCurso_();
  let creados = 0;
  faltantes.forEach(name => {
    Classroom.Courses.Topics.create({name:String(name)}, courseId);
    registrarAudit_('CREATE_TOPIC', name, '', 'OK', '');
    creados++;
  });
  sincronizarTemas();
  ui.alert('Temas creados: ' + creados);
  return creados;
}

function exportarPaquetePortable() {
  asegurarEstructura_();
  const ss = SpreadsheetApp.getActive();
  const cola = ss.getSheetByName('COLA');
  const adj = ss.getSheetByName('ADJUNTOS_PLAN');
  const data = cola.getDataRange().getValues();

  const name = 'CLASSROOM_PACKAGE_v1_' +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');

  const out = SpreadsheetApp.create(name);
  const pub = out.getSheets()[0];
  pub.setName('PUBLICACIONES');

  const headers = [
    'ID','ACCION','TEMA','TITULO','DESCRIPCION','PUNTOS',
    'FECHA_LIMITE','HORA_LIMITE','PROGRAMAR_PARA','ENLACES_JSON'
  ];
  pub.getRange(1,1,1,headers.length).setValues([headers]);

  const rows = [];
  for (let i=1; i<data.length; i++) {
    const r = data[i];
    if (!String(r[0] || '').trim()) continue;
    rows.push([
      r[0], r[2], r[4], r[5], r[6], r[7],
      r[8], r[9], r[10], r[11]
    ]);
  }
  if (rows.length) pub.getRange(2,1,rows.length,headers.length).setValues(rows);
  formatearCabecera_(pub, headers.length);
  pub.setFrozenRows(1);
  pub.autoResizeColumns(1, headers.length);

  const man = out.insertSheet('MANIFEST');
  man.getRange('A1:B6').setValues([
    ['CLAVE','VALOR'],
    ['FORMAT','CLASSROOM_PACKAGE_v1'],
    ['SOURCE_VERSION',CD_VERSION],
    ['EXPORTED_AT',new Date()],
    ['SOURCE_COURSE_NAME',PropertiesService.getDocumentProperties().getProperty('COURSE_NAME') || ''],
    ['NOTE','Portable: no contiene courseId, topicId ni RESULT_ID']
  ]);
  formatearCabecera_(man,2);
  man.autoResizeColumns(1,2);

  if (adj && adj.getLastRow() > 1) {
    const dst = out.insertSheet('ADJUNTOS_PLAN');
    const av = adj.getDataRange().getValues();
    dst.getRange(1,1,av.length,av[0].length).setValues(av);
    formatearCabecera_(dst,av[0].length);
    dst.setFrozenRows(1);
    dst.autoResizeColumns(1,av[0].length);
  }

  registrarAudit_('EXPORT_PACKAGE', '', '', 'OK', out.getUrl());
  SpreadsheetApp.getUi().alert(
    'Paquete portable creado:\n\n' + out.getName() + '\n\n' + out.getUrl()
  );
  return out.getUrl();
}

function importarPaqueteDialogo() {
  asegurarEstructura_();
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt(
    'Importar paquete',
    'Pega la URL o el ID de una Google Sheet que contenga PUBLICACIONES y, opcionalmente, ADJUNTOS_PLAN.',
    ui.ButtonSet.OK_CANCEL
  );
  if (r.getSelectedButton() !== ui.Button.OK) return;
  return importarPaqueteDesdeSheet_(r.getResponseText());
}

function importarPaqueteDesdeSheet_(urlOrId) {
  const id = extraerSpreadsheetId_(urlOrId);
  if (!id) throw new Error('No se ha podido obtener el ID de la Google Sheet.');

  const src = SpreadsheetApp.openById(id);
  const pub = src.getSheetByName('PUBLICACIONES');
  if (!pub) throw new Error('El paquete no contiene la hoja PUBLICACIONES.');

  const manifest = src.getSheetByName('MANIFEST');
  if (manifest) {
    const vals = manifest.getDataRange().getValues();
    const map = {};
    vals.slice(1).forEach(r => map[String(r[0]||'')] = String(r[1]||''));
    if (map.FORMAT && map.FORMAT !== 'CLASSROOM_PACKAGE_v1') {
      throw new Error('Formato de paquete no compatible: ' + map.FORMAT);
    }
  }

  const pv = pub.getDataRange().getValues();
  if (pv.length < 2) throw new Error('PUBLICACIONES está vacía.');

  const headers = pv[0].map(x => String(x || '').trim());
  const ix = {};
  headers.forEach((h,i) => ix[h] = i);
  ['ID','ACCION','TEMA','TITULO','DESCRIPCION','ENLACES_JSON'].forEach(h => {
    if (ix[h] === undefined) throw new Error('Falta columna obligatoria en PUBLICACIONES: ' + h);
  });

  const dst = SpreadsheetApp.getActive().getSheetByName('COLA');
  const existing = dst.getDataRange().getValues();
  const existingIds = new Set(existing.slice(1).map(r => String(r[0]||'').trim()).filter(Boolean));

  const courseId = exigirCurso_();
  const rows = [];
  for (let i=1; i<pv.length; i++) {
    const r = pv[i];
    const localId = String(r[ix.ID] || '').trim();
    if (!localId) continue;
    if (existingIds.has(localId)) {
      throw new Error('Ya existe en COLA el ID: ' + localId + '. Importación cancelada sin mezclar datos.');
    }
    rows.push([
      localId,
      'PENDIENTE',
      String(r[ix.ACCION] || '').trim(),
      courseId,
      String(r[ix.TEMA] || '').trim(),
      String(r[ix.TITULO] || ''),
      String(r[ix.DESCRIPCION] || ''),
      ix.PUNTOS !== undefined ? r[ix.PUNTOS] : '',
      ix.FECHA_LIMITE !== undefined ? r[ix.FECHA_LIMITE] : '',
      ix.HORA_LIMITE !== undefined ? r[ix.HORA_LIMITE] : '',
      ix.PROGRAMAR_PARA !== undefined ? r[ix.PROGRAMAR_PARA] : '',
      String(r[ix.ENLACES_JSON] || ''),
      '', '', '', new Date(), '', 'NO'
    ]);
  }

  if (!rows.length) throw new Error('No hay publicaciones importables.');

  dst.getRange(dst.getLastRow()+1,1,rows.length,18).setValues(rows);

  const srcAdj = src.getSheetByName('ADJUNTOS_PLAN');
  if (srcAdj && srcAdj.getLastRow() > 1) {
    const dstAdj = SpreadsheetApp.getActive().getSheetByName('ADJUNTOS_PLAN');
    const av = srcAdj.getRange(2,1,srcAdj.getLastRow()-1,srcAdj.getLastColumn()).getValues();
    if (av.length) dstAdj.getRange(dstAdj.getLastRow()+1,1,av.length,av[0].length).setValues(av);
  }

  registrarAudit_('IMPORT_PACKAGE', '', '', 'OK', src.getName() + ' · ' + rows.length + ' publicaciones');
  SpreadsheetApp.getUi().alert(
    'Importación terminada: '+rows.length+' publicaciones.\n\n' +
    'Siguiente paso: sincroniza temas, crea los que falten si procede y ejecuta la auditoría.'
  );
  return rows.length;
}

function extraerSpreadsheetId_(value) {
  const s = String(value || '').trim();
  if (!s) return '';
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return '';
}

function auditarCola() {
  asegurarEstructura_();
  const sh = SpreadsheetApp.getActive().getSheetByName('COLA');
  const data = sh.getDataRange().getValues();
  const errors = [];
  let ready = 0;

  for (let i=1; i<data.length; i++) {
    const row = data[i];
    const id = String(row[0] || '').trim();
    if (!id) continue;
    const action = String(row[2] || '').trim().toUpperCase();
    const title = String(row[5] || '').trim();
    const topic = String(row[4] || '').trim();
    const links = String(row[11] || '').trim();

    if (!['CREATE_ASSIGNMENT','CREATE_MATERIAL','CREATE_ANNOUNCEMENT'].includes(action)) {
      errors.push('Fila ' + (i+1) + ' ('+id+'): ACCION no válida');
    }
    if (action !== 'CREATE_ANNOUNCEMENT' && !title) {
      errors.push('Fila ' + (i+1) + ' ('+id+'): falta TITULO');
    }
    if (topic) {
      try { resolverTopicId_(topic); } catch(e) { errors.push('Fila '+(i+1)+' ('+id+'): '+e.message); }
    }
    if (links) {
      try {
        const arr = JSON.parse(links);
        if (!Array.isArray(arr)) throw new Error('ENLACES_JSON debe ser un array');
        arr.forEach((x,j) => {
          if (!x || !x.url) throw new Error('adjunto '+(j+1)+' sin url');
          const chk = auditarUrlAdjunto_(String(x.url));
          if (!chk.ok) throw new Error('adjunto '+(j+1)+': '+chk.error);
        });
      } catch(e) {
        errors.push('Fila ' + (i+1) + ' ('+id+'): ' + e.message);
      }
    }
    ready++;
  }

  const audit = SpreadsheetApp.getActive().getSheetByName('AUDITORIA');
  audit.clearContents();
  audit.getRange('A1:B1').setValues([['RESULTADO','DETALLE']]);
  const rows = errors.length
    ? errors.map(x => ['ERROR',x])
    : [['OK', ready + ' publicaciones validadas; 0 errores']];
  audit.getRange(2,1,rows.length,2).setValues(rows);
  formatearCabecera_(audit,2);
  audit.autoResizeColumns(1,2);
  registrarAudit_('VALIDATE', '', '', errors.length ? 'ERROR' : 'OK', errors.length ? errors.join(' | ') : ready+' filas');

  SpreadsheetApp.getUi().alert(errors.length
    ? 'Auditoría terminada con '+errors.length+' errores. Revisa la hoja AUDITORIA.'
    : 'Auditoría correcta: '+ready+' publicaciones preparadas.'
  );
  return {ready, errors};
}

function procesarCola() {
  asegurarEstructura_();
  const courseId = exigirCurso_();
  const sh = SpreadsheetApp.getActive().getSheetByName('COLA');
  const data = sh.getDataRange().getValues();

  for (let i=1; i<data.length; i++) {
    const row = data[i];
    if (String(row[1] || '').toUpperCase() !== 'PENDIENTE') continue;

    try {
      const result = crearDesdeFila_(courseId, row);
      sh.getRange(i+1,2).setValue('PROCESADO');
      sh.getRange(i+1,13).setValue(result && result.id ? String(result.id) : '');
      sh.getRange(i+1,14).setValue(result && result.alternateLink ? String(result.alternateLink) : '');
      sh.getRange(i+1,15).clearContent();
      sh.getRange(i+1,17).setValue(new Date());
      registrarAudit_('CREATE', String(row[0]||''), result && result.id ? String(result.id):'', 'OK', String(row[2]||''));
    } catch(err) {
      sh.getRange(i+1,2).setValue('ERROR');
      sh.getRange(i+1,15).setValue(String(err && err.message ? err.message : err));
      sh.getRange(i+1,17).setValue(new Date());
      registrarAudit_('CREATE', String(row[0]||''), '', 'ERROR', String(err && err.message ? err.message : err));
    }
  }
}

function crearDesdeFila_(courseId, row) {
  const action = String(row[2] || '').toUpperCase();
  const topicId = resolverTopicId_(row[4]);
  const links = parseLinks_(row[11]);

  if (action === 'CREATE_ASSIGNMENT') {
    const work = {
      title:String(row[5] || ''),
      description:String(row[6] || ''),
      workType:'ASSIGNMENT',
      state:CD_DEFAULT_STATE
    };
    if (!work.title) throw new Error('title es obligatorio');
    if (topicId) work.topicId = topicId;
    if (row[7] !== '' && row[7] !== null) work.maxPoints = Number(row[7]);
    if (links.length) work.materials = links;
    aplicarFecha_(work, row[8], row[9]);
    return Classroom.Courses.CourseWork.create(work, courseId);
  }

  if (action === 'CREATE_MATERIAL') {
    const material = {
      title:String(row[5] || ''),
      description:String(row[6] || ''),
      state:CD_DEFAULT_STATE
    };
    if (!material.title) throw new Error('title es obligatorio');
    if (topicId) material.topicId = topicId;
    if (links.length) material.materials = links;
    return Classroom.Courses.CourseWorkMaterials.create(material, courseId);
  }

  if (action === 'CREATE_ANNOUNCEMENT') {
    const a = {text:String(row[6] || row[5] || ''), state:CD_DEFAULT_STATE};
    if (!a.text) throw new Error('texto es obligatorio');
    if (links.length) a.materials = links;
    return Classroom.Courses.Announcements.create(a, courseId);
  }

  throw new Error('Acción no reconocida: ' + action);
}

function recrearSeleccionados() {
  asegurarEstructura_();
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Recrear borradores',
    'Se borrarán y recrearán SOLO las filas con RECREAR = SI y con RESULT_ID registrado. Todo volverá a crearse como DRAFT. ¿Continuar?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  const courseId = exigirCurso_();
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('COLA');
  const data = sh.getDataRange().getValues();

  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const backup = sh.copyTo(ss).setName('BACKUP_'+stamp);

  let count = 0;
  for (let i=1; i<data.length; i++) {
    const row = data[i];
    const recreate = String(row[17] || '').trim().toUpperCase();
    if (!['SI','SÍ','YES','TRUE','1'].includes(recreate)) continue;

    const resultId = String(row[12] || '').trim();
    const action = String(row[2] || '').toUpperCase();
    if (!resultId) throw new Error('Fila '+(i+1)+': RECREAR=SI pero RESULT_ID vacío');

    if (action === 'CREATE_ASSIGNMENT') {
      Classroom.Courses.CourseWork.remove(courseId, resultId);
    } else if (action === 'CREATE_MATERIAL') {
      Classroom.Courses.CourseWorkMaterials.remove(courseId, resultId);
    } else {
      throw new Error('Fila '+(i+1)+': recreación no soportada para '+action);
    }

    sh.getRange(i+1,2).setValue('PENDIENTE');
    sh.getRange(i+1,13,1,3).clearContent();
    sh.getRange(i+1,17).clearContent();
    sh.getRange(i+1,18).setValue('NO');
    count++;
  }

  procesarCola();
  registrarAudit_('RECREATE_BATCH', '', '', 'OK', count+' filas; backup '+backup.getName());
  ui.alert('Recreación terminada para '+count+' filas. Revisa ESTADO/ERROR antes de publicar.');
}

function aplicarFecha_(resource, dateValue, timeValue) {
  if (!dateValue) return;
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (isNaN(d.getTime())) throw new Error('FECHA_LIMITE no válida');
  resource.dueDate = {year:d.getFullYear(), month:d.getMonth()+1, day:d.getDate()};
  if (timeValue) {
    const t = timeValue instanceof Date ? timeValue : new Date(timeValue);
    if (!isNaN(t.getTime())) resource.dueTime = {hours:t.getHours(), minutes:t.getMinutes()};
  }
}

function parseLinks_(value) {
  if (!value) return [];
  const data = JSON.parse(String(value));
  if (!Array.isArray(data)) throw new Error('ENLACES_JSON debe ser un array');
  return data.map(x => {
    if (!x || !x.url) throw new Error('Adjunto sin URL');
    return {link:{url:String(x.url), title:x.title ? String(x.title) : undefined}};
  });
}


function auditarUrlAdjunto_(url) {
  const id = extraerDriveFileId_(url);
  if (!id) return {ok:true, type:'external_link'};
  try {
    const f = DriveApp.getFileById(id);
    f.getName();
    return {ok:true, type:'drive'};
  } catch(e) {
    return {ok:false, error:'archivo de Drive no accesible para esta cuenta'};
  }
}

function extraerDriveFileId_(url) {
  const s = String(url || '');
  let m = s.match(/\/d\/([a-zA-Z0-9-_]{15,})/);
  if (m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9-_]{15,})/);
  if (m) return m[1];
  return '';
}

function mostrarEstado() {
  const props = PropertiesService.getDocumentProperties();
  SpreadsheetApp.getUi().alert(
    'Classroom Docente v'+CD_VERSION+'\n\n' +
    'Cuenta: '+(props.getProperty('TEACHER_EMAIL') || Session.getEffectiveUser().getEmail() || '—')+'\n' +
    'Curso: '+(props.getProperty('COURSE_NAME') || 'NO CONFIGURADO')+'\n' +
    'Course ID: '+(props.getProperty('COURSE_ID') || '—')+'\n' +
    'Modo de creación: DRAFT'
  );
}

function exigirCurso_() {
  const id = PropertiesService.getDocumentProperties().getProperty('COURSE_ID');
  if (!id) throw new Error('No hay curso configurado. Usa Classroom Docente > Configurar / cambiar curso.');
  Classroom.Courses.get(id);
  return id;
}

function asegurarEstructura_() {
  const ss = SpreadsheetApp.getActive();
  asegurarHoja_(ss,'CONFIG',['CLAVE','VALOR']);
  asegurarHoja_(ss,'TEMAS',['TEMA','TOPIC_ID']);
  asegurarHoja_(ss,'COLA',[
    'ID','ESTADO','ACCION','COURSE_ID','TEMA','TITULO','DESCRIPCION','PUNTOS',
    'FECHA_LIMITE','HORA_LIMITE','PROGRAMAR_PARA','ENLACES_JSON',
    'RESULT_ID','RESULT_URL','ERROR','CREADO','PROCESADO','RECREAR'
  ]);
  asegurarHoja_(ss,'ADJUNTOS_PLAN',['ID_PUBLICACION','ARCHIVO','URL_DRIVE','ESTADO','USO']);
  asegurarHoja_(ss,'AUDITORIA',['RESULTADO','DETALLE']);
  asegurarHoja_(ss,'AUDIT_LOG',['FECHA','USUARIO','CURSO','ACCION','ID_LOCAL','RESULT_ID','RESULTADO','DETALLE']);
  escribirConfig_();
}

function asegurarHoja_(ss,name,headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,headers.length).setValues([headers]);
  else {
    const existing = sh.getRange(1,1,1,Math.max(headers.length,sh.getLastColumn())).getValues()[0];
    let changed = false;
    headers.forEach((h,i) => { if (existing[i] !== h) { existing[i]=h; changed=true; } });
    if (changed) sh.getRange(1,1,1,headers.length).setValues([existing.slice(0,headers.length)]);
  }
  formatearCabecera_(sh, headers.length);
  sh.setFrozenRows(1);
}

function formatearCabecera_(sh, cols) {
  sh.getRange(1,1,1,cols)
    .setFontWeight('bold')
    .setBackground('#A7182F')
    .setFontColor('#FFFFFF');
}

function escribirConfig_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('CONFIG');
  if (!sh) return;
  const p = PropertiesService.getDocumentProperties();
  const rows = [
    ['VERSION',CD_VERSION],
    ['COURSE_ID',p.getProperty('COURSE_ID') || ''],
    ['COURSE_NAME',p.getProperty('COURSE_NAME') || ''],
    ['TEACHER_EMAIL',p.getProperty('TEACHER_EMAIL') || Session.getEffectiveUser().getEmail() || ''],
    ['DEFAULT_STATE','DRAFT']
  ];
  sh.getRange(2,1,Math.max(rows.length,sh.getMaxRows()-1),2).clearContent();
  sh.getRange(2,1,rows.length,2).setValues(rows);
  sh.autoResizeColumns(1,2);
}

function registrarAudit_(action, localId, resultId, result, detail) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName('AUDIT_LOG');
  if (!sh) return;
  const p = PropertiesService.getDocumentProperties();
  sh.appendRow([
    new Date(),
    Session.getEffectiveUser().getEmail() || '',
    p.getProperty('COURSE_NAME') || p.getProperty('COURSE_ID') || '',
    action, localId || '', resultId || '', result || '', detail || ''
  ]);
}
