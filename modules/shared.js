// ============ STATE ============
let state = {
  currentProject: null,
  projects: [],
  contacts: [],
  tasks: [],
  diary: [],
  protocols: [],
  priceItems: [],
  calculations: [],
  estimates: [],
  schaetzungVorlagen: [],
  schaetzungGruppenVorlagen: [],
  pruefungen: [],
  schedule: [],
  kalenderEntries: [],
  settings: {theme:'enercity'},
  hilfeNotes: '',
  genehmigungen: [],
  querungen: [],
  nutzungsvertraege: [],
  genehmVorpruefung: [],
};
let currentCalcId = null;
let currentEstimateId = null;
let currentEstimatePart = null;
let currentProjectDetailId = null;
let currentBegehungId = null;
let globalQuantile = 0.5;
let kalcShowPreise = false;
let reminderInterval = null;
let currentView = 'dashboard';
let previousView = 'dashboard';

// ============ CONSTANTS ============
const DOC_TEMPLATES = {
  pv:[
    {cat:'Genehmigung',items:['Genehmigungsbescheid / Freistellungsbescheid','Baugenehmigung','Netzanschlusszusage (NVP)','Grundstückssicherung / Pachtverträge']},
    {cat:'Gutachten',items:['Bodengutachten / Baugrundgutachten','Kampfmittelfreiheitsnachweis','Artenschutzgutachten','Schallgutachten','Entwässerungskonzept','Brandschutzkonzept']},
    {cat:'Unterlagen',items:['Leitungsauskünfte','Kreuzungsvereinbarungen','Statische Nachweise','Ausführungsplanung freigegeben']},
  ],
  bess:[
    {cat:'Genehmigung',items:['Baugenehmigung (Sonderbau)','Netzanschlusszusage','Prüfstatik nach NBauO','Grundstückssicherung / Pachtverträge']},
    {cat:'Gutachten',items:['Bodengutachten','Kampfmittelfreiheitsnachweis','Brandschutzgutachten BESS','Löschwassernachweis','MV-Skid Typenprüfung']},
    {cat:'Unterlagen',items:['Leitungsauskünfte','Kreuzungsvereinbarungen','Statische Nachweise','Ausführungsplanung freigegeben']},
  ],
  wind:[
    {cat:'Genehmigung',items:['BImSchG-Bescheid','Baugenehmigung WEA','Netzanschlusszusage']},
    {cat:'Gutachten',items:['Schallgutachten','Schattenwurfgutachten','Avifauna-/Fledermausgutachten','Bodengutachten','Standsicherheitsnachweis WEA']},
    {cat:'Unterlagen',items:['Leitungsauskünfte','Kreuzungsvereinbarungen','Kranstellflächen-Nachweis','Ausführungsplanung freigegeben']},
  ],
};
const DOC_STATUS = [
  {key:'fehlt',     label:'Fehlt',      color:'var(--red)'},
  {key:'beantragt', label:'Beantragt',  color:'var(--yellow)'},
  {key:'vorhanden', label:'Vorhanden',  color:'var(--blue)'},
  {key:'geprueft',  label:'Geprüft',    color:'var(--primary)'},
  {key:'freigegeben',label:'Freigegeben',color:'var(--green)'},
];
const PRUEFUNG_TYPES = [
  'Verdichtungsprüfung Wegebau','Verdichtungsprüfung Kabeltrasse',
  'Isolationsmessung MV-Kabel','Druckprüfung Rohrleitung',
  'Betonfestigkeit / Druckprüfung','Sichtprüfung Schweißnaht',
  'Commissioning PV-Anlage','Commissioning BESS',
  'FAT (Factory Acceptance Test)','SAT (Site Acceptance Test)',
  'Abnahme Gewerk','Prüfung Erdungsanlage','Kabelverlegekontrolle','Sonstige',
];
const WORKFLOW_RULES = {
  pv:[
    {field:'commDate',days:42,text:'Inbetriebnahme-Antrag beim Netzbetreiber stellen'},
    {field:'commDate',days:28,text:'EZE-/SNA-Zertifikat anfordern und prüfen'},
    {field:'commDate',days:14,text:'Netzanmeldung und Termin mit Netzbetreiber bestätigen'},
    {field:'buildStart',days:14,text:'Leitungsauskünfte erneuern (max. 3 Monate gültig)'},
    {field:'buildStart',days:7,text:'Baubeginnanzeige bei Behörde einreichen'},
    {field:'buildStart',days:3,text:'SiGeKo-Anwesenheit und Einweisung sicherstellen'},
    {field:'buildEnd',days:21,text:'Abnahmetermin mit Bauherr / Prüfer vereinbaren'},
    {field:'acceptanceDate',days:14,text:'Abnahmeunterlagen (§12 VOB/B) vorbereiten'},
  ],
  bess:[
    {field:'commDate',days:42,text:'Brandschutzabnahme mit Behörde abstimmen'},
    {field:'commDate',days:28,text:'Netzbetreiber-Abnahme Übergabestation terminieren'},
    {field:'commDate',days:14,text:'FAT-Abnahme BESS-Container beim Hersteller'},
    {field:'gridDate',days:21,text:'Prüfbericht MV-Kabel beim Netzbetreiber einreichen'},
    {field:'buildStart',days:14,text:'Leitungsauskünfte erneuern'},
    {field:'buildStart',days:7,text:'Baubeginnanzeige einreichen'},
    {field:'acceptanceDate',days:14,text:'SAT-Checkliste und Abnahmeprotokoll vorbereiten'},
  ],
  wind:[
    {field:'commDate',days:56,text:'Endabnahmetermin mit TÜV/Dekra abstimmen'},
    {field:'commDate',days:28,text:'Einmessprotokoll WEA beauftragen'},
    {field:'buildStart',days:14,text:'Leitungsauskünfte erneuern'},
    {field:'buildStart',days:7,text:'Baubeginnanzeige einreichen'},
    {field:'acceptanceDate',days:21,text:'Abnahmeunterlagen WEA (Hersteller + Behörde) vorbereiten'},
  ],
};
const TL_FIELD_LABEL = {
  planStart:'Planungsbeginn',planEnd:'Planungsende',
  permitStart:'Genehmigungsbeginn',permitEnd:'Genehmigungsende',
  buildStart:'Baubeginn',buildEnd:'Bauende',
  commDate:'Inbetriebnahme',gridDate:'Netzanschluss',acceptanceDate:'Abnahme',
};

function computeWorkflowAlerts(p, daysAhead=60){
  if(!p.type||!WORKFLOW_RULES[p.type]) return [];
  const tl=p.timeline||{};
  const now=new Date(); now.setHours(0,0,0,0);
  const alerts=[];
  for(const rule of WORKFLOW_RULES[p.type]){
    const dateStr=tl[rule.field];
    if(!dateStr) continue;
    const target=new Date(dateStr);
    const triggerDate=new Date(target.getTime()-rule.days*864e5);
    const daysUntilTrigger=Math.ceil((triggerDate-now)/864e5);
    const daysUntilEvent=Math.ceil((target-now)/864e5);
    if(daysUntilTrigger<=daysAhead){
      alerts.push({
        text:rule.text, field:rule.field,
        fieldLabel:TL_FIELD_LABEL[rule.field]||rule.field,
        eventDate:dateStr, daysUntilTrigger, daysUntilEvent,
        urgent:daysUntilTrigger<=0,
        done:daysUntilEvent<0,
      });
    }
  }
  return alerts.sort((a,b)=>a.daysUntilTrigger-b.daysUntilTrigger);
}

function docCompletionPct(p){
  const docs=p.docChecklist||[];
  if(!docs.length) return 0;
  const done=docs.filter(d=>d.status==='freigegeben'||d.status==='geprueft').length;
  return Math.round(done/docs.length*100);
}

function projAmpel(p){
  // Dokumente
  const docPct=docCompletionPct(p);
  const docColor=docPct>=80?'var(--green)':docPct>=50?'var(--yellow)':'var(--red)';
  // Zeit
  const now=new Date(); now.setHours(0,0,0,0);
  const tl=p.timeline||{};
  let zeitColor='var(--muted)'; let zeitLabel='—';
  if(tl.buildEnd){
    const days=Math.ceil((new Date(tl.buildEnd)-now)/864e5);
    zeitLabel=days<0?`${Math.abs(days)}T überfällig`:days+'T';
    zeitColor=days<0?'var(--red)':days<14?'var(--yellow)':'var(--green)';
  }
  // Schätzung
  const ests=state.estimates.filter(e=>e.projectId===p.id);
  const budget=ests.length?fmtEur(Math.max(...ests.map(e=>estTotal(e)))):'—';
  return {docPct,docColor,zeitColor,zeitLabel,budget};
}


const STORAGE_PREFIX = 'bauleiter:';
const STORAGE_KEYS = ['projects','contacts','tasks','diary','protocols','priceItems','calculations','estimates','schaetzungVorlagen','schaetzungGruppenVorlagen','pruefungen','schedule','kalenderEntries','settings','hilfeNotes','currentProject','genehmigungen','querungen','nutzungsvertraege','genehmVorpruefung'];
const DB_NAME = 'bauleiter-db';
const DB_STORE = 'kv';
const DB_VERSION = 1;

// ---- IndexedDB Wrapper ----
let _db = null;
function openDB(){
  if(_db) return Promise.resolve(_db);
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => e.target.result.createObjectStore(DB_STORE);
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}
async function dbGet(key){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(DB_STORE,'readonly');
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
async function dbSet(key, value){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(DB_STORE,'readwrite');
    const req = tx.objectStore(DB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
async function dbDel(key){
  const db = await openDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(DB_STORE,'readwrite');
    const req = tx.objectStore(DB_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ---- Einmalige Migration von localStorage → IndexedDB ----
async function migrateFromLocalStorage(){
  const migrated = await dbGet('__migrated__');
  if(migrated) return;
  let found = false;
  for(const k of STORAGE_KEYS){
    const raw = localStorage.getItem(STORAGE_PREFIX+k);
    if(raw === null) continue;
    try{
      await dbSet(STORAGE_PREFIX+k, JSON.parse(raw));
      found = true;
    }catch(e){ console.warn('Migration fehlgeschlagen für '+k, e); }
  }
  await dbSet('__migrated__', true);
  if(found){
    console.log('✓ Daten von localStorage nach IndexedDB migriert');
    // localStorage aufräumen (optional)
    for(const k of STORAGE_KEYS) localStorage.removeItem(STORAGE_PREFIX+k);
  }
}

// ---- loadAll / save (API unverändert für den Rest des Codes) ----
async function loadAll(){
  try{
    await migrateFromLocalStorage();
    for(const k of STORAGE_KEYS){
      const val = await dbGet(STORAGE_PREFIX+k);
      if(val !== undefined) state[k] = val;
    }
  }catch(e){
    console.warn('IndexedDB nicht verfügbar', e);
    alert('Achtung: Lokaler Speicher nicht verfügbar. Daten werden beim Schließen verloren gehen.');
  }
}

async function save(key){
  try{
    await dbSet(STORAGE_PREFIX+key, state[key]);
  }catch(e){
    console.error('Speichern fehlgeschlagen für '+key, e);
    if(e.name === 'QuotaExceededError'){
      alert('Speicher voll! Bitte alte Fotos oder nicht benötigte Daten löschen.');
    }
  }
}

// ============ UTIL ============
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const fmtDate = d => d ? new Date(d).toLocaleDateString('de-DE') : '';
const today = () => new Date().toISOString().slice(0,10);
const esc = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function projectTasks(){
  return state.tasks.filter(t => !state.currentProject || t.projectId === state.currentProject);
}
function projectDiary(){
  return state.diary.filter(d => !state.currentProject || d.projectId === state.currentProject);
}
function projectProtocols(){
  return state.protocols.filter(p => !state.currentProject || p.projectId === state.currentProject);
}

// ============ MODAL ============
function openModal(html){
  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalBg').classList.add('show');
}
function closeModal(){
  document.getElementById('modalBg').classList.remove('show');
}

// ============ NAVIGATION ============
window.showView = function showView(view){
  if(currentView !== 'gruppenKatalog') previousView = currentView;
  currentView = view;
  if(view !== 'schaetzung' && view !== 'gruppenKatalog'){ currentEstimateId = null; currentEstimatePart = null; kalcShowPreise = false; }
  if(view !== 'projekte' && view !== 'projektdetail'){ currentProjectDetailId = null; }
  if(view !== 'bautagebuch'){ currentBegehungId = null; }
  if(view !== 'protokolle'){ _reportType = null; }
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view===view));
  render();
}
window.switchProject = function switchProject(id){
  state.currentProject = id || null;
  save('currentProject');
  render();
}
window.refreshProjectSelect = function refreshProjectSelect(){
  const sel = document.getElementById('projectSelect');
  sel.innerHTML = '<option value="">— Alle Projekte —</option>' +
    state.projects.map(p=>`<option value="${p.id}" ${state.currentProject===p.id?'selected':''}>${esc(p.name)}</option>`).join('');
}

// ============ RENDER ROUTER ============
function render(){
  refreshProjectSelect();
  const m = document.getElementById('main');
  switch(currentView){
    case 'dashboard': m.innerHTML = renderDashboard(); break;
    case 'projekte': m.innerHTML = renderProjekte(); break;
    case 'projektdetail':
      currentProjectDetailId = state.currentProject || state.projects[0]?.id || null;
      m.innerHTML = currentProjectDetailId ? renderProjektDetail() : renderProjekte();
      break;
    case 'dokumentpruefung': m.innerHTML = renderDokumentpruefung(); break;
    case 'genehmigungen': m.innerHTML = renderGenehmigungen(); break;
    case 'aufgaben': m.innerHTML = renderAufgaben(); break;
    case 'fristenkalender': m.innerHTML = renderFristenkalender(); break;
    case 'bautagebuch': m.innerHTML = renderBautagebuch(); break;
    case 'kontakte': m.innerHTML = renderKontakte(); break;
    case 'protokolle': m.innerHTML = renderProtokolle(); break;
    case 'schaetzung': m.innerHTML = renderSchaetzung(); break;
    case 'pruefungen': m.innerHTML = renderPruefungen(); break;
    case 'bauzeitplan': m.innerHTML = renderBauzeitplan(); break;
    case 'gruppenKatalog': m.innerHTML = renderGruppenKatalog(); break;
    case 'hilfe': m.innerHTML = renderHilfe(); break;
    case 'einstellungen': m.innerHTML = renderEinstellungen(); break;
    case 'admin': m.innerHTML = renderAdmin(); break;
  }
}

// ============ EVENT LISTENERS ============
// Nach DOM-Load Navigation-Buttons verknüpfen
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initNavigationListeners);
} else {
  initNavigationListeners();
}

function initNavigationListeners(){
  // Navigation Buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if(view) window.showView(view);
    });
  });
  
  // Project Select
  const projSelect = document.getElementById('projectSelect');
  if(projSelect){
    projSelect.addEventListener('change', (e) => {
      window.switchProject(e.target.value);
    });
  }
}

// ============ GLOBALE EXPORTS ============
window.state = state;
window.currentCalcId = currentCalcId;
window.currentEstimateId = currentEstimateId;
window.currentEstimatePart = currentEstimatePart;
window.currentProjectDetailId = currentProjectDetailId;
window.currentBegehungId = currentBegehungId;
window.globalQuantile = globalQuantile;
window.kalcShowPreise = kalcShowPreise;
window.reminderInterval = reminderInterval;
window.currentView = currentView;
window.previousView = previousView;
