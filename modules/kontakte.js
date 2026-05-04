// ============ KONTAKTE ============
let kontaktFilter = {search:'', tags:[]};
let _filteredKontaktIds = [];
let _editingTags = [];
let _mailQueue=[];

function renderKontakte(){
  let contacts = [...state.contacts];
  const allTags = [...new Set(contacts.flatMap(c=>c.tags||[]))].sort();

  if(kontaktFilter.search){
    const s=kontaktFilter.search.toLowerCase();
    contacts=contacts.filter(c=>
      (c.company||'').toLowerCase().includes(s)||
      (c.trade||'').toLowerCase().includes(s)||
      (c.contact||'').toLowerCase().includes(s)||
      (c.email||'').toLowerCase().includes(s)||
      (c.tags||[]).some(t=>t.toLowerCase().includes(s))
    );
  }
  if(kontaktFilter.tags.length>0){
    contacts=contacts.filter(c=>kontaktFilter.tags.some(t=>(c.tags||[]).includes(t)));
  }
  _filteredKontaktIds=contacts.map(c=>c.id);

  const tagFilterHtml=allTags.length===0?'':
    `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;align-items:center">
      <span style="font-size:12px;color:var(--muted)">Tags:</span>
      ${allTags.map(t=>`
        <span onclick="toggleKontaktTag('${esc(t)}')" style="cursor:pointer;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;
          background:${kontaktFilter.tags.includes(t)?'var(--primary)':'var(--surface-2)'};
          color:${kontaktFilter.tags.includes(t)?'#fff':'var(--text)'};
          border:1px solid ${kontaktFilter.tags.includes(t)?'var(--primary)':'var(--border)'}">
          ${esc(t)}
        </span>`).join('')}
      ${kontaktFilter.tags.length>0?`<button class="btn btn-sm btn-secondary" onclick="kontaktFilter.tags=[];render()">× Alle</button>`:''}
    </div>`;

  return `
    <div class="page-header">
      <h2>Firmendatenbank</h2>
      <button class="btn" onclick="editContact()">+ Neuer Kontakt</button>
    </div>
    <div class="filters" style="margin-bottom:10px">
      <input type="text" placeholder="🔍 Firma, Funktion, Tag, E-Mail…"
        oninput="kontaktFilter.search=this.value;render()"
        value="${esc(kontaktFilter.search)}" style="min-width:280px">
    </div>
    ${tagFilterHtml}
    ${contacts.length===0?`<div class="card empty"><span class="empty-icon">👥</span>Keine Kontakte gefunden</div>`:`
    <table>
      <thead><tr>
        <th>Firma</th>
        <th>Tags / Funktion</th>
        <th>Ansprechpartner</th>
        <th>Telefon</th>
        <th>E-Mail</th>
        <th></th>
      </tr></thead>
      <tbody>
      ${contacts.map(c=>`<tr>
        <td>
          <strong>${esc(c.company)}</strong>
          ${c.address?`<br><span style="font-size:11px;color:var(--muted)">${esc(c.address)}</span>`:''}
        </td>
        <td>
          <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
            ${c.trade?`<span class="badge aufgabe" style="font-size:11px">${esc(c.trade)}</span>`:''}
            ${(c.tags||[]).map(t=>`
              <span onclick="toggleKontaktTag('${esc(t)}')" title="Nach '${esc(t)}' filtern"
                style="cursor:pointer;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;
                       background:var(--surface-2);border:1px solid var(--border);color:var(--text)">
                ${esc(t)}
              </span>`).join('')}
          </div>
        </td>
        <td>${esc(c.contact||'')}</td>
        <td>${c.phone?`<a href="tel:${esc(c.phone)}" style="color:var(--text);text-decoration:none">${esc(c.phone)}</a>`:''}</td>
        <td>${c.email?`<a href="mailto:${esc(c.email)}" style="color:var(--primary);text-decoration:none">${esc(c.email)}</a>`:''}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-secondary" onclick="openOutlookMailSingle('${c.id}')" title="E-Mail schreiben" ${!c.email?'disabled':''}>📧</button>
          <button class="btn btn-sm btn-secondary" onclick="editContact('${c.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteContact('${c.id}')">🗑️</button>
        </td>
      </tr>`).join('')}
      </tbody>
    </table>`}
  `;
}

function _renderTagChips(){
  return _editingTags.map((t,i)=>`
    <span style="display:inline-flex;align-items:center;gap:3px;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:var(--primary);color:#fff">
      ${esc(t)}<button type="button" onclick="removeEditTag(${i})" style="background:none;border:none;color:#fff;cursor:pointer;padding:0 0 0 2px;font-size:15px;line-height:1">×</button>
    </span>`).join('');
}
function addEditTag(){
  const inp=document.getElementById('tag-input');
  const val=(inp.value||'').trim();
  if(!val||_editingTags.includes(val)){inp.value='';return;}
  _editingTags.push(val); inp.value='';
  document.getElementById('tag-chips').innerHTML=_renderTagChips();
}
function removeEditTag(idx){
  _editingTags.splice(idx,1);
  document.getElementById('tag-chips').innerHTML=_renderTagChips();
}

function editContact(id){
  const c=id?state.contacts.find(x=>x.id===id):{id:uid(),company:'',trade:'',contact:'',phone:'',email:'',address:'',notes:'',tags:[]};
  _editingTags=[...(c.tags||[])];
  const allTagSuggestions=[...new Set(state.contacts.flatMap(x=>x.tags||[]))].sort();
  openModal(`
    <h3>${id?'Kontakt bearbeiten':'Neuer Kontakt'}</h3>
    <form onsubmit="saveContact(event,'${c.id}',${id?'true':'false'})">
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:2"><label>Firma / Name *</label><input name="company" required value="${esc(c.company)}"></div>
        <div class="form-group" style="flex:1"><label>Gewerk / Funktion</label><input name="trade" value="${esc(c.trade||'')}" placeholder="z.B. Elektriker"></div>
      </div>
      <div class="form-group">
        <label>Tags</label>
        <div id="tag-chips" style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:6px;min-height:8px">${_renderTagChips()}</div>
        <div style="display:flex;gap:6px">
          <input id="tag-input" type="text" placeholder="Tag eingeben + Enter"
            list="tag-sugg" style="flex:1"
            onkeydown="if(event.key==='Enter'){event.preventDefault();addEditTag()}">
          <datalist id="tag-sugg">${allTagSuggestions.map(t=>`<option value="${esc(t)}">`).join('')}</datalist>
          <button type="button" class="btn btn-secondary btn-sm" onclick="addEditTag()">＋</button>
        </div>
      </div>
      <div class="form-group"><label>Ansprechpartner</label><input name="contact" value="${esc(c.contact||'')}"></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Telefon</label><input name="phone" value="${esc(c.phone||'')}"></div>
        <div class="form-group" style="flex:1"><label>E-Mail</label><input type="email" name="email" value="${esc(c.email||'')}"></div>
      </div>
      <div class="form-group"><label>Adresse</label><input name="address" value="${esc(c.address||'')}"></div>
      <div class="form-group"><label>Notizen</label><textarea name="notes">${esc(c.notes||'')}</textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}

async function saveContact(e,id,exists){
  e.preventDefault();
  const fd=new FormData(e.target);
  const data={id,company:fd.get('company'),trade:fd.get('trade'),contact:fd.get('contact'),
    phone:fd.get('phone'),email:fd.get('email'),address:fd.get('address'),notes:fd.get('notes'),
    tags:[..._editingTags]};
  if(exists==='true'||exists===true){
    state.contacts=state.contacts.map(c=>c.id===id?{...c,...data}:c);
  } else {
    state.contacts.push(data);
  }
  await save('contacts');
  closeModal(); render();
}

async function deleteContact(id){
  if(!confirm('Kontakt wirklich löschen?')) return;
  state.contacts=state.contacts.filter(c=>c.id!==id);
  kontaktSelection.delete(id);
  await save('contacts'); render();
}

function toggleKontaktTag(tag){
  const idx=kontaktFilter.tags.indexOf(tag);
  if(idx>=0) kontaktFilter.tags.splice(idx,1); else kontaktFilter.tags.push(tag);
  render();
}

function openOutlookMailSingle(id){
  const c=state.contacts.find(x=>x.id===id); if(!c||!c.email) return;
  _mailQueue=[c.email];
  openModal(`
    <h3>📧 E-Mail an ${esc(c.company)}</h3>
    <div style="margin-bottom:14px;padding:8px 14px;background:var(--surface-2);border-radius:8px;font-size:13px">
      <strong>An:</strong> ${c.contact?esc(c.contact)+' · ':''}${esc(c.email)}
    </div>
    <div class="form-group"><label>Betreff</label><input id="mail-subject" type="text" placeholder="z.B. Anfrage Projekt XY – Angebot erbeten"></div>
    <div class="form-group"><label>Nachricht</label><textarea id="mail-body" style="min-height:150px" placeholder="Sehr geehrte Damen und Herren,…"></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn" onclick="sendOutlookMail()">📧 In Outlook öffnen</button>
    </div>
  `);
}
function sendOutlookMail(){
  const subject=encodeURIComponent(document.getElementById('mail-subject')?.value||'');
  const body=encodeURIComponent(document.getElementById('mail-body')?.value||'');
  closeModal();
  _mailQueue.forEach((email,i)=>{
    setTimeout(()=>{
      const iframe=document.createElement('iframe');
      iframe.style.display='none';
      iframe.src=`mailto:${email}?subject=${subject}&body=${body}`;
      document.body.appendChild(iframe);
      setTimeout(()=>document.body.removeChild(iframe),3000);
    }, i*1000);
  });
}



// Exports
window.renderKontakte = renderKontakte;
window._renderTagChips = _renderTagChips;
window.addEditTag = addEditTag;
window.removeEditTag = removeEditTag;
window.editContact = editContact;
window.saveContact = saveContact;
window.deleteContact = deleteContact;
window.toggleKontaktTag = toggleKontaktTag;
window.openOutlookMailSingle = openOutlookMailSingle;
window.sendOutlookMail = sendOutlookMail;
