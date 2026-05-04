// ============ BAUZEITPLAN ============
function projectSchedule(){
  return state.schedule.filter(t => !state.currentProject || t.projectId === state.currentProject);
}

// ─── Dependency Engine ────────────────────────────────────────────────────────
// dep = {predId, type:'EA'|'AA'|'EE'|'AE', lag:0}  (lag in Arbeitstagen)
// EA = Ende→Anfang (FS), AA = Anfang→Anfang (SS), EE = Ende→Ende (FF), AE = Anfang→Ende (SF)

function dateAddDays(dateStr, days){
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}
function dateDiffDays(a, b){ // b - a in days
  return Math.round((new Date(b)-new Date(a))/864e5);
}
function taskDuration(t){
  if(t.start && t.end) return Math.max(0, dateDiffDays(t.start, t.end));
  return t.duration || 0;
}

// Compute earliest start/end for one task given its predecessors (already resolved)
function computeConstrainedStart(task, allTasks){
  const deps = task.deps || [];
  if(!deps.length) return task.start;
  let earliest = null;
  for(const dep of deps){
    const pred = allTasks.find(t=>t.id===dep.predId);
    if(!pred||!pred.start) continue;
    const lag = dep.lag || 0;
    let constraintStart;
    const type = dep.type || 'EA';
    const predDur = taskDuration(pred);
    if(type==='EA'){  // Finish→Start
      constraintStart = dateAddDays(pred.end || dateAddDays(pred.start, predDur), lag);
    } else if(type==='AA'){ // Start→Start
      constraintStart = dateAddDays(pred.start, lag);
    } else if(type==='EE'){ // Finish→Finish: constraintEnd = pred.end+lag → start = constraintEnd - dur
      const constraintEnd = dateAddDays(pred.end || dateAddDays(pred.start, predDur), lag);
      const dur = taskDuration(task);
      constraintStart = dateAddDays(constraintEnd, -dur);
    } else if(type==='AE'){ // Start→Finish
      const constraintEnd = dateAddDays(pred.start, lag);
      const dur = taskDuration(task);
      constraintStart = dateAddDays(constraintEnd, -dur);
    }
    if(!earliest || constraintStart > earliest) earliest = constraintStart;
  }
  return earliest || task.start;
}

// Topological sort + cascade: recalculate all tasks with deps
function cascadeSchedule(tasks){
  // Build adjacency and in-degree
  const idMap = {};
  tasks.forEach(t=>idMap[t.id]=t);
  const inDeg = {};
  const succ = {}; // pred → list of successors
  tasks.forEach(t=>{ inDeg[t.id]=0; succ[t.id]=[]; });
  tasks.forEach(t=>{
    (t.deps||[]).forEach(d=>{
      if(idMap[d.predId]){
        inDeg[t.id]++;
        succ[d.predId].push(t.id);
      }
    });
  });
  // Kahn's algorithm
  const queue = tasks.filter(t=>inDeg[t.id]===0).map(t=>t.id);
  const order = [];
  while(queue.length){
    const cur = queue.shift();
    order.push(cur);
    succ[cur].forEach(sid=>{
      inDeg[sid]--;
      if(inDeg[sid]===0) queue.push(sid);
    });
  }
  // Cascade in order
  const updated = tasks.map(t=>({...t}));
  const updMap = {};
  updated.forEach(t=>updMap[t.id]=t);
  order.forEach(id=>{
    const t = updMap[id];
    if(!(t.deps||[]).length) return; // anchor, keep manual dates
    const newStart = computeConstrainedStart(t, updated);
    if(newStart && newStart !== t.start){
      const dur = taskDuration(t);
      t.start = newStart;
      t.end = dateAddDays(newStart, dur);
      t.duration = dur;
    }
  });
  return updated;
}
// ─────────────────────────────────────────────────────────────────────────────


// ISO 8601 Kalenderwoche
function getISOWeek(d){
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() + 3 - ((date.getDay()+6)%7));
  const week1 = new Date(date.getFullYear(),0,4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + ((week1.getDay()+6)%7)) / 7);
}
function getMondayOfWeek(d){
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (date.getDay()+6)%7; // 0 = Mo
  date.setDate(date.getDate() - day);
  return date;
}

function generateGanttHeaders(minDate, maxDate){
  const totalMs = maxDate - minDate || 1;
  // Wochen
  const weeks = [];
  let cur = getMondayOfWeek(minDate);
  while(cur < maxDate){
    const next = new Date(cur);
    next.setDate(next.getDate()+7);
    const startMs = Math.max(cur.getTime(), minDate.getTime());
    const endMs = Math.min(next.getTime(), maxDate.getTime());
    if(endMs > startMs){
      weeks.push({
        left: ((startMs - minDate.getTime())/totalMs)*100,
        width: ((endMs - startMs)/totalMs)*100,
        kw: getISOWeek(cur)
      });
    }
    cur = next;
  }
  // Monate
  const months = [];
  let m = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while(m < maxDate){
    const next = new Date(m.getFullYear(), m.getMonth()+1, 1);
    const startMs = Math.max(m.getTime(), minDate.getTime());
    const endMs = Math.min(next.getTime(), maxDate.getTime());
    if(endMs > startMs){
      const widthPct = ((endMs - startMs)/totalMs)*100;
      const fullLabel = m.toLocaleDateString('de-DE', {month:'long', year:'numeric'});
      const shortLabel = m.toLocaleDateString('de-DE', {month:'short', year:'2-digit'});
      months.push({
        left: ((startMs - minDate.getTime())/totalMs)*100,
        width: widthPct,
        label: widthPct > 8 ? fullLabel : shortLabel
      });
    }
    m = next;
  }
  return {weeks, months};
}

// ============ GRUPPEN-KATALOG ============
function renderGruppenKatalog(){
  const vorlagen=state.schaetzungGruppenVorlagen||[];

  const vorlagenHtml=vorlagen.length===0
    ?`<div class="card empty"><span class="empty-icon">📋</span>Noch keine Gruppenvorlagen.<br>Erstelle deine erste Vorlage mit dem Button oben rechts.</div>`
    :vorlagen.map(v=>{
      const groupsHtml=(v.groups||[]).length===0
        ?`<p style="color:var(--muted);font-size:13px;margin:0 0 10px">Noch keine Gruppen. Füge eine Gruppe hinzu.</p>`
        :(v.groups||[]).map(g=>`
          <div style="border:1px solid var(--border);border-radius:8px;margin-bottom:10px;overflow:hidden">
            <div style="background:var(--surface-2);padding:9px 14px;display:flex;align-items:center;gap:8px">
              <span style="font-weight:700;font-size:14px;flex:1">${esc(g.name)}</span>
              <span style="font-size:12px;color:var(--muted)">${(g.positions||[]).length} Pos.</span>
              <button class="btn btn-sm btn-secondary" onclick="renameKatalogGroup('${v.id}','${g.id}')">✏️ Umbenennen</button>
              <button class="btn btn-sm btn-danger" onclick="deleteKatalogGroup('${v.id}','${g.id}')">🗑️</button>
            </div>
            ${(g.positions||[]).length>0?`
            <div style="overflow-x:auto">
              <table style="border-radius:0;box-shadow:none;border:none;font-size:13px">
                <thead><tr>
                  <th>Position</th>
                  <th style="text-align:right;width:90px">Menge</th>
                  <th style="width:60px;text-align:center">Einh.</th>
                  <th style="text-align:right;width:110px">Preis/Einh.</th>
                  <th style="width:40px"></th>
                </tr></thead>
                <tbody>
                  ${(g.positions||[]).map((p,pi)=>`
                    <tr>
                      <td style="padding:5px 10px">
                        <input type="text" value="${esc(p.name)}"
                          style="border:none;background:transparent;color:var(--text);font-size:13px;width:100%"
                          onchange="updateKatalogPos('${v.id}','${g.id}',${pi},'name',this.value)">
                      </td>
                      <td style="padding:4px 6px">
                        <input type="number" step="any" value="${p.qty||0}"
                          style="width:80px;text-align:right;font-size:13px"
                          onchange="updateKatalogPos('${v.id}','${g.id}',${pi},'qty',parseFloat(this.value)||0)">
                      </td>
                      <td style="padding:4px 6px;text-align:center">
                        <input type="text" value="${esc(p.unit||'psch')}"
                          style="width:52px;text-align:center;font-size:13px"
                          onchange="updateKatalogPos('${v.id}','${g.id}',${pi},'unit',this.value)">
                      </td>
                      <td style="padding:4px 6px">
                        <input type="number" step="0.01" value="${p.price||0}"
                          style="width:100px;text-align:right;font-size:13px"
                          onchange="updateKatalogPos('${v.id}','${g.id}',${pi},'price',parseFloat(this.value)||0)">
                      </td>
                      <td style="padding:4px 4px;text-align:center">
                        <button class="btn btn-sm btn-danger" style="padding:2px 7px"
                          onclick="deleteKatalogPos('${v.id}','${g.id}',${pi})">×</button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>`:``}
            <div style="padding:8px 12px;border-top:1px solid var(--border);background:var(--card)">
              <button class="btn btn-sm btn-secondary" onclick="addKatalogPos('${v.id}','${g.id}')">＋ Position hinzufügen</button>
            </div>
          </div>
        `).join('');

      return `
        <div class="katalog-vorlage-card" style="margin-bottom:20px">
          <div style="background:var(--primary);color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-size:17px">📋</span>
            <strong style="flex:1;font-size:15px">${esc(v.name)}</strong>
            <span style="font-size:12px;opacity:.8">${(v.groups||[]).length} Gruppe${(v.groups||[]).length!==1?'n':''}</span>
            <button class="btn btn-sm" style="background:rgba(255,255,255,.2);border:none;color:#fff" onclick="renameGruppenVorlageKatalog('${v.id}')">✏️ Umbenennen</button>
            <button class="btn btn-sm" style="background:rgba(255,255,255,.2);border:none;color:#fff" onclick="copyGruppenVorlageKatalog('${v.id}')">📋 Duplizieren</button>
            <button class="btn btn-sm btn-danger" onclick="deleteGruppenVorlageKatalog('${v.id}')">🗑️ Löschen</button>
          </div>
          <div style="padding:14px 16px">
            ${groupsHtml}
            <button class="btn btn-secondary btn-sm" onclick="addKatalogGroup('${v.id}')">＋ Gruppe hinzufügen</button>
          </div>
        </div>`;
    }).join('');

  return `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="showView(previousView)">← Zurück</button>
        <h2>📋 Gruppen-Katalog</h2>
      </div>
      <button class="btn" onclick="addGruppenVorlage()">＋ Neue Vorlage</button>
    </div>
    <p style="color:var(--muted);font-size:13px;margin-bottom:20px">
      Erstelle wiederverwendbare Gruppen-Vorlagen mit Positionen.
      In der Kostenschätzung kannst du Gruppen per <strong>Drag & Drop</strong> aus dem rechten Katalog-Panel direkt einfügen.
    </p>
    ${vorlagenHtml}
  `;
}

function renderBauzeitplan(){
  const tasks = projectSchedule().sort((a,b)=>(a.start||'').localeCompare(b.start||''));

  // Zeitachse berechnen mit etwas Puffer links/rechts
  let minDate=null, maxDate=null;
  tasks.forEach(t=>{
    if(t.start){const d=new Date(t.start);if(!minDate||d<minDate)minDate=d;}
    if(t.end){const d=new Date(t.end);if(!maxDate||d>maxDate)maxDate=d;}
  });
  if(!minDate)minDate=new Date();
  if(!maxDate)maxDate=new Date(minDate.getTime()+90*24*60*60*1000);
  // Auf Wochengrenzen runden für sauberes Lineal
  minDate = getMondayOfWeek(minDate);
  const maxMon = getMondayOfWeek(maxDate);
  maxDate = new Date(maxMon.getTime() + 7*24*60*60*1000);
  const totalMs = maxDate - minDate || 1;

  const {weeks, months} = generateGanttHeaders(minDate, maxDate);
  // Adaptive: Bei vielen Wochen nur jede 2./4. KW labeln
  const kwLabelStep = weeks.length > 60 ? 4 : weeks.length > 30 ? 2 : 1;

  // Wochenlinien-HTML einmal generieren (in jeder Row wiederverwendet)
  const weekLinesHtml = weeks.map(w =>
    `<div class="gantt-week-line" style="left:${(w.left+w.width).toFixed(3)}%"></div>`
  ).join('');

  // Heute-Linie
  const now = new Date();
  let todayLine = '';
  if(now >= minDate && now <= maxDate){
    const todayLeft = ((now-minDate)/totalMs)*100;
    todayLine = `<div class="gantt-today-line" style="left:${todayLeft.toFixed(3)}%" title="Heute"></div>`;
  }

  return `
    <div class="page-header">
      <h2>Bauzeitplan</h2>
      <div>
        <button class="btn btn-secondary" onclick="">🧙 Wizard</button>
        <button class="btn btn-secondary" onclick="exportMSProjectXML()">⬇️ XML-Download</button>
        <button class="btn btn-secondary" onclick="document.getElementById('mppImport').click()">⬆️ XML-Upload</button>
        <button class="btn" onclick="editScheduleTask()" ${state.projects.length===0?'disabled':''}>+ Vorgang</button>
        <input type="file" id="mppImport" accept=".xml" style="display:none" onchange="importMSProjectXML(event)">
      </div>
    </div>

    ${tasks.length===0 ? `<div class="card empty"><span class="empty-icon">📅</span>
      Noch kein Bauzeitplan. Importiere eine MS-Project-XML-Datei oder lege Vorgänge manuell an.
      <br><button class="btn btn-secondary" style="margin-top:14px" onclick="showImportHelp()">So exportierst du aus MS Project</button>
    </div>` :
    `<div class="card gantt-container">
      <div class="gantt-header">
        <div class="gantt-header-name">Vorgang (${tasks.length})</div>
        <div class="gantt-header-dates">
          <div class="gantt-month-row">
            ${months.map(m=>`<div class="gantt-month-cell" style="left:${m.left.toFixed(3)}%;width:${m.width.toFixed(3)}%">${esc(m.label)}</div>`).join('')}
          </div>
          <div class="gantt-week-row">
            ${weeks.map((w,i)=>`<div class="gantt-week-cell" style="left:${w.left.toFixed(3)}%;width:${w.width.toFixed(3)}%">${i%kwLabelStep===0?'KW '+w.kw:''}</div>`).join('')}
          </div>
        </div>
      </div>
      ${tasks.map((t,rowIdx)=>{
        const start = t.start?new Date(t.start):minDate;
        const end = t.end?new Date(t.end):start;
        const left = ((start-minDate)/totalMs)*100;
        const width = Math.max(((end-start)/totalMs)*100, 0.3);
        const isMilestone = t.duration === 0 || start.getTime()===end.getTime();
        const done = (t.progress||0) >= 100;
        const checklistDone = (t.checklist||[]).filter(c=>c.done).length;
        const checklistTotal = (t.checklist||[]).length;
        const hasDeps = (t.deps||[]).length > 0;
        const depLabel = hasDeps ? (t.deps||[]).map(d=>{
          const pred=tasks.find(x=>x.id===d.predId);
          return pred?`${d.type||'EA'}: ${pred.name.slice(0,15)}`:'';
        }).filter(Boolean).join(', ') : '';
        const tooltip = `${t.name}: ${fmtDate(t.start)} – ${fmtDate(t.end)}${t.assignee?' • '+t.assignee:''}${checklistTotal?' • ✓ '+checklistDone+'/'+checklistTotal:''}${depLabel?' • 🔗 '+depLabel:''}`;
        return `
        <div class="gantt-row" data-taskid="${t.id}" data-rowidx="${rowIdx}">
          <div class="gantt-name level-${Math.min(t.level||1,4)}" onclick="editScheduleTask('${t.id}')" style="cursor:pointer">
            <div style="overflow:hidden;text-overflow:ellipsis">
              ${t.reminder?'<span title="Erinnerung gesetzt">🔔</span> ':''}
              ${hasDeps?'<span title="Hat Vorgänger" style="font-size:10px;color:var(--blue)">🔗</span> ':''}
              ${checklistTotal?`<span title="Checkliste" style="font-size:11px;color:var(--muted)">✓${checklistDone}/${checklistTotal}</span> `:''}
              <strong>${esc(t.name)}</strong>
            </div>
            ${t.assignee?`<small style="color:var(--muted);font-size:11px;margin-left:18px;overflow:hidden;text-overflow:ellipsis">${esc(t.assignee)}</small>`:''}
          </div>
          <div class="gantt-bar-area" style="position:relative">
            ${weekLinesHtml}
            ${todayLine}
            <div class="gantt-bar ${isMilestone?'milestone':''} ${done?'done':''}"
              data-left="${left.toFixed(3)}" data-width="${width.toFixed(3)}"
              style="left:${left.toFixed(3)}%;${isMilestone?'':'width:'+width.toFixed(3)+'%'}"
              onclick="editScheduleTask('${t.id}')"
              title="${esc(tooltip)}">
              ${!isMilestone?`<div class="progress" style="width:${t.progress||0}%"></div>${width>8?fmtDate(t.start)+' – '+fmtDate(t.end):''}`:''}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div style="margin-top:14px;display:flex;gap:18px;font-size:12px;color:var(--muted);flex-wrap:wrap">
      <span>📊 ${tasks.length} Vorgänge • Zeitraum: ${fmtDate(minDate)} – ${fmtDate(maxDate)}</span>
      <span><span style="display:inline-block;width:14px;height:10px;background:var(--primary);border-radius:2px;vertical-align:middle"></span> Vorgang</span>
      <span><span style="display:inline-block;width:14px;height:10px;background:var(--green);border-radius:2px;vertical-align:middle"></span> Erledigt</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:var(--accent);border-radius:50%;vertical-align:middle"></span> Meilenstein</span>
      <span><span style="display:inline-block;width:2px;height:12px;background:var(--red);vertical-align:middle"></span> Heute</span>
    </div>

    <div style="margin-top:20px"><h3 style="color:var(--primary);margin-bottom:10px">Vorgangsliste</h3>
    <table><thead><tr>
      <th>Name</th><th>Start</th><th>Ende</th><th>Dauer</th><th>Zuständig</th>
      <th>Fortschritt</th><th>Checkliste</th><th>Vorgänger</th><th>Erinnerung</th><th></th>
    </tr></thead><tbody>
    ${tasks.map(t=>{
      const cd=(t.checklist||[]).filter(c=>c.done).length, ct=(t.checklist||[]).length;
      const depStr=(t.deps||[]).map(d=>{
        const pred=tasks.find(x=>x.id===d.predId);
        return pred?`<span style="font-size:11px;background:var(--info-bg);padding:1px 5px;border-radius:4px;white-space:nowrap">${d.type||'EA'}: ${esc(pred.name.slice(0,12))}${pred.name.length>12?'…':''}${d.lag?` (${d.lag>0?'+':''}${d.lag}T)`:''}</span>`:''
      }).filter(Boolean).join(' ');
      return `<tr>
        <td class="level-${Math.min(t.level||1,4)}"><strong>${esc(t.name)}</strong></td>
        <td>${fmtDate(t.start)}</td>
        <td>${fmtDate(t.end)}</td>
        <td>${t.duration||0}T</td>
        <td>${esc(t.assignee||'')}</td>
        <td>${t.progress||0}%</td>
        <td>${ct?`${cd}/${ct}`:'-'}</td>
        <td>${depStr||'—'}</td>
        <td>${(t.reminders?.length?t.reminders:(t.reminder?[t.reminder]:[])).filter(r=>r&&r.date).map(r=>`🔔 ${fmtDate(r.date)}`).join(', ')||'-'}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-secondary" onclick="editScheduleTask('${t.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteScheduleTask('${t.id}')">×</button>
        </td>
      </tr>`;
    }).join('')}
    </tbody></table></div>`}
  `;
}

function showImportHelp(){
  openModal(`
    <h3>Bauzeitplan – MS-Project XML</h3>
    <h4 style="color:var(--primary);margin-bottom:8px">📥 Importieren</h4>
    <ol style="margin:0 0 14px 20px;font-size:13px;line-height:1.9">
      <li>In MS Project: <strong>Datei → Speichern unter</strong></li>
      <li>Dateityp: <strong>XML-Format (*.xml)</strong></li>
      <li>Hier mit „📥 MS-Project XML" importieren</li>
    </ol>
    <p style="font-size:12px;color:var(--muted)">Importiert werden: Vorgänge, Daten, Dauer, Gliederung, Fortschritt und <strong>Abhängigkeiten (EA, AA, EE, AE)</strong> inkl. Lag.</p>
    <h4 style="color:var(--primary);margin:14px 0 8px">📤 Exportieren</h4>
    <p style="font-size:13px;margin-bottom:6px">„📤 MS-Project XML" erstellt eine XML-Datei, die direkt in MS Project importierbar ist. Alle Abhängigkeiten bleiben erhalten.</p>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">OK</button>
    </div>
  `);
}

// ── MS-Project Typ-Mapping ────────────────────────────────────────────────────
// MSP_DEP_TYPE and DEP_TO_MSP are declared in kostenschaetzung.js (loaded first)
// ─────────────────────────────────────────────────────────────────────────────

// MS Project XML Import
function importMSProjectXML(e){
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try{
      const parser = new DOMParser();
      const doc = parser.parseFromString(ev.target.result, 'application/xml');
      if(doc.querySelector('parsererror')) throw new Error('XML konnte nicht gelesen werden');

      const taskNodes = Array.from(doc.getElementsByTagName('Task'));
      if(taskNodes.length===0) throw new Error('Keine <Task>-Elemente gefunden');

      const projectId = state.currentProject || (state.projects[0] && state.projects[0].id);
      if(!projectId){alert('Bitte zuerst ein Projekt anlegen.');return;}

      // Pass 1: collect all tasks by UID, build UID→internalId map
      const uidToId = {};
      const taskList = [];

      taskNodes.forEach(tn => {
        const get = tag => { const el=tn.getElementsByTagName(tag)[0]; return el?el.textContent.trim():''; };
        const mspUid = get('UID');
        if(mspUid==='0') return; // project summary
        const name = get('Name') || get('n');
        if(!name) return;

        let durationDays = 0;
        const dur = get('Duration');
        const m = dur.match(/PT(\d+)H(\d+)M/);
        if(m) durationDays = Math.round((parseInt(m[1])*60+parseInt(m[2]))/480);

        const internalId = 'sch_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7)+mspUid;
        uidToId[mspUid] = internalId;

        taskList.push({
          mspUid, internalId,
          name,
          start: (get('Start')||get('ManualStart')||'').slice(0,10),
          end:   (get('Finish')||get('ManualFinish')||'').slice(0,10),
          duration: durationDays,
          level: parseInt(get('OutlineLevel'))||1,
          progress: parseInt(get('PercentComplete'))||0,
          isMilestone: get('Milestone')==='1'||durationDays===0,
          predLinks: Array.from(tn.getElementsByTagName('PredecessorLink')).map(pl=>{
            const pget = tag => { const el=pl.getElementsByTagName(tag)[0]; return el?el.textContent.trim():''; };
            return {
              predUid: pget('PredecessorUID'),
              type:    MSP_DEP_TYPE[parseInt(pget('Type'))||1] || 'EA',
              lagMin:  parseInt(pget('LinkLag'))||0, // in minutes
            };
          }),
        });
      });

      // Pass 2: resolve UIDs → internal IDs
      const newTasks = taskList.map(t=>({
        id: t.internalId,
        projectId,
        name: t.name,
        start: t.start,
        end: t.end,
        duration: t.isMilestone ? 0 : t.duration,
        level: t.level,
        assignee: '',
        progress: t.progress,
        checklist: [],
        reminder: null,
        deps: t.predLinks
          .filter(pl=>uidToId[pl.predUid])
          .map(pl=>({
            predId: uidToId[pl.predUid],
            type:   pl.type,
            lag:    Math.round(pl.lagMin/480), // convert minutes→workdays
          })),
      }));

      state.schedule = state.schedule.filter(t=>t.projectId!==projectId).concat(newTasks);
      await save('schedule');
      alert(`✓ ${newTasks.length} Vorgänge importiert (inkl. Abhängigkeiten)`);
      render();
    }catch(err){
      alert('Fehler beim Import: '+err.message);
    }
  };
  reader.readAsText(f);
  e.target.value = '';
}

// MS-Project XML Export
function exportMSProjectXML(){
  const tasks = projectSchedule().sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  if(tasks.length===0){alert('Keine Vorgänge zum Exportieren.');return;}

  const proj = state.projects.find(p=>p.id===state.currentProject) || {name:'BauLeiter-Export'};

  // Assign sequential UIDs, build id→uid map
  const idToUid = {};
  tasks.forEach((t,i)=>{ idToUid[t.id]=i+1; });

  const xmlDate = d => d ? d+'T08:00:00' : new Date().toISOString().slice(0,10)+'T08:00:00';
  const durStr = days => `PT${days*8}H0M0S`;

  const taskXml = tasks.map((t,i)=>{
    const uid = i+1;
    const dur = t.duration||0;
    const predXml = (t.deps||[]).filter(d=>idToUid[d.predId]).map(d=>`
      <PredecessorLink>
        <PredecessorUID>${idToUid[d.predId]}</PredecessorUID>
        <Type>${DEP_TO_MSP[d.type]??1}</Type>
        <CrossProject>0</CrossProject>
        <LinkLag>${(d.lag||0)*480}</LinkLag>
        <LagFormat>7</LagFormat>
      </PredecessorLink>`).join('');
    return `
    <Task>
      <UID>${uid}</UID>
      <ID>${uid}</ID>
      <Name>${t.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Name>
      <Active>1</Active>
      <Type>0</Type>
      <IsNull>0</IsNull>
      <WBS>${uid}</WBS>
      <OutlineNumber>${uid}</OutlineNumber>
      <OutlineLevel>${t.level||1}</OutlineLevel>
      <Priority>500</Priority>
      <Start>${xmlDate(t.start)}</Start>
      <Finish>${xmlDate(t.end)}</Finish>
      <Duration>${durStr(dur)}</Duration>
      <ManualStart>${xmlDate(t.start)}</ManualStart>
      <ManualFinish>${xmlDate(t.end)}</ManualFinish>
      <ManualDuration>${durStr(dur)}</ManualDuration>
      <DurationFormat>7</DurationFormat>
      <Milestone>${dur===0?1:0}</Milestone>
      <Summary>0</Summary>
      <PercentComplete>${t.progress||0}</PercentComplete>
      <PercentWorkComplete>${t.progress||0}</PercentWorkComplete>${predXml}
    </Task>`;
  }).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <SaveVersion>14</SaveVersion>
  <Name>${proj.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Name>
  <Title>${proj.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Title>
  <StartDate>${xmlDate(tasks[0]?.start)}</StartDate>
  <ScheduleFromStart>1</ScheduleFromStart>
  <CalendarUID>1</CalendarUID>
  <DefaultStartTime>08:00:00</DefaultStartTime>
  <DefaultFinishTime>17:00:00</DefaultFinishTime>
  <MinutesPerDay>480</MinutesPerDay>
  <MinutesPerWeek>2400</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <Calendars>
    <Calendar>
      <UID>1</UID>
      <Name>Standard</Name>
      <IsBaseCalendar>1</IsBaseCalendar>
      <IsBaselineCalendar>0</IsBaselineCalendar>
      <BaseCalendarUID>0</BaseCalendarUID>
    </Calendar>
  </Calendars>
  <Tasks>${taskXml}
  </Tasks>
  <Resources/>
  <Assignments/>
</Project>`;

  const blob = new Blob([xml],{type:'application/xml'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${proj.name.replace(/[^a-zA-Z0-9äöüÄÖÜß_\- ]/g,'_')}-Bauzeitplan.xml`;
  a.click();
}

function editScheduleTask(id){
  if(state.projects.length===0){alert('Bitte zuerst ein Projekt anlegen.');return;}
  const t = id ? state.schedule.find(x=>x.id===id) : {
    id:'sch_'+uid(),
    projectId: state.currentProject || state.projects[0].id,
    name:'',start:today(),end:today(),duration:1,level:1,assignee:'',progress:0,
    checklist:[], reminder:null, deps:[]
  };
  const r = t.reminder || {};
  const deps = t.deps || [];

  // Other tasks in same project (potential predecessors, not self)
  const projTasks = state.schedule.filter(x=>x.projectId===(t.projectId||state.currentProject||state.projects[0]?.id) && x.id!==t.id);

  const DEP_TYPES = [
    {key:'EA', label:'EA – Ende → Anfang (Standard)'},
    {key:'AA', label:'AA – Anfang → Anfang'},
    {key:'EE', label:'EE – Ende → Ende'},
    {key:'AE', label:'AE – Anfang → Ende'},
  ];

  openModal(`
    <h3>${id?'Vorgang bearbeiten':'Neuer Vorgang'}</h3>
    <form onsubmit="saveScheduleTask(event,'${t.id}',${id?'true':'false'})">
    <div style="display:grid;grid-template-columns:1fr 340px;gap:20px;align-items:start">
    <!-- Left column: Stammdaten + Deps -->
    <div>
      <div class="form-group"><label>Bezeichnung *</label><input name="name" required value="${esc(t.name)}"></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:2"><label>Projekt</label>
          <select name="projectId">
            ${state.projects.map(p=>`<option value="${p.id}" ${t.projectId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex:1"><label>Ebene</label>
          <select name="level">
            ${[1,2,3,4].map(l=>`<option value="${l}" ${t.level==l?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Start</label><input type="date" name="start" id="schStart" value="${t.start||''}"></div>
        <div class="form-group" style="flex:1"><label>Ende</label><input type="date" name="end" id="schEnd" value="${t.end||''}"></div>
        <div class="form-group" style="flex:0 0 80px"><label>Dauer (T)</label>
          <input type="number" name="duration" id="schDur" value="${t.duration||0}" min="0"
            oninput="const s=document.getElementById('schStart').value;if(s){const d=new Date(s);d.setDate(d.getDate()+parseInt(this.value||0));document.getElementById('schEnd').value=d.toISOString().slice(0,10)}">
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:2"><label>Zuständig</label><input name="assignee" value="${esc(t.assignee||'')}"></div>
        <div class="form-group" style="flex:1"><label>Fortschritt %</label><input type="number" name="progress" value="${t.progress||0}" min="0" max="100"></div>
      </div>

      <!-- Vorgänger / Abhängigkeiten -->
      <div style="background:var(--info-bg);padding:14px;border-radius:6px;margin:14px 0;border:1px solid var(--border)">
        <h4 style="color:var(--primary);margin-bottom:10px">🔗 Vorgänger / Abhängigkeiten</h4>
        <div id="depsContainer">
          ${deps.map((dep,i)=>{
            const pred=state.schedule.find(x=>x.id===dep.predId);
            return `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
              <select name="depPredId_${i}" style="flex:2;font-size:12px">
                <option value="">— kein Vorgänger —</option>
                ${projTasks.map(x=>`<option value="${x.id}" ${dep.predId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}
              </select>
              <select name="depType_${i}" style="flex:1;font-size:12px">
                ${DEP_TYPES.map(dt=>`<option value="${dt.key}" ${(dep.type||'EA')===dt.key?'selected':''}>${dt.key}</option>`).join('')}
              </select>
              <div style="display:flex;align-items:center;gap:3px;flex:0 0 80px">
                <input type="number" name="depLag_${i}" value="${dep.lag||0}" style="width:50px;text-align:center;font-size:12px" title="Abstand (Tage)">
                <span style="font-size:11px;color:var(--muted)">T</span>
              </div>
              <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('div[style*=margin-bottom]').remove()">×</button>
            </div>`;
          }).join('')}
        </div>
        ${projTasks.length>0?`
        <button type="button" class="btn btn-sm btn-secondary" onclick="addDepRow('${t.id}')">+ Vorgänger hinzufügen</button>
        <div style="margin-top:8px;font-size:11px;color:var(--muted)">
          EA=Ende→Anfang&nbsp;|&nbsp;AA=Anfang→Anfang&nbsp;|&nbsp;EE=Ende→Ende&nbsp;|&nbsp;AE=Anfang→Ende&nbsp;|&nbsp;Abstand in Tagen (positiv=Puffer, negativ=Überlappung)
        </div>`:'<p style="font-size:12px;color:var(--muted);margin:0">Keine anderen Vorgänge in diesem Projekt vorhanden.</p>'}
      </div>
    </div>

    <!-- Right column: Erinnerungen + Checkliste -->
    <div style="display:flex;flex-direction:column;gap:14px;min-width:0">

      <div style="background:#fff7ed;padding:14px;border-radius:6px;border:1px solid #fed7aa;flex:0 0 auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <h4 style="color:var(--accent);margin:0">🔔 Erinnerungen</h4>
          <button type="button" class="btn btn-sm btn-secondary" onclick="addReminderRow('${t.id}')">+ Hinzufügen</button>
        </div>
        <div id="remindersContainer">
          ${(t.reminders||[t.reminder].filter(Boolean)).map((r,ri)=>`
            <div style="border:1px solid #fed7aa;border-radius:6px;padding:8px;margin-bottom:8px;background:var(--warn-bg)">
              <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
                <input type="date" name="reminderDate_${ri}" value="${r.date||''}" style="flex:1;font-size:13px">
                <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('div[style*=border]').remove()">×</button>
              </div>
              <input type="text" name="reminderMsg_${ri}" value="${esc(r.message||'')}" placeholder="Erinnerungstext…" style="width:100%;font-size:13px">
            </div>
          `).join('')}
        </div>
        ${(t.reminders||[t.reminder].filter(Boolean)).length===0?'<p style="font-size:12px;color:var(--muted);margin:0">Noch keine Erinnerungen. Klicke auf „+ Hinzufügen".</p>':''}
      </div>

      <div style="background:#f0f7ff;padding:14px;border-radius:6px;border:1px solid #bfdbfe;flex:1">
        <h4 style="color:var(--primary);margin-bottom:8px">✓ Checkliste</h4>
        <div id="checklistContainer">
          ${(t.checklist||[]).map((c,i)=>`
            <div class="checklist-item ${c.done?'done':''}">
              <input type="checkbox" ${c.done?'checked':''} onchange="toggleChecklistItem('${t.id}',${i},this.checked)">
              <span style="flex:1">${esc(c.text)}</span>
              <button type="button" class="btn btn-sm btn-danger" onclick="removeChecklistItem('${t.id}',${i})">×</button>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <input type="text" id="newChkItem" placeholder="Neuer Eintrag…" onkeydown="if(event.key==='Enter'){event.preventDefault();addChecklistItem('${t.id}')}">
          <button type="button" class="btn btn-sm" onclick="addChecklistItem('${t.id}')">+</button>
        </div>
      </div>

    </div><!-- end right column -->
  </div><!-- end two-col grid -->

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern & Kaskadieren</button>
      </div>
    </form>
  `);
}

function addDepRow(taskId){
  const pid = state.currentProject || state.projects[0]?.id;
  const projTasks = state.schedule.filter(x=>x.projectId===pid && x.id!==taskId);
  const container = document.getElementById('depsContainer');
  const i = container.children.length;
  const div = document.createElement('div');
  div.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:6px';
  div.innerHTML=`
    <select name="depPredId_${i}" style="flex:2;font-size:12px">
      <option value="">— kein Vorgänger —</option>
      ${projTasks.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}
    </select>
    <select name="depType_${i}" style="flex:1;font-size:12px">
      <option value="EA">EA</option><option value="AA">AA</option>
      <option value="EE">EE</option><option value="AE">AE</option>
    </select>
    <div style="display:flex;align-items:center;gap:3px;flex:0 0 80px">
      <input type="number" name="depLag_${i}" value="0" style="width:50px;text-align:center;font-size:12px">
      <span style="font-size:11px;color:var(--muted)">T</span>
    </div>
    <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('div').remove()">×</button>`;
  container.appendChild(div);
}

function addReminderRow(){
  const container = document.getElementById('remindersContainer');
  const ri = container.children.length;
  const div = document.createElement('div');
  div.style.cssText='border:1px solid #fed7aa;border-radius:6px;padding:8px;margin-bottom:8px;background:var(--warn-bg)';
  div.innerHTML=`
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
      <input type="date" name="reminderDate_${ri}" style="flex:1;font-size:13px">
      <button type="button" class="btn btn-sm btn-danger" onclick="this.closest('div[style*=border]').remove()">×</button>
    </div>
    <input type="text" name="reminderMsg_${ri}" placeholder="Erinnerungstext…" style="width:100%;font-size:13px">`;
  container.appendChild(div);
}

function setRelDate(targetId, days){
  const d = new Date();
  d.setDate(d.getDate()+days);
  document.getElementById(targetId).value = d.toISOString().slice(0,10);
}

async function saveScheduleTask(e,id,exists){
  e.preventDefault();
  const fd = new FormData(e.target);

  // Collect deps from form
  const deps = [];
  let i = 0;
  while(fd.has(`depPredId_${i}`)){
    const predId = fd.get(`depPredId_${i}`);
    if(predId){
      deps.push({
        predId,
        type: fd.get(`depType_${i}`) || 'EA',
        lag: parseInt(fd.get(`depLag_${i}`)) || 0,
      });
    }
    i++;
  }

  // Collect multiple reminders
  const reminders = [];
  let ri = 0;
  while(fd.has(`reminderDate_${ri}`)){
    const date = fd.get(`reminderDate_${ri}`);
    const message = fd.get(`reminderMsg_${ri}`) || '';
    if(date) reminders.push({date, message, triggered:false});
    ri++;
  }

  const data = {
    id,
    projectId: fd.get('projectId'),
    name: fd.get('name'),
    start: fd.get('start'),
    end: fd.get('end'),
    duration: parseInt(fd.get('duration'))||0,
    level: parseInt(fd.get('level'))||1,
    assignee: fd.get('assignee'),
    progress: parseInt(fd.get('progress'))||0,
    reminder: reminders[0] || null, // legacy compat
    reminders,
    deps,
  };
  if(exists==='true'||exists===true){
    const existing = state.schedule.find(x=>x.id===id);
    state.schedule = state.schedule.map(x=>x.id===id?{...x,...data,checklist:existing.checklist||[]}:x);
  } else {
    data.checklist = [];
    state.schedule.push(data);
  }
  // Cascade dependencies
  const projectId = data.projectId;
  const projTasks = state.schedule.filter(t=>t.projectId===projectId);
  const cascaded = cascadeSchedule(projTasks);
  state.schedule = state.schedule.filter(t=>t.projectId!==projectId).concat(cascaded);

  await save('schedule');
  closeModal();
  render();
}

async function deleteScheduleTask(id){
  if(!confirm('Vorgang wirklich löschen?')) return;
  state.schedule = state.schedule.filter(t=>t.id!==id);
  await save('schedule');
  render();
}

async function addChecklistItem(taskId){
  const input = document.getElementById('newChkItem');
  const text = input.value.trim();
  if(!text) return;
  const t = state.schedule.find(x=>x.id===taskId);
  if(!t) return;
  if(!t.checklist) t.checklist = [];
  t.checklist.push({id:uid(),text,done:false});
  await save('schedule');
  input.value = '';
  editScheduleTask(taskId); // Modal neu rendern
}

async function removeChecklistItem(taskId, idx){
  const t = state.schedule.find(x=>x.id===taskId);
  if(!t || !t.checklist) return;
  t.checklist.splice(idx,1);
  await save('schedule');
  editScheduleTask(taskId);
}

async function toggleChecklistItem(taskId, idx, done){
  const t = state.schedule.find(x=>x.id===taskId);
  if(!t || !t.checklist || !t.checklist[idx]) return;
  t.checklist[idx].done = done;
  // Fortschritt automatisch aus Checkliste berechnen
  const total = t.checklist.length;
  const doneCount = t.checklist.filter(c=>c.done).length;
  if(total>0) t.progress = Math.round(doneCount/total*100);
  await save('schedule');
  editScheduleTask(taskId);
}


// Exports
window.renderPruefungen = renderPruefungen;
window.editPruefung = editPruefung;
window.savePruefung = savePruefung;
window.deletePruefung = deletePruefung;
window.renderBauzeitplan = renderBauzeitplan;
window.editSchedule = editSchedule;
window.saveSchedule = saveSchedule;
window.deleteSchedule = deleteSchedule;
