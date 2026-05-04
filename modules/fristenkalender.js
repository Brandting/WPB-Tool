// ============ FRISTENKALENDER ============
let kalMonth       = new Date().getMonth();
let kalYear        = new Date().getFullYear();
let kalProjFilter  = '';
let kalUpcomingDays = 7;

const KAL_TYPE_COLOR = { termin:'#3b82f6', frist:'#ef4444', erinnerung:'#eab308', info:'#6b7280', aufgabe:'#3ecf6e', mangel:'#f97316' };
function kalColor(type){ return (state.settings?.kalTypeColors?.[type]) || KAL_TYPE_COLOR[type] || '#3b82f6'; }
const KAL_TYPE_LABEL = { termin:'Termin', frist:'Frist', erinnerung:'Erinnerung', info:'Info', aufgabe:'Aufgabe', mangel:'Mangel' };
const KAL_NO_NOTIFY  = new Set(['info']);
const KAL_DAY_NAMES  = ['Mo','Di','Mi','Do','Fr','Sa','So'];

function buildTaskEntries(){
  return (state.tasks||[]).filter(t=>t.due).map(t=>({
    id: t.id, date: t.due, title: t.title,
    type: t.type, source: 'task', projectId: t.projectId||null,
    status: t.status, priority: t.priority,
  }));
}

function renderFristenkalender(){
  const now = new Date(); now.setHours(0,0,0,0);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  // Virtuelle Einträge aus Bauzeitplan-Erinnerungen
  const bzpEntries = (state.schedule||[]).flatMap(t=>{
    const reminders = t.reminders?.length ? t.reminders : (t.reminder ? [t.reminder] : []);
    return reminders.filter(r=>r&&r.date).map((r,ri)=>({
      id: `bzp_${t.id}_${ri}`,
      date: r.date,
      title: r.message ? `${esc(t.name)}: ${esc(r.message)}` : esc(t.name),
      type: 'erinnerung',
      source: 'bauzeitplan',
      projectId: t.projectId||null,
      readonly: true,
    }));
  });

  const allEntries = [
    ...(state.kalenderEntries||[]),
    ...bzpEntries,
    ...buildTaskEntries(),
  ].filter(e=> !kalProjFilter || !e.projectId || e.projectId===kalProjFilter);

  const upcoming = allEntries.filter(e=>{
    if(KAL_NO_NOTIFY.has(e.type)) return false;
    const d = new Date(e.date); d.setHours(0,0,0,0);
    const diff = Math.ceil((d-now)/864e5);
    return diff>=0 && diff<=kalUpcomingDays;
  }).sort((a,b)=>a.date.localeCompare(b.date));

  const firstDay = new Date(kalYear, kalMonth, 1);
  const daysInMonth = new Date(kalYear, kalMonth+1, 0).getDate();
  let startOffset = firstDay.getDay()-1;
  if(startOffset<0) startOffset=6;

  const cells=[];
  for(let i=0;i<startOffset;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);
  while(cells.length%7!==0) cells.push(null);

  const monthName = new Date(kalYear,kalMonth,1).toLocaleDateString('de-DE',{month:'long',year:'numeric'});

  // ── Aufgaben-Panel (rechte Spalte) ──
  let tasks = projectTasks();
  if(taskFilter.status)   tasks = tasks.filter(t=>t.status===taskFilter.status);
  if(taskFilter.type)     tasks = tasks.filter(t=>t.type===taskFilter.type);
  if(taskFilter.priority) tasks = tasks.filter(t=>t.priority===taskFilter.priority);

  const aufgabenPanel = `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <h3 style="color:var(--primary);font-size:15px;margin:0">✅ Aufgaben & Mängel</h3>
        <button class="btn btn-sm" onclick="editTask()" ${state.projects.length===0?'disabled':''}>+ Neu</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        <select onchange="taskFilter.status=this.value;render()" style="flex:1;min-width:100px;padding:5px 8px;border-radius:var(--radius-btn);border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12px">
          <option value="">Alle Status</option>
          <option value="offen"       ${taskFilter.status==='offen'?'selected':''}>Offen</option>
          <option value="bearbeitung" ${taskFilter.status==='bearbeitung'?'selected':''}>In Bearbeitung</option>
          <option value="erledigt"    ${taskFilter.status==='erledigt'?'selected':''}>Erledigt</option>
        </select>
        <select onchange="taskFilter.type=this.value;render()" style="flex:1;min-width:100px;padding:5px 8px;border-radius:var(--radius-btn);border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12px">
          <option value="">Alle Typen</option>
          <option value="aufgabe" ${taskFilter.type==='aufgabe'?'selected':''}>Aufgabe</option>
          <option value="mangel"  ${taskFilter.type==='mangel'?'selected':''}>Mangel</option>
        </select>
        <select onchange="taskFilter.priority=this.value;render()" style="flex:1;min-width:100px;padding:5px 8px;border-radius:var(--radius-btn);border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12px">
          <option value="">Alle Prioritäten</option>
          <option value="hoch"    ${taskFilter.priority==='hoch'?'selected':''}>Hoch</option>
          <option value="mittel"  ${taskFilter.priority==='mittel'?'selected':''}>Mittel</option>
          <option value="niedrig" ${taskFilter.priority==='niedrig'?'selected':''}>Niedrig</option>
        </select>
      </div>
      ${tasks.length===0
        ? `<div style="text-align:center;padding:32px 0;color:var(--muted);font-size:13px">✅ Keine Aufgaben vorhanden</div>`
        : `<div style="display:flex;flex-direction:column;gap:6px">
          ${tasks.map(t=>`
            <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:var(--surface-2);border-radius:8px;border-left:3px solid ${t.priority==='hoch'?'var(--red)':t.priority==='mittel'?'var(--yellow)':'var(--blue)'}">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</div>
                <div style="display:flex;gap:5px;margin-top:4px;flex-wrap:wrap">
                  <span class="badge ${t.type}" style="font-size:10px">${t.type==='mangel'?'Mangel':'Aufgabe'}</span>
                  <span class="badge ${t.status}" style="font-size:10px">${t.status}</span>
                  <span class="badge ${t.priority}" style="font-size:10px">${t.priority}</span>
                  ${t.due?`<span style="font-size:10px;color:var(--muted)">📅 ${fmtDate(t.due)}</span>`:''}
                </div>
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0">
                <button class="btn btn-sm btn-secondary" onclick="editTask('${t.id}')">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}')">🗑️</button>
              </div>
            </div>`).join('')}
          </div>`
      }
    </div>`;

  return `


    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">

      <!-- LINKE SPALTE: Kalender + Anstehende -->
      <div>
        <div class="card" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="kalPrevMonth()">‹</button>
            <h3 style="color:var(--primary);font-size:15px;margin:0;text-transform:capitalize;flex:1;text-align:center">${monthName}</h3>
            <button class="btn btn-secondary btn-sm" onclick="kalNextMonth()">›</button>
          </div>
          <div style="margin-bottom:10px">
            <select onchange="kalProjFilter=this.value;render()" style="width:100%;padding:5px 8px;border-radius:var(--radius-btn);border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12px">
              <option value="" ${!kalProjFilter?'selected':''}>Alle Projekte</option>
              ${state.projects.map(p=>`<option value="${p.id}" ${kalProjFilter===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
            </select>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">
            ${KAL_DAY_NAMES.map(d=>`<div style="text-align:center;font-size:11px;font-weight:600;color:var(--muted);padding:3px 0">${d}</div>`).join('')}
            ${cells.map((day,idx)=>{
              if(!day) return `<div style="min-height:56px"></div>`;
              const col=idx%7;
              const isWeekend=col===5||col===6;
              const dateStr=`${kalYear}-${String(kalMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const entries=allEntries.filter(e=>e.date===dateStr);
              const isToday=dateStr===todayStr;
              const bg=isToday?'var(--info-bg)':isWeekend?'var(--surface-2)':'var(--card)';
              return `<div onclick="openDayDetail('${dateStr}')"
                style="min-height:56px;border:${isToday?'2px solid var(--primary)':'1px solid var(--border)'};border-radius:5px;padding:3px;cursor:pointer;background:${bg};transition:.15s"
                onmouseover="this.style.filter='brightness(.96)'" onmouseout="this.style.filter=''">
                <div style="font-size:11px;font-weight:${isToday?'700':'400'};color:${isToday?'var(--primary)':isWeekend?'var(--muted)':'var(--text)'};margin-bottom:2px">${day}</div>
                ${entries.slice(0,1).map(e=>{
                  const isBzp=e.source==='bauzeitplan';
                  return `<div style="background:${kalColor(e.type)};color:#fff;border-radius:2px;padding:1px 3px;font-size:9px;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                    title="${e.title}${isBzp?' (Bauzeitplan)':''}">${e.title}</div>`;
                }).join('')}
                ${entries.length>1?`<div style="font-size:9px;color:var(--muted)">+${entries.length-1}</div>`:''}
              </div>`;
            }).join('')}
          </div>
        </div>

        ${upcoming.length>0?`
        <div class="card" style="border-left:4px solid var(--accent)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <h3 style="color:var(--primary);font-size:14px;margin:0">🔔 Anstehende Einträge</h3>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:12px;color:var(--muted)">der nächsten</span>
              <select onchange="kalUpcomingDays=+this.value;render()" style="padding:4px 6px;border-radius:var(--radius-btn);border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12px;width:80px">
                <option value="3"  ${kalUpcomingDays===3?'selected':''}>3 Tage</option>
                <option value="7"  ${kalUpcomingDays===7?'selected':''}>7 Tage</option>
                <option value="14" ${kalUpcomingDays===14?'selected':''}>14 Tage</option>
                <option value="21" ${kalUpcomingDays===21?'selected':''}>21 Tage</option>
                <option value="30" ${kalUpcomingDays===30?'selected':''}>30 Tage</option>
                <option value="60" ${kalUpcomingDays===60?'selected':''}>60 Tage</option>
                <option value="90" ${kalUpcomingDays===90?'selected':''}>90 Tage</option>
              </select>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${upcoming.map(e=>{
              const d=new Date(e.date); d.setHours(0,0,0,0);
              const diff=Math.ceil((d-now)/864e5);
              const badge=diff===0?`<strong style="color:var(--accent)">Heute</strong>`:diff===1?'Morgen':`in ${diff} Tagen`;
              const proj=e.projectId?state.projects.find(p=>p.id===e.projectId):null;
              const isBzp=e.source==='bauzeitplan';
              return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
                <span style="background:${kalColor(e.type)};color:#fff;border-radius:4px;padding:2px 6px;font-size:10px;min-width:64px;text-align:center">${isBzp?'📅 BZP':KAL_TYPE_LABEL[e.type]||e.type}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.title}</div>
                  ${proj?`<div style="font-size:10px;color:var(--muted)">📁 ${esc(proj.name)}</div>`:''}
                </div>
                <span style="font-size:11px;color:var(--muted);white-space:nowrap">${fmtDate(e.date)}</span>
                <span style="font-size:11px;color:${diff===0?'var(--accent)':'var(--muted)'};white-space:nowrap">${badge}</span>
                ${isBzp?'':`<button class="btn btn-sm btn-secondary" onclick="editKalenderEntry('${e.id}')">✏️</button>`}
              </div>`;
            }).join('')}
          </div>
        </div>`:''}
      </div>

      <!-- RECHTE SPALTE: Aufgaben & Mängel -->
      <div>
        ${aufgabenPanel}
      </div>

    </div>
  `;
}

function kalPrevMonth(){
  kalMonth--;
  if(kalMonth<0){kalMonth=11;kalYear--;}
  render();
}
function kalNextMonth(){
  kalMonth++;
  if(kalMonth>11){kalMonth=0;kalYear++;}
  render();
}

function editKalenderEntry(id, preDate){
  const e = id ? state.kalenderEntries.find(x=>x.id===id) : {
    id:uid(), title:'', description:'', type:'termin',
    date: preDate||today(), projectId: state.currentProject||null, source:'manual'
  };
  openModal(`
    <h3>${id?'Eintrag bearbeiten':'Neuer Kalendereintrag'}</h3>
    <form onsubmit="saveKalenderEntry(event,'${e.id}',${id?'true':'false'})">
      <div class="form-group"><label>Titel *</label><input name="title" required value="${esc(e.title)}"></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Datum *</label><input type="date" name="date" required value="${e.date||''}"></div>
        <div class="form-group" style="flex:1"><label>Typ</label>
          <select name="type">
            <option value="termin" ${e.type==='termin'?'selected':''}>Termin</option>
            <option value="frist" ${e.type==='frist'?'selected':''}>Frist</option>
            <option value="erinnerung" ${e.type==='erinnerung'?'selected':''}>Erinnerung</option>
            <option value="info" ${e.type==='info'?'selected':''}>Info (kein Hinweis)</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Projekt</label>
        <select name="projectId">
          <option value="">— kein Projekt —</option>
          ${state.projects.map(p=>`<option value="${p.id}" ${e.projectId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Beschreibung</label><textarea name="description">${esc(e.description||'')}</textarea></div>
      <div class="modal-actions">
        ${id?`<button type="button" class="btn btn-danger" onclick="deleteKalenderEntry('${e.id}')">Löschen</button>`:''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}

async function saveKalenderEntry(ev, id, exists){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  const data={id, title:fd.get('title'), date:fd.get('date'), type:fd.get('type'), description:fd.get('description'), source:'manual', projectId:fd.get('projectId')||null};
  if(exists==='true'||exists===true){
    state.kalenderEntries=state.kalenderEntries.map(e=>e.id===id?{...e,...data}:e);
  } else {
    state.kalenderEntries.push(data);
  }
  await save('kalenderEntries');
  closeModal();
  render();
}

async function deleteKalenderEntry(id){
  if(!confirm('Eintrag wirklich löschen?')) return;
  state.kalenderEntries=state.kalenderEntries.filter(e=>e.id!==id);
  await save('kalenderEntries');
  closeModal();
  render();
}

function openDayDetail(dateStr){
  const bzpEntries=(state.schedule||[]).flatMap(t=>{
    const reminders=t.reminders?.length?t.reminders:(t.reminder?[t.reminder]:[]);
    return reminders.filter(r=>r&&r.date).map((r,ri)=>({
      id:`bzp_${t.id}_${ri}`,date:r.date,
      title:r.message?`${t.name}: ${r.message}`:t.name,
      type:'erinnerung',source:'bauzeitplan',projectId:t.projectId||null,
    }));
  });
  const allEntries=[...(state.kalenderEntries||[]),...bzpEntries,...buildTaskEntries()]
    .filter(e=>!kalProjFilter||!e.projectId||e.projectId===kalProjFilter);
  const entries=allEntries.filter(e=>e.date===dateStr);
  const dateLabel=new Date(dateStr+'T12:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  openModal(`
    <h3 style="margin-bottom:16px">📅 ${dateLabel}</h3>
    ${entries.length===0?`<p style="color:var(--muted);text-align:center;padding:12px 0">Keine Einträge an diesem Tag</p>`:`
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:40px">
      ${entries.map(e=>{
        const isBzp=e.source==='bauzeitplan';
        const isTask=e.source==='task';
        const proj=e.projectId?state.projects.find(p=>p.id===e.projectId):null;
        const editOnclick=isTask?`editTask('${e.id}')`:`editKalenderEntry('${e.id}')`;
        const delOnclick=isTask?`closeModal();deleteTask('${e.id}')`:`deleteKalenderEntry('${e.id}')`;
        const badge=isBzp?'📅 BZP':(KAL_TYPE_LABEL[e.type]||e.type);
        const statusLabel=isTask&&e.status?` · ${e.status}`:'';
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;background:var(--surface-2)">
          <span style="background:${kalColor(e.type)};color:#fff;border-radius:4px;padding:2px 7px;font-size:10px;min-width:64px;text-align:center;flex-shrink:0">${badge}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600">${esc(e.title)}</div>
            ${proj?`<div style="font-size:11px;color:var(--muted)">📁 ${esc(proj.name)}${statusLabel}</div>`:(statusLabel?`<div style="font-size:11px;color:var(--muted)">${statusLabel.trim()}</div>`:'')}
            ${e.description?`<div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(e.description)}</div>`:''}
          </div>
          ${isBzp?'':`<div style="display:flex;gap:4px;flex-shrink:0">
            <button class="btn btn-sm btn-secondary" onclick="${editOnclick}">✏️ Bearbeiten</button>
            <button class="btn btn-sm btn-danger" onclick="${delOnclick}">🗑️</button>
          </div>`}
        </div>`;
      }).join('')}
    </div>`}
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="editKalenderEntry(null,'${dateStr}')">+ Neuer Eintrag</button>
      <button class="btn" onclick="closeModal()">Schließen</button>
    </div>
  `);
}

// Exports
window.renderFristenkalender = renderFristenkalender;
window.kalProjFilter = kalProjFilter;
window.kalPrevMonth = kalPrevMonth;
window.kalNextMonth = kalNextMonth;
window.openDayDetail = openDayDetail;
window.editKalenderEntry = editKalenderEntry;
window.saveKalenderEntry = saveKalenderEntry;
window.deleteKalenderEntry = deleteKalenderEntry;
