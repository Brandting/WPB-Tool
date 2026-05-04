// ============ ERINNERUNGEN / NOTIFICATIONS ============
async function requestNotificationPermission(){
  if(!('Notification' in window)){
    alert('Dein Browser unterstützt keine Benachrichtigungen.');
    return;
  }
  if(Notification.permission==='granted'){
    alert('✓ Benachrichtigungen sind bereits aktiviert.');
    return;
  }
  const result = await Notification.requestPermission();
  if(result==='granted'){
    new Notification('BauLeiter',{body:'Benachrichtigungen sind jetzt aktiv!',icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏗️</text></svg>'});
  } else {
    alert('Benachrichtigungen wurden abgelehnt. Du kannst sie in den Browser-Einstellungen aktivieren.');
  }
}

async function checkReminders(){
  const now = new Date();
  let changed = false;
  for(const t of state.schedule){
    // Support both legacy t.reminder and new t.reminders[]
    const allReminders = t.reminders?.length ? t.reminders : (t.reminder ? [t.reminder] : []);
    for(const r of allReminders){
      if(!r||r.triggered) continue;
      const d = new Date(r.date);
      if(d <= now){
        r.triggered = true;
        changed = true;
        if('Notification' in window && Notification.permission==='granted'){
          const n = new Notification('🔔 BauLeiter: '+t.name, {
            body: r.message || 'Erinnerung fällig',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏗️</text></svg>',
            tag: t.id+r.date,
            requireInteraction: true
          });
          n.onclick = () => {window.focus(); showView('bauzeitplan'); n.close();};
        }
      }
    }
    // Keep legacy t.reminder in sync with first reminder
    if(t.reminders?.length) t.reminder = t.reminders[0];
  }
  if(changed){
    await save('schedule');
    if(currentView==='dashboard'||currentView==='bauzeitplan') render();
  }
}

function startReminderCheck(){
  if(reminderInterval) clearInterval(reminderInterval);
  checkReminders();
  reminderInterval = setInterval(checkReminders, 60000); // Jede Minute
}


// ============ EINSTELLUNGEN ============
const THEMES = {
  dark: {
    name: 'Dark Mode',
    description: 'Augenschonendes dunkles Design für lange Arbeitssessions und schwaches Umgebungslicht.',
    colors: {bg:'#111111', card:'#1e1e1e', primary:'#4d9fff', accent:'#f97316', text:'#e8e8e8'}
  },
  'enercity-dark': {
    name: 'Firma Dark',
    description: 'Charcoal-Schwarz mit dem Rot–Magenta–Lila der enercity-Marke.',
    colors: {bg:'#111111', card:'#1e1e1e', primary:'#e5007d', accent:'#9400d3', text:'#f0e6ec'}
  },
  hell: {
    name: 'Klassisch Hell',
    description: 'Professionelles, ruhiges Design in Bauleiter-Blau mit klaren Kanten.',
    colors: {bg:'#f4f6f8', card:'#ffffff', primary:'#1f4e79', accent:'#ff8800', text:'#1f2937'}
  },
  enercity: {
    name: 'Firma Hell',
    description: 'Markendesign in Rot–Magenta–Lila mit Verlauf-Header und runden Formen.',
    colors: {bg:'#fafafa', card:'#ffffff', primary:'#e5007d', accent:'#9400d3', text:'#1a1a1a'}
  }
};

function applyTheme(themeKey){
  const t = THEMES[themeKey] ? themeKey : 'dark';
  document.body.setAttribute('data-theme', t);
  state.settings.theme = t;
  const themeColors = { dark:'#4d9fff', 'enercity-dark':'#e5007d', hell:'#1f4e79', enercity:'#e5007d' };
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if(metaTheme) metaTheme.setAttribute('content', themeColors[t] || '#60a5fa');
}

async function saveKalTypeColor(type, value){
  if(!state.settings.kalTypeColors) state.settings.kalTypeColors = {};
  state.settings.kalTypeColors[type] = value;
  await save('settings');
}

async function resetKalTypeColors(){
  state.settings.kalTypeColors = {};
  await save('settings');
  render();
}

function renderHilfe(){
  return `
    <div class="page-header">
      <h2>💡 Hilfe & Notizen</h2>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="color:var(--primary);font-size:16px;margin-bottom:8px">📝 Meine Gedanken & Notizen</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:12px">
        Platz für Ideen, Anmerkungen und Prozessnotizen. Wird automatisch gespeichert.
      </p>
      <textarea id="hilfe-notes"
        placeholder="Deine Gedanken, Ideen, To-Dos, Fragen …"
        style="width:100%;min-height:400px;padding:14px;font-size:14px;line-height:1.7;border:1px solid var(--border);border-radius:var(--radius);background:var(--card);color:var(--text);font-family:var(--font);resize:vertical"
        oninput="saveHilfeNotes(this.value)">${esc(state.hilfeNotes||'')}</textarea>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="color:var(--primary);font-size:16px;margin-bottom:14px">❓ FAQ</h3>

      <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border);background:var(--surface-2)">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px">📧 E-Mail-Button öffnet das falsche Outlook</div>
          <div style="font-size:13px;color:var(--text);line-height:1.6">
            Der „In Outlook öffnen"-Button nutzt den Standard-Mail-Client von Windows. Damit das <strong>neue Outlook</strong> geöffnet wird, muss es einmalig als Standard gesetzt werden:<br><br>
            <strong>Windows 11:</strong> Start → Einstellungen → Apps → Standard-Apps → „Outlook" suchen → <em>Neues Outlook</em> auswählen → „Als Standard festlegen"<br><br>
            <strong>Schnellweg:</strong> Beim ersten Klick fragt Windows welche App genutzt werden soll — dort „Neues Outlook" wählen und <em>„Immer"</em> bestätigen.
          </div>
        </div>
      </div>
    </div>
  `;
}

let _hilfeTimer=null;
function saveHilfeNotes(value){
  state.hilfeNotes=value;
  clearTimeout(_hilfeTimer);
  _hilfeTimer=setTimeout(()=>save('hilfeNotes'),600);
}

function renderEinstellungen(){
  const current = state.settings.theme || 'dark';
  return `
    <div class="page-header">
      <h2>⚙️ Einstellungen</h2>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="color:var(--primary);margin-bottom:6px;font-size:18px">🖥️ Layout</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:14px">Passe das App-Layout an.</p>
      <label style="display:flex;align-items:center;gap:12px;cursor:pointer;font-size:14px">
        <input type="checkbox" ${state.settings.headerMinimized?'checked':''} onchange="toggleHeaderMin()" style="width:auto;cursor:pointer">
        <span>Header ausblenden (mehr Platz für Inhalte)</span>
      </label>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="color:var(--primary);margin-bottom:6px;font-size:18px">🎨 Optik / Design</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:18px">Wähle das Erscheinungsbild des Tools. Die Auswahl wird automatisch gespeichert.</p>

      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">
        ${Object.entries(THEMES).map(([key,t])=>{
          const c = t.colors;
          return `
          <div class="theme-card ${current===key?'selected':''}" onclick="changeTheme('${key}')">
            <div class="theme-preview" style="background:${c.bg};border:1px solid ${c.bg==='#0f172a'?'#334155':'#e5e7eb'}">
              <div class="pv-side" style="background:${c.card}"></div>
              <div class="pv-main">
                <div class="pv-bar" style="background:${c.primary};width:60%"></div>
                <div class="pv-bar" style="background:${c.accent};width:40%"></div>
                <div class="pv-bar" style="background:${c.text};opacity:.3;width:80%;height:4px"></div>
                <div class="pv-bar" style="background:${c.text};opacity:.3;width:70%;height:4px"></div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <strong style="color:var(--text);font-size:15px">${esc(t.name)}</strong>
              ${current===key?'<span style="color:var(--primary);font-size:12px;font-weight:600">✓ AKTIV</span>':''}
            </div>
            <p style="font-size:12px;color:var(--muted);line-height:1.4">${esc(t.description)}</p>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="color:var(--primary);margin-bottom:6px;font-size:18px">🗓️ Kalender-Eintragsfarben</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:18px">Lege fest, mit welcher Farbe jeder Eintragstyp im Kontrollcenter-Kalender dargestellt wird.</p>
      ${(()=>{
        const custom = state.settings.kalTypeColors || {};
        const defaults = { termin:'#3b82f6', frist:'#ef4444', erinnerung:'#eab308', info:'#6b7280', aufgabe:'#3ecf6e', mangel:'#f97316' };
        const labels   = { termin:'Termin', frist:'Frist', erinnerung:'Erinnerung', info:'Info', aufgabe:'Aufgabe', mangel:'Mangel' };
        const hasCustom = Object.keys(custom).length > 0;
        return `
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:${hasCustom?'16':'0'}px">
            ${Object.keys(defaults).map(type=>{
              const val = custom[type] || defaults[type];
              const isCustom = !!custom[type];
              return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--surface-2);cursor:pointer;border:2px solid ${isCustom?val:'var(--border)'}">
                <input type="color" value="${val}" oninput="saveKalTypeColor('${type}',this.value);this.parentElement.style.borderColor=this.value"
                  style="width:34px;height:34px;border:none;border-radius:6px;cursor:pointer;padding:2px;background:none;flex-shrink:0">
                <div>
                  <div style="font-size:13px;font-weight:600;color:var(--text)">${labels[type]}</div>
                  ${isCustom?`<div style="font-size:10px;color:var(--muted)">angepasst</div>`:''}
                </div>
              </label>`;
            }).join('')}
          </div>
          ${hasCustom?`<button class="btn btn-secondary btn-sm" onclick="resetKalTypeColors()">↺ Farben zurücksetzen</button>`:''}
        `;
      })()}
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="color:var(--primary);margin-bottom:6px;font-size:18px">🔔 Benachrichtigungen</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:14px">
        Aktiviere Browser-Benachrichtigungen, um Erinnerungen aus dem Bauzeitplan zu erhalten – auch wenn das Tool im Hintergrund läuft.
      </p>
      <button class="btn" onclick="requestNotificationPermission()">🔔 Benachrichtigungen aktivieren</button>
      <span style="margin-left:14px;font-size:13px;color:var(--muted)">
        Status: <strong>${('Notification' in window) ? (Notification.permission==='granted'?'✓ aktiviert':Notification.permission==='denied'?'✗ blockiert':'⚠ noch nicht erlaubt') : 'nicht verfügbar'}</strong>
      </span>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="color:var(--primary);margin-bottom:6px;font-size:18px">☁️ Automatisches Backup</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:14px">
        Sichert alle Daten regelmäßig als JSON in einen Ordner deiner Wahl.
        <strong>Tipp:</strong> Wähle einen OneDrive-Ordner für automatisches Cloud-Backup.<br>
        <span style="font-size:12px">Status: <strong>${state.settings.backupDirName ? '✓ Ordner: '+esc(state.settings.backupDirName) : '✗ Kein Ordner gewählt'}</strong>
        ${state.settings.lastBackup ? ' • Letztes Backup: '+new Date(state.settings.lastBackup).toLocaleString('de-DE') : ''}</span>
      </p>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <label style="font-size:14px">Intervall:</label>
        <select id="backupInterval" onchange="changeBackupInterval(this.value)" style="padding:8px 12px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text)">
          <option value="0"       ${(state.settings.backupInterval||0)==0?'selected':''}>Aus</option>
          <option value="900000"  ${state.settings.backupInterval==900000?'selected':''}>Alle 15 Minuten</option>
          <option value="1800000" ${state.settings.backupInterval==1800000?'selected':''}>Alle 30 Minuten</option>
          <option value="3600000" ${state.settings.backupInterval==3600000?'selected':''}>Stündlich</option>
          <option value="7200000" ${state.settings.backupInterval==7200000?'selected':''}>Alle 2 Stunden</option>
          <option value="86400000"${state.settings.backupInterval==86400000?'selected':''}>Täglich (24h)</option>
        </select>
      </div>
      <button class="btn btn-secondary" onclick="chooseBackupDir()">📁 Backup-Ordner wählen</button>
      <button class="btn btn-secondary" onclick="runAutoBackup(true)">💾 Jetzt sichern</button>
      ${state.settings.backupDirName ? '<button class="btn btn-danger" onclick="clearBackupDir()">✗ Ordner-Verknüpfung lösen</button>':''}
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="color:var(--primary);margin-bottom:6px;font-size:18px">💾 Daten</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:14px">
        Sichere alle Daten als JSON-Datei oder spiele ein Backup ein. Praktisch für Geräte-Wechsel oder zur Sicherung.
      </p>
      <button class="btn btn-secondary" onclick="exportData()">📤 Alle Daten exportieren</button>
      <button class="btn btn-secondary" onclick="document.getElementById('importBackup').click()">📥 Backup einspielen</button>
      <input type="file" id="importBackup" accept=".json" style="display:none" onchange="importData(event)">
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 style="color:var(--primary);margin-bottom:6px;font-size:18px">📱 Baustellenbegehung-App</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:14px">
        Importiere Begehungen aus der mobilen Baustellenbegehungs-App. Neue Einträge werden zusammengeführt —
        bestehende Begehungen (gleiche Projekt-ID + Datum) werden auf Wunsch ersetzt.
      </p>
      <button class="btn btn-secondary" onclick="document.getElementById('importField').click()">📱 Begehungen importieren</button>
      <input type="file" id="importField" accept=".json" style="display:none" onchange="mergeFieldImport(event)">
    </div>

    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <h3 style="color:var(--primary);margin-bottom:6px;font-size:18px">ℹ️ Über</h3>
        <button class="btn btn-secondary btn-sm" onclick="showView('admin')" style="white-space:nowrap">🔧 Admin</button>
      </div>
      <p style="font-size:13px;color:var(--muted);line-height:1.6">
        <strong style="color:var(--text)">BauLeiter</strong> – Digitales Baugedächtnis<br>
        Ein eigenständiges HTML-Tool für die Bauleitung. Alle Daten werden lokal gespeichert.<br>
        <span style="font-size:11px">Projekte: ${state.projects.length} • Aufgaben: ${state.tasks.length} • Vorgänge: ${state.schedule.length} • Preispositionen: ${state.priceItems.length}</span>
      </p>
    </div>
  `;
}

async function changeTheme(themeKey){
  applyTheme(themeKey);
  await save('settings');
  render();
}

function applyHeaderMin(){
  document.body.classList.toggle('header-min', !!state.settings.headerMinimized);
}

async function toggleHeaderMin(){
  state.settings.headerMinimized = !state.settings.headerMinimized;
  applyHeaderMin();
  await save('settings');
  render();
}

async function mergeFieldImport(e){
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try{
      const dump = JSON.parse(ev.target.result);
      if(dump._type !== 'bauleiter-field-export'){
        alert('Das ist keine Baustellenbegehungs-Export-Datei.');
        e.target.value=''; return;
      }
      const begehungen = (dump.diary||[]).filter(d=>d.type==='begehung');
      if(begehungen.length===0){ alert('Keine Begehungen im Export.'); e.target.value=''; return; }
      window._pendingFieldImport = begehungen;
      window._pendingFieldIdx = 0;
      window._pendingFieldStats = { added:0, replaced:0, skipped:0 };
      mergeFieldNext();
    }catch(err){
      alert('Fehler beim Import: '+err.message);
    }
    e.target.value='';
  };
  reader.readAsText(f);
}

function mergeFieldNext(){
  const data = window._pendingFieldImport;
  const idx  = window._pendingFieldIdx;
  if(!data || idx >= data.length){
    // Fertig
    const s = window._pendingFieldStats;
    window._pendingFieldImport = null;
    closeModal();
    alert(`✓ Import abgeschlossen:\n${s.added} neue Begehungen\n${s.replaced} ersetzt\n${s.skipped} übersprungen`);
    render();
    return;
  }

  const beg = data[idx];
  const total = data.length;
  const projectOptions = state.projects.map(p=>
    `<option value="${p.id}">${esc(p.name)}</option>`
  ).join('');

  openModal(`
    <h3>Begehung ${idx+1} von ${total}</h3>
    ${beg.projektHinweis
      ? `<div style="background:var(--info-bg);border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:14px">
          📱 Hinweis aus App: <strong>${esc(beg.projektHinweis)}</strong>
         </div>`
      : ''}
    <div style="background:var(--surface-2);border-radius:10px;padding:12px 14px;font-size:14px;margin-bottom:16px;line-height:1.6">
      <div><strong>Datum:</strong> ${fmtDate(beg.date)}</div>
      ${beg.workforce?`<div><strong>Anwesende:</strong> ${esc(beg.workforce)}</div>`:''}
      ${beg.grund?`<div><strong>Grund:</strong> ${esc(beg.grund)}</div>`:''}
      <div><strong>Erkenntnisse:</strong> ${(beg.erkenntnisse||[]).length}</div>
    </div>
    <div class="form-group">
      <label>Projekt zuordnen</label>
      <select id="mergeTargetProject">
        ${state.projects.length===0
          ? '<option value="">— Kein Projekt vorhanden —</option>'
          : projectOptions}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="mergeFieldSkip()">Überspringen</button>
      <button class="btn" onclick="mergeFieldAssign()">Zuordnen →</button>
    </div>
  `);
}

async function mergeFieldAssign(){
  const data = window._pendingFieldImport;
  const idx  = window._pendingFieldIdx;
  const beg  = {...data[idx]};
  const projectId = document.getElementById('mergeTargetProject')?.value;
  if(!projectId){ alert('Bitte ein Projekt auswählen.'); return; }

  beg.projectId = projectId;
  const existById  = state.diary.find(x=>x.id===beg.id);
  const existByDate= state.diary.find(x=>
    x.type==='begehung' && x.projectId===projectId && x.date===beg.date && x.id!==beg.id
  );

  if(existById){
    if((beg.erkenntnisse||[]).length >= (existById.erkenntnisse||[]).length){
      state.diary = state.diary.map(d=>d.id===beg.id?beg:d);
      window._pendingFieldStats.replaced++;
    }
  } else if(existByDate){
    const proj = state.projects.find(p=>p.id===projectId);
    const ok = confirm(`Begehung vom ${fmtDate(beg.date)} für „${proj?.name||''}" existiert bereits.\nErsetzen?`);
    if(ok){ state.diary = state.diary.map(d=>d.id===existByDate.id?beg:d); window._pendingFieldStats.replaced++; }
    else { window._pendingFieldStats.skipped++; }
  } else {
    state.diary.push(beg);
    window._pendingFieldStats.added++;
  }

  await save('diary');
  window._pendingFieldIdx++;
  mergeFieldNext();
}

function mergeFieldSkip(){
  window._pendingFieldStats.skipped++;
  window._pendingFieldIdx++;
  mergeFieldNext();
}

async function executeMerge(){}

function exportData(){
  const dump = {};
  ['projects','contacts','tasks','diary','protocols','priceItems','calculations','estimates','schaetzungVorlagen','schaetzungGruppenVorlagen','pruefungen','schedule','kalenderEntries','settings','hilfeNotes','genehmigungen','querungen','nutzungsvertraege','genehmVorpruefung'].forEach(k=>dump[k]=state[k]);
  dump._exported = new Date().toISOString();
  dump._version = 1;
  const blob = new Blob([JSON.stringify(dump,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bauleiter-backup-${today()}.json`;
  a.click();
}

function importData(e){
  const f = e.target.files[0]; if(!f) return;
  if(!confirm('Achtung: Das überschreibt alle aktuellen Daten. Fortfahren?')){e.target.value='';return;}
  const reader = new FileReader();
  reader.onload = async ev => {
    try{
      const dump = JSON.parse(ev.target.result);
      for(const k of ['projects','contacts','tasks','diary','protocols','priceItems','calculations','estimates','schaetzungVorlagen','schaetzungGruppenVorlagen','pruefungen','schedule','kalenderEntries','settings','hilfeNotes','genehmigungen','querungen','nutzungsvertraege','genehmVorpruefung']){
        if(dump[k]!==undefined){
          state[k] = dump[k];
          await save(k);
        }
      }
      applyTheme(state.settings?.theme||'dark');
      alert('✓ Backup erfolgreich eingespielt');
      render();
    }catch(err){
      alert('Fehler beim Import: '+err.message);
    }
  };
  reader.readAsText(f);
  e.target.value = '';
}

async function resetAllData(){
  if(!confirm('WIRKLICH alle Daten unwiderruflich löschen? Das kann nicht rückgängig gemacht werden!')) return;
  if(!confirm('Letzte Warnung: Alle Projekte, Aufgaben, Preise und Bauzeitpläne werden gelöscht. Fortfahren?')) return;
  for(const k of ['projects','contacts','tasks','diary','protocols','priceItems','calculations','estimates','pruefungen','schedule','kalenderEntries']){
    state[k] = [];
    await save(k);
  }
  state.currentProject = null;
  await save('currentProject');
  render();
}


// ============ AUTO-BACKUP (File System Access API) ============
const BACKUP_HANDLE_KEY = '__backup_dir_handle__';
let _backupTimer = null;

async function chooseBackupDir(){
  if(!window.showDirectoryPicker){
    alert('Diese Funktion ist nur in Chromium-Browsern (Edge/Chrome) auf Desktop verfügbar.');
    return;
  }
  try{
    const handle = await window.showDirectoryPicker({mode:'readwrite', startIn:'documents'});
    await dbSet(BACKUP_HANDLE_KEY, handle);
    state.settings.backupDirName = handle.name;
    await save('settings');
    alert('✓ Ordner verknüpft: '+handle.name+'\n\nBackups werden hier abgelegt.');
    await offerRestoreIfEmpty();
    render();
    scheduleAutoBackup();
  }catch(err){
    if(err.name !== 'AbortError') alert('Fehler: '+err.message);
  }
}

async function clearBackupDir(){
  if(!confirm('Backup-Ordner-Verknüpfung lösen? Bestehende Dateien bleiben erhalten.')) return;
  await dbDel(BACKUP_HANDLE_KEY);
  delete state.settings.backupDirName;
  await save('settings');
  if(_backupTimer){clearInterval(_backupTimer); _backupTimer=null;}
  render();
}

async function changeBackupInterval(ms){
  state.settings.backupInterval = parseInt(ms,10);
  await save('settings');
  scheduleAutoBackup();
}

async function getBackupDir(){
  const handle = await dbGet(BACKUP_HANDLE_KEY);
  if(!handle) return null;
  let perm = await handle.queryPermission({mode:'readwrite'});
  if(perm === 'prompt') perm = await handle.requestPermission({mode:'readwrite'});
  if(perm !== 'granted') return null;
  return handle;
}

async function runAutoBackup(manual=false){
  try{
    const dir = await getBackupDir();
    if(!dir){
      if(manual) alert('Kein Backup-Ordner verknüpft oder Berechtigung verweigert.');
      return;
    }
    const dump = {};
    ['projects','contacts','tasks','diary','protocols','priceItems','calculations','estimates','schaetzungVorlagen','schaetzungGruppenVorlagen','pruefungen','schedule','kalenderEntries','settings','hilfeNotes'].forEach(k=>dump[k]=state[k]);
    dump._exported = new Date().toISOString();
    dump._version = 1;
    const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    const fileHandle = await dir.getFileHandle(`bauleiter-backup-${ts}.json`, {create:true});
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(dump));
    await writable.close();
    await rotateBackups(dir, 20);
    state.settings.lastBackup = Date.now();
    await save('settings');
    if(manual){ alert('✓ Backup gespeichert'); render(); }
    console.log('✓ Auto-Backup geschrieben');
  }catch(err){
    console.warn('Backup fehlgeschlagen:', err);
    if(manual) alert('Backup fehlgeschlagen: '+err.message);
  }
}

async function rotateBackups(dir, keep){
  const files = [];
  for await(const [name, h] of dir.entries()){
    if(h.kind==='file' && name.startsWith('bauleiter-backup-') && name.endsWith('.json')){
      files.push(name);
    }
  }
  files.sort();
  while(files.length > keep){
    const old = files.shift();
    try{ await dir.removeEntry(old); }catch(e){}
  }
}

function scheduleAutoBackup(){
  if(_backupTimer){ clearInterval(_backupTimer); _backupTimer=null; }
  const ms = parseInt(state.settings.backupInterval||0, 10);
  if(!ms) return;
  _backupTimer = setInterval(()=>runAutoBackup(false), ms);
  console.log('Auto-Backup aktiv: alle '+(ms/60000)+' Min');
}

async function offerRestoreIfEmpty(){
  const empty = state.projects.length===0 && state.diary.length===0
             && state.tasks.length===0 && state.priceItems.length===0;
  if(!empty) return;
  const dir = await getBackupDir();
  if(!dir) return;
  let newest = null;
  for await(const [name, h] of dir.entries()){
    if(h.kind==='file' && name.startsWith('bauleiter-backup-') && name.endsWith('.json')){
      if(!newest || name > newest.name) newest = {name, handle:h};
    }
  }
  if(!newest) return;
  if(!confirm(`Leere Datenbank erkannt. Backup gefunden:\n\n${newest.name}\n\nJetzt wiederherstellen?`)) return;
  const file = await newest.handle.getFile();
  const dump = JSON.parse(await file.text());
  for(const k of ['projects','contacts','tasks','diary','protocols','priceItems','calculations','estimates','schaetzungVorlagen','schaetzungGruppenVorlagen','pruefungen','schedule','kalenderEntries','settings','hilfeNotes']){
    if(dump[k]!==undefined){ state[k] = dump[k]; await save(k); }
  }
  applyTheme(state.settings?.theme||'dark');
  alert('✓ Backup wiederhergestellt');
  render();
}

window.addEventListener('beforeunload', ()=>{
  if(state.settings.backupInterval && state.settings.backupDirName){
    runAutoBackup(false);
  }
});

// ============ PWA Service Worker ============
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('✓ SW registriert', reg.scope))
      .catch(err => console.warn('SW-Registrierung fehlgeschlagen', err));
  });
}


// ============ ADMIN ============
function renderAdmin(){
  return `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-secondary btn-sm" onclick="showView('einstellungen')">← Zurück</button>
        <h2>🔧 Admin</h2>
      </div>
    </div>
    <div class="card" style="border-left:4px solid var(--red)">
      <h3 style="color:var(--red);margin-bottom:6px;font-size:15px">⚠️ Gefahrenzone</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:12px">Diese Aktionen können nicht rückgängig gemacht werden.</p>
      <button class="btn btn-danger" onclick="resetAllData()">🗑️ Alle Daten löschen</button>
    </div>
  `;
}

// Exports
window.renderAdmin = renderAdmin;
window.startReminderCheck = startReminderCheck;
window.renderEinstellungen = renderEinstellungen;
window.applyTheme = applyTheme;
window.saveKalTypeColor = saveKalTypeColor;
window.resetKalTypeColors = resetKalTypeColors;
window.renderHilfe = renderHilfe;
window.saveHilfeNotes = saveHilfeNotes;
window.exportData = exportData;
window.importData = importData;
window.clearAllData = resetAllData;
window.requestBackupPermission = requestNotificationPermission;
window.selectBackupDir = selectBackupDir;
window.runAutoBackup = runAutoBackup;
window.offerRestoreIfEmpty = offerRestoreIfEmpty;
window.scheduleAutoBackup = scheduleAutoBackup;
window.setBackupInterval = setBackupInterval;
