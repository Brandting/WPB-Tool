// ============================================================================
// PRÜFUNGEN — Inspections / Tests (Verdichtung, etc.)
// Aufgeteilt aus alter pruefungen.js am 2026-05-05.
// ============================================================================

// ============ PRÜFUNGEN ============
function projectPruefungen(){
  return state.pruefungen.filter(p=>!state.currentProject||p.projectId===state.currentProject);
}

let pruefFilter={type:'',status:''};

function renderPruefungen(){
  let items=projectPruefungen();
  if(pruefFilter.type) items=items.filter(p=>p.type===pruefFilter.type);
  if(pruefFilter.status) items=items.filter(p=>p.status===pruefFilter.status);
  items=items.sort((a,b)=>(a.plannedDate||'').localeCompare(b.plannedDate||''));

  const statusBadge=s=>{
    const map={geplant:'bearbeitung',durchgefuehrt:'niedrig',bestanden:'erledigt',nicht_bestanden:'hoch'};
    const label={geplant:'Geplant',durchgefuehrt:'Durchgeführt',bestanden:'Bestanden',nicht_bestanden:'Nicht bestanden'};
    return badge(label[s]||s, map[s]||'');
  };

  return `
    <div class="page-header">
      <h2>🔬 Prüfungen</h2>
      <button class="btn" onclick="editPruefung()" ${state.projects.length===0?'disabled':''}>+ Neue Prüfung</button>
    </div>
    <div class="filters">
      <select onchange="pruefFilter.type=this.value;render()">
        <option value="">Alle Typen</option>
        ${PRUEFUNG_TYPES.map(t=>`<option ${pruefFilter.type===t?'selected':''}>${esc(t)}</option>`).join('')}
      </select>
      <select onchange="pruefFilter.status=this.value;render()">
        <option value="">Alle Status</option>
        <option value="geplant" ${pruefFilter.status==='geplant'?'selected':''}>Geplant</option>
        <option value="durchgefuehrt" ${pruefFilter.status==='durchgefuehrt'?'selected':''}>Durchgeführt</option>
        <option value="bestanden" ${pruefFilter.status==='bestanden'?'selected':''}>Bestanden</option>
        <option value="nicht_bestanden" ${pruefFilter.status==='nicht_bestanden'?'selected':''}>Nicht bestanden</option>
      </select>
    </div>
    ${items.length===0?'<div class="card empty"><span class="empty-icon">🔬</span>Noch keine Prüfungen erfasst.</div>':
    `<table><thead><tr>
      <th>Prüfung</th><th>Typ</th><th>Gewerk</th><th>Projekt</th>
      <th>Geplant</th><th>Durchgeführt</th><th>Status</th><th>Ergebnis</th><th></th>
    </tr></thead><tbody>
    ${items.map(p=>{
      const proj=state.projects.find(x=>x.id===p.projectId);
      return `<tr>
        <td><strong>${esc(p.name)}</strong>${p.notes?`<br><small style="color:var(--muted)">📝 ${esc(p.notes)}</small>`:''}</td>
        <td style="font-size:12px">${esc(p.type||'—')}</td>
        <td>${esc(p.gewerk||'—')}</td>
        <td>${esc(proj?.name||'—')}</td>
        <td>${fmtDate(p.plannedDate)}</td>
        <td>${fmtDate(p.actualDate)}</td>
        <td>${statusBadge(p.status)}</td>
        <td style="font-size:12px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.ergebnis||'—')}</td>
        <td class="actions-cell">${actionButtons(p.id,{edit:'editPruefung',del:'deletePruefung'})}</td>
      </tr>`;
    }).join('')}
    </tbody></table>`}
  `;
}

function editPruefung(id){
  if(state.projects.length===0){alert('Bitte zuerst ein Projekt anlegen.');return;}
  const p=id?state.pruefungen.find(x=>x.id===id):{
    id:uid(),name:'',type:PRUEFUNG_TYPES[0],gewerk:'',
    projectId:state.currentProject||state.projects[0]?.id,
    plannedDate:'',actualDate:'',status:'geplant',ergebnis:'',notes:'',
    created:new Date().toISOString()
  };
  openModal(`
    <h3>${id?'Prüfung bearbeiten':'Neue Prüfung'}</h3>
    <form onsubmit="savePruefung(event,'${p.id}',${id?'true':'false'})">
      <div class="form-group"><label>Bezeichnung *</label><input name="name" required value="${esc(p.name)}" placeholder="z.B. Verdichtungsprüfung KW 24 Süd"></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:2"><label>Prüftyp</label>
          <select name="type">
            ${PRUEFUNG_TYPES.map(t=>`<option ${p.type===t?'selected':''}>${esc(t)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex:1"><label>Projekt</label>
          <select name="projectId">
            ${state.projects.map(x=>`<option value="${x.id}" ${p.projectId===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Gewerk / Firma</label><input name="gewerk" value="${esc(p.gewerk||'')}" placeholder="z.B. Tiefbau Müller GmbH"></div>
        <div class="form-group" style="flex:1"><label>Status</label>
          <select name="status">
            <option value="geplant" ${p.status==='geplant'?'selected':''}>Geplant</option>
            <option value="durchgefuehrt" ${p.status==='durchgefuehrt'?'selected':''}>Durchgeführt</option>
            <option value="bestanden" ${p.status==='bestanden'?'selected':''}>Bestanden</option>
            <option value="nicht_bestanden" ${p.status==='nicht_bestanden'?'selected':''}>Nicht bestanden</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Geplantes Datum</label><input type="date" name="plannedDate" value="${p.plannedDate||''}"></div>
        <div class="form-group" style="flex:1"><label>Durchgeführt am</label><input type="date" name="actualDate" value="${p.actualDate||''}"></div>
      </div>
      <div class="form-group"><label>Ergebnis / Messwert</label><input name="ergebnis" value="${esc(p.ergebnis||'')}" placeholder="z.B. Ev = 45 MN/m², OK"></div>
      <div class="form-group"><label>Bemerkungen</label><textarea name="notes">${esc(p.notes||'')}</textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}

async function savePruefung(e,id,exists){
  e.preventDefault();
  const fd=new FormData(e.target);
  const data={id,name:fd.get('name'),type:fd.get('type'),gewerk:fd.get('gewerk'),
    projectId:fd.get('projectId'),status:fd.get('status'),
    plannedDate:fd.get('plannedDate'),actualDate:fd.get('actualDate'),
    ergebnis:fd.get('ergebnis'),notes:fd.get('notes')};
  if(exists==='true'||exists===true){
    state.pruefungen=state.pruefungen.map(p=>p.id===id?{...p,...data}:p);
  } else {
    data.created=new Date().toISOString();
    state.pruefungen.push(data);
  }
  await save('pruefungen'); closeModal(); render();
}

async function deletePruefung(id){
  const pr=state.pruefungen.find(x=>x.id===id);
  if(!confirm(`Prüfung „${pr?.name||'?'}" löschen?`)) return;
  state.pruefungen=state.pruefungen.filter(p=>p.id!==id);
  await save('pruefungen'); render();
}


