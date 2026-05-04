// ============ PREISDATENBANK ============
// Quantilberechnung mit linearer Interpolation
function quantile(values, q){
  if(!values || values.length===0) return 0;
  const sorted = [...values].sort((a,b)=>a-b);
  if(sorted.length===1) return sorted[0];
  const pos = (sorted.length-1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  if(lo===hi) return sorted[lo];
  return sorted[lo] + (sorted[hi]-sorted[lo]) * (pos-lo);
}
function fmtEur(n){
  return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n||0);
}
function priceStats(item){
  const prices = (item.history||[]).map(h=>h.price).filter(p=>!isNaN(p));
  if(prices.length===0) return {n:0,min:0,max:0,avg:0,median:0};
  return {
    n: prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: prices.reduce((a,b)=>a+b,0)/prices.length,
    median: quantile(prices,0.5)
  };
}

let priceFilter = {category:'',search:''};
function renderPreiseContent(){
  let items = [...state.priceItems];
  if(priceFilter.category) items = items.filter(i=>i.category===priceFilter.category);
  if(priceFilter.search){
    const s = priceFilter.search.toLowerCase();
    items = items.filter(i => i.name.toLowerCase().includes(s));
  }
  const categories = [...new Set(state.priceItems.map(i=>i.category).filter(Boolean))].sort();

  return `
    <div class="card" style="margin-bottom:16px;background:#f0f7ff;border-color:#bfdbfe">
      <div style="font-size:13px;color:var(--text)">
        💡 <strong>So funktioniert's:</strong> Lege hier Positionen an (z.B. „Estrich verlegen"). Zu jeder Position trägst du <strong>historische Preise aus alten Projekten</strong> ein. In der <strong>Preisdatenbank</strong> kannst du per Quantil-Schieberegler auswählen, ob du günstige (0%), mittlere (50%) oder teure (100%) Preise verwenden willst.
      </div>
    </div>
    <div class="filters">
      <input type="text" placeholder="🔍 Position suchen…" oninput="priceFilter.search=this.value;render()" value="${esc(priceFilter.search)}">
      <select onchange="priceFilter.category=this.value;render()">
        <option value="">Alle Kategorien</option>
        ${categories.map(c=>`<option ${priceFilter.category===c?'selected':''}>${esc(c)}</option>`).join('')}
      </select>
    </div>
    ${items.length===0 ? '<div class="card empty"><span class="empty-icon">💰</span>Noch keine Preispositionen erfasst</div>' :
    `<table><thead><tr>
      <th>Position</th><th>Kategorie</th><th>Einheit</th>
      <th style="text-align:right">Anzahl</th>
      <th style="text-align:right">Min</th>
      <th style="text-align:right">Median</th>
      <th style="text-align:right">Ø</th>
      <th style="text-align:right">Max</th>
      <th></th>
    </tr></thead><tbody>
    ${items.map(it=>{const s=priceStats(it);return `<tr>
      <td><strong>${esc(it.name)}</strong></td>
      <td>${esc(it.category||'-')}</td>
      <td>${esc(it.unit||'')}</td>
      <td style="text-align:right">${s.n}</td>
      <td style="text-align:right">${s.n?fmtEur(s.min):'-'}</td>
      <td style="text-align:right;font-weight:600">${s.n?fmtEur(s.median):'-'}</td>
      <td style="text-align:right">${s.n?fmtEur(s.avg):'-'}</td>
      <td style="text-align:right">${s.n?fmtEur(s.max):'-'}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-secondary" onclick="managePrices('${it.id}')" title="Preise verwalten">💲</button>
        <button class="btn btn-sm btn-secondary" onclick="editPriceItem('${it.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deletePriceItem('${it.id}')">🗑️</button>
      </td>
    </tr>`}).join('')}
    </tbody></table>`}
  `;
}
function editPriceItem(id){
  const it = id ? state.priceItems.find(x=>x.id===id) : {id:uid(),name:'',category:'',unit:'m²',history:[],notes:''};
  openModal(`
    <h3>${id?'Position bearbeiten':'Neue Preisposition'}</h3>
    <form onsubmit="savePriceItem(event,'${it.id}',${id?'true':'false'})">
      <div class="form-group"><label>Bezeichnung *</label><input name="name" required value="${esc(it.name)}" placeholder="z.B. Estrich verlegen"></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:2"><label>Kategorie / Gewerk</label><input name="category" value="${esc(it.category||'')}" placeholder="z.B. Estrich, Maurer, Elektro" list="catList">
          <datalist id="catList">
            ${[...new Set(state.priceItems.map(i=>i.category).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('')}
          </datalist>
        </div>
        <div class="form-group" style="flex:1"><label>Einheit *</label>
          <select name="unit">
            ${['m²','m³','lfm','Stk','h','Tag','psch','kg','t'].map(u=>`<option ${it.unit===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-group"><label>Notizen</label><textarea name="notes">${esc(it.notes||'')}</textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}
async function savePriceItem(e,id,exists){
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = {id,name:fd.get('name'),category:fd.get('category'),unit:fd.get('unit'),notes:fd.get('notes')};
  if(exists==='true' || exists===true){
    state.priceItems = state.priceItems.map(i=>i.id===id?{...i,...data}:i);
  } else {
    data.history = [];
    state.priceItems.push(data);
  }
  await save('priceItems');
  closeModal();
  if(!exists || exists==='false') managePrices(id); else render();
}
async function deletePriceItem(id){
  if(!confirm('Position samt aller hinterlegten Preise löschen?')) return;
  state.priceItems = state.priceItems.filter(i=>i.id!==id);
  await save('priceItems');
  render();
}
function managePrices(itemId){
  const it = state.priceItems.find(x=>x.id===itemId);
  if(!it) return;
  const hist = (it.history||[]).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const s = priceStats(it);
  openModal(`
    <h3>${esc(it.name)} <span style="font-size:13px;color:var(--muted);font-weight:400">(${esc(it.unit)})</span></h3>
    ${s.n>0?`<div style="background:#f8fafc;padding:12px;border-radius:6px;margin-bottom:14px;font-size:13px">
      <strong>${s.n} Preise</strong> • Min ${fmtEur(s.min)} • Median ${fmtEur(s.median)} • Ø ${fmtEur(s.avg)} • Max ${fmtEur(s.max)}
    </div>`:''}
    <h4 style="margin-bottom:8px;color:var(--primary)">Neuen Preis hinzufügen</h4>
    <form onsubmit="addPrice(event,'${itemId}')" style="background:#f0f7ff;padding:12px;border-radius:6px;margin-bottom:16px">
      <div style="display:flex;gap:8px">
        <div class="form-group" style="flex:1;margin:0"><label style="font-size:11px">Preis (€/${esc(it.unit)}) *</label><input type="number" step="0.01" name="price" required></div>
        <div class="form-group" style="flex:1;margin:0"><label style="font-size:11px">Datum</label><input type="date" name="date" value="${today()}"></div>
      </div>
      <div class="form-group" style="margin-top:8px;margin-bottom:0"><label style="font-size:11px">Projekt / Quelle</label><input name="source" placeholder="z.B. Wohnhaus Müller 2023"></div>
      <button type="submit" class="btn btn-sm" style="margin-top:8px">+ Hinzufügen</button>
    </form>
    <h4 style="margin-bottom:8px;color:var(--primary)">Historie (${hist.length})</h4>
    ${hist.length===0?'<p style="color:var(--muted);font-size:13px">Noch keine Preise erfasst.</p>':
    `<table style="font-size:13px"><thead><tr><th>Datum</th><th>Quelle</th><th style="text-align:right">Preis</th><th></th></tr></thead><tbody>
    ${hist.map(h=>`<tr>
      <td>${fmtDate(h.date)}</td>
      <td>${esc(h.source||'-')}</td>
      <td style="text-align:right;font-weight:600">${fmtEur(h.price)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="removePrice('${itemId}','${h.id}')">×</button></td>
    </tr>`).join('')}
    </tbody></table>`}
    <div class="modal-actions">
      <button class="btn" onclick="closeModal()">Fertig</button>
    </div>
  `);
}
async function addPrice(e,itemId){
  e.preventDefault();
  const fd = new FormData(e.target);
  const it = state.priceItems.find(x=>x.id===itemId);
  if(!it.history) it.history=[];
  it.history.push({id:uid(),price:parseFloat(fd.get('price')),date:fd.get('date'),source:fd.get('source')});
  await save('priceItems');
  managePrices(itemId);
}
async function removePrice(itemId,priceId){
  const it = state.priceItems.find(x=>x.id===itemId);
  it.history = it.history.filter(h=>h.id!==priceId);
  await save('priceItems');
  managePrices(itemId);
}
async function importPricesFromTasks(){
  if(!confirm('Beispiel-Positionen mit historischen Preisen anlegen, damit du das Modul ausprobieren kannst?')) return;
  const samples = [
    {name:'Estrich verlegen',category:'Estrich',unit:'m²',prices:[28.50,32.00,35.20,29.80,33.50,31.00,36.40]},
    {name:'Wandfliesen verlegen',category:'Fliesen',unit:'m²',prices:[45.00,52.00,48.50,55.00,50.00,58.00,46.50]},
    {name:'Innenwand mauern (KS 17,5cm)',category:'Maurer',unit:'m²',prices:[68.00,75.00,72.50,80.00,69.50,78.00]},
    {name:'Steckdose setzen inkl. Material',category:'Elektro',unit:'Stk',prices:[42.00,48.00,45.00,52.00,46.50,50.00,44.00]},
    {name:'Heizkörper Typ 22 600x1000',category:'Heizung',unit:'Stk',prices:[185.00,210.00,195.00,225.00,205.00]},
    {name:'Innenputz Gips 15mm',category:'Putz',unit:'m²',prices:[22.50,26.00,24.00,28.50,25.00,27.00]},
    {name:'Bauleitung',category:'Planung',unit:'h',prices:[85.00,95.00,90.00,110.00,100.00,92.00]},
  ];
  for(const sm of samples){
    if(state.priceItems.some(p=>p.name===sm.name)) continue;
    const id = uid();
    state.priceItems.push({
      id,name:sm.name,category:sm.category,unit:sm.unit,notes:'',
      history: sm.prices.map((p,i)=>({id:uid(),price:p,date:`202${3+i%2}-0${(i%9)+1}-15`,source:`Beispielprojekt ${i+1}`}))
    });
  }
  await save('priceItems');
  render();
}


// ============ KALKULATION ============
function renderKalkulation(){
  if(kalcShowPreise) return renderPreiseMitZurueck();
  if(currentCalcId) return renderCalcDetail();
  return `
    <div class="page-header">
      <h2>Kalkulationen</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="kalcShowPreise=true;render()">💰 Preisdatenbank</button>
        <button class="btn" onclick="newCalculation()" ${state.priceItems.length===0?'disabled title="Bitte zuerst Preise erfassen"':''}>+ Neue Kalkulation</button>
      </div>
    </div>
    ${state.priceItems.length===0?'<div class="card empty"><span class="empty-icon">💡</span>Lege zuerst Positionen in der Preisdatenbank an, dann kannst du hier kalkulieren.</div>':
    state.calculations.length===0?'<div class="card empty"><span class="empty-icon">🧮</span>Noch keine Kalkulationen. Erstelle deine erste!</div>':
    `<table><thead><tr><th>Name</th><th>Projekt</th><th>Positionen</th><th>Quantil</th><th style="text-align:right">Summe</th><th></th></tr></thead><tbody>
    ${state.calculations.map(c=>{
      const proj = state.projects.find(p=>p.id===c.projectId);
      const sum = calcTotal(c);
      return `<tr>
        <td><strong>${esc(c.name)}</strong></td>
        <td>${esc(proj?.name||'-')}</td>
        <td>${(c.lines||[]).length}</td>
        <td>${Math.round((c.quantile||0.5)*100)} %</td>
        <td style="text-align:right;font-weight:600">${fmtEur(sum)}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-secondary" onclick="openCalc('${c.id}')">Öffnen</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCalculation('${c.id}')">🗑️</button>
        </td>
      </tr>`;
    }).join('')}
    </tbody></table>`}
  `;
}
function renderPreiseMitZurueck(){
  return `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-secondary btn-sm" onclick="kalcShowPreise=false;render()">← Zurück zur Kostenschätzung</button>
        <h2>💰 Preisdatenbank</h2>
      </div>
      <div>
        <button class="btn btn-secondary" onclick="importPricesFromTasks()">📥 Beispiele</button>
        <button class="btn" onclick="editPriceItem()">+ Neue Position</button>
      </div>
    </div>
    ${renderPreiseContent()}
  `;
}
function calcTotal(calc){
  if(calc.categories){
    return (calc.categories||[]).reduce((s,cat)=>
      s+(cat.sections||[]).reduce((s2,sec)=>
        s2+(sec.lines||[]).reduce((s3,l)=>s3+linePrice(l,calc.quantile)*l.quantity,0),0),0);
  }
  return (calc.lines||[]).reduce((sum,l)=>sum+linePrice(l,calc.quantile)*l.quantity,0);
}
function linePrice(line, defaultQ){
  const item = state.priceItems.find(i=>i.id===line.itemId);
  if(!item) return 0;
  const q = line.quantile != null ? line.quantile : defaultQ;
  const prices = (item.history||[]).map(h=>h.price);
  return quantile(prices, q);
}
async function newCalculation(){
  const name = prompt('Name der Kalkulation:','Kalkulation '+new Date().toLocaleDateString('de-DE'));
  if(!name) return;
  const calc = {
    id:uid(),name,
    projectId: state.currentProject || (state.projects[0]?.id || ''),
    quantile: 0.5,
    categories:[],
    created: new Date().toISOString()
  };
  state.calculations.push(calc);
  await save('calculations');
  currentCalcId = calc.id;
  render();
}
function openCalc(id){currentCalcId = id; render();}
function closeCalc(){currentCalcId = null; render();}
async function deleteCalculation(id){
  if(!confirm('Kalkulation löschen?')) return;
  state.calculations = state.calculations.filter(c=>c.id!==id);
  await save('calculations');
  render();
}

const CALC_CAT_PRESETS = ['PV-Anlage','BESS','Wegebau','Kabeltrasse','Fundamente','Zaunanlage','Netzanschluss','Planung & Design','Gutachten','Vermessung','Sonstiges'];

function renderCalcDetail(){
  const calc = state.calculations.find(c=>c.id===currentCalcId);
  if(!calc){currentCalcId=null;return renderKalkulation();}
  const q = calc.quantile ?? 0.5;
  const total = calcTotal(calc);

  // Für Vergleichskacheln – null-quantile pro Abschnitt zurücksetzen
  function totalAtQ(cq){
    if(calc.categories){
      return (calc.categories||[]).reduce((s,cat)=>
        s+(cat.sections||[]).reduce((s2,sec)=>
          s2+(sec.lines||[]).reduce((s3,l)=>s3+linePrice({...l,quantile:null},cq)*l.quantity,0),0),0);
    }
    return (calc.lines||[]).reduce((s,l)=>s+linePrice({...l,quantile:null},cq)*l.quantity,0);
  }
  const compareQs=[0,0.25,0.5,0.75,1.0];

  // Quantile-Slider + Vergleichskacheln (shared)
  const sliderHtml=`
    <div class="card" style="margin-bottom:16px">
      <div style="flex:1;margin-bottom:14px">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">
          Globaler Quantilwert: <span style="color:var(--primary);font-size:16px">${Math.round(q*100)} %</span>
          <span style="color:var(--muted);font-weight:400;font-size:12px">
            ${q<0.25?'(sehr günstig)':q<0.45?'(günstig)':q<0.55?'(mittel/Median)':q<0.75?'(eher teuer)':'(sehr teuer)'}
          </span>
        </label>
        <input type="range" min="0" max="100" step="5" value="${Math.round(q*100)}"
          oninput="updateQuantile('${calc.id}',this.value)" style="width:100%">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:2px">
          <span>0% günstigster</span><span>25%</span><span>50% Median</span><span>75%</span><span>100% teuerster</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;font-size:12px;flex-wrap:wrap">
        ${compareQs.map(cq=>`
          <div style="flex:1;min-width:100px;padding:8px;background:${Math.abs(cq-q)<0.01?'#e8f0f8':'#f8fafc'};border-radius:6px;text-align:center;cursor:pointer;border:1px solid ${Math.abs(cq-q)<0.01?'var(--primary)':'transparent'}"
            onclick="updateQuantile('${calc.id}',${cq*100})">
            <div style="color:var(--muted)">${Math.round(cq*100)}%</div>
            <div style="font-weight:700;color:var(--primary);font-size:14px">${fmtEur(totalAtQ(cq))}</div>
          </div>`).join('')}
      </div>
    </div>`;

  // Legacy: alte Kalkulation mit calc.lines (ohne categories)
  if(!calc.categories){
    return `
      <div class="page-header">
        <div><button class="btn btn-secondary btn-sm" onclick="closeCalc()">← Zurück</button>
        <h2 style="display:inline-block;margin-left:10px">${esc(calc.name)}</h2></div>
        <div>
          <button class="btn btn-secondary" onclick="renameCalc('${calc.id}')">✏️ Umbenennen</button>
          <button class="btn btn-secondary" onclick="migrateLegacyCalc('${calc.id}')">⬆️ Auf neue Struktur upgraden</button>
          <button class="btn" onclick="addCalcLineLegacy('${calc.id}')">+ Position</button>
        </div>
      </div>
      ${sliderHtml}
      ${calc.lines.length===0?'<div class="card empty"><span class="empty-icon">📋</span>Keine Positionen.</div>':
      `<table><thead><tr>
        <th>Position</th><th style="text-align:right">Menge</th><th>Einheit</th>
        <th style="text-align:right">Quantil</th><th style="text-align:right">Min/Med/Max</th>
        <th style="text-align:right">EP</th><th style="text-align:right">Gesamt</th><th></th>
      </tr></thead><tbody>
      ${calc.lines.map((line,idx)=>{
        const item=state.priceItems.find(i=>i.id===line.itemId);
        if(!item) return `<tr><td colspan="8" style="color:var(--red)">Position gelöscht</td></tr>`;
        const s=priceStats(item); const ep=linePrice(line,q); const ges=ep*line.quantity;
        return `<tr>
          <td><strong>${esc(item.name)}</strong>${line.note?`<br><small>📝 ${esc(line.note)}</small>`:''}</td>
          <td style="text-align:right"><input type="number" step="0.01" value="${line.quantity}" style="width:80px;text-align:right" onchange="updateLine('${calc.id}',${idx},'quantity',parseFloat(this.value)||0)"></td>
          <td>${esc(item.unit)}</td>
          <td style="text-align:right">
            <select style="width:90px" onchange="updateLine('${calc.id}',${idx},'quantile',this.value===''?null:parseFloat(this.value))">
              <option value="" ${line.quantile==null?'selected':''}>Global</option>
              ${[0,0.25,0.5,0.75,1.0].map(o=>`<option value="${o}" ${line.quantile===o?'selected':''}>${Math.round(o*100)}%</option>`).join('')}
            </select>
          </td>
          <td style="text-align:right;font-size:11px;color:var(--muted)">${s.n?`${fmtEur(s.min)} / <strong>${fmtEur(s.median)}</strong> / ${fmtEur(s.max)}`:'–'}</td>
          <td style="text-align:right;font-weight:600">${fmtEur(ep)}</td>
          <td style="text-align:right;font-weight:700;color:var(--primary)">${fmtEur(ges)}</td>
          <td><button class="btn btn-sm btn-danger" onclick="removeLine('${calc.id}',${idx})">×</button></td>
        </tr>`;
      }).join('')}
      </tbody><tfoot>
        <tr style="background:#f0f7ff"><td colspan="6" style="text-align:right;font-weight:700;padding:14px">Netto:</td>
          <td style="text-align:right;font-weight:700;color:var(--primary);font-size:18px">${fmtEur(total)}</td><td></td></tr>
        <tr><td colspan="6" style="text-align:right;padding:8px">+ 19% MwSt:</td>
          <td style="text-align:right">${fmtEur(total*0.19)}</td><td></td></tr>
        <tr style="background:#e8f0f8"><td colspan="6" style="text-align:right;font-weight:700;padding:10px">Brutto:</td>
          <td style="text-align:right;font-weight:700;color:var(--primary)">${fmtEur(total*1.19)}</td><td></td></tr>
      </tfoot></table>`}
    `;
  }

  // Neue hierarchische Ansicht mit Kategorien & Abschnitten
  const catsHtml = (calc.categories||[]).length===0
    ? `<div class="card empty"><span class="empty-icon">📁</span>Noch keine Kategorien. Klicke auf „+ Kategorie".</div>`
    : calc.categories.map(cat=>{
        const catTotal=(cat.sections||[]).reduce((s,sec)=>
          s+(sec.lines||[]).reduce((s2,l)=>s2+linePrice(l,q)*l.quantity,0),0);
        return `
        <div style="margin-bottom:20px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)">
          <div style="background:var(--primary);color:#fff;padding:12px 16px;display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">📁</span>
            <strong style="flex:1;font-size:15px">${esc(cat.name)}</strong>
            <span style="font-size:13px;opacity:.85;margin-right:8px">${fmtEur(catTotal)}</span>
            <button class="btn btn-sm" style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.35);color:#fff" onclick="addSection('${calc.id}','${cat.id}')">+ Abschnitt</button>
            <button class="btn btn-sm" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff" onclick="renameCategory('${calc.id}','${cat.id}')">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deleteCategory('${calc.id}','${cat.id}')">🗑️</button>
          </div>
          ${(cat.sections||[]).length===0
            ? `<div style="padding:14px 16px;color:var(--muted);font-size:13px;text-align:center;background:var(--card)">Noch keine Abschnitte – klicke auf „+ Abschnitt".</div>`
            : cat.sections.map(sec=>{
                const secTotal=(sec.lines||[]).reduce((s,l)=>s+linePrice(l,q)*l.quantity,0);
                return `
                <div style="border-bottom:1px solid var(--border)">
                  <div style="background:var(--surface-2);padding:8px 16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border)">
                    <span style="color:var(--primary);font-size:13px">▶</span>
                    <strong style="flex:1;font-size:13px">${esc(sec.name)}</strong>
                    <span style="font-size:12px;color:var(--muted);margin-right:8px">${fmtEur(secTotal)}</span>
                    <button class="btn btn-sm btn-secondary" onclick="addCalcLine('${calc.id}','${cat.id}','${sec.id}')">+ Position</button>
                    <button class="btn btn-sm btn-secondary" onclick="renameSection('${calc.id}','${cat.id}','${sec.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSection('${calc.id}','${cat.id}','${sec.id}')">×</button>
                  </div>
                  ${(sec.lines||[]).length===0
                    ? `<div style="padding:8px 20px;color:var(--muted);font-size:12px;background:var(--card)">Keine Positionen – klicke auf „+ Position".</div>`
                    : `<table style="border-radius:0;box-shadow:none;border:none">
                        <thead><tr>
                          <th>Position</th>
                          <th style="text-align:right">Menge</th>
                          <th>Einheit</th>
                          <th style="text-align:right">Quantil</th>
                          <th style="text-align:right">Min / Median / Max</th>
                          <th style="text-align:right">EP</th>
                          <th style="text-align:right">Gesamt</th>
                          <th></th>
                        </tr></thead>
                        <tbody>
                        ${sec.lines.map((line,idx)=>{
                          const item=state.priceItems.find(i=>i.id===line.itemId);
                          if(!item) return `<tr><td colspan="8" style="color:var(--red);padding:10px">Position gelöscht</td></tr>`;
                          const s=priceStats(item); const ep=linePrice(line,q); const ges=ep*line.quantity;
                          return `<tr>
                            <td><strong>${esc(item.name)}</strong>
                              ${item.category?`<br><small style="color:var(--muted)">${esc(item.category)}</small>`:''}
                              ${line.note?`<br><small style="color:var(--muted)">📝 ${esc(line.note)}</small>`:''}
                            </td>
                            <td style="text-align:right">
                              <input type="number" step="0.01" value="${line.quantity}" style="width:80px;text-align:right"
                                onchange="updateSecLine('${calc.id}','${cat.id}','${sec.id}',${idx},'quantity',parseFloat(this.value)||0)">
                            </td>
                            <td>${esc(item.unit)}</td>
                            <td style="text-align:right">
                              <select style="width:90px" onchange="updateSecLine('${calc.id}','${cat.id}','${sec.id}',${idx},'quantile',this.value===''?null:parseFloat(this.value))">
                                <option value="" ${line.quantile==null?'selected':''}>Global</option>
                                ${[0,0.25,0.5,0.75,1.0].map(o=>`<option value="${o}" ${line.quantile===o?'selected':''}>${Math.round(o*100)}%</option>`).join('')}
                              </select>
                              ${line.quantile!=null?`<br><small style="color:var(--accent)">Override</small>`:''}
                            </td>
                            <td style="text-align:right;font-size:11px;color:var(--muted)">
                              ${s.n?`${fmtEur(s.min)} / <strong style="color:var(--text)">${fmtEur(s.median)}</strong> / ${fmtEur(s.max)}<br><span style="font-size:10px">(${s.n} Preise)</span>`:'<span style="color:var(--red)">keine Preise!</span>'}
                            </td>
                            <td style="text-align:right;font-weight:600">${fmtEur(ep)}</td>
                            <td style="text-align:right;font-weight:700;color:var(--primary)">${fmtEur(ges)}</td>
                            <td class="actions-cell">
                              <button class="btn btn-sm btn-secondary" onclick="editSecLineNote('${calc.id}','${cat.id}','${sec.id}',${idx})" title="Notiz">📝</button>
                              <button class="btn btn-sm btn-danger" onclick="removeSecLine('${calc.id}','${cat.id}','${sec.id}',${idx})">×</button>
                            </td>
                          </tr>`;
                        }).join('')}
                        </tbody>
                      </table>`}
                </div>`;
              }).join('')}
          <div style="padding:10px 16px;text-align:right;background:var(--info-bg);border-top:1px solid var(--border)">
            <span style="font-size:13px;color:var(--muted)">Summe ${esc(cat.name)}: </span>
            <strong style="color:var(--primary);font-size:15px">${fmtEur(catTotal)}</strong>
          </div>
        </div>`;
      }).join('');

  return `
    <div class="page-header">
      <div>
        <button class="btn btn-secondary btn-sm" onclick="closeCalc()">← Zurück</button>
        <h2 style="display:inline-block;margin-left:10px">${esc(calc.name)}</h2>
      </div>
      <div>
        <button class="btn btn-secondary" onclick="renameCalc('${calc.id}')">✏️ Umbenennen</button>
        <button class="btn" onclick="addCategory('${calc.id}')">+ Kategorie</button>
      </div>
    </div>
    ${sliderHtml}
    ${catsHtml}
    <div class="card" style="margin-top:20px;text-align:right;padding:20px">
      <div style="display:inline-flex;flex-direction:column;gap:6px;min-width:260px">
        <div style="display:flex;justify-content:space-between;gap:40px">
          <span style="color:var(--muted)">Gesamtsumme (netto):</span>
          <strong style="color:var(--primary);font-size:20px">${fmtEur(total)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;gap:40px;font-size:13px;color:var(--muted)">
          <span>+ 19% MwSt:</span><span>${fmtEur(total*0.19)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:40px;padding-top:8px;border-top:1px solid var(--border)">
          <span style="font-weight:600">Gesamtsumme (brutto):</span>
          <strong style="color:var(--primary)">${fmtEur(total*1.19)}</strong>
        </div>
      </div>
    </div>
  `;
}

// ---- Kategorie-Management ----
function addCategory(calcId){
  openModal(`
    <h3>Kategorie hinzufügen</h3>
    <div class="form-group">
      <label>Name der Kategorie</label>
      <input id="newCatName" list="catPresets" placeholder="z.B. Wegebau" autofocus>
      <datalist id="catPresets">
        ${CALC_CAT_PRESETS.map(p=>`<option value="${esc(p)}">`).join('')}
      </datalist>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn" onclick="confirmAddCategory('${calcId}')">Hinzufügen</button>
    </div>
  `);
}
async function confirmAddCategory(calcId){
  const name=(document.getElementById('newCatName').value||'').trim();
  if(!name) return;
  const calc=state.calculations.find(c=>c.id===calcId);
  if(!calc.categories) calc.categories=[];
  calc.categories.push({id:uid(),name,sections:[]});
  await save('calculations'); closeModal(); render();
}
async function deleteCategory(calcId,catId){
  if(!confirm('Kategorie mit allen Abschnitten löschen?')) return;
  const calc=state.calculations.find(c=>c.id===calcId);
  calc.categories=calc.categories.filter(c=>c.id!==catId);
  await save('calculations'); render();
}
async function renameCategory(calcId,catId){
  const calc=state.calculations.find(c=>c.id===calcId);
  const cat=calc.categories.find(c=>c.id===catId);
  const name=prompt('Kategorie umbenennen:',cat.name);
  if(!name) return;
  cat.name=name; await save('calculations'); render();
}

// ---- Abschnitt-Management ----
async function addSection(calcId,catId){
  const calc=state.calculations.find(c=>c.id===calcId);
  const cat=calc.categories.find(c=>c.id===catId);
  const name=prompt('Name des Abschnitts:','Abschnitt '+(cat.sections.length+1));
  if(!name) return;
  cat.sections.push({id:uid(),name,lines:[]});
  await save('calculations'); render();
}
async function deleteSection(calcId,catId,secId){
  if(!confirm('Abschnitt löschen?')) return;
  const calc=state.calculations.find(c=>c.id===calcId);
  const cat=calc.categories.find(c=>c.id===catId);
  cat.sections=cat.sections.filter(s=>s.id!==secId);
  await save('calculations'); render();
}
async function renameSection(calcId,catId,secId){
  const calc=state.calculations.find(c=>c.id===calcId);
  const cat=calc.categories.find(c=>c.id===catId);
  const sec=cat.sections.find(s=>s.id===secId);
  const name=prompt('Abschnitt umbenennen:',sec.name);
  if(!name) return;
  sec.name=name; await save('calculations'); render();
}

// ---- Positions-Management (neue Struktur) ----
function addCalcLine(calcId,catId,secId){
  if(state.priceItems.length===0){alert('Keine Preispositionen vorhanden.');return;}
  openModal(`
    <h3>Position hinzufügen</h3>
    <div class="form-group">
      <input type="text" id="lineSearch" placeholder="🔍 Position suchen…" oninput="filterPositionList(this.value)">
    </div>
    <div id="positionList" style="max-height:380px;overflow-y:auto;border:1px solid var(--border);border-radius:6px">
      ${state.priceItems.map(it=>{
        const s=priceStats(it);
        return `<div class="pos-item" data-name="${esc(it.name.toLowerCase())}" data-cat="${esc((it.category||'').toLowerCase())}"
          style="padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center"
          onclick="selectSecPosition('${calcId}','${catId}','${secId}','${it.id}')"
          onmouseover="this.style.background='var(--info-bg)'" onmouseout="this.style.background=''">
          <div>
            <strong>${esc(it.name)}</strong>
            <div style="font-size:11px;color:var(--muted)">${esc(it.category||'')} • ${esc(it.unit)} • ${s.n} Preise</div>
          </div>
          <div style="text-align:right;font-size:12px;margin-left:12px;flex-shrink:0">
            <div style="color:var(--muted)">${s.n?fmtEur(s.min)+' – '+fmtEur(s.max):'-'}</div>
            <div style="font-weight:600">Median: ${s.n?fmtEur(s.median):'-'}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
    </div>
  `);
}
async function selectSecPosition(calcId,catId,secId,itemId){
  const qty=prompt('Menge:','1');
  if(qty===null) return;
  const calc=state.calculations.find(c=>c.id===calcId);
  const sec=calc.categories.find(c=>c.id===catId)?.sections.find(s=>s.id===secId);
  if(!sec) return;
  sec.lines.push({itemId,quantity:parseFloat(qty)||1,quantile:null,note:''});
  await save('calculations'); closeModal(); render();
}
async function updateSecLine(calcId,catId,secId,idx,field,value){
  const calc=state.calculations.find(c=>c.id===calcId);
  const sec=calc.categories.find(c=>c.id===catId)?.sections.find(s=>s.id===secId);
  if(!sec) return;
  sec.lines[idx][field]=value;
  await save('calculations'); render();
}
async function removeSecLine(calcId,catId,secId,idx){
  const calc=state.calculations.find(c=>c.id===calcId);
  const sec=calc.categories.find(c=>c.id===catId)?.sections.find(s=>s.id===secId);
  if(!sec) return;
  sec.lines.splice(idx,1);
  await save('calculations'); render();
}
function editSecLineNote(calcId,catId,secId,idx){
  const calc=state.calculations.find(c=>c.id===calcId);
  const sec=calc.categories.find(c=>c.id===catId)?.sections.find(s=>s.id===secId);
  if(!sec) return;
  const note=prompt('Notiz:',sec.lines[idx].note||'');
  if(note===null) return;
  updateSecLine(calcId,catId,secId,idx,'note',note);
}
async function updateQuantile(calcId, value){
  const calc=state.calculations.find(c=>c.id===calcId);
  calc.quantile=parseFloat(value)/100;
  await save('calculations'); render();
}
async function renameCalc(calcId){
  const calc=state.calculations.find(c=>c.id===calcId);
  const name=prompt('Name:',calc.name);
  if(!name) return;
  calc.name=name; await save('calculations'); render();
}
function filterPositionList(q){
  const ql=q.toLowerCase();
  document.querySelectorAll('.pos-item').forEach(el=>{
    el.style.display=(el.dataset.name.includes(ql)||el.dataset.cat?.includes(ql))?'':'none';
  });
}
async function selectPosition(calcId,itemId){
  const qty=prompt('Menge:','1');
  if(qty===null) return;
  const calc=state.calculations.find(c=>c.id===calcId);
  if(!calc.lines) calc.lines=[];
  calc.lines.push({itemId,quantity:parseFloat(qty)||1,quantile:null,note:''});
  await save('calculations'); closeModal(); render();
}
async function updateLine(calcId,idx,field,value){
  const calc=state.calculations.find(c=>c.id===calcId);
  calc.lines[idx][field]=value; await save('calculations'); render();
}
async function removeLine(calcId,idx){
  const calc=state.calculations.find(c=>c.id===calcId);
  calc.lines.splice(idx,1); await save('calculations'); render();
}
async function migrateLegacyCalc(calcId){
  if(!confirm('Kalkulation in neue Struktur umwandeln? Die vorhandenen Positionen werden in eine Kategorie „Allgemein / Abschnitt 1" übernommen.')) return;
  const calc=state.calculations.find(c=>c.id===calcId);
  const secId=uid();
  calc.categories=[{id:uid(),name:'Allgemein',sections:[{id:secId,name:'Abschnitt 1',lines:calc.lines||[]}]}];
  delete calc.lines;
  await save('calculations'); render();
}

// ---- Legacy-Funktionen (für alte Kalkulationen ohne categories) ----
function addCalcLineLegacy(calcId){
  if(state.priceItems.length===0){alert('Keine Preispositionen vorhanden.');return;}
  openModal(`
    <h3>Position hinzufügen</h3>
    <div class="form-group"><input type="text" id="lineSearch" placeholder="🔍 Position suchen…" oninput="filterPositionList(this.value)"></div>
    <div id="positionList" style="max-height:380px;overflow-y:auto;border:1px solid var(--border);border-radius:6px">
      ${state.priceItems.map(it=>{const s=priceStats(it);return `<div class="pos-item" data-name="${esc(it.name.toLowerCase())}"
        style="padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;display:flex;justify-content:space-between;align-items:center"
        onclick="selectPosition('${calcId}','${it.id}')"
        onmouseover="this.style.background='var(--info-bg)'" onmouseout="this.style.background=''">
        <div><strong>${esc(it.name)}</strong><div style="font-size:11px;color:var(--muted)">${esc(it.category||'')} • ${esc(it.unit)} • ${s.n} Preise</div></div>
        <div style="text-align:right;font-size:12px"><div>${s.n?fmtEur(s.min)+' – '+fmtEur(s.max):'-'}</div><strong>Median: ${s.n?fmtEur(s.median):'-'}</strong></div>
      </div>`}).join('')}
    </div>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button></div>
  `);
}


// ============ KOSTENSCHÄTZUNG ============
const TEILE = [
  { key:'anlage',      label:'Anlage',                           icon:'🏗️',  color:'#e5007d' },
  { key:'kranstell',   label:'Kranstellflächen',                 icon:'🏗️', color:'#8b5cf6' },
  { key:'wegebau',     label:'Wegebau',                          icon:'🛤️',  color:'#0084d6' },
  { key:'ausgleich',   label:'Ausgleichs- und Ersatzmaßnahmen',  icon:'🌿',  color:'#0aaf60' },
  { key:'baudienst',   label:'Bau Dienstleistungen',             icon:'🔧',  color:'#f5a623' },
  { key:'rueckbau',    label:'Rückbau',                          icon:'🔄',  color:'#6b7280' },
  { key:'kabeltrasse', label:'Kabeltrasse',                      icon:'⚡',  color:'#ff6b35' },
];

const EST_TEMPLATES = {
  pv: {
    label: 'PV-Freifläche',
    params: [
      {key:'mwp',          label:'Anlagenleistung',    unit:'MWp',  primary:true,  default:10},
      {key:'moduleCount',  label:'Modulanzahl',         unit:'Stk',  primary:false, formula:'Math.round(p.mwp*1800)'},
      {key:'invertorCount',label:'Wechselrichter',      unit:'Stk',  primary:false, formula:'Math.round(p.mwp*2)'},
      {key:'mvStations',   label:'MS-Stationen',        unit:'Stk',  primary:true,  default:2},
      {key:'trenchM',      label:'Kabeltrasse gesamt',  unit:'m',    primary:true,  default:5000},
      {key:'roadM',        label:'Wegebau gesamt',      unit:'m',    primary:true,  default:3000},
      {key:'fenceM',       label:'Zaunanlage',          unit:'m',    primary:true,  default:4000},
      {key:'areaHa',       label:'Fläche',              unit:'ha',   primary:false, formula:'Math.round(p.mwp*2*10)/10'},
    ],
    categories: [
      {key:'anlage',    name:'Anlage'},
      {key:'kranstell', name:'Kranstellflächen'},
      {key:'wegebau',   name:'Wegebau'},
      {key:'ausgleich', name:'Ausgleichs- und Ersatzmaßnahmen'},
      {key:'baudienst', name:'Bau Dienstleistungen'},
      {key:'rueckbau',  name:'Rückbau'},
      {key:'kabeltrasse',name:'Kabeltrasse'},
    ]
  },
  bess: {
    label: 'BESS',
    params: [
      {key:'mwh',          label:'Energieinhalt',       unit:'MWh',  primary:true,  default:20},
      {key:'mw',           label:'Leistung',             unit:'MW',   primary:true,  default:10},
      {key:'containers',   label:'Containeranzahl',      unit:'Stk',  primary:false, formula:'Math.ceil(p.mwh/2)'},
      {key:'pcsCount',     label:'PCS-Anzahl',           unit:'Stk',  primary:false, formula:'Math.ceil(p.mw/2.5)'},
      {key:'trenchM',      label:'Kabeltrasse gesamt',   unit:'m',    primary:true,  default:600},
      {key:'roadM',        label:'Wegebau',              unit:'m',    primary:true,  default:250},
      {key:'fenceM',       label:'Zaunanlage',           unit:'m',    primary:true,  default:600},
    ],
    categories: [
      {key:'anlage',    name:'Anlage'},
      {key:'kranstell', name:'Kranstellflächen'},
      {key:'wegebau',   name:'Wegebau'},
      {key:'ausgleich', name:'Ausgleichs- und Ersatzmaßnahmen'},
      {key:'baudienst', name:'Bau Dienstleistungen'},
      {key:'rueckbau',  name:'Rückbau'},
      {key:'kabeltrasse',name:'Kabeltrasse'},
    ]
  },
  wind: {
    label: 'Wind Onshore',
    params: [
      {key:'weaCount',     label:'Anzahl WEA',          unit:'Stk',  primary:true,  default:5},
      {key:'mwPerWea',     label:'Leistung je WEA',     unit:'MW',   primary:true,  default:5},
      {key:'mwTotal',      label:'Gesamtleistung',       unit:'MW',   primary:false, formula:'p.weaCount*p.mwPerWea'},
      {key:'trenchM',      label:'Kabeltrasse gesamt',   unit:'m',    primary:true,  default:8000},
      {key:'roadM',        label:'Wegebau gesamt',       unit:'m',    primary:true,  default:5000},
      {key:'cranePadM2',   label:'Kranstellfläche/WEA',  unit:'m²',   primary:true,  default:1200},
    ],
    categories: [
      {key:'anlage',    name:'Anlage'},
      {key:'kranstell', name:'Kranstellflächen'},
      {key:'wegebau',   name:'Wegebau'},
      {key:'ausgleich', name:'Ausgleichs- und Ersatzmaßnahmen'},
      {key:'baudienst', name:'Bau Dienstleistungen'},
      {key:'rueckbau',  name:'Rückbau'},
      {key:'kabeltrasse',name:'Kabeltrasse'},
    ]
  }
};

function evalFormula(formula, p){
  try{ return (new Function('p','return '+formula))(p); }
  catch(e){ return 0; }
}

function computeParams(est){
  const tpl = EST_TEMPLATES[est.type];
  if(!tpl) return {};
  const proj = state.projects.find(p=>p.id===est.projectId);
  const projParams = (proj?.type===est.type) ? (proj.params||{}) : {};
  const p = {};
  for(const param of tpl.params){
    const estOv = est.paramOverrides?.[param.key];
    const projVal = projParams[param.key];
    if(estOv !== undefined && estOv !== null){
      p[param.key] = estOv;
    } else if(projVal !== undefined && projVal !== null && param.primary){
      p[param.key] = projVal;
    } else if(param.formula){
      p[param.key] = Math.round(evalFormula(param.formula, p)*100)/100;
    } else {
      p[param.key] = param.default ?? 0;
    }
  }
  return p;
}

function estLineKey(catIdx, lineIdx){ return `${catIdx}_${lineIdx}`; }

function estLineQty(est, catIdx, lineIdx, params){
  const key = estLineKey(catIdx, lineIdx);
  const ov = est.lineOverrides?.[key];
  if(ov?.quantity !== undefined && ov.quantity !== null) return ov.quantity;
  const tpl = EST_TEMPLATES[est.type];
  const formula = tpl.categories[catIdx].lines[lineIdx].formula;
  return Math.round(evalFormula(formula, params)*100)/100;
}

function estLinePrice(est, catIdx, lineIdx){
  const key = estLineKey(catIdx, lineIdx);
  const ov = est.lineOverrides?.[key];
  if(ov?.price !== undefined && ov.price !== null) return ov.price;
  return EST_TEMPLATES[est.type].categories[catIdx].lines[lineIdx].price ?? 0;
}

// ---- Gruppen-Helpers ----
function getEstGroups(est, partKey){
  return ((est.groups||{})[String(partKey)])||[];
}
function setEstGroups(est, partKey, groups){
  if(!est.groups) est.groups={};
  est.groups[String(partKey)]=groups;
}

// ---- Formel-Auswertung ----
function getAllParamValues(est){
  const custom={};
  (est.paramDefinitions||[]).forEach(p=>{ if(/^[a-zA-Z_]/.test(p.key)) custom[p.key]=p.value??0; });
  return custom;
}
function evalPosFormula(formula, paramValues){
  // paramValues = flat {key:value} object (from getAllParamValues)
  if(!formula||!formula.trim()) return null;
  try{
    const keys=Object.keys(paramValues||{}).filter(k=>/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k));
    const vals=keys.map(k=>paramValues[k]??0);
    const fn=new Function(...keys,`"use strict";return +(${formula});`);
    const r=fn(...vals);
    if(!isFinite(r)) return null;
    return Math.round(r*1000)/1000;
  }catch(e){ return null; }
}
function getPosQty(pos, paramValues){
  if(pos.formula){
    const r=evalPosFormula(pos.formula,paramValues);
    if(r!==null) return r;
  }
  return pos.qty||0;
}
function countFormulaRefs(paramKey, est){
  let n=0;
  const check=p=>{ if(p.formula&&p.formula.includes(paramKey)) n++; };
  TEILE.forEach((_,ci)=>getEstGroups(est,String(ci)).forEach(g=>(g.positions||[]).forEach(check)));
  (est.customCategories||[]).forEach(cat=>getEstGroups(est,cat.id).forEach(g=>(g.positions||[]).forEach(check)));
  return n;
}

// ---- Quantil-Preis-Berechnung ----
function getPriceForPos(pos, mode, groupQuantile, globalQuantile){
  if(!pos.priceItemId) return pos.price||0; // manuelle Preise unberührt
  const item=state.priceItems.find(i=>i.id===pos.priceItemId);
  if(!item) return pos.price||0;
  const prices=(item.history||[]).map(h=>h.price).filter(p=>!isNaN(p));
  if(!prices.length) return pos.price||0;
  let q;
  if(mode==='position')      q = pos.quantile??0.5;
  else if(mode==='group')    q = groupQuantile??0.5;
  else                       q = globalQuantile??0.5;
  return Math.round(quantile(prices,q)*100)/100;
}

function partKeyTotal(est, partKey){
  const pv=getAllParamValues(est);
  const mode=est.quantileMode||'global';
  const globalQ=est.globalQuantile??0.5;
  return getEstGroups(est,partKey).reduce((s,g)=>
    s+(g.positions||[]).reduce((s2,p)=>{
      const qty=getPosQty(p,pv);
      const price=getPriceForPos(p,mode,g.quantile??0.5,globalQ);
      return s2+qty*price;
    },0),0);
}

function estTotal(est){
  let total=0;
  TEILE.forEach((_,ci)=>{ total+=partKeyTotal(est,String(ci)); });
  (est.customCategories||[]).forEach(cat=>{ total+=partKeyTotal(est,cat.id); });
  return total;
}

function renderSchaetzung(){
  if(kalcShowPreise) return renderPreiseMitZurueck();
  if(currentEstimateId && currentEstimatePart !== null) return renderSchaetzungTeil();
  if(currentEstimateId) return renderSchaetzungDashboard();
  const list = state.estimates.filter(e=>!state.currentProject || e.projectId===state.currentProject);
  return `
    <div class="page-header">
      <h2>📐 Kostenschätzungen</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" onclick="">🧙 Wizard</button>
        <button class="btn btn-secondary" onclick="kalcShowPreise=true;render()">💰 Preisdatenbank</button>
        <button class="btn" onclick="newEstimate()">+ Neue Schätzung</button>
      </div>
    </div>
    ${list.length===0?'<div class="card empty"><span class="empty-icon">📐</span>Noch keine Schätzungen. Erstelle deine erste!</div>':
    `<table><thead><tr>
      <th>Name</th><th>Typ</th><th>Projekt</th><th style="text-align:right">Gesamt (netto)</th><th></th>
    </tr></thead><tbody>
    ${list.map(e=>{
      const proj=state.projects.find(p=>p.id===e.projectId);
      const tpl=EST_TEMPLATES[e.type];
      return `<tr>
        <td><strong>${esc(e.name)}</strong><br><small style="color:var(--muted)">${fmtDate(e.created)}</small></td>
        <td><span class="badge aufgabe">${esc(tpl?.label||e.type)}</span></td>
        <td>${esc(proj?.name||'-')}</td>
        <td style="text-align:right;font-weight:700;color:var(--primary);font-size:15px">${fmtEur(estTotal(e))}</td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-secondary" onclick="currentEstimateId='${e.id}';currentEstimatePart=null;render()">Öffnen</button>
          <button class="btn btn-sm btn-danger" onclick="deleteEstimate('${e.id}')">🗑️</button>
        </td>
      </tr>`;
    }).join('')}
    </tbody></table>`}
  `;
}

function renderSchaetzungDashboard(){
  const est = state.estimates.find(e=>e.id===currentEstimateId);
  if(!est){currentEstimateId=null;return renderSchaetzung();}
  const tpl = EST_TEMPLATES[est.type];
  const params = computeParams(est);
  const total = estTotal(est);
  const hidden = est.hiddenDefaultTeile || [];
  const vorlagen = state.schaetzungVorlagen || [];

  // Default TEILE Karten (nicht versteckte)
  const defaultCards = TEILE.map((teil, ci)=>{
    if(hidden.includes(ci)) return '';
    const cat = tpl.categories[ci];
    if(!cat) return '';
    const catTotal = partKeyTotal(est, String(ci));
    const pct = total > 0 ? Math.round(catTotal/total*100) : 0;
    return `
      <div class="card" style="padding:0;overflow:hidden;cursor:pointer;transition:transform .15s,box-shadow .15s"
           onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,.15)'"
           onmouseleave="this.style.transform='';this.style.boxShadow=''"
           onclick="currentEstimatePart=${ci};render()">
        <div style="background:${teil.color};padding:10px 14px;display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">${teil.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="color:#fff;font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${teil.label}</div>
            <div style="color:rgba(255,255,255,.7);font-size:11px">${getEstGroups(est,String(ci)).reduce((s,g)=>s+(g.positions||[]).length,0)} Pos.</div>
          </div>
          <span style="color:rgba(255,255,255,.85);font-size:11px;font-weight:600">${pct}%</span>
          <button onclick="event.stopPropagation();hideDefaultTeil('${est.id}',${ci})"
            style="background:rgba(0,0,0,.2);border:none;color:#fff;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:13px;line-height:1" title="Ausblenden">×</button>
        </div>
        <div style="padding:12px 14px">
          <div style="font-size:20px;font-weight:700;color:var(--primary)">${fmtEur(catTotal)}</div>
          <div style="margin-top:5px;background:var(--border);border-radius:4px;height:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${teil.color};border-radius:4px"></div>
          </div>
          <div style="margin-top:8px;text-align:right">
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();currentEstimatePart=${ci};render()">Bearbeiten →</button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Custom Categories Karten
  const customCards = (est.customCategories||[]).map(cat=>{
    const catTotal=(cat.lines||[]).reduce((s,l)=>s+(l.quantity||0)*(l.price||0),0);
    const pct = total > 0 ? Math.round(catTotal/total*100) : 0;
    return `
      <div class="card" style="padding:0;overflow:hidden;cursor:pointer;transition:transform .15s,box-shadow .15s;border:2px solid var(--accent)"
           onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,.15)'"
           onmouseleave="this.style.transform='';this.style.boxShadow=''"
           onclick="currentEstimatePart='${cat.id}';render()">
        <div style="background:var(--accent);padding:10px 14px;display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">📂</span>
          <div style="flex:1;min-width:0">
            <div style="color:#fff;font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(cat.name)}</div>
            <div style="color:rgba(255,255,255,.7);font-size:11px">${(cat.lines||[]).length} Pos.</div>
          </div>
          <span style="color:rgba(255,255,255,.85);font-size:11px;font-weight:600">${pct}%</span>
          <button onclick="event.stopPropagation();renameEstCustomCat('${est.id}','${cat.id}')"
            style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:12px" title="Umbenennen">✏️</button>
          <button onclick="event.stopPropagation();deleteEstCustomCat('${est.id}','${cat.id}')"
            style="background:rgba(0,0,0,.2);border:none;color:#fff;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:13px" title="Löschen">×</button>
        </div>
        <div style="padding:12px 14px">
          <div style="font-size:20px;font-weight:700;color:var(--accent)">${fmtEur(catTotal)}</div>
          <div style="margin-top:5px;background:var(--border);border-radius:4px;height:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:var(--accent);border-radius:4px"></div>
          </div>
          <div style="margin-top:8px;text-align:right">
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();currentEstimatePart='${cat.id}';render()">Bearbeiten →</button>
          </div>
        </div>
      </div>`;
  }).join('');

  // Karte für ausgeblendete Teile (kompakt, zum Wiedereinblenden)
  const hiddenCards = hidden.length > 0 ? `
    <div class="card" style="padding:12px 14px;border:1px dashed var(--border);background:var(--surface-2)">
      <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:8px;text-transform:uppercase">Ausgeblendet</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${hidden.map(ci=>{
          const t = TEILE[ci]; if(!t) return '';
          return `<button class="btn btn-sm btn-secondary" onclick="showDefaultTeil('${est.id}',${ci})"
            style="border-color:${t.color};color:${t.color}">${t.icon} ${t.label} +</button>`;
        }).join('')}
      </div>
    </div>` : '';

  // "+ Neuer Bereich"-Karte
  const addCard = `
    <div class="card" style="padding:0;overflow:hidden;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;min-height:120px;cursor:pointer;transition:border-color .15s"
         onmouseenter="this.style.borderColor='var(--primary)'"
         onmouseleave="this.style.borderColor='var(--border)'"
         onclick="addEstCustomCat('${est.id}')">
      <div style="text-align:center;color:var(--muted)">
        <div style="font-size:28px;margin-bottom:4px">＋</div>
        <div style="font-size:13px;font-weight:600">Neuer Bereich</div>
      </div>
    </div>`;

  const proj = state.projects.find(p=>p.id===est.projectId);
  return `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="currentEstimateId=null;render()">← Schätzungen</button>
        <h2 style="margin:0">${esc(est.name)}</h2>
        <span class="badge aufgabe">${esc(tpl.label)}</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="renameEstimate('${est.id}')">✏️</button>
      </div>
    </div>

    <!-- Gesamt-Summary -->
    <div class="card" style="margin-bottom:16px;padding:14px 18px;display:flex;align-items:center;gap:24px;flex-wrap:wrap">
      <div style="min-width:140px">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Gesamtkosten (netto)</div>
        <div style="font-size:28px;font-weight:700;color:var(--primary)">${fmtEur(total)}</div>
        <div style="font-size:11px;color:var(--muted)">inkl. MwSt: ${fmtEur(total*1.19)}</div>
      </div>
      <div style="flex:1;min-width:220px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:11px;font-weight:600;color:var(--muted)">Preisquantil (global)</span>
          <span data-gq-label style="font-size:12px;font-weight:700;color:var(--primary)">${Math.round((est.globalQuantile??0.5)*100)} %</span>
        </div>
        <input type="range" min="0" max="100" value="${Math.round((est.globalQuantile??0.5)*100)}"
          style="width:100%;accent-color:var(--primary);${(est.quantileMode||'global')!=='global'?'opacity:.35;pointer-events:none':''}"
          oninput="liveQuantileGlobal('${est.id}',this.value)"
          onchange="setQuantile('${est.id}','global',null,null,this.value/100)">
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:2px">
          <span>Günstig</span><span>Teuer</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px">
        <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:2px">Steuerung</div>
        ${['global','group','position'].map(m=>`
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;padding:4px 8px;border-radius:6px;background:${(est.quantileMode||'global')===m?'var(--primary)':'var(--surface-2)'};color:${(est.quantileMode||'global')===m?'#fff':'var(--text)'}">
            <input type="radio" name="qmode-${est.id}" value="${m}" ${(est.quantileMode||'global')===m?'checked':''}
              style="accent-color:#fff;display:none"
              onchange="setQuantileMode('${est.id}','${m}')">
            ${{ global:'🌐 Global', group:'📁 Gruppe', position:'📌 Position' }[m]}
          </label>`).join('')}
      </div>
    </div>

    <!-- Projektkennwerte -->
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3 style="color:var(--primary);font-size:14px;margin:0">📐 Projektkennwerte</h3>
        <button class="btn btn-sm btn-secondary" onclick="addParam('${est.id}')">+ Kennwert</button>
      </div>
      ${(est.paramDefinitions||[]).length===0
        ? `<div style="font-size:13px;color:var(--muted)">Noch keine Kennwerte. Füge z.B. <code>l_geschlossen</code> hinzu – dann kannst du in Positionen Formeln wie <code>l_geschlossen * 3</code> verwenden.</div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:7px">
          ${(est.paramDefinitions||[]).map((p,pi)=>`
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:7px;padding:7px 9px">
              <div style="font-size:10px;color:var(--muted);margin-bottom:3px;display:flex;justify-content:space-between;align-items:center">
                <input type="text" value="${esc(p.label)}" placeholder="Bezeichnung"
                  style="border:none;background:transparent;color:var(--muted);font-size:10px;flex:1;padding:0"
                  onchange="updateParam('${est.id}',${pi},'label',this.value)" onblur="saveEstQuiet('${est.id}')">
                <button onclick="deleteParam('${est.id}',${pi})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;padding:0 0 0 4px" title="Kennwert löschen">×</button>
              </div>
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
                <input type="number" step="any" value="${p.value||0}" style="flex:1;font-weight:700;font-size:13px"
                  onchange="updateParam('${est.id}',${pi},'value',parseFloat(this.value)||0)" onblur="saveEstQuiet('${est.id}')">
                <input type="text" value="${esc(p.unit||'')}" placeholder="Einh."
                  style="width:36px;border:none;background:transparent;color:var(--muted);font-size:11px;text-align:right"
                  onchange="updateParam('${est.id}',${pi},'unit',this.value)" onblur="saveEstQuiet('${est.id}')">
              </div>
              <code style="font-size:9px;color:var(--blue);cursor:pointer" title="Schlüssel – klicken zum Umbenennen"
                onclick="renameParamKey('${est.id}',${pi},prompt('Neuer Schlüssel:','${esc(p.key)}'))">${esc(p.key)}</code>
            </div>`).join('')}
          </div>`}
    </div>

    <!-- Teilkosten-Header mit Vorlagen rechts -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <h3 style="color:var(--primary);font-size:15px;margin:0">Teilkosten</h3>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
        <select onchange="loadVorlage('${est.id}',this.value);this.value=''"
          style="width:100%;padding:7px 10px;border-radius:var(--radius-btn);border:1px solid var(--border);background:var(--card);color:var(--text);font-size:13px">
          <option value="">📋 Vorlage laden…</option>
          ${vorlagen.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('')}
        </select>
        <div style="display:flex;gap:6px;width:100%">
          <button class="btn btn-secondary btn-sm" style="flex:1" onclick="saveAsVorlage('${est.id}')">💾 Als Vorlage speichern</button>
          ${vorlagen.length>0?`<button class="btn btn-secondary btn-sm" onclick="openVorlagenManager()">⚙️ Vorlagen</button>`:''}
        </div>
      </div>
    </div>

    <!-- Teile Grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
      ${defaultCards}
      ${customCards}
      ${addCard}
    </div>
    ${hiddenCards ? `<div style="margin-top:14px">${hiddenCards}</div>` : ''}
  `;
}

function renderSchaetzungTeil(){
  const est = state.estimates.find(e=>e.id===currentEstimateId);
  if(!est){currentEstimateId=null;currentEstimatePart=null;return renderSchaetzung();}
  if(typeof currentEstimatePart==='string') return renderSchaetzungCustomTeil(est);
  const tpl=EST_TEMPLATES[est.type];
  const ci=currentEstimatePart;
  const cat=tpl.categories[ci];
  const teil=TEILE[ci];
  if(!cat||!teil){currentEstimatePart=null;return renderSchaetzungDashboard();}
  return renderTeilContent(est, String(ci), teil.label, teil.icon, teil.color);
}

function renderSchaetzungCustomTeil(est){
  const catId=currentEstimatePart;
  const cat=(est.customCategories||[]).find(c=>c.id===catId);
  if(!cat){currentEstimatePart=null;return renderSchaetzungDashboard();}
  return renderTeilContent(est, catId, cat.name, '📂', 'var(--accent)', true);
}

function renderTeilContent(est, partKey, label, icon, color, isCustom=false){
  const groups=getEstGroups(est,partKey);
  const catTotal=partKeyTotal(est,partKey);
  const vorlagen=state.schaetzungGruppenVorlagen||[];
  const totalPos=groups.reduce((s,g)=>s+(g.positions||[]).length,0);
  const mode=est.quantileMode||'global';
  const globalQ=est.globalQuantile??0.5;
  const groupActive=mode==='group';
  const posActive=mode==='position';

  const paramValues=getAllParamValues(est);
  const paramDefs=est.paramDefinitions||[];
  const paramDatalist=`<datalist id="pd-${est.id}">${Object.keys(paramValues).map(k=>`<option value="${esc(k)}">${k} = ${paramValues[k]}</option>`).join('')}</datalist>`;

  const groupsHtml=groups.map((group,gi)=>{
    const gQ=group.quantile??0.5;
    const groupTotal=(group.positions||[]).reduce((s,p)=>
      s+getPosQty(p,paramValues)*getPriceForPos(p,mode,gQ,globalQ),0);
    const rows=(group.positions||[]).map((pos,pi)=>{
      const hasFormula=!!pos.formula;
      const computedQty=hasFormula?evalPosFormula(pos.formula,paramValues):null;
      const displayQty=computedQty!==null?computedQty:(pos.qty||0);
      const formulaErr=hasFormula&&computedQty===null;
      const effPrice=getPriceForPos(pos,mode,gQ,globalQ);
      const ges=displayQty*effPrice;
      const isOpen=_formulaOpen?.groupId===group.id&&_formulaOpen?.posId===pos.id;

      const formulaRow=isOpen?`<tr style="background:var(--surface-2)">
        <td colspan="7" style="padding:8px 12px;border-top:1px dashed var(--border)">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:600;color:var(--muted);white-space:nowrap">⚡ Formel:</span>
            <input type="text" id="fi-${pos.id}"
              value="${esc(pos.formula||'')}"
              placeholder="z.B. l_geschlossen * 3 + l_offen"
              list="pd-${est.id}"
              style="flex:1;min-width:180px;font-family:monospace;font-size:13px;padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text)"
              oninput="liveFormulaPreview('${pos.id}','${est.id}',this.value)"
              onchange="setFormula('${est.id}','${partKey}','${group.id}',${pi},this.value)">
            <span id="fp-${pos.id}" style="font-size:12px;font-weight:700;white-space:nowrap;color:${formulaErr?'var(--red)':'var(--green)'}">
              ${hasFormula?(computedQty!==null?`= ${computedQty.toLocaleString('de-DE')}`:'⚠ Ungültige Formel'):''}
            </span>
            ${hasFormula?`<button class="btn btn-sm btn-danger" onclick="setFormula('${est.id}','${partKey}','${group.id}',${pi},'')">Formel löschen</button>`:''}
          </div>
          ${Object.keys(paramValues).length>0?`<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap;align-items:center">
            <span style="font-size:10px;color:var(--muted)">Einfügen:</span>
            ${Object.entries(paramValues).map(([k,v])=>`<button class="btn btn-sm btn-secondary" style="font-family:monospace;font-size:11px;padding:2px 7px"
              onclick="insertParam('${pos.id}','${k}')">${esc(k)}<span style="color:var(--muted);font-family:sans-serif;font-size:10px"> ${v}</span></button>`).join('')}
          </div>`:
          `<div style="margin-top:6px;font-size:11px;color:var(--muted)">Noch keine Parameter – füge sie im Dashboard unter ⚡ Berechnungsparameter hinzu.</div>`}
        </td>
      </tr>`:'' ;

      return `<tr draggable="true"
          data-est-id="${est.id}" data-part-key="${partKey}" data-group-id="${group.id}" data-pos-id="${pos.id}"
          ondragstart="posDragStart(event)" ondragover="posDragOver(event)"
          ondragleave="posDragLeave(event)" ondrop="posDrop(event)" ondragend="dndEnd(event)"
          style="cursor:default${formulaErr?';outline:1px solid var(--red)':''}">
        <td style="cursor:grab;color:var(--muted);text-align:center;padding:6px 4px;user-select:none;vertical-align:middle">⠿</td>
        <td style="padding:4px 6px;vertical-align:middle">
          <div style="display:flex;align-items:center;gap:6px">
            <input type="text" value="${esc(pos.name)}" placeholder="Bezeichnung"
              style="width:auto;max-width:220px;border:none;background:transparent;color:var(--text);font-weight:600;font-size:13px;padding:2px;flex-shrink:0"
              onchange="updatePos('${est.id}','${partKey}','${group.id}',${pi},'name',this.value)"
              onblur="saveEstQuiet('${est.id}')">
            ${pos.priceItemId?`<input type="range" min="0" max="100" value="${Math.round((pos.quantile??0.5)*100)}"
                style="width:120%;max-width:320px;min-width:160px;height:3px;margin-left:auto;${!posActive?'opacity:.3;pointer-events:none':''}"
                title="${Math.round((pos.quantile??0.5)*100)}%"
                ondragstart="event.stopPropagation()"
                onmousedown="this.closest('tr').setAttribute('draggable','false')"
                onmouseup="this.closest('tr').setAttribute('draggable','true')"
                ontouchstart="this.closest('tr').setAttribute('draggable','false')"
                ontouchend="this.closest('tr').setAttribute('draggable','true')"
                oninput="liveQuantilePos(this,'${est.id}','${partKey}','${group.id}',${pi})"
                onchange="setQuantile('${est.id}','position','${group.id}',${pi},this.value/100)">
              <span style="font-size:9px;color:var(--muted);white-space:nowrap;min-width:22px">${Math.round((pos.quantile??0.5)*100)}%</span>`:''}
          </div>
        </td>
        <td style="padding:4px 3px;vertical-align:middle">
          ${hasFormula&&computedQty!==null
            ?`<input type="number" value="${computedQty}" readonly
                style="width:80px;text-align:right;background:var(--info-bg);color:var(--blue);font-weight:600;border-color:transparent"
                title="⚡ ${esc(pos.formula)}">`
            :`<input type="number" step="any" value="${displayQty}" style="width:80px;text-align:right"
                onchange="updatePos('${est.id}','${partKey}','${group.id}',${pi},'qty',parseFloat(this.value)||0);saveEstQuiet('${est.id}')">`}
        </td>
        <td style="padding:4px 3px;vertical-align:middle">
          <input type="text" value="${esc(pos.unit||'psch')}" style="width:52px;border:none;background:transparent;color:var(--muted);font-size:12px;text-align:center"
            onchange="updatePos('${est.id}','${partKey}','${group.id}',${pi},'unit',this.value)"
            onblur="saveEstQuiet('${est.id}')">
        </td>
        <td style="padding:4px 3px;vertical-align:middle">
          <input type="number" step="0.01" value="${effPrice}" style="width:100px;text-align:right;${pos.priceItemId?'color:var(--blue)':''}"
            ${pos.priceItemId?'readonly title="Preis aus Datenbank"':''}
            onchange="updatePos('${est.id}','${partKey}','${group.id}',${pi},'price',parseFloat(this.value)||0);saveEstQuiet('${est.id}')">
        </td>
        <td class="row-total" style="text-align:right;font-weight:700;color:var(--primary);padding:4px 8px;vertical-align:middle">${fmtEur(ges)}</td>
        <td style="padding:4px 2px;white-space:nowrap;text-align:right;vertical-align:middle">
          <button class="btn btn-sm" style="padding:3px 7px;${hasFormula?'background:var(--blue);color:#fff;border-color:var(--blue)':''}"
            onclick="toggleFormula('${group.id}','${pos.id}')" title="${hasFormula?'Formel: '+pos.formula:'Formel hinzufügen'}">⚡</button>
          <button class="btn btn-sm btn-danger" style="padding:3px 6px" onclick="deletePos('${est.id}','${partKey}','${group.id}',${pi})">×</button>
        </td>
      </tr>${formulaRow}`;
    }).join('');

    return `
      <div class="group-card" style="margin-bottom:14px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)">
        <div style="background:${color};color:#fff;padding:10px 14px;display:flex;align-items:center;gap:8px;cursor:grab;user-select:none"
             draggable="true"
             data-est-id="${est.id}" data-part-key="${partKey}" data-group-id="${group.id}"
             ondragstart="groupDragStart(event)" ondragover="groupDragOver(event)"
             ondragleave="groupDragLeave(event)" ondrop="groupDrop(event)" ondragend="dndEnd(event)">
          <span style="font-size:15px">⠿</span>
          <strong style="font-size:14px;white-space:nowrap;flex:1">${esc(group.name)}</strong>
          <div style="flex:0 0 auto;width:25%;display:flex;align-items:center;gap:6px;margin-left:auto;margin-right:10px;${!groupActive?'opacity:.4':''}">
            <input type="range" min="0" max="100" value="${Math.round(gQ*100)}"
              style="flex:1;accent-color:#fff;height:3px;opacity:${groupActive?'1':'.5'};${!groupActive?'pointer-events:none':''}"
              ondragstart="event.stopPropagation()"
              onmousedown="event.stopPropagation();this.closest('[draggable]').setAttribute('draggable','false')"
              onmouseup="this.closest('[draggable]').setAttribute('draggable','true')"
              ontouchstart="event.stopPropagation();this.closest('[draggable]').setAttribute('draggable','false')"
              ontouchend="this.closest('[draggable]').setAttribute('draggable','true')"
              ondragstart="event.stopPropagation()"
              oninput="liveQuantileGroup(this,'${est.id}','${partKey}','${group.id}')"
              onchange="setQuantile('${est.id}','group','${group.id}',null,this.value/100)">
            <span id="gq-${group.id}" style="font-size:11px;font-weight:700;color:rgba(255,255,255,.85);white-space:nowrap;min-width:28px;text-align:right">${Math.round(gQ*100)}%</span>
          </div>
          <span style="opacity:.85;font-size:13px">${fmtEur(groupTotal)}</span>
          <button onclick="event.stopPropagation();renameGroup('${est.id}','${partKey}',${gi})"
            style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:12px">✏️</button>
          <button onclick="event.stopPropagation();deleteGroup('${est.id}','${partKey}',${gi})"
            style="background:rgba(0,0,0,.25);border:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font-size:13px">×</button>
        </div>
        <table style="border-radius:0;box-shadow:none;border:none">
          <thead><tr>
            <th style="width:22px"></th>
            <th>Position</th>
            <th style="text-align:right;width:90px">Menge</th>
            <th style="width:58px;text-align:center">Einh.</th>
            <th style="text-align:right;width:110px">Preis/Einh.</th>
            <th style="text-align:right;width:110px">Gesamt</th>
            <th style="width:70px"></th>
          </tr></thead>
          <tbody>
          ${rows}
          <tr class="dnd-drop-zone"
              data-est-id="${est.id}" data-part-key="${partKey}" data-group-id="${group.id}" data-pos-id="__end__"
              ondragover="posDragOver(event)" ondragleave="posDragLeave(event)" ondrop="posDrop(event)"
              style="height:6px;transition:height .15s,background .15s">
            <td colspan="7" style="padding:0;border:none"></td>
          </tr>
          </tbody>
          <tfoot><tr style="background:var(--info-bg)">
            <td colspan="4" style="text-align:right;font-weight:600;padding:8px 10px">Summe ${esc(group.name)}:</td>
            <td colspan="2" style="text-align:right;font-weight:700;color:var(--primary)">${fmtEur(groupTotal)}</td>
            <td style="text-align:right;padding:4px;white-space:nowrap">
              <button class="btn btn-sm btn-secondary" onclick="openPriceItemPicker('${est.id}','${partKey}','${group.id}')" title="Aus Preisdatenbank">📊</button>
              <button class="btn btn-sm" onclick="addPos('${est.id}','${partKey}','${group.id}')" title="Leere Position hinzufügen">＋</button>
            </td>
          </tr></tfoot>
        </table>
      </div>`;
  }).join('');

  const sidebarHtml = `
    <div style="font-weight:700;font-size:13px;color:var(--primary);margin-bottom:10px;display:flex;align-items:center;gap:6px;padding-bottom:8px;border-bottom:1px solid var(--border)">
      📋 Katalog
    </div>

    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Vorlagen</div>
    <select onchange="loadGruppenVorlage('${est.id}','${partKey}',this.value);this.value=''"
      style="width:100%;padding:6px 8px;border-radius:var(--radius-btn);border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12px;margin-bottom:6px;box-sizing:border-box">
      <option value="">— Vorlage laden…</option>
      ${vorlagen.map(v=>`<option value="${v.id}">${esc(v.name)}</option>`).join('')}
    </select>
    <div style="display:flex;gap:6px;margin-bottom:12px">
      <button class="btn btn-secondary btn-sm" style="flex:1;justify-content:center" onclick="saveGruppenVorlage('${est.id}','${partKey}')" title="Aktuelle Gruppen als Vorlage speichern">💾 Speichern</button>
      <button class="btn btn-secondary btn-sm" style="flex:1;justify-content:center" onclick="showView('gruppenKatalog')" title="Katalog verwalten">⚙️ Verwalten</button>
    </div>

    <div style="border-top:1px solid var(--border);margin-bottom:12px"></div>

    ${vorlagen.length===0
      ? `<div style="color:var(--muted);font-size:12px;text-align:center;padding:8px 0">Noch keine Vorlagen im Katalog.</div>`
      : vorlagen.map(v=>`
          <div style="margin-bottom:12px">
            <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(v.name)}">${esc(v.name)}</div>
            ${(v.groups||[]).length===0?`<div style="color:var(--muted);font-size:11px;padding:4px 6px">Keine Gruppen</div>`:
              (v.groups||[]).map(g=>`
                <div class="katalog-item"
                  draggable="true"
                  data-vorlage-id="${v.id}" data-group-id="${g.id}"
                  ondragstart="catalogDragStart(event)"
                  ondragend="dndEnd(event)"
                  title="${esc(g.name)} · ${(g.positions||[]).length} Pos. – Ziehen zum Einfügen">
                  <span style="color:var(--muted);font-size:11px">⠿</span>
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px">${esc(g.name)}</span>
                  <span style="font-size:10px;color:var(--muted);flex-shrink:0">${(g.positions||[]).length}P</span>
                </div>
              `).join('')}
          </div>
        `).join('')
    }
  `;

  return `
    ${paramDatalist}
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="currentEstimatePart=null;render()">← Dashboard</button>
        <span style="font-size:18px">${icon}</span>
        <h2 style="margin:0">${label}</h2>
        <span class="badge aufgabe">${esc(est.name)}</span>
      </div>
    </div>

    <div class="teil-layout">
      <div class="teil-main">
        <div style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;padding:11px 16px;background:var(--card);border-radius:var(--radius);border:1px solid var(--border)">
          <span style="font-size:13px;color:var(--muted)">${groups.length} Gruppe${groups.length!==1?'n':''} · ${totalPos} Position${totalPos!==1?'en':''}</span>
          <strong style="color:var(--primary);font-size:16px">${fmtEur(catTotal)} netto</strong>
        </div>

        ${groupsHtml}

        <div class="catalog-drop-end"
          data-est-id="${est.id}" data-part-key="${partKey}"
          ondragover="catalogEndDragOver(event)"
          ondragleave="catalogEndDragLeave(event)"
          ondrop="catalogEndDrop(event)"
          onclick="addGroup('${est.id}','${partKey}')"
          style="cursor:pointer"
          title="Klicken: neue Gruppe · Ziehen: Katalog-Gruppe einfügen">
          ＋ Neue Gruppe &nbsp;·&nbsp; ↓ Katalog-Gruppe hier ablegen
        </div>
      </div>
      <div class="katalog-sidebar">
        ${sidebarHtml}
      </div>
    </div>
  `;
}

// ---- Live-Update Zeilentotal ohne re-render ----
function liveUpdateRow(input, otherVal){
  const row=input.closest('tr');
  if(!row) return;
  const qty=parseFloat(row.querySelector('input[type="number"]:nth-of-type(1)')?.value||0)||0;
  const price=parseFloat(row.querySelector('input[type="number"]:nth-of-type(2)')?.value||0)||0;
  const cell=row.querySelector('.row-total');
  if(cell) cell.textContent=fmtEur(qty*price);
}
function saveEstQuiet(estId){
  clearTimeout(window._saveTimer);
  window._saveTimer=setTimeout(()=>save('estimates'),600);
}

// ---- Quantil-Steuerung ----
async function setQuantileMode(estId, mode){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  est.quantileMode=mode;
  await save('estimates'); render();
}

async function setQuantile(estId, target, groupId, posIdx, q){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  q=Math.max(0,Math.min(1,parseFloat(q)||0));
  if(target==='global'){
    est.globalQuantile=q;
  } else if(target==='group' && groupId){
    // find group across all partKeys
    for(const key of [...TEILE.map((_,i)=>String(i)),...(est.customCategories||[]).map(c=>c.id)]){
      const groups=getEstGroups(est,key);
      const g=groups.find(x=>x.id===groupId);
      if(g){ g.quantile=q; setEstGroups(est,key,groups); break; }
    }
  } else if(target==='position' && groupId && posIdx!==null){
    for(const key of [...TEILE.map((_,i)=>String(i)),...(est.customCategories||[]).map(c=>c.id)]){
      const groups=getEstGroups(est,key);
      const g=groups.find(x=>x.id===groupId);
      if(g && g.positions[posIdx]){ g.positions[posIdx].quantile=q; setEstGroups(est,key,groups); break; }
    }
  }
  await save('estimates'); render();
}

// Live-Updates (ohne re-render, nur DOM)
function liveQuantileGlobal(input, estId){
  const q=input.value/100;
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  est.globalQuantile=q;
  input.previousElementSibling&&(input.previousElementSibling.textContent='');
  // update label
  const card=input.closest('.card');
  if(card){
    const label=card.querySelector('[data-gq-label]');
    if(label) label.textContent=Math.round(q*100)+' %';
  }
  saveEstQuiet(estId);
}
function liveQuantileGroup(input, estId, partKey, groupId){
  const q=input.value/100;
  const label=document.getElementById('gq-'+groupId);
  if(label) label.textContent=Math.round(q*100)+'%';
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const groups=getEstGroups(est,partKey);
  const g=groups.find(x=>x.id===groupId);
  if(g){ g.quantile=q; setEstGroups(est,partKey,groups); }
  saveEstQuiet(estId);
}
function liveQuantilePos(input, estId, partKey, groupId, pi){
  const q=input.value/100;
  const label=input.nextElementSibling;
  if(label) label.textContent=Math.round(q*100)+'%';
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const groups=getEstGroups(est,partKey);
  const g=groups.find(x=>x.id===groupId);
  if(g&&g.positions[pi]){ g.positions[pi].quantile=q; setEstGroups(est,partKey,groups); }
  saveEstQuiet(estId);
}


// ---- D&D State ----
let _dnd=null;
let _formulaOpen=null; // {groupId, posId}

function posDragStart(e){
  const el=e.currentTarget;
  _dnd={type:'pos',estId:el.dataset.estId,partKey:el.dataset.partKey,groupId:el.dataset.groupId,posId:el.dataset.posId};
  e.dataTransfer.effectAllowed='move';
  setTimeout(()=>{ el.style.opacity='0.35'; el.style.background='var(--surface-2)'; },0);
}
function posDragOver(e){
  if(!_dnd||_dnd.type!=='pos') return;
  e.preventDefault(); e.dataTransfer.dropEffect='move';
  const el=e.currentTarget;
  if(el.classList.contains('dnd-drop-zone')){
    el.style.height='24px'; el.style.background='var(--info-bg)';
  } else {
    el.style.borderTop='2px solid var(--primary)';
  }
}
function posDragLeave(e){
  const el=e.currentTarget;
  el.style.borderTop=''; el.style.height='6px'; el.style.background='';
}
function posDrop(e){
  e.preventDefault();
  if(!_dnd||_dnd.type!=='pos') return;
  const target=e.currentTarget;
  target.style.borderTop=''; target.style.height='6px'; target.style.background='';
  const targetGroupId=target.dataset.groupId;
  const targetPosId=target.dataset.posId;
  const targetPartKey=target.dataset.partKey;
  const est=state.estimates.find(x=>x.id===_dnd.estId); if(!est){_dnd=null;return;}
  const srcGroups=getEstGroups(est,_dnd.partKey);
  const srcGroup=srcGroups.find(g=>g.id===_dnd.groupId); if(!srcGroup){_dnd=null;return;}
  const srcIdx=(srcGroup.positions||[]).findIndex(p=>p.id===_dnd.posId); if(srcIdx<0){_dnd=null;return;}
  const [pos]=srcGroup.positions.splice(srcIdx,1);
  const tgtGroups=getEstGroups(est,targetPartKey);
  const tgtGroup=tgtGroups.find(g=>g.id===targetGroupId);
  if(!tgtGroup){srcGroup.positions.splice(srcIdx,0,pos);_dnd=null;return;}
  if(!tgtGroup.positions) tgtGroup.positions=[];
  if(targetPosId==='__end__'){
    tgtGroup.positions.push(pos);
  } else {
    const tgtIdx=tgtGroup.positions.findIndex(p=>p.id===targetPosId);
    tgtGroup.positions.splice(tgtIdx>=0?tgtIdx:tgtGroup.positions.length,0,pos);
  }
  _dnd=null;
  save('estimates').then(()=>render());
}

function groupDragStart(e){
  const el=e.currentTarget;
  _dnd={type:'group',estId:el.dataset.estId,partKey:el.dataset.partKey,groupId:el.dataset.groupId};
  e.dataTransfer.effectAllowed='move';
  e.stopPropagation();
  setTimeout(()=>{ const card=el.closest('.group-card'); if(card) card.style.opacity='0.4'; },0);
}
function groupDragOver(e){
  if(!_dnd||(_dnd.type!=='group'&&_dnd.type!=='catalog')) return;
  e.preventDefault();
  e.currentTarget.style.outline='2px solid var(--primary)';
  e.currentTarget.style.outlineOffset='-2px';
}
function groupDragLeave(e){
  e.currentTarget.style.outline='';
}
function groupDrop(e){
  e.preventDefault();
  if(!_dnd) return;
  const target=e.currentTarget;
  target.style.outline='';
  const targetGroupId=target.dataset.groupId;

  if(_dnd.type==='catalog'){
    const estId=target.dataset.estId||currentEstimateId;
    const partKey=target.dataset.partKey||currentEstimatePart;
    const est=state.estimates.find(x=>x.id===estId); if(!est){_dnd=null;return;}
    const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===_dnd.vorlageId); if(!v){_dnd=null;return;}
    const srcGroup=(v.groups||[]).find(g=>g.id===_dnd.groupId); if(!srcGroup){_dnd=null;return;}
    const groups=getEstGroups(est,partKey);
    const newGroup=JSON.parse(JSON.stringify(srcGroup));
    newGroup.id=uid();
    if(newGroup.positions) newGroup.positions=newGroup.positions.map(p=>({...p,id:uid()}));
    const tgtIdx=groups.findIndex(g=>g.id===targetGroupId);
    if(tgtIdx<0) groups.push(newGroup); else groups.splice(tgtIdx,0,newGroup);
    setEstGroups(est,partKey,groups);
    _dnd=null;
    save('estimates').then(()=>render());
    return;
  }

  if(_dnd.type!=='group'){_dnd=null;return;}
  if(_dnd.groupId===targetGroupId){_dnd=null;return;}
  const est=state.estimates.find(x=>x.id===_dnd.estId); if(!est){_dnd=null;return;}
  const groups=getEstGroups(est,_dnd.partKey);
  const srcIdx=groups.findIndex(g=>g.id===_dnd.groupId);
  const tgtIdx=groups.findIndex(g=>g.id===targetGroupId);
  if(srcIdx<0||tgtIdx<0){_dnd=null;return;}
  const [group]=groups.splice(srcIdx,1);
  groups.splice(tgtIdx,0,group);
  setEstGroups(est,_dnd.partKey,groups);
  _dnd=null;
  save('estimates').then(()=>render());
}
function dndEnd(e){
  e.currentTarget.style.opacity='';
  e.currentTarget.style.borderTop='';
  e.currentTarget.style.outline='';
  const card=e.currentTarget.closest?.('.group-card');
  if(card) card.style.opacity='';
  _dnd=null;
}

// ---- Catalog Drag ----
function catalogDragStart(e){
  const el=e.currentTarget;
  _dnd={type:'catalog',vorlageId:el.dataset.vorlageId,groupId:el.dataset.groupId};
  e.dataTransfer.effectAllowed='copy';
  e.stopPropagation();
  setTimeout(()=>{ el.style.opacity='0.5'; },0);
}
function catalogEndDragOver(e){
  if(!_dnd||_dnd.type!=='catalog') return;
  e.preventDefault();
  e.currentTarget.classList.add('dnd-over');
}
function catalogEndDragLeave(e){
  e.currentTarget.classList.remove('dnd-over');
}
async function catalogEndDrop(e){
  e.preventDefault();
  e.currentTarget.classList.remove('dnd-over');
  if(!_dnd||_dnd.type!=='catalog'){_dnd=null;return;}
  const target=e.currentTarget;
  const estId=target.dataset.estId;
  const partKey=target.dataset.partKey;
  const est=state.estimates.find(x=>x.id===estId); if(!est){_dnd=null;return;}
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===_dnd.vorlageId); if(!v){_dnd=null;return;}
  const srcGroup=(v.groups||[]).find(g=>g.id===_dnd.groupId); if(!srcGroup){_dnd=null;return;}
  const groups=getEstGroups(est,partKey);
  const newGroup=JSON.parse(JSON.stringify(srcGroup));
  newGroup.id=uid();
  if(newGroup.positions) newGroup.positions=newGroup.positions.map(p=>({...p,id:uid()}));
  groups.push(newGroup);
  setEstGroups(est,partKey,groups);
  _dnd=null;
  await save('estimates'); render();
}

// ---- Gruppen CRUD ----
async function addGroup(estId,partKey){
  const name=prompt('Name der Gruppe:','Baulos 1');
  if(!name) return;
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const groups=getEstGroups(est,partKey);
  const newGroup={id:uid(),name,positions:[]};
  groups.push(newGroup);
  setEstGroups(est,partKey,groups);
  await save('estimates'); render();
}
async function deleteGroup(estId,partKey,gi){
  if(!confirm('Gruppe und alle Positionen löschen?')) return;
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const groups=getEstGroups(est,partKey);
  groups.splice(gi,1);
  setEstGroups(est,partKey,groups);
  await save('estimates'); render();
}
async function renameGroup(estId,partKey,gi){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const groups=getEstGroups(est,partKey);
  const name=prompt('Umbenennen:',groups[gi]?.name||'');
  if(!name) return;
  groups[gi].name=name;
  await save('estimates'); render();
}

// ---- Positionen CRUD ----
async function addPos(estId,partKey,groupId){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const groups=getEstGroups(est,partKey);
  const group=groups.find(g=>g.id===groupId); if(!group) return;
  if(!group.positions) group.positions=[];
  group.positions.push({id:uid(),name:'Neue Position',unit:'psch',qty:1,price:0});
  setEstGroups(est,partKey,groups);
  await save('estimates'); render();
}
async function deletePos(estId,partKey,groupId,pi){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const groups=getEstGroups(est,partKey);
  const group=groups.find(g=>g.id===groupId); if(!group) return;
  group.positions.splice(pi,1);
  await save('estimates'); render();
}
function updatePos(estId,partKey,groupId,pi,field,value){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const groups=getEstGroups(est,partKey);
  const group=groups.find(g=>g.id===groupId); if(!group) return;
  if(group.positions[pi]) group.positions[pi][field]=value;
}

// ---- Formel-Funktionen ----
function toggleFormula(groupId,posId){
  if(_formulaOpen?.groupId===groupId&&_formulaOpen?.posId===posId){
    _formulaOpen=null;
  } else {
    _formulaOpen={groupId,posId};
  }
  render();
}

function liveFormulaPreview(posId,estId,formula){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const el=document.getElementById('fp-'+posId); if(!el) return;
  if(!formula.trim()){ el.textContent=''; return; }
  const r=evalPosFormula(formula,getAllParamValues(est));
  if(r===null){
    el.textContent='⚠ Ungültige Formel';
    el.style.color='var(--red)';
  } else {
    el.textContent='= '+r.toLocaleString('de-DE');
    el.style.color='var(--green)';
  }
}

async function setFormula(estId,partKey,groupId,pi,formula){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const groups=getEstGroups(est,partKey);
  const group=groups.find(g=>g.id===groupId); if(!group) return;
  const pos=group.positions[pi]; if(!pos) return;
  const f=formula.trim();
  pos.formula=f||null;
  if(pos.formula){
    const r=evalPosFormula(pos.formula,getAllParamValues(est));
    if(r!==null) pos.qty=r;
  }
  setEstGroups(est,partKey,groups);
  await save('estimates'); render();
}

function insertParam(posId,paramKey){
  const input=document.getElementById('fi-'+posId); if(!input) return;
  const s=input.selectionStart, e=input.selectionEnd;
  input.value=input.value.slice(0,s)+paramKey+input.value.slice(e);
  input.setSelectionRange(s+paramKey.length,s+paramKey.length);
  input.focus();
  input.dispatchEvent(new Event('input'));
}

// ---- Parameter CRUD ----
async function addParam(estId){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  if(!est.paramDefinitions) est.paramDefinitions=[];
  const label=prompt('Bezeichnung des Parameters:','Länge geschl. Bauweise');
  if(!label) return;
  let key=label.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9_]/g,'_').replace(/^[^a-z_]/,'p$&').replace(/__+/g,'_').slice(0,20);
  const existing=est.paramDefinitions.map(p=>p.key);
  let attempt=key, n=2;
  while(existing.includes(attempt)) attempt=key+'_'+n++;
  est.paramDefinitions.push({id:uid(),key:attempt,label,value:0,unit:''});
  await save('estimates'); render();
}

function updateParam(estId,pi,field,value){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  if(!est.paramDefinitions?.[pi]) return;
  est.paramDefinitions[pi][field]=value;
  // Recompute formula-linked positions live
  if(field==='value') _recomputeFormulas(est);
}

async function renameParamKey(estId,pi,newKey){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const p=est.paramDefinitions?.[pi]; if(!p) return;
  const cleaned=newKey.trim().replace(/[^a-zA-Z0-9_]/g,'_').replace(/^[^a-zA-Z_]/,'p$&').slice(0,30);
  if(!cleaned||cleaned===p.key){ saveEstQuiet(estId); return; }
  const refs=countFormulaRefs(p.key,est);
  if(refs>0){
    if(!confirm(`Der Schlüssel "${p.key}" wird in ${refs} Formel${refs>1?'n':''} verwendet. Umbenennen bricht diese Formeln!\n\nTrotzdem umbenennen?`)){
      render(); return;
    }
  }
  p.key=cleaned;
  await save('estimates'); render();
}

async function deleteParam(estId,pi){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const p=est.paramDefinitions?.[pi]; if(!p) return;
  const refs=countFormulaRefs(p.key,est);
  if(refs>0){
    if(!confirm(`Achtung: "${p.key}" wird in ${refs} Formel${refs>1?'n':''} verwendet. Löschen bricht diese Formeln!\n\nTrotzdem löschen?`)) return;
  } else {
    if(!confirm(`Parameter "${p.label}" löschen?`)) return;
  }
  est.paramDefinitions.splice(pi,1);
  await save('estimates'); render();
}

function _recomputeFormulas(est){
  const pv=getAllParamValues(est);
  const recompute=positions=>{
    (positions||[]).forEach(pos=>{
      if(pos.formula){
        const r=evalPosFormula(pos.formula,pv);
        if(r!==null) pos.qty=r;
      }
    });
  };
  TEILE.forEach((_,ci)=>getEstGroups(est,String(ci)).forEach(g=>recompute(g.positions)));
  (est.customCategories||[]).forEach(cat=>getEstGroups(est,cat.id).forEach(g=>recompute(g.positions)));
  saveEstQuiet(est.id);
}


async function saveGruppenVorlage(estId,partKey){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const name=prompt('Name der Gruppen-Vorlage:','Vorlage '+new Date().toLocaleDateString('de-DE'));
  if(!name) return;
  if(!state.schaetzungGruppenVorlagen) state.schaetzungGruppenVorlagen=[];
  const groups=JSON.parse(JSON.stringify(getEstGroups(est,partKey)));
  state.schaetzungGruppenVorlagen.push({id:uid(),name,groups});
  await save('schaetzungGruppenVorlagen');
  alert(`✓ Vorlage „${name}" gespeichert`);
  render();
}
async function loadGruppenVorlage(estId,partKey,vorlageId){
  if(!vorlageId) return;
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===vorlageId); if(!v) return;
  if(!confirm(`Vorlage „${v.name}" laden? Aktuelle Gruppen werden ersetzt.`)) return;
  const groups=JSON.parse(JSON.stringify(v.groups||[])).map(g=>({
    ...g,id:uid(),positions:(g.positions||[]).map(p=>({...p,id:uid()}))
  }));
  setEstGroups(est,partKey,groups);
  await save('estimates'); render();
}
function openGruppenVorlagenManager(){
  const vorlagen=state.schaetzungGruppenVorlagen||[];
  openModal(`
    <h3 style="margin-bottom:16px">📋 Gruppen-Vorlagen</h3>
    ${vorlagen.length===0?'<p style="color:var(--muted);font-size:13px">Noch keine Vorlagen gespeichert.</p>':
    `<div style="display:flex;flex-direction:column;gap:8px;max-height:380px;overflow-y:auto">
      ${vorlagen.map(v=>`
        <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border)">
          <span style="flex:1;font-weight:600;font-size:14px">${esc(v.name)}</span>
          <span style="font-size:11px;color:var(--muted)">${(v.groups||[]).length} Gruppen</span>
          <button class="btn btn-sm btn-secondary" onclick="copyGruppenVorlage('${v.id}')">📋</button>
          <button class="btn btn-sm btn-secondary" onclick="renameGruppenVorlage('${v.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteGruppenVorlage('${v.id}')">🗑️</button>
        </div>`).join('')}
    </div>`}
    <div class="modal-actions" style="margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
    </div>
  `);
}
async function copyGruppenVorlage(id){
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===id); if(!v) return;
  const name=prompt('Name der Kopie:',v.name+' (Kopie)');
  if(!name) return;
  state.schaetzungGruppenVorlagen.push({...JSON.parse(JSON.stringify(v)),id:uid(),name});
  await save('schaetzungGruppenVorlagen');
  openGruppenVorlagenManager();
}
async function renameGruppenVorlage(id){
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===id); if(!v) return;
  const name=prompt('Neuer Name:',v.name); if(!name) return;
  v.name=name; await save('schaetzungGruppenVorlagen');
  openGruppenVorlagenManager();
}
async function deleteGruppenVorlage(id){
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===id); if(!v) return;
  if(!confirm(`Vorlage „${v.name}" löschen?`)) return;
  state.schaetzungGruppenVorlagen=state.schaetzungGruppenVorlagen.filter(x=>x.id!==id);
  await save('schaetzungGruppenVorlagen');
  if(!(state.schaetzungGruppenVorlagen||[]).length){closeModal();render();}
  else openGruppenVorlagenManager();
}

// ---- Gruppen-Katalog CRUD ----
async function addGruppenVorlage(){
  const name=prompt('Name der neuen Vorlage:','Neue Vorlage');
  if(!name) return;
  if(!state.schaetzungGruppenVorlagen) state.schaetzungGruppenVorlagen=[];
  state.schaetzungGruppenVorlagen.push({id:uid(),name,groups:[]});
  await save('schaetzungGruppenVorlagen');
  render();
}
async function addKatalogGroup(vorlageId){
  const name=prompt('Name der Gruppe:','Neue Gruppe');
  if(!name) return;
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===vorlageId); if(!v) return;
  if(!v.groups) v.groups=[];
  v.groups.push({id:uid(),name,positions:[]});
  await save('schaetzungGruppenVorlagen'); render();
}
async function renameKatalogGroup(vorlageId,groupId){
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===vorlageId); if(!v) return;
  const g=(v.groups||[]).find(x=>x.id===groupId); if(!g) return;
  const name=prompt('Neuer Gruppenname:',g.name); if(!name) return;
  g.name=name; await save('schaetzungGruppenVorlagen'); render();
}
async function deleteKatalogGroup(vorlageId,groupId){
  if(!confirm('Gruppe aus Katalog löschen?')) return;
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===vorlageId); if(!v) return;
  v.groups=(v.groups||[]).filter(g=>g.id!==groupId);
  await save('schaetzungGruppenVorlagen'); render();
}
async function addKatalogPos(vorlageId,groupId){
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===vorlageId); if(!v) return;
  const g=(v.groups||[]).find(x=>x.id===groupId); if(!g) return;
  if(!g.positions) g.positions=[];
  g.positions.push({id:uid(),name:'Neue Position',qty:1,unit:'psch',price:0});
  await save('schaetzungGruppenVorlagen'); render();
}
async function updateKatalogPos(vorlageId,groupId,pi,field,value){
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===vorlageId); if(!v) return;
  const g=(v.groups||[]).find(x=>x.id===groupId); if(!g||!g.positions[pi]) return;
  g.positions[pi][field]=value;
  await save('schaetzungGruppenVorlagen');
}
async function deleteKatalogPos(vorlageId,groupId,pi){
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===vorlageId); if(!v) return;
  const g=(v.groups||[]).find(x=>x.id===groupId); if(!g) return;
  g.positions.splice(pi,1);
  await save('schaetzungGruppenVorlagen'); render();
}
async function renameGruppenVorlageKatalog(id){
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===id); if(!v) return;
  const name=prompt('Neuer Name:',v.name); if(!name) return;
  v.name=name; await save('schaetzungGruppenVorlagen'); render();
}
async function copyGruppenVorlageKatalog(id){
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===id); if(!v) return;
  const name=prompt('Name der Kopie:',v.name+' (Kopie)'); if(!name) return;
  state.schaetzungGruppenVorlagen.push({...JSON.parse(JSON.stringify(v)),id:uid(),name});
  await save('schaetzungGruppenVorlagen'); render();
}
async function deleteGruppenVorlageKatalog(id){
  const v=(state.schaetzungGruppenVorlagen||[]).find(x=>x.id===id); if(!v) return;
  if(!confirm(`Vorlage „${v.name}" löschen?`)) return;
  state.schaetzungGruppenVorlagen=state.schaetzungGruppenVorlagen.filter(x=>x.id!==id);
  await save('schaetzungGruppenVorlagen'); render();
}

function livePricePicker(input){
  const q=input.value/100;
  const label=document.getElementById('pp-q-label');
  if(label) label.textContent=Math.round(q*100)+'%';
  // Update all price cells in the table live
  const rows=document.querySelectorAll('[data-pp-item]');
  rows.forEach(row=>{
    const itemId=row.getAttribute('data-pp-item');
    const item=state.priceItems.find(i=>i.id===itemId); if(!item) return;
    const prices=(item.history||[]).map(h=>h.price).filter(p=>!isNaN(p));
    if(!prices.length) return;
    const price=quantile(prices,q);
    const cell=row.querySelector('.pp-price');
    if(cell) cell.textContent=fmtEur(price);
  });
}


let _pickerCtx = null; // { estId, partKey, groupId, prefillItemId }

function openPriceItemPicker(estId, partKey, groupId, prefillItemId=null){
  _pickerCtx = { estId, partKey, groupId };
  _renderPricePickerModal('', 0.5, prefillItemId);
}

function _renderPricePickerModal(searchTerm, q, highlightId=null){
  const items = state.priceItems;
  if(items.length===0){
    openModal(`
      <h3 style="margin-bottom:12px">📊 Aus Preisdatenbank</h3>
      <p style="color:var(--muted);font-size:13px">Die Preisdatenbank ist noch leer. Füge zuerst Positionen unter <strong>💰 Preisdatenbank</strong> hinzu.</p>
      <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Schließen</button></div>
    `);
    return;
  }

  const categories = [...new Set(items.map(i=>i.category).filter(Boolean))].sort();
  const term = searchTerm.toLowerCase();
  const filtered = items.filter(i=>
    !term ||
    i.name.toLowerCase().includes(term) ||
    (i.category||'').toLowerCase().includes(term)
  );

  const rows = filtered.map(item=>{
    const prices=(item.history||[]).map(h=>h.price).filter(p=>!isNaN(p));
    const pMin = prices.length ? Math.min(...prices) : 0;
    const pMax = prices.length ? Math.max(...prices) : 0;
    const pQ   = quantile(prices, q);
    const isHl = item.id === highlightId;
    return `
      <tr data-pp-item="${item.id}" style="cursor:pointer;${isHl?'background:var(--info-bg)':''}"
          onclick="selectPriceItem('${item.id}',document.querySelector('#pp-q-label')?parseInt(document.querySelector('#pp-q-label').textContent)/100:${q})"
          onmouseenter="this.style.background='var(--surface-2)'"
          onmouseleave="this.style.background='${isHl?'var(--info-bg)':''}'">
        <td style="padding:8px 10px">
          <div style="font-weight:600;font-size:13px">${esc(item.name)}</div>
          ${item.category?`<div style="font-size:11px;color:var(--muted)">${esc(item.category)}</div>`:''}
        </td>
        <td style="padding:8px 6px;font-size:12px;color:var(--muted);white-space:nowrap">${esc(item.unit||'')}</td>
        <td style="padding:8px 6px;font-size:11px;color:var(--muted);white-space:nowrap">
          ${prices.length?`${fmtEur(pMin)} – ${fmtEur(pMax)}`:'–'}
          <div style="font-size:10px">${prices.length} Preise</div>
        </td>
        <td class="pp-price" style="padding:8px 10px;text-align:right;font-weight:700;color:var(--primary);white-space:nowrap">${fmtEur(pQ)}</td>
        <td style="padding:8px 6px">
          <button class="btn btn-sm" onclick="event.stopPropagation();selectPriceItem('${item.id}',document.querySelector('#pp-q-label')?parseInt(document.querySelector('#pp-q-label').textContent)/100:${q})">＋</button>
        </td>
      </tr>`;
  }).join('');

  openModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h3 style="margin:0">📊 Aus Preisdatenbank</h3>
      <button class="btn btn-secondary btn-sm" onclick="closeModal()">✕</button>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center">
      <input type="text" placeholder="Suchen…" value="${esc(searchTerm)}"
        style="flex:1;min-width:160px;padding:8px 10px;border-radius:var(--radius-btn);border:1px solid var(--border);background:var(--card);color:var(--text)"
        oninput="_renderPricePickerModal(this.value,${q})">
      <div style="display:flex;align-items:center;gap:8px;min-width:220px">
        <span style="font-size:11px;color:var(--muted);white-space:nowrap">Günstig</span>
        <input type="range" min="0" max="100" value="${Math.round(q*100)}" style="flex:1"
          oninput="livePricePicker(this)"
          onchange="_renderPricePickerModal('${esc(searchTerm)}',this.value/100)">
        <span style="font-size:11px;color:var(--muted);white-space:nowrap">Teuer</span>
        <span id="pp-q-label" style="font-size:12px;font-weight:600;color:var(--primary);min-width:32px">${Math.round(q*100)}%</span>
      </div>
    </div>

    <div style="max-height:380px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius)">
      ${filtered.length===0?`<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px">Keine Einträge gefunden.</div>`:`
      <table style="border-radius:0;box-shadow:none;border:none">
        <thead><tr>
          <th>Position</th><th>Einh.</th><th>Preisspanne</th><th style="text-align:right">@ ${Math.round(q*100)}%</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`}
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--muted)">
      ${filtered.length} von ${items.length} Einträgen · Quantil-Slider wählt den Preis aus dem Preisverlauf
    </div>
  `);
}

async function selectPriceItem(itemId, q){
  if(!_pickerCtx) return;
  const item = state.priceItems.find(i=>i.id===itemId); if(!item) return;
  const prices = (item.history||[]).map(h=>h.price).filter(p=>!isNaN(p));
  const price = quantile(prices, q);
  const {estId, partKey, groupId} = _pickerCtx;
  const est = state.estimates.find(e=>e.id===estId); if(!est) return;
  const groups = getEstGroups(est, partKey);
  const group = groups.find(g=>g.id===groupId); if(!group) return;
  if(!group.positions) group.positions=[];
  group.positions.push({
    id: uid(),
    name: item.name,
    unit: item.unit||'psch',
    qty: 1,
    price: Math.round(price*100)/100,
    priceItemId: item.id,
    quantile: q
  });
  setEstGroups(est, partKey, groups);
  await save('estimates');
  closeModal();
  render();
}
// ---- Eigene Kategorien ----
async function addEstCustomCat(estId){
  const name=prompt('Name des Bereichs:','Sonstiges');
  if(!name) return;
  const est=state.estimates.find(e=>e.id===estId);
  if(!est.customCategories) est.customCategories=[];
  const newCat = {id:uid(),name,lines:[]};
  est.customCategories.push(newCat);
  await save('estimates');
  currentEstimatePart = newCat.id;
  render();
}
async function deleteEstCustomCat(estId,catId){
  if(!confirm('Bereich löschen?')) return;
  const est=state.estimates.find(e=>e.id===estId);
  est.customCategories=(est.customCategories||[]).filter(c=>c.id!==catId);
  if(currentEstimatePart===catId) currentEstimatePart=null;
  await save('estimates'); render();
}
async function renameEstCustomCat(estId,catId){
  const est=state.estimates.find(e=>e.id===estId);
  const cat=(est.customCategories||[]).find(c=>c.id===catId);
  const name=prompt('Umbenennen:',cat.name);
  if(!name) return;
  cat.name=name; await save('estimates'); render();
}

// ---- Default Teile ein-/ausblenden ----
async function hideDefaultTeil(estId, ci){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  if(!est.hiddenDefaultTeile) est.hiddenDefaultTeile=[];
  if(!est.hiddenDefaultTeile.includes(ci)) est.hiddenDefaultTeile.push(ci);
  await save('estimates'); render();
}
async function showDefaultTeil(estId, ci){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  est.hiddenDefaultTeile=(est.hiddenDefaultTeile||[]).filter(i=>i!==ci);
  await save('estimates'); render();
}

// ---- Vorlagen ----
async function saveAsVorlage(estId){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const name=prompt('Name der Vorlage:','Vorlage '+new Date().toLocaleDateString('de-DE'));
  if(!name) return;
  if(!state.schaetzungVorlagen) state.schaetzungVorlagen=[];
  // Deep-copy custom categories ohne Mengendaten (nur Struktur)
  const customCats = JSON.parse(JSON.stringify(est.customCategories||[])).map(cat=>({
    ...cat, id:uid(), lines:(cat.lines||[]).map(l=>({...l}))
  }));
  state.schaetzungVorlagen.push({
    id:uid(), name,
    hiddenDefaultTeile: [...(est.hiddenDefaultTeile||[])],
    customCategories: customCats
  });
  await save('schaetzungVorlagen');
  alert(`✓ Vorlage „${name}" gespeichert`);
  render();
}

async function loadVorlage(estId, vorlageId){
  if(!vorlageId) return;
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  const v=state.schaetzungVorlagen.find(x=>x.id===vorlageId); if(!v) return;
  if(!confirm(`Vorlage „${v.name}" anwenden? Bestehende eigene Bereiche werden ersetzt.`)) return;
  est.hiddenDefaultTeile=[...(v.hiddenDefaultTeile||[])];
  est.customCategories=JSON.parse(JSON.stringify(v.customCategories||[])).map(cat=>({
    ...cat, id:uid()
  }));
  currentEstimatePart=null;
  await save('estimates'); render();
}

function openVorlagenManager(){
  const vorlagen = state.schaetzungVorlagen||[];
  openModal(`
    <h3 style="margin-bottom:16px">📋 Vorlagen verwalten</h3>
    ${vorlagen.length===0?'<p style="color:var(--muted);font-size:13px">Noch keine Vorlagen gespeichert.</p>':
    `<div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto">
      ${vorlagen.map(v=>`
        <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border)">
          <span style="flex:1;font-weight:600;font-size:14px">${esc(v.name)}</span>
          <span style="font-size:12px;color:var(--muted)">${(v.hiddenDefaultTeile||[]).length} ausgeblendet · ${(v.customCategories||[]).length} eigene</span>
          <button class="btn btn-sm btn-secondary" onclick="copyVorlage('${v.id}')">📋 Kopieren</button>
          <button class="btn btn-sm btn-secondary" onclick="renameVorlage('${v.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteVorlage('${v.id}')">🗑️</button>
        </div>`).join('')}
    </div>`}
    <div class="modal-actions" style="margin-top:16px">
      <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
    </div>
  `);
}

async function copyVorlage(vorlageId){
  const v=state.schaetzungVorlagen.find(x=>x.id===vorlageId); if(!v) return;
  const name=prompt('Name der Kopie:',v.name+' (Kopie)');
  if(!name) return;
  state.schaetzungVorlagen.push({
    ...JSON.parse(JSON.stringify(v)), id:uid(), name
  });
  await save('schaetzungVorlagen');
  openVorlagenManager();
}

async function renameVorlage(vorlageId){
  const v=state.schaetzungVorlagen.find(x=>x.id===vorlageId); if(!v) return;
  const name=prompt('Neuer Name:',v.name);
  if(!name) return;
  v.name=name;
  await save('schaetzungVorlagen');
  openVorlagenManager();
}

async function deleteVorlage(vorlageId){
  const v=state.schaetzungVorlagen.find(x=>x.id===vorlageId); if(!v) return;
  if(!confirm(`Vorlage „${v.name}" löschen?`)) return;
  state.schaetzungVorlagen=state.schaetzungVorlagen.filter(x=>x.id!==vorlageId);
  await save('schaetzungVorlagen');
  if((state.schaetzungVorlagen||[]).length===0){ closeModal(); render(); }
  else openVorlagenManager();
}

// ---- Positionen hinzufügen (Template-Extra + Custom) ----
let _estAddTarget=null;
function openEstPositionPicker(estId,targetType,targetRef){
  _estAddTarget={estId,targetType,targetRef};
  openModal(`
    <h3>Position hinzufügen</h3>
    ${state.priceItems.length>0?`
    <div style="margin-bottom:14px">
      <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase">Aus Preisdatenbank wählen</div>
      <input type="text" id="estPosSearch" placeholder="🔍 Suchen…" oninput="filterEstPos(this.value)" style="margin-bottom:6px">
      <div id="estPosList" style="max-height:160px;overflow-y:auto;border:1px solid var(--border);border-radius:6px">
        ${state.priceItems.map(it=>{const s=priceStats(it);return `<div class="est-pos-item"
          data-name="${esc(it.name.toLowerCase())}"
          style="padding:8px 10px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"
          onclick="selectEstPosFromDB('${it.id}')"
          onmouseover="this.style.background='var(--info-bg)'" onmouseout="this.style.background=''">
          <div><strong style="font-size:13px">${esc(it.name)}</strong><br><small style="color:var(--muted)">${esc(it.category||'')} • ${esc(it.unit)}</small></div>
          <div style="text-align:right;font-size:12px;color:var(--muted);margin-left:8px">Median:<br><strong>${s.n?fmtEur(s.median):'-'}</strong></div>
        </div>`}).join('')}
      </div>
    </div>
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:8px;text-transform:uppercase">Manuelle Eingabe</div>
    `:''}
    <input type="hidden" id="estPosPriceItemId" value="">
    <div class="form-group"><label>Bezeichnung *</label><input id="estPosName" placeholder="z.B. Sondermaßnahme"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <div class="form-group"><label>Menge</label><input type="number" id="estPosQty" step="any" value="1"></div>
      <div class="form-group"><label>Einheit</label><input id="estPosUnit" value="psch"></div>
      <div class="form-group"><label>Preis/Einheit (€)</label><input type="number" id="estPosPrice" step="0.01" value="0"></div>
    </div>
    <div class="form-group"><label>Notiz</label><input id="estPosNote" placeholder="Optional"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn" onclick="confirmAddEstPosition()">Hinzufügen</button>
    </div>
  `);
}
function filterEstPos(q){
  const ql=q.toLowerCase();
  document.querySelectorAll('.est-pos-item').forEach(el=>{
    el.style.display=el.dataset.name.includes(ql)?'':'none';
  });
}
function selectEstPosFromDB(itemId){
  const it=state.priceItems.find(i=>i.id===itemId); if(!it) return;
  const s=priceStats(it);
  document.getElementById('estPosPriceItemId').value=itemId;
  document.getElementById('estPosName').value=it.name;
  document.getElementById('estPosUnit').value=it.unit||'psch';
  document.getElementById('estPosPrice').value=s.n?s.median.toFixed(2):0;
  document.getElementById('estPosNote').value=it.category||'';
}
async function confirmAddEstPosition(){
  const name=(document.getElementById('estPosName').value||'').trim();
  if(!name){alert('Bitte Bezeichnung eingeben.');return;}
  const newLine={
    id:uid(), name,
    unit:document.getElementById('estPosUnit').value||'psch',
    quantity:parseFloat(document.getElementById('estPosQty').value)||1,
    price:parseFloat(document.getElementById('estPosPrice').value)||0,
    note:document.getElementById('estPosNote').value||'',
    priceItemId:document.getElementById('estPosPriceItemId').value||null
  };
  const {estId,targetType,targetRef}=_estAddTarget;
  const est=state.estimates.find(e=>e.id===estId);
  if(targetType==='template'){
    if(!est.extraLines) est.extraLines={};
    if(!est.extraLines[targetRef]) est.extraLines[targetRef]=[];
    est.extraLines[targetRef].push(newLine);
  } else {
    const cat=(est.customCategories||[]).find(c=>c.id===String(targetRef));
    if(cat){if(!cat.lines) cat.lines=[]; cat.lines.push(newLine);}
  }
  await save('estimates'); closeModal(); render();
}
async function updateEstExtraLine(estId,ci,eli,field,value){
  const est=state.estimates.find(e=>e.id===estId);
  est.extraLines[ci][eli][field]=value;
  await save('estimates'); render();
}
async function deleteEstExtraLine(estId,ci,eli){
  const est=state.estimates.find(e=>e.id===estId);
  est.extraLines[ci].splice(eli,1);
  await save('estimates'); render();
}
async function updateEstCustomLine(estId,catId,li,field,value){
  const est=state.estimates.find(e=>e.id===estId);
  const cat=(est.customCategories||[]).find(c=>c.id===catId);
  if(cat) cat.lines[li][field]=value;
  await save('estimates'); render();
}
async function deleteEstCustomLine(estId,catId,li){
  const est=state.estimates.find(e=>e.id===estId);
  const cat=(est.customCategories||[]).find(c=>c.id===catId);
  if(cat) cat.lines.splice(li,1);
  await save('estimates'); render();
}

function newEstimate(){
  openModal(`
    <h3>Neue Kostenschätzung</h3>
    <div class="form-group">
      <label>Name</label>
      <input id="estName" placeholder="z.B. PV-Anlage Wetzen 2026" autofocus>
    </div>
    <div class="form-group">
      <label>Projekttyp</label>
      <select id="estType">
        ${Object.entries(EST_TEMPLATES).map(([k,t])=>`<option value="${k}">${esc(t.label)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Projekt</label>
      <select id="estProject">
        <option value="">— Kein Projekt —</option>
        ${state.projects.map(p=>`<option value="${p.id}" ${state.currentProject===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn btn-secondary" onclick="alert('Wizard kommt bald!')">🧙 Wizard</button>
      <button class="btn" onclick="confirmNewEstimate()">Erstellen</button>
    </div>
  `);
}

async function confirmNewEstimate(){
  const name=(document.getElementById('estName').value||'').trim();
  if(!name){alert('Bitte einen Namen eingeben.');return;}
  const type=document.getElementById('estType').value;
  const projectId=document.getElementById('estProject').value||null;
  const est={
    id:uid(), name, type, projectId,
    paramOverrides:{}, lineOverrides:{},
    created:new Date().toISOString()
  };
  state.estimates.push(est);
  await save('estimates');
  closeModal();
  currentEstimateId=est.id;
  render();
}

async function deleteEstimate(id){
  if(!confirm('Schätzung löschen?')) return;
  state.estimates=state.estimates.filter(e=>e.id!==id);
  await save('estimates'); render();
}

async function renameEstimate(id){
  const est=state.estimates.find(e=>e.id===id);
  const name=prompt('Name:',est.name);
  if(!name) return;
  est.name=name; await save('estimates'); render();
}

async function setEstParam(estId,key,value){
  const est=state.estimates.find(e=>e.id===estId); if(!est) return;
  if(!est.paramOverrides) est.paramOverrides={};
  est.paramOverrides[key]=value;
  // Bidirektional: auch ins Projekt zurückschreiben
  const proj=state.projects.find(p=>p.id===est.projectId);
  if(proj&&proj.type===est.type){
    if(!proj.params) proj.params={};
    proj.params[key]=value;
    await save('projects');
  }
  _recomputeFormulas(est);
  await save('estimates'); render();
}

async function resetEstParam(estId,key){
  const est=state.estimates.find(e=>e.id===estId);
  delete est.paramOverrides[key];
  await save('estimates'); render();
}

async function setEstLine(estId,key,field,value){
  const est=state.estimates.find(e=>e.id===estId);
  if(!est.lineOverrides) est.lineOverrides={};
  if(!est.lineOverrides[key]) est.lineOverrides[key]={};
  if(value===null){ delete est.lineOverrides[key][field]; }
  else { est.lineOverrides[key][field]=value; }
  await save('estimates'); render();
}

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
    return `<span class="badge ${map[s]||''}">${label[s]||s}</span>`;
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
        <td class="actions-cell">
          <button class="btn btn-sm btn-secondary" onclick="editPruefung('${p.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deletePruefung('${p.id}')">🗑️</button>
        </td>
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
  if(!confirm('Prüfung löschen?')) return;
  state.pruefungen=state.pruefungen.filter(p=>p.id!==id);
  await save('pruefungen'); render();
}

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
        <button class="btn btn-secondary" onclick="showImportHelp()">❓ Hilfe</button>
        <button class="btn btn-secondary" onclick="exportMSProjectXML()">⬆️ XML-Export</button>
        <button class="btn btn-secondary" onclick="document.getElementById('mppImport').click()">⬇️ XML-Import</button>
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
// MS-Project: 0=FF(EE), 1=FS(EA), 2=SS(AA), 3=SF(AE)
const MSP_DEP_TYPE = {0:'EE', 1:'EA', 2:'AA', 3:'AE'};
const DEP_TO_MSP   = {EE:0, EA:1, AA:2, AE:3};
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

// Exports - sehr viele Funktionen
window.renderPreisdatenbank = renderPreiseMitZurueck;
window.editPrice = editPrice;
window.savePrice = savePrice;
window.deletePrice = deletePrice;
window.renderKalkulationen = renderKalkulationen;
window.renderKalkulationDetail = renderKalkulationDetail;
window.editCalc = editCalc;
window.saveCalc = saveCalc;
window.deleteCalc = deleteCalc;
window.addCalcItem = addCalcItem;
window.updateCalcItem = updateCalcItem;
window.deleteCalcItem = deleteCalcItem;
window.setKalcShowPreise = setKalcShowPreise;
window.renderSchaetzungen = renderSchaetzungen;
window.renderSchaetzungDetail = renderSchaetzungDetail;
window.editEstimate = editEstimate;
window.saveEstimate = saveEstimate;
window.deleteEstimate = deleteEstimate;
window.showPart = showPart;
window.addEstTeil = addEstTeil;
window.saveEstTeilName = saveEstTeilName;
window.deleteEstTeil = deleteEstTeil;
window.addEstGruppe = addEstGruppe;
window.updateEstGruppe = updateEstGruppe;
window.deleteEstGruppe = deleteEstGruppe;
window.dragGroupStart = dragGroupStart;
window.dragGroupOver = dragGroupOver;
window.dropGroup = dropGroup;
window.addEstPosition = addEstPosition;
window.updateEstPosition = updateEstPosition;
window.deleteEstPosition = deleteEstPosition;
window.setEstQuantile = setEstQuantile;
window.setEstGruppeQuantile = setEstGruppeQuantile;
window.setEstPosQuantile = setEstPosQuantile;
window.getAllParamValues = getAllParamValues;
window.openEstVorlagenManager = openEstVorlagenManager;
window.saveAsEstVorlage = saveAsEstVorlage;
window.loadEstVorlage = loadEstVorlage;
window.deleteEstVorlage = deleteEstVorlage;
window.openGruppenKatalog = openGruppenKatalog;
window.saveGruppeAsVorlage = saveGruppeAsVorlage;
window.applyGruppenVorlage = applyGruppenVorlage;
window.deleteGruppenVorlage = deleteGruppenVorlage;
