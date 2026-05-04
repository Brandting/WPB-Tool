// ============ AUFGABEN & MÄNGEL ============
let taskFilter = {status:'',type:'',priority:''};
function renderAufgaben(){
  let tasks = projectTasks();
  if(taskFilter.status) tasks = tasks.filter(t=>t.status===taskFilter.status);
  if(taskFilter.type) tasks = tasks.filter(t=>t.type===taskFilter.type);
  if(taskFilter.priority) tasks = tasks.filter(t=>t.priority===taskFilter.priority);

  const proj = state.currentProject ? state.projects.find(p=>p.id===state.currentProject) : null;
  const projCard = proj ? `
    <div class="card" style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-left:4px solid var(--primary)">
      <div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:2px">Aktuelles Projekt</div>
        <div style="font-weight:600;font-size:16px;color:var(--primary)">${esc(proj.name)}</div>
        ${proj.client?`<div style="font-size:13px;color:var(--muted)">${esc(proj.client)}</div>`:''}
      </div>
      <button class="btn btn-secondary btn-sm" onclick="currentProjectDetailId='${proj.id}';showView('projekte')">Projektdaten →</button>
    </div>` : '';

  return `
    <div class="page-header">
      <h2>Aufgaben & Mängel</h2>
      <button class="btn" onclick="editTask()" ${state.projects.length===0?'disabled':''}>+ Neue Aufgabe</button>
    </div>
    ${projCard}
    <div class="filters">
      <select onchange="taskFilter.status=this.value;render()">
        <option value="">Alle Status</option>
        <option value="offen" ${taskFilter.status==='offen'?'selected':''}>Offen</option>
        <option value="bearbeitung" ${taskFilter.status==='bearbeitung'?'selected':''}>In Bearbeitung</option>
        <option value="erledigt" ${taskFilter.status==='erledigt'?'selected':''}>Erledigt</option>
      </select>
      <select onchange="taskFilter.type=this.value;render()">
        <option value="">Alle Typen</option>
        <option value="aufgabe" ${taskFilter.type==='aufgabe'?'selected':''}>Aufgabe</option>
        <option value="mangel" ${taskFilter.type==='mangel'?'selected':''}>Mangel</option>
      </select>
      <select onchange="taskFilter.priority=this.value;render()">
        <option value="">Alle Prioritäten</option>
        <option value="hoch" ${taskFilter.priority==='hoch'?'selected':''}>Hoch</option>
        <option value="mittel" ${taskFilter.priority==='mittel'?'selected':''}>Mittel</option>
        <option value="niedrig" ${taskFilter.priority==='niedrig'?'selected':''}>Niedrig</option>
      </select>
    </div>
    ${tasks.length === 0 ? '<div class="card empty"><span class="empty-icon">✅</span>Keine Aufgaben vorhanden</div>' :
    `<table><thead><tr><th>Titel</th><th>Typ</th><th>Gewerk</th><th>Priorität</th><th>Status</th><th>Frist</th><th>Foto</th><th></th></tr></thead><tbody>
    ${tasks.map(t=>`<tr>
      <td><strong>${esc(t.title)}</strong>${t.location?`<br><small style="color:var(--muted)">📍 ${esc(t.location)}</small>`:''}</td>
      <td><span class="badge ${t.type}">${t.type==='mangel'?'Mangel':'Aufgabe'}</span></td>
      <td>${esc(t.trade||'-')}</td>
      <td><span class="badge ${t.priority}">${t.priority}</span></td>
      <td><span class="badge ${t.status}">${t.status}</span></td>
      <td>${fmtDate(t.due)}</td>
      <td>${t.photo?`<img src="${t.photo}" class="photo-thumb">`:'—'}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-secondary" onclick="editTask('${t.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteTask('${t.id}')">🗑️</button>
      </td>
    </tr>`).join('')}
    </tbody></table>`}
  `;
}
function editTask(id){
  if(state.projects.length===0){alert('Bitte zuerst ein Projekt anlegen.');return;}
  const t = id ? state.tasks.find(x=>x.id===id) : {
    id:uid(),title:'',description:'',type:'aufgabe',priority:'mittel',status:'offen',
    trade:'',location:'',assignee:'',due:'',photo:'',
    projectId:state.currentProject||state.projects[0].id,created:new Date().toISOString()
  };
  openModal(`
    <h3>${id?'Aufgabe bearbeiten':'Neue Aufgabe / Mangel'}</h3>
    <form onsubmit="saveTask(event,'${t.id}',${id?'true':'false'})">
      <div class="form-group"><label>Titel *</label><input name="title" required value="${esc(t.title)}"></div>
      <div class="form-group"><label>Beschreibung</label><textarea name="description">${esc(t.description||'')}</textarea></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Projekt</label>
          <select name="projectId">
            ${state.projects.map(p=>`<option value="${p.id}" ${t.projectId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" style="flex:1"><label>Typ</label>
          <select name="type">
            <option value="aufgabe" ${t.type==='aufgabe'?'selected':''}>Aufgabe</option>
            <option value="mangel" ${t.type==='mangel'?'selected':''}>Mangel</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Gewerk</label><input name="trade" value="${esc(t.trade||'')}" placeholder="z.B. Maurer, Elektro"></div>
        <div class="form-group" style="flex:1"><label>Ort / Lage</label><input name="location" value="${esc(t.location||'')}" placeholder="z.B. OG1 Bad"></div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Zuständig</label><input name="assignee" value="${esc(t.assignee||'')}"></div>
        <div class="form-group" style="flex:1"><label>Frist</label><input type="date" name="due" value="${t.due||''}"></div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Priorität</label>
          <select name="priority">
            <option value="hoch" ${t.priority==='hoch'?'selected':''}>Hoch</option>
            <option value="mittel" ${t.priority==='mittel'?'selected':''}>Mittel</option>
            <option value="niedrig" ${t.priority==='niedrig'?'selected':''}>Niedrig</option>
          </select>
        </div>
        <div class="form-group" style="flex:1"><label>Status</label>
          <select name="status">
            <option value="offen" ${t.status==='offen'?'selected':''}>Offen</option>
            <option value="bearbeitung" ${t.status==='bearbeitung'?'selected':''}>In Bearbeitung</option>
            <option value="erledigt" ${t.status==='erledigt'?'selected':''}>Erledigt</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Foto</label><input type="file" accept="image/*" onchange="handlePhoto(event,'taskPhoto')">
        <input type="hidden" name="photo" id="taskPhoto" value="${t.photo||''}">
        ${t.photo?`<img src="${t.photo}" style="margin-top:8px;max-width:120px;border-radius:4px">`:''}
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}
function handlePhoto(e,targetId){
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ev => {
    // Compress via canvas
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 800;
      let w=img.width, h=img.height;
      if(w>max){h=h*max/w;w=max}
      if(h>max){w=w*max/h;h=max}
      canvas.width=w; canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      document.getElementById(targetId).value = canvas.toDataURL('image/jpeg',0.7);
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(f);
}
async function saveTask(e,id,exists){
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = {id, title:fd.get('title'), description:fd.get('description'), type:fd.get('type'),
    priority:fd.get('priority'), status:fd.get('status'), trade:fd.get('trade'), location:fd.get('location'),
    assignee:fd.get('assignee'), due:fd.get('due'), photo:fd.get('photo'), projectId:fd.get('projectId')};
  if(exists==='true' || exists===true){
    state.tasks = state.tasks.map(t=>t.id===id?{...t,...data}:t);
  } else {
    data.created = new Date().toISOString();
    state.tasks.push(data);
  }
  await save('tasks');
  closeModal();
  render();
}
async function deleteTask(id){
  if(!confirm('Aufgabe wirklich löschen?')) return;
  state.tasks = state.tasks.filter(t=>t.id!==id);
  await save('tasks');
  render();
}



// Exports
window.renderAufgaben = renderAufgaben;
window.editTask = editTask;
window.handlePhoto = handlePhoto;
window.saveTask = saveTask;
window.deleteTask = deleteTask;
