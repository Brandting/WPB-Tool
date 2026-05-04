// ============ BAUTAGEBUCH ============
function renderBautagebuch(){
  if(currentBegehungId) return renderBegehungDetail(currentBegehungId);
  const entries = projectDiary().sort((a,b)=>b.date.localeCompare(a.date));
  const noProj = state.projects.length===0;
  return `
    <div class="diary-mobile-header">
      <h2>📔 Bautagebuch</h2>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="document.getElementById('importFieldBTB').click()">📱 Import</button>
        <input type="file" id="importFieldBTB" accept=".json" style="display:none" onchange="mergeFieldImport(event)">
        <button class="btn btn-secondary" onclick="editDiary()" ${noProj?'disabled':''}>+ Neuer Eintrag</button>
        <button class="btn" onclick="editBegehung()" ${noProj?'disabled':''}>+ Neue Begehung</button>
      </div>
    </div>
    ${entries.length === 0 ? '<div class="card empty"><span class="empty-icon">📔</span>Noch keine Einträge</div>' :
    entries.map(d=>{
      const isBegehung = d.type === 'begehung';
      return `
      <div class="card diary-card-mobile">
        <div style="display:flex;justify-content:space-between;align-items:start">
          <div>
            <span class="diary-date">${fmtDate(d.date)}</span>
            <span class="diary-type-badge ${isBegehung?'badge-begehung':'badge-eintrag'}">${isBegehung?'Begehung':'Eintrag'}</span>
            ${d.weather&&!isBegehung?`<span class="diary-meta" style="display:block;margin-top:2px">☁ ${esc(d.weather)}${d.temp?' · '+esc(d.temp)+'°C':''}</span>`:''}
          </div>
          <div class="diary-actions">
            ${isBegehung?`<button class="btn btn-sm btn-secondary" onclick="currentBegehungId='${d.id}';render()">📋 Öffnen</button>`:''}
            <button class="btn btn-sm btn-secondary" onclick="${isBegehung?'editBegehung':'editDiary'}('${d.id}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteDiary('${d.id}')">🗑️</button>
          </div>
        </div>
        ${d.workforce?`<div class="diary-meta" style="margin-top:8px">👥 ${esc(d.workforce)}</div>`:''}
        ${isBegehung&&d.grund?`<div class="diary-meta" style="margin-top:4px">📌 ${esc(d.grund)}</div>`:''}
        ${!isBegehung&&d.work?`<div style="margin-top:6px;font-size:14px"><strong>Arbeiten:</strong> ${esc(d.work).slice(0,120)}${d.work.length>120?'…':''}</div>`:''}
      </div>`;
    }).join('')}
  `;
}

function renderBegehungDetail(id){
  const b = state.diary.find(x=>x.id===id);
  if(!b) return '<div class="card empty">Begehung nicht gefunden</div>';
  const proj = state.projects.find(p=>p.id===b.projectId);
  const erkenntnisse = b.erkenntnisse||[];
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm" onclick="currentBegehungId=null;render()">← Zurück</button>
      <h2 style="color:var(--primary);font-size:22px;margin:0;flex:1">📋 Begehung – ${fmtDate(b.date)}</h2>
      <button class="btn btn-secondary btn-sm" onclick="printBegehung('${id}')">🖨️ Drucken</button>
    </div>
    <div class="card diary-card-mobile" style="margin-bottom:16px">
      <div style="display:grid;gap:5px">
        ${proj?`<div><strong>Projekt:</strong> ${esc(proj.name)}</div>`:''}
        ${b.workforce?`<div><strong>Anwesende:</strong> ${esc(b.workforce)}</div>`:''}
        ${b.grund?`<div><strong>Grund:</strong> ${esc(b.grund)}</div>`:''}
      </div>
    </div>
    <h3 style="margin-bottom:12px;color:var(--text)">Erkenntnisse <span style="color:var(--muted);font-weight:400;font-size:14px">(${erkenntnisse.length})</span></h3>
    ${erkenntnisse.length===0?'<div class="card empty" style="margin-bottom:80px"><span class="empty-icon">🔍</span>Noch keine Erkenntnisse – unten + drücken</div>':''}
    ${erkenntnisse.map((e,i)=>{
      const typCls = e.typ==='Mangel'?'mangel':e.typ==='Info'?'info':'hinweis';
      return `
      <div class="erkenntnis-card">
        <div class="erk-typ-col">
          <span class="badge badge-${typCls} erk-typ-badge-rot">${e.typ||'—'}</span>
        </div>
        <div class="erk-vdivider"></div>
        <div class="erk-img-col">
          ${e.foto
            ? `<img src="${e.foto}" alt="Foto">`
            : `<div class="erk-no-photo">📷<br>Kein Foto</div>`}
        </div>
        <div class="erk-text-col">${esc(e.beschreibung||'').replace(/\n/g,'<br>')}</div>
        <div class="erk-actions-col">
          <button class="btn btn-secondary" onclick="editErkenntnis('${id}',${i})" style="flex:1;width:100%;font-size:20px;border-radius:0;border:none;border-bottom:1px solid var(--border)">✏️</button>
          <button class="btn btn-danger" onclick="deleteErkenntnis('${id}',${i})" style="flex:1;width:100%;font-size:20px;border-radius:0;border:none">🗑️</button>
        </div>
      </div>`;
    }).join('')}
    <div style="height:80px"></div>
    <button class="begehung-detail-fab" onclick="addErkenntnis('${id}')" title="Neue Erkenntnis">+</button>
  `;
}

function editDiary(id){
  if(state.projects.length===0){alert('Bitte zuerst ein Projekt anlegen.');return;}
  const d = id ? state.diary.find(x=>x.id===id) : {
    id:uid(),date:today(),weather:'',temp:'',workforce:'',work:'',notes:'',
    projectId:state.currentProject||state.projects[0].id
  };
  openModal(`
    <h3>${id?'Eintrag bearbeiten':'Neuer Bautagebuch-Eintrag'}</h3>
    <form onsubmit="saveDiary(event,'${d.id}',${id?'true':'false'})">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:120px"><label>Datum *</label><input type="date" name="date" required value="${d.date}"></div>
        <div class="form-group" style="flex:1;min-width:120px"><label>Projekt</label>
          <select name="projectId">
            ${state.projects.map(p=>`<option value="${p.id}" ${d.projectId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:120px"><label>Wetter</label><input name="weather" value="${esc(d.weather||'')}" placeholder="sonnig, regnerisch …"></div>
        <div class="form-group" style="flex:1;min-width:80px"><label>Temperatur (°C)</label><input name="temp" value="${esc(d.temp||'')}"></div>
      </div>
      <div class="form-group"><label>Personal / Anwesende</label><input name="workforce" value="${esc(d.workforce||'')}" placeholder="z.B. 5 Maurer, 2 Hilfskräfte"></div>
      <div class="form-group"><label>Ausgeführte Arbeiten</label><textarea name="work" rows="3">${esc(d.work||'')}</textarea></div>
      <div class="form-group"><label>Bemerkungen / Besondere Vorkommnisse</label><textarea name="notes" rows="3">${esc(d.notes||'')}</textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}

function editBegehung(id){
  if(state.projects.length===0){alert('Bitte zuerst ein Projekt anlegen.');return;}
  const b = id ? state.diary.find(x=>x.id===id) : {
    id:uid(), type:'begehung', date:today(), workforce:'', grund:'', erkenntnisse:[],
    projectId:state.currentProject||state.projects[0].id
  };
  openModal(`
    <h3>${id?'Begehung bearbeiten':'Neue Begehung'}</h3>
    <form onsubmit="saveBegehung(event,'${b.id}',${id?'true':'false'})">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="form-group" style="flex:1;min-width:120px"><label>Datum *</label><input type="date" name="date" required value="${b.date}"></div>
        <div class="form-group" style="flex:1;min-width:120px"><label>Projekt</label>
          <select name="projectId">
            ${state.projects.map(p=>`<option value="${p.id}" ${b.projectId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Anwesende</label><input name="workforce" value="${esc(b.workforce||'')}" placeholder="z.B. Bauleiter, Fachplaner, AN"></div>
      <div class="form-group"><label>Grund der Besichtigung</label><textarea name="grund" rows="3" placeholder="Worum geht es bei dieser Begehung?">${esc(b.grund||'')}</textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}

async function saveBegehung(e,id,exists){
  e.preventDefault();
  const fd = new FormData(e.target);
  const existing = state.diary.find(x=>x.id===id);
  const data = {
    id, type:'begehung',
    date:fd.get('date'),
    workforce:fd.get('workforce'),
    grund:fd.get('grund'),
    projectId:fd.get('projectId'),
    erkenntnisse: existing?.erkenntnisse||[]
  };
  if(exists==='true'||exists===true){
    state.diary = state.diary.map(d=>d.id===id?{...d,...data}:d);
  } else {
    state.diary.push(data);
  }
  await save('diary');
  closeModal();
  render();
}

function addErkenntnis(begehungId){
  const eid = uid();
  openModal(`
    <h3 style="margin-bottom:14px">Neue Erkenntnis</h3>
    <input type="file" id="photoInput_${eid}" accept="image/*" capture="environment" style="display:none" onchange="previewErkPhoto('${eid}')">
    <div style="display:flex;gap:14px;align-items:stretch">
      <div style="width:150px;flex-shrink:0;display:flex;flex-direction:column;gap:10px">
        <div id="photoCaptureArea_${eid}"
          onclick="document.getElementById('photoInput_${eid}').click()"
          style="height:150px;border:2px dashed var(--border);border-radius:12px;
                 background:var(--surface-2);cursor:pointer;display:flex;
                 align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
          <div style="text-align:center;color:var(--muted);font-size:13px;padding:8px">
            <span style="font-size:32px;display:block;margin-bottom:4px">📷</span>Foto aufnehmen
          </div>
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px;display:block">TYP</label>
          <select id="erkTyp_${eid}" style="width:100%;padding:9px 10px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text)">
            <option>Mangel</option>
            <option>Info</option>
            <option>Hinweis</option>
          </select>
        </div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column">
        <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px;display:block">BESCHREIBUNG</label>
        <textarea id="erkDesc_${eid}" placeholder="Beschreibe die Erkenntnis …"
          style="flex:1;min-height:190px;font-size:15px;resize:none;
                 border:1px solid var(--border);border-radius:10px;
                 padding:10px 12px;background:var(--card);color:var(--text);font-family:inherit;line-height:1.5"></textarea>
      </div>
    </div>
    <div class="modal-actions" style="margin-top:14px">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button type="button" class="btn" onclick="saveErkenntnis('${begehungId}','${eid}')">💾 Speichern</button>
    </div>
  `);
}

function compressImage(file, maxW, maxH, quality){
  return new Promise(resolve=>{
    const reader = new FileReader();
    reader.onload = ev=>{
      const img = new Image();
      img.onload = ()=>{
        let w=img.width, h=img.height;
        const ratio = Math.min(maxW/w, maxH/h, 1);
        w=Math.round(w*ratio); h=Math.round(h*ratio);
        const canvas=document.createElement('canvas');
        canvas.width=w; canvas.height=h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}
// Komprimiert auf ca. 0,5 MB base64 (longest side 1200px, q=0.78)
function compressPhoto(file){ return compressImage(file, 1200, 1200, 0.78); }

function previewErkPhoto(eid){
  const input = document.getElementById('photoInput_'+eid);
  const area = document.getElementById('photoCaptureArea_'+eid);
  if(!input||!area||!input.files[0]) return;
  compressPhoto(input.files[0]).then(dataUrl=>{
    area.innerHTML = `<img src="${dataUrl}" alt="Foto" style="width:100%;height:100%;object-fit:contain;display:block">`;
    input._compressed = dataUrl;
  });
}

async function saveErkenntnis(begehungId, eid){
  const input = document.getElementById('photoInput_'+eid);
  const desc = document.getElementById('erkDesc_'+eid)?.value||'';
  const typ = document.getElementById('erkTyp_'+eid)?.value||'Info';
  const b = state.diary.find(x=>x.id===begehungId);
  if(!b) return;

  const originalFile = input?.files[0] || null;

  const doSave = async (fotoData) => {
    const erk = { id:eid, typ, beschreibung:desc, foto:fotoData||'' };
    b.erkenntnisse = [...(b.erkenntnisse||[]), erk];
    state.diary = state.diary.map(d=>d.id===begehungId?b:d);
    await save('diary');
    closeModal();
    render();
  };

  if(input&&input._compressed){
    await doSave(input._compressed);
  } else if(originalFile){
    await doSave(await compressPhoto(originalFile));
  } else {
    await doSave('');
  }
}

function editErkenntnis(begehungId, idx){
  const b = state.diary.find(x=>x.id===begehungId);
  if(!b) return;
  const e = (b.erkenntnisse||[])[idx];
  if(!e) return;
  const eid = e.id||uid();
  openModal(`
    <h3 style="margin-bottom:14px">Erkenntnis bearbeiten</h3>
    <input type="file" id="photoInput_${eid}" accept="image/*" capture="environment" style="display:none" onchange="previewErkPhoto('${eid}')">
    <div style="display:flex;gap:14px;align-items:stretch">
      <div style="width:150px;flex-shrink:0;display:flex;flex-direction:column;gap:10px">
        <div id="photoCaptureArea_${eid}"
          onclick="document.getElementById('photoInput_${eid}').click()"
          style="height:150px;border:2px dashed var(--border);border-radius:12px;
                 background:var(--surface-2);cursor:pointer;display:flex;
                 align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
          ${e.foto
            ? `<img src="${e.foto}" style="width:100%;height:100%;object-fit:contain;display:block">`
            : `<div style="text-align:center;color:var(--muted);font-size:13px;padding:8px"><span style="font-size:32px;display:block;margin-bottom:4px">📷</span>Foto aufnehmen</div>`}
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px;display:block">TYP</label>
          <select id="erkTyp_${eid}" style="width:100%;padding:9px 10px;font-size:14px;border-radius:8px;border:1px solid var(--border);background:var(--card);color:var(--text)">
            <option ${e.typ==='Mangel'?'selected':''}>Mangel</option>
            <option ${e.typ==='Info'?'selected':''}>Info</option>
            <option ${e.typ==='Hinweis'?'selected':''}>Hinweis</option>
          </select>
        </div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column">
        <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:4px;display:block">BESCHREIBUNG</label>
        <textarea id="erkDesc_${eid}" placeholder="Beschreibe die Erkenntnis …"
          style="flex:1;min-height:190px;font-size:15px;resize:none;
                 border:1px solid var(--border);border-radius:10px;
                 padding:10px 12px;background:var(--card);color:var(--text);font-family:inherit;line-height:1.5">${esc(e.beschreibung||'')}</textarea>
      </div>
    </div>
    <div class="modal-actions" style="margin-top:14px">
      <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button type="button" class="btn" onclick="updateErkenntnis('${begehungId}',${idx},'${eid}')">💾 Speichern</button>
    </div>
  `);
}

async function updateErkenntnis(begehungId, idx, eid){
  const input = document.getElementById('photoInput_'+eid);
  const desc = document.getElementById('erkDesc_'+eid)?.value||'';
  const typ = document.getElementById('erkTyp_'+eid)?.value||'Info';
  const b = state.diary.find(x=>x.id===begehungId);
  if(!b) return;
  const existing = (b.erkenntnisse||[])[idx];
  const originalFile = input?.files[0] || null;

  const doUpdate = async (fotoData) => {
    b.erkenntnisse[idx] = { ...existing, typ, beschreibung:desc, foto:fotoData };
    state.diary = state.diary.map(d=>d.id===begehungId?b:d);
    await save('diary');
    closeModal();
    render();
  };

  if(input&&input._compressed){
    await doUpdate(input._compressed);
  } else if(originalFile){
    await doUpdate(await compressPhoto(originalFile));
  } else {
    await doUpdate(existing?.foto||'');
  }
}

async function deleteErkenntnis(begehungId, idx){
  if(!confirm('Erkenntnis löschen?')) return;
  const b = state.diary.find(x=>x.id===begehungId);
  if(!b) return;
  b.erkenntnisse = (b.erkenntnisse||[]).filter((_,i)=>i!==idx);
  state.diary = state.diary.map(d=>d.id===begehungId?b:d);
  await save('diary');
  render();
}

function printBegehung(id){
  const b = state.diary.find(x=>x.id===id);
  if(!b) return;
  const proj = state.projects.find(p=>p.id===b.projectId);
  const erkenntnisse = b.erkenntnisse||[];

  // ---- Hilfsfunktionen ----
  const esc2 = s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtD = d=>d?new Date(d).toLocaleDateString('de-DE'):'';
  const typColor = t=>t==='Mangel'?'#dc2626':t==='Info'?'#2563eb':'#d97706';
  const typBg   = t=>t==='Mangel'?'#fee2e2':t==='Info'?'#dbeafe':'#fef9c3';

  // Slots: [0] = Projektinfo, [1..n] = Erkenntnisse
  // Erste Seite: 5 Slots (Projektinfo + 4 Erkenntnisse)
  // Folgeseiten: je 5 Erkenntnisse
  const SLOTS_PER_PAGE = 5;
  const FIRST_PAGE_ERK = 4; // auf Seite 1 passen 4 Erkenntnisse + 1 Projektblock

  // Erzeuge Array aller Seitenslots
  // Seite 1: [info, erk0, erk1, erk2, erk3]
  // Seite 2: [erk4, erk5, erk6, erk7, erk8]  usw.
  let pages = [];
  // Seite 1
  let p1 = [{type:'info'}];
  for(let i=0;i<FIRST_PAGE_ERK&&i<erkenntnisse.length;i++) p1.push({type:'erk',e:erkenntnisse[i],idx:i});
  while(p1.length<SLOTS_PER_PAGE) p1.push({type:'empty'});
  pages.push(p1);
  // Folgeseiten
  for(let i=FIRST_PAGE_ERK;i<erkenntnisse.length;i+=SLOTS_PER_PAGE){
    let pg=[];
    for(let j=0;j<SLOTS_PER_PAGE&&(i+j)<erkenntnisse.length;j++) pg.push({type:'erk',e:erkenntnisse[i+j],idx:i+j});
    while(pg.length<SLOTS_PER_PAGE) pg.push({type:'empty'});
    pages.push(pg);
  }

  const slotHtml = (slot,pageIdx,slotIdx)=>{
    if(slot.type==='empty') return `<div class="slot empty-slot"></div>`;
    if(slot.type==='info') return `
      <div class="slot info-slot">
        <div class="slot-inner">
          <div class="info-title">Begehungsprotokoll</div>
          <table class="info-table">
            <tr><td class="info-label">Datum</td><td>${fmtD(b.date)}</td></tr>
            ${proj?`<tr><td class="info-label">Projekt</td><td>${esc2(proj.name)}</td></tr>`:''}
            ${b.workforce?`<tr><td class="info-label">Anwesende</td><td>${esc2(b.workforce)}</td></tr>`:''}
            ${b.grund?`<tr><td class="info-label">Grund</td><td>${esc2(b.grund)}</td></tr>`:''}
            <tr><td class="info-label">Erkenntnisse</td><td>${erkenntnisse.length} gesamt</td></tr>
          </table>
        </div>
      </div>`;
    const e=slot.e;
    const nr=slot.idx+1;
    const tBg = typBg(e.typ), tCol = typColor(e.typ);
    return `
      <div class="slot erk-slot">
        <div class="erk-slot-inner">
          <div class="p-typ-col">
            <span class="p-typ-badge" style="background:${tBg};color:${tCol}">${e.typ||'—'}</span>
          </div>
          <div class="p-vdiv"></div>
          <div class="p-img-col">
            ${e.foto?`<img src="${e.foto}" class="p-img">`:'<div class="p-no-photo">Kein Foto</div>'}
          </div>
          <div class="p-desc-col">${esc2(e.beschreibung||'').replace(/\n/g,'<br>')}</div>
          <div class="p-nr-col">#${nr}</div>
        </div>
      </div>`;
  };

  const pagesHtml = pages.map((page,pi)=>`
    <div class="print-page">
      <div class="page-header-bar">
        <span>${proj?esc2(proj.name):'Begehung'} · ${fmtD(b.date)}</span>
        <span>Seite ${pi+1} / ${pages.length}</span>
      </div>
      <div class="slots-grid">
        ${page.map((slot,si)=>slotHtml(slot,pi,si)).join('')}
      </div>
    </div>
  `).join('');

  const html=`<!DOCTYPE html>
<html lang="de"><head>
<meta charset="UTF-8">
<title>Begehung ${fmtD(b.date)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif}
  @page{size:A4 portrait;margin:10mm}
  body{background:#fff;color:#111}
  .print-page{
    width:190mm;height:277mm;
    display:flex;flex-direction:column;
    page-break-after:always;
    overflow:hidden;
  }
  .print-page:last-child{page-break-after:auto}
  .page-header-bar{
    display:flex;justify-content:space-between;align-items:center;
    font-size:8pt;color:#555;border-bottom:1px solid #ccc;
    padding-bottom:3mm;margin-bottom:3mm;flex-shrink:0;
  }
  .slots-grid{
    flex:1;display:flex;flex-direction:column;gap:3mm;
    overflow:hidden;
  }
  .slot{
    flex:1;min-height:0;border:1px solid #ddd;border-radius:4px;
    overflow:hidden;display:flex;
  }
  .empty-slot{background:#f8f8f8;border-style:dashed}
  /* INFO SLOT */
  .info-slot{background:#f0f4ff;border-color:#4f46e5}
  .slot-inner{
    flex:1;display:flex;flex-direction:column;padding:3mm 4mm;
    overflow:hidden;min-height:0;
  }
  .info-title{font-size:12pt;font-weight:700;color:#4f46e5;margin-bottom:3mm}
  .info-table{width:100%;border-collapse:collapse;font-size:9pt}
  .info-table td{padding:1.5mm 2mm;vertical-align:top}
  .info-label{color:#555;width:28mm;font-weight:600}
  /* ERK SLOT – horizontal layout */
  .erk-slot-inner{
    flex:1;display:flex;flex-direction:row;align-items:stretch;
    overflow:hidden;
  }
  .p-typ-col{
    width:14mm;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    padding:2mm 0;
  }
  .p-typ-badge{
    writing-mode:vertical-lr;transform:rotate(180deg);
    padding:2.5mm 2mm;border-radius:3px;
    font-size:7.5pt;font-weight:800;letter-spacing:0.8px;
    text-transform:uppercase;white-space:nowrap;
  }
  .p-vdiv{width:0.3mm;background:#ddd;flex-shrink:0;margin:3mm 0}
  .p-img-col{
    width:46mm;flex-shrink:0;
    background:#f5f5f5; border-right:0.3mm solid #e0e0e0;
    margin:2mm 2mm 2mm 0;
    border-radius:2mm;border:0.3mm solid #ddd;
    display:flex;align-items:center;justify-content:center;
    overflow:hidden;
  }
  .p-img{
    max-width:100%;max-height:100%;
    object-fit:contain;display:block;
  }
  .p-no-photo{font-size:7pt;color:#aaa;text-align:center;padding:2mm}
  .p-desc-col{
    flex:1;padding:3mm 3mm;
    font-size:8pt;line-height:1.45;color:#222;
    overflow:hidden;word-break:break-word;
    border-right:0.3mm solid #eee;
  }
  .p-nr-col{
    width:8mm;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;
    font-size:7.5pt;color:#bbb;font-weight:700;
    writing-mode:vertical-lr;
  }
</style>
</head><body>
${pagesHtml}
<script>window.onload=()=>window.print()<\/script>
</body></html>`;

  const w=window.open('','_blank');
  w.document.write(html);
  w.document.close();
}

async function saveDiary(e,id,exists){
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = {id,date:fd.get('date'),weather:fd.get('weather'),temp:fd.get('temp'),
    workforce:fd.get('workforce'),work:fd.get('work'),notes:fd.get('notes'),projectId:fd.get('projectId')};
  if(exists==='true' || exists===true){
    state.diary = state.diary.map(d=>d.id===id?{...d,...data}:d);
  } else {
    state.diary.push(data);
  }
  await save('diary');
  closeModal();
  render();
}
async function deleteDiary(id){
  if(!confirm('Eintrag wirklich löschen?')) return;
  state.diary = state.diary.filter(d=>d.id!==id);
  await save('diary');
  render();
}



// Exports
window.renderBautagebuch = renderBautagebuch;
window.renderBegehungDetail = renderBegehungDetail;
window.editDiary = editDiary;
window.editBegehung = editBegehung;
window.saveBegehung = saveBegehung;
window.addErkenntnis = addErkenntnis;
window.compressImage = compressImage;
window.compressPhoto = compressPhoto;
window.previewErkPhoto = previewErkPhoto;
window.saveErkenntnis = saveErkenntnis;
window.editErkenntnis = editErkenntnis;
window.updateErkenntnis = updateErkenntnis;
window.deleteErkenntnis = deleteErkenntnis;
window.printBegehung = printBegehung;
window.saveDiary = saveDiary;
window.deleteDiary = deleteDiary;
