const RECORDS_SHEET = 'Records';
const CONFIG_SHEET = 'Config';
const HEADERS = [
  'id','category','date','title','description','symptom','environment','cause','solution',
  'links','tags','favorite','notes','createdAt','updatedAt'
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
  Logger.log('SYNC_KEY: ' + key);
  return 'SYNC_KEY: ' + key;
}

function doGet(e) {
  try {
    verifyKey_(e && e.parameter && e.parameter.key);
    const action = String((e && e.parameter && e.parameter.action) || 'list');
    let result;
    if (action === 'list') result = listAll_();
    else if (action === 'ping') result = {ok:true, message:'pong'};
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
  if (rs.getLastRow() === 0) rs.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
  else {
    const current = rs.getRange(1,1,1,HEADERS.length).getValues()[0];
    if (current.join('|') !== HEADERS.join('|')) rs.getRange(1,1,1,HEADERS.length).setValues([HEADERS]);
  }
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
  return {ok:true, records:records, categories:meta.categories || [], categoryIcons:meta.categoryIcons || {}};
}

function upsertRecord_(record) {
  if (!record || !record.id) throw new Error('紀錄缺少 id');
  const ss = getSS_();
  const sh = ss.getSheetByName(RECORDS_SHEET);
  const row = recordToRow_(record);
  const last = sh.getLastRow();
  let target = 0;
  if (last > 1) {
    const ids = sh.getRange(2,1,last-1,1).getDisplayValues().flat();
    const idx = ids.indexOf(String(record.id));
    if (idx >= 0) target = idx + 2;
  }
  if (!target) target = last + 1;
  sh.getRange(target,1,1,HEADERS.length).setValues([row]);
}

function deleteRecord_(id) {
  if (!id) return;
  const ss = getSS_();
  const sh = ss.getSheetByName(RECORDS_SHEET);
  const last = sh.getLastRow();
  if (last <= 1) return;
  const ids = sh.getRange(2,1,last-1,1).getDisplayValues().flat();
  const idx = ids.indexOf(String(id));
  if (idx >= 0) sh.deleteRow(idx + 2);
}

function replaceAll_(records, categories, categoryIcons) {
  const ss = getSS_();
  const sh = ss.getSheetByName(RECORDS_SHEET);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2,1,last-1,HEADERS.length).clearContent();
  const clean = (records || []).filter(r => r && r.id).map(recordToRow_);
  if (clean.length) sh.getRange(2,1,clean.length,HEADERS.length).setValues(clean);
  saveMeta_(categories || [], categoryIcons || {});
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

function recordToRow_(r) {
  return [
    String(r.id || ''), String(r.category || ''), String(r.date || ''), String(r.title || ''),
    String(r.description || ''), String(r.symptom || ''), String(r.environment || ''), String(r.cause || ''),
    String(r.solution || ''), JSON.stringify(r.links || []), JSON.stringify(r.tags || []), !!r.favorite,
    String(r.notes || ''), String(r.createdAt || ''), String(r.updatedAt || '')
  ];
}

function rowToRecord_(row) {
  return {
    id:String(row[0] || ''), category:String(row[1] || ''), date:formatDateCell_(row[2]), title:String(row[3] || ''),
    description:String(row[4] || ''), symptom:String(row[5] || ''), environment:String(row[6] || ''), cause:String(row[7] || ''),
    solution:String(row[8] || ''), links:parseJson_(row[9], []), tags:parseJson_(row[10], []), favorite:toBool_(row[11]),
    notes:String(row[12] || ''), createdAt:String(row[13] || ''), updatedAt:String(row[14] || '')
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
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
