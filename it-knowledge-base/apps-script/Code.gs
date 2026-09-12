const RECORDS_SHEET = 'Records';
const CONFIG_SHEET = 'Config';
const ATTACHMENT_FOLDER_PROP = 'ATTACHMENTS_FOLDER_ID';
const ATTACHMENT_ROOT_NAME = 'IT 問題處理知識庫附件';
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const HEADERS = [
  'id','category','date','title','description','symptom','environment','cause','solution',
  'links','tags','favorite','notes','createdAt','updatedAt','attachments'
];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('請先從 Google 試算表的「擴充功能 → Apps Script」開啟此程式。');
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SHEET_ID', ss.getId());

  let key = props.getProperty('SYNC_KEY');
  if (!key) {
    key = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    props.setProperty('SYNC_KEY', key);
  }

  ensureSheets_(ss);
  const folder = getAttachmentRoot_();
  Logger.log('SYNC_KEY: ' + key);
  Logger.log('ATTACHMENTS_FOLDER: ' + folder.getUrl());
  return 'SYNC_KEY: ' + key + '\nATTACHMENTS_FOLDER: ' + folder.getUrl();
}

function doGet(e) {
  try {
    verifyKey_(e && e.parameter && e.parameter.key);
    const action = String((e && e.parameter && e.parameter.action) || 'list');
    let result;
    if (action === 'list') result = listAll_();
    else if (action === 'ping') {
      const folder = getAttachmentRoot_();
      result = {ok:true, message:'pong', driveEnabled:true, attachmentFolderName:folder.getName()};
    }
    else if (action === 'record') result = getRecord_(String(e.parameter.id || ''));
    else if (action === 'attachment') result = getAttachment_(String(e.parameter.fileId || ''));
    else throw new Error('不支援的 action');
    return output_(result, e && e.parameter && e.parameter.callback);
  } catch (err) {
    return output_({ok:false, error:String(err.message || err)}, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    verifyKey_(body.key);
    const action = String(body.action || '');

    if (action === 'upsert') upsertRecord_(body.record || {});
    else if (action === 'delete') deleteRecord_(String(body.id || ''));
    else if (action === 'replaceAll') replaceAll_(body.records || [], body.categories || [], body.categoryIcons || {});
    else if (action === 'meta') saveMeta_(body.categories || [], body.categoryIcons || {});
    else if (action === 'syncAttachments') syncAttachments_(String(body.id || ''), body.attachments || []);
    else throw new Error('不支援的 action');

    return json_({ok:true});
  } catch (err) {
    return json_({ok:false, error:String(err.message || err)});
  }
}

function getSS_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('尚未執行 setup()');
  const ss = SpreadsheetApp.openById(id);
  ensureSheets_(ss);
  return ss;
}

function ensureSheets_(ss) {
  let rs = ss.getSheetByName(RECORDS_SHEET);
  if (!rs) rs = ss.insertSheet(RECORDS_SHEET);
  rs.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
  rs.setFrozenRows(1);

  let cs = ss.getSheetByName(CONFIG_SHEET);
  if (!cs) cs = ss.insertSheet(CONFIG_SHEET);
  if (cs.getLastRow() === 0) {
    cs.getRange(1,1,1,2).setValues([['key','value']]);
    cs.setFrozenRows(1);
  }
}

function verifyKey_(key) {
  const expected = PropertiesService.getScriptProperties().getProperty('SYNC_KEY');
  if (!expected) throw new Error('伺服器尚未執行 setup()');
  if (!key || String(key) !== expected) throw new Error('同步金鑰錯誤');
}

function listAll_() {
  const ss = getSS_();
  const sh = ss.getSheetByName(RECORDS_SHEET);
  const rows = sh.getLastRow() > 1 ? sh.getRange(2,1,sh.getLastRow()-1,HEADERS.length).getValues() : [];
  const records = rows.filter(r => r[0]).map(rowToRecord_);
  const meta = readMeta_();
  const folder = getAttachmentRoot_();

  return {
    ok:true,
    driveEnabled:true,
    attachmentFolderName:folder.getName(),
    records:records,
    categories:meta.categories || [],
    categoryIcons:meta.categoryIcons || {}
  };
}

function getRecord_(id) {
  if (!id) throw new Error('缺少紀錄 id');
  const ss = getSS_();
  const sh = ss.getSheetByName(RECORDS_SHEET);
  const row = findRecordRow_(sh, id);
  if (!row) throw new Error('找不到紀錄');
  return {ok:true, driveEnabled:true, record:rowToRecord_(sh.getRange(row,1,1,HEADERS.length).getValues()[0])};
}

function upsertRecord_(record) {
  if (!record || !record.id) throw new Error('紀錄缺少 id');

  const ss = getSS_();
  const sh = ss.getSheetByName(RECORDS_SHEET);
  const last = sh.getLastRow();
  let target = 0;
  let existingAttachments = [];

  if (last > 1) {
    const ids = sh.getRange(2,1,last-1,1).getDisplayValues().flat();
    const idx = ids.indexOf(String(record.id));
    if (idx >= 0) {
      target = idx + 2;
      existingAttachments = parseJson_(sh.getRange(target,16).getDisplayValue(), []);
    }
  }

  if (!target) target = last + 1;
  sh.getRange(target,1,1,HEADERS.length).setValues([recordToRow_(record, existingAttachments)]);
}

function deleteRecord_(id) {
  if (!id) return;

  const ss = getSS_();
  const sh = ss.getSheetByName(RECORDS_SHEET);
  const last = sh.getLastRow();

  if (last > 1) {
    const ids = sh.getRange(2,1,last-1,1).getDisplayValues().flat();
    const idx = ids.indexOf(String(id));
    if (idx >= 0) sh.deleteRow(idx + 2);
  }

  trashRecordFolder_(id);
}

function replaceAll_(records, categories, categoryIcons) {
  const ss = getSS_();
  const sh = ss.getSheetByName(RECORDS_SHEET);
  const oldMap = {};
  const oldIds = [];

  if (sh.getLastRow() > 1) {
    const oldRows = sh.getRange(2,1,sh.getLastRow()-1,HEADERS.length).getValues();
    oldRows.forEach(row => {
      const id = String(row[0] || '');
      if (!id) return;
      oldIds.push(id);
      oldMap[id] = parseJson_(row[15], []);
    });
    sh.getRange(2,1,sh.getLastRow()-1,HEADERS.length).clearContent();
  }

  const valid = (records || []).filter(r => r && r.id);
  const clean = valid.map(r => recordToRow_(r, oldMap[String(r.id)] || []));
  if (clean.length) sh.getRange(2,1,clean.length,HEADERS.length).setValues(clean);

  const keep = {};
  valid.forEach(r => keep[String(r.id)] = true);
  oldIds.forEach(id => { if (!keep[id]) trashRecordFolder_(id); });

  saveMeta_(categories || [], categoryIcons || {});
}

function syncAttachments_(recordId, desired) {
  if (!recordId) throw new Error('附件同步缺少紀錄 id');

  const ss = getSS_();
  const sh = ss.getSheetByName(RECORDS_SHEET);
  const row = findRecordRow_(sh, recordId);
  if (!row) throw new Error('找不到要同步附件的紀錄');

  const current = parseJson_(sh.getRange(row,16).getDisplayValue(), []);
  const wanted = (desired || []).slice(0, MAX_ATTACHMENTS);
  const result = [];
  const keepIds = {};
  let folder = null;

  wanted.forEach(item => {
    item = item || {};
    const existingId = String(item.driveFileId || '');

    if (existingId) {
      const file = getAllowedAttachmentFile_(existingId);
      keepIds[existingId] = true;
      result.push({
        localId:String(item.localId || ''),
        name:String(item.name || file.getName()),
        type:String(item.type || file.getMimeType()),
        size:Number(item.size || file.getSize()),
        driveFileId:existingId
      });
      return;
    }

    const dataUrl = String(item.data || '');
    if (!dataUrl) return;

    const parsed = parseDataUrl_(dataUrl);
    if (!parsed.mimeType.startsWith('image/')) throw new Error('附件只允許圖片');
    if (parsed.bytes.length > MAX_ATTACHMENT_BYTES) throw new Error('單張圖片不可超過 2 MB');

    if (!folder) folder = getRecordFolder_(recordId, true);

    const name = String(item.name || ('image_' + new Date().getTime()));
    const blob = Utilities.newBlob(parsed.bytes, parsed.mimeType, name);
    const file = folder.createFile(blob);
    const fileId = file.getId();

    keepIds[fileId] = true;
    result.push({
      localId:String(item.localId || ''),
      name:file.getName(),
      type:file.getMimeType(),
      size:file.getSize(),
      driveFileId:fileId
    });
  });

  current.forEach(item => {
    const id = String((item && item.driveFileId) || '');
    if (id && !keepIds[id]) {
      try {
        const file = getAllowedAttachmentFile_(id);
        file.setTrashed(true);
      } catch (_) {}
    }
  });

  sh.getRange(row,16).setValue(JSON.stringify(result));
  return result;
}

function getAttachment_(fileId) {
  if (!fileId) throw new Error('缺少附件 fileId');

  const file = getAllowedAttachmentFile_(fileId);
  const blob = file.getBlob();
  const bytes = blob.getBytes();
  if (bytes.length > MAX_ATTACHMENT_BYTES) throw new Error('附件超過允許大小');

  return {
    ok:true,
    name:file.getName(),
    type:file.getMimeType(),
    size:file.getSize(),
    data:'data:' + file.getMimeType() + ';base64,' + Utilities.base64Encode(bytes)
  };
}

function getAttachmentRoot_() {
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty(ATTACHMENT_FOLDER_PROP);

  if (saved) {
    try {
      const folder = DriveApp.getFolderById(saved);
      if (!folder.isTrashed()) return folder;
    } catch (_) {}
  }

  const root = DriveApp.getRootFolder();
  const found = root.getFoldersByName(ATTACHMENT_ROOT_NAME);
  const folder = found.hasNext() ? found.next() : root.createFolder(ATTACHMENT_ROOT_NAME);
  props.setProperty(ATTACHMENT_FOLDER_PROP, folder.getId());
  return folder;
}

function recordFolderName_(id) {
  return 'record_' + String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getRecordFolder_(id, createIfMissing) {
  const root = getAttachmentRoot_();
  const folders = root.getFoldersByName(recordFolderName_(id));
  if (folders.hasNext()) return folders.next();
  return createIfMissing ? root.createFolder(recordFolderName_(id)) : null;
}

function trashRecordFolder_(id) {
  if (!id) return;
  const root = getAttachmentRoot_();
  const folders = root.getFoldersByName(recordFolderName_(id));
  while (folders.hasNext()) {
    try { folders.next().setTrashed(true); } catch (_) {}
  }
}

function getAllowedAttachmentFile_(fileId) {
  const rootId = getAttachmentRoot_().getId();
  const file = DriveApp.getFileById(fileId);
  const parents = file.getParents();

  while (parents.hasNext()) {
    const recordFolder = parents.next();
    const grandparents = recordFolder.getParents();
    while (grandparents.hasNext()) {
      if (grandparents.next().getId() === rootId) return file;
    }
  }

  throw new Error('此檔案不屬於知識庫附件資料夾');
}

function findRecordRow_(sh, id) {
  const last = sh.getLastRow();
  if (last <= 1) return 0;
  const ids = sh.getRange(2,1,last-1,1).getDisplayValues().flat();
  const idx = ids.indexOf(String(id));
  return idx >= 0 ? idx + 2 : 0;
}

function parseDataUrl_(dataUrl) {
  const m = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('附件資料格式錯誤');
  return {mimeType:m[1], bytes:Utilities.base64Decode(m[2])};
}

function saveMeta_(categories, categoryIcons) {
  const ss = getSS_();
  const sh = ss.getSheetByName(CONFIG_SHEET);
  const values = [
    ['categories', JSON.stringify(categories || [])],
    ['categoryIcons', JSON.stringify(categoryIcons || {})],
    ['updatedAt', new Date().toISOString()]
  ];

  if (sh.getLastRow() > 1) sh.getRange(2,1,sh.getLastRow()-1,2).clearContent();
  sh.getRange(2,1,values.length,2).setValues(values);
}

function readMeta_() {
  const ss = getSS_();
  const sh = ss.getSheetByName(CONFIG_SHEET);
  const out = {};
  if (sh.getLastRow() <= 1) return out;

  const rows = sh.getRange(2,1,sh.getLastRow()-1,2).getDisplayValues();
  rows.forEach(r => {
    if (!r[0]) return;
    if (r[0] === 'categories' || r[0] === 'categoryIcons') {
      try { out[r[0]] = JSON.parse(r[1] || (r[0] === 'categories' ? '[]' : '{}')); }
      catch (_) { out[r[0]] = r[0] === 'categories' ? [] : {}; }
    } else out[r[0]] = r[1];
  });
  return out;
}

function recordToRow_(r, attachmentMeta) {
  return [
    String(r.id || ''), String(r.category || ''), String(r.date || ''), String(r.title || ''),
    String(r.description || ''), String(r.symptom || ''), String(r.environment || ''), String(r.cause || ''),
    String(r.solution || ''), JSON.stringify(r.links || []), JSON.stringify(r.tags || []), !!r.favorite,
    String(r.notes || ''), String(r.createdAt || ''), String(r.updatedAt || ''), JSON.stringify(attachmentMeta || [])
  ];
}

function rowToRecord_(row) {
  return {
    id:String(row[0] || ''), category:String(row[1] || ''), date:formatDateCell_(row[2]), title:String(row[3] || ''),
    description:String(row[4] || ''), symptom:String(row[5] || ''), environment:String(row[6] || ''), cause:String(row[7] || ''),
    solution:String(row[8] || ''), links:parseJson_(row[9], []), tags:parseJson_(row[10], []), favorite:toBool_(row[11]),
    notes:String(row[12] || ''), createdAt:String(row[13] || ''), updatedAt:String(row[14] || ''), attachments:parseJson_(row[15], [])
  };
}

function formatDateCell_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd');
  }
  return String(v || '');
}
function parseJson_(v, fallback) { try { return JSON.parse(String(v || '')); } catch (_) { return fallback; } }
function toBool_(v) { return v === true || String(v).toLowerCase() === 'true' || String(v) === '1'; }

function output_(obj, callback) {
  const text = JSON.stringify(obj);
  const cb = String(callback || '').replace(/[^a-zA-Z0-9_.$]/g, '');
  if (cb) return ContentService.createTextOutput(cb + '(' + text + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return json_(obj);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
