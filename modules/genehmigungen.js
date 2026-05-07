// ============ GENEHMIGUNGEN ============
const VALID_GENEHM_TABS = ['anlage','kabeltrasse','wegebau','nutzungsvertraege'];
let genehmTab = (() => {
  const stored = sessionStorage.getItem('genehmTab');
  return VALID_GENEHM_TABS.includes(stored) ? stored : 'anlage';
})();
let genehmSubView = null;
let activeInlineNB = null;

const GENEHM_STATUS = {
  ausstehend:      {label:'Ausstehend',      color:'var(--red)'},
  beantragt:       {label:'Beantragt',       color:'var(--yellow)'},
  erteilt:         {label:'Erteilt',         color:'var(--blue)'},
  bestandskraeftig:{label:'Bestandskräftig', color:'var(--green)'},
};
const NV_STATUS = {
  aktiv:      {label:'Aktiv',      color:'var(--green)'},
  ausstehend: {label:'Ausstehend', color:'var(--yellow)'},
  abgelaufen: {label:'Abgelaufen', color:'var(--red)'},
  gekuendigt: {label:'Gekündigt',  color:'var(--muted)'},
};
const NB_STATUS = {
  offen:          {label:'Offen',          color:'var(--red)'},
  in_bearbeitung: {label:'In Bearbeitung', color:'var(--yellow)'},
  erfuellt:       {label:'Erfüllt',        color:'var(--green)'},
};
const VORPRUEF_STATUS = {
  offen:          {label:'Fehlt',      color:'var(--red)'},
  beantragt:      {label:'Beantragt',  color:'var(--yellow)'},
  vorhanden:      {label:'Vorhanden',  color:'var(--green)'},
  nicht_relevant: {label:'Entfällt',   color:'var(--muted)'},
};
const QUERUNG_TYP_COLOR = {
  BAB:'#dc2626', Gewässer:'#2563eb', Bahn:'#7c3aed',
  Gemeindestraße:'#d97706', Privatweg:'#6b7280', Leitung:'#0891b2', Sonstige:'#6b7280',
};
const GENEHM_TYP_LABELS = {
  BImSchG:'BImSchG-Bescheid', Baugenehmigung:'Baugenehmigung', LBP:'LBP / Naturschutz',
  Wasserrecht_Verrohrung:'Wasserrecht – Verrohrung', Wasserrecht_GWA:'Wasserrecht – GW-Absenkung',
};
const GUTACHTEN_TYPEN = [
  'Bodengutachten / Baugrundgutachten',
  'Kampfmittelfreiheitsnachweis',
  'Artenschutzgutachten / Avifauna',
  'Schallgutachten / Schallemissionsprognose',
  'Schattenwurfgutachten',
  'UVP / Umweltverträglichkeitsprüfung',
  'Sonstiges Gutachten',
];
const VP_DEFAULT_ITEMS = [
  {kategorie:'Genehmigung', label:'BImSchG-Bescheid / Baugenehmigung'},
  {kategorie:'Genehmigung', label:'Bestandskraft der Genehmigung geprüft'},
  {kategorie:'Genehmigung', label:'Nebenbestimmungen erfasst und bewertet'},
  {kategorie:'Genehmigung', label:'LBP / Naturschutzrechtliche Genehmigung'},
  {kategorie:'Genehmigung', label:'Wasserrechtliche Genehmigung (falls erforderlich)'},
  {kategorie:'Unterlagen',  label:'Querungsgenehmigungen vollständig'},
  {kategorie:'Unterlagen',  label:'Nutzungsverträge Anlage unterzeichnet'},
  {kategorie:'Unterlagen',  label:'Nutzungsverträge Kabeltrasse unterzeichnet'},
  {kategorie:'Unterlagen',  label:'Nutzungsverträge Wegebau unterzeichnet'},
  {kategorie:'Unterlagen',  label:'Leitungsauskünfte eingeholt'},
  {kategorie:'Unterlagen',  label:'Kreuzungsvereinbarungen abgeschlossen'},
  {kategorie:'Gutachten',   label:'Bodengutachten / Baugrundgutachten'},
  {kategorie:'Gutachten',   label:'Kampfmittelfreiheitsnachweis'},
  {kategorie:'Gutachten',   label:'Artenschutzgutachten / Avifauna'},
];
// VP Genehmigung items → mapped typ for pre-filling
const VP_GENEHM_OPTIONS = [
  {label:'BImSchG-Bescheid / Baugenehmigung',        typ:'BImSchG'},
  {label:'Bestandskraft der Genehmigung geprüft',    typ:'BImSchG'},
  {label:'Nebenbestimmungen erfasst und bewertet',   typ:'BImSchG'},
  {label:'LBP / Naturschutzrechtliche Genehmigung',  typ:'LBP'},
  {label:'Wasserrechtliche Genehmigung',             typ:'Wasserrecht_Verrohrung'},
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function allGenehmigungen(){ return (state.genehmigungen||[]).filter(g=>(!state.currentProject||g.projektId===state.currentProject)&&g.kategorie!=='gutachten'); }
function allGutachten(){     return (state.genehmigungen||[]).filter(g=>(!state.currentProject||g.projektId===state.currentProject)&&g.kategorie==='gutachten'); }
function allQuerungen(){     return (state.querungen||[]).filter(q=>!state.currentProject||q.projektId===state.currentProject); }
function allNV(){            return (state.nutzungsvertraege||[]).filter(n=>!state.currentProject||n.projektId===state.currentProject); }
function allVP(){            return (state.genehmVorpruefung||[]).filter(v=>!state.currentProject||v.projektId===state.currentProject); }

function vpStats(){
  const vp=allVP();
  const done=vp.filter(v=>v.status==='vorhanden'||v.status==='nicht_relevant').length;
  const pct=vp.length?Math.round(done/vp.length*100):0;
  const col=pct>=80?'var(--green)':pct>=50?'var(--yellow)':'var(--red)';
  return {vp,done,pct,col};
}

function getAnlageTabLabel(){
  const proj=(state.projects||[]).find(p=>p.id===state.currentProject);
  const t=proj?.type;
  if(t==='pv')   return '🏭 PV';
  if(t==='bess') return '🏭 BESS';
  if(t==='wind') return '🏭 WEA';
  return '🏭 Anlage';
}

// ─── Main View ───────────────────────────────────────────────────────────────

function renderGenehmigungen(){
  if(genehmSubView==='vorpruefung') return renderVorpruefungPage();

  const {vp,done,pct,col} = vpStats();
  const vpHidden = state.settings?.vpHidden;

  const tabs = [
    {key:'anlage',           label:getAnlageTabLabel()},
    {key:'kabeltrasse',      label:'⚡ Kabeltrasse'},
    {key:'wegebau',          label:'🛤️ Wegebau'},
    {key:'nutzungsvertraege',label:'📝 Nutzungsverträge'},
  ];

  let content = '';
  if(genehmTab==='anlage')            content = renderAnlageTab();
  else if(genehmTab==='kabeltrasse')  content = renderKabeltrasseTab();
  else if(genehmTab==='wegebau')      content = renderWegebauTab();
  else                                content = renderNutzungsvertraegeTab();

  const vpCard = vpHidden
    ? `<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
         <button class="btn btn-sm btn-secondary" onclick="toggleVorpruefung()">📋 Vorprüfung anzeigen (${pct}%)</button>
       </div>`
    : `<div class="card" style="margin-bottom:16px;cursor:pointer" onclick="openVorpruefungPage()">
         <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
           <div>
             <h3 style="color:var(--primary);font-size:15px;margin:0 0 2px">📋 Vorprüfung – Vollständigkeit</h3>
             <div style="font-size:12px;color:var(--muted)">Klicken zur Vorprüfung aller erforderlichen Unterlagen vor Baubeginn</div>
           </div>
           <div style="display:flex;align-items:center;gap:12px">
             <span style="font-size:22px;font-weight:700;color:${col}">${pct}%</span>
             <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();toggleVorpruefung()" title="Ausblenden" style="padding:3px 8px;font-size:11px">✕</button>
           </div>
         </div>
         <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
           <div style="height:100%;width:${pct}%;background:${col};transition:.3s"></div>
         </div>
         <div style="font-size:12px;color:var(--muted);margin-top:6px">${vp.length===0?'Noch keine Prüfpunkte angelegt – klicken zum Starten':done+' von '+vp.length+' Punkten vollständig'}</div>
       </div>`;

  return `
    ${vpCard}
    <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
      ${tabs.map(t=>`<button class="btn ${genehmTab===t.key?'':'btn-secondary'}" onclick="setGenehmTab('${t.key}')" style="font-size:13px;padding:7px 14px">${t.label}</button>`).join('')}
    </div>
    ${content}
  `;
}

function setGenehmTab(tab){ if(!VALID_GENEHM_TABS.includes(tab)) tab='anlage'; genehmTab=tab; sessionStorage.setItem('genehmTab',tab); genehmSubView=null; activeInlineNB=null; render(); }

async function toggleVorpruefung(){
  if(!state.settings) state.settings={};
  state.settings.vpHidden = !state.settings.vpHidden;
  await save('settings');
  render();
}

function openVorpruefungPage(){
  let items = allVP();
  if(items.length===0){
    items = VP_DEFAULT_ITEMS.map(d=>({
      id:uid(), kategorie:d.kategorie, label:d.label,
      status:'offen', notizen:'', custom:false,
      projektId:state.currentProject||null,
    }));
    if(!state.genehmVorpruefung) state.genehmVorpruefung=[];
    state.genehmVorpruefung.push(...items);
    save('genehmVorpruefung');
  }
  genehmSubView='vorpruefung';
  render();
}

// ─── Vorprüfung Page ──────────────────────────────────────────────────────────

function renderVorpruefungPage(){
  const {vp:items,done,pct,col} = vpStats();
  const kats=[...new Set(items.map(i=>i.kategorie))];
  return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <button class="btn btn-secondary" onclick="genehmSubView=null;render()">← Zurück</button>
      <h2 style="margin:0;font-size:17px;color:var(--primary)">📋 Vorprüfung – Vollständigkeit</h2>
    </div>
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:13px;color:var(--muted)">${done} von ${items.length} Punkten vollständig</div>
        <span style="font-size:22px;font-weight:700;color:${col}">${pct}%</span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${col};transition:.3s"></div>
      </div>
    </div>
    ${kats.map(kat=>`
      <div class="card" style="margin-bottom:14px">
        <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">${esc(kat)}</div>
        ${items.filter(i=>i.kategorie===kat).map(item=>`
          <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--surface-2);margin-bottom:6px">
            <span style="flex:1;font-size:13px;line-height:1.45">${esc(item.label)}</span>
            <select onchange="updateVPStatus('${item.id}',this.value)" style="width:120px;flex-shrink:0;padding:4px 6px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:12px">
              ${Object.entries(VORPRUEF_STATUS).map(([k,v])=>`<option value="${k}" ${item.status===k?'selected':''}>${v.label}</option>`).join('')}
            </select>
            ${item.custom?`<button class="btn btn-sm btn-danger" onclick="deleteVPItem('${item.id}')" title="Entfernen" style="flex-shrink:0">🗑️</button>`:''}
          </div>`).join('')}
      </div>
    `).join('')}
    <div style="margin-top:4px">
      <button class="btn btn-secondary btn-sm" onclick="addVPItem()">+ Eigenen Punkt hinzufügen</button>
    </div>
  `;
}

async function updateVPStatus(id, status){
  state.genehmVorpruefung=(state.genehmVorpruefung||[]).map(v=>v.id===id?{...v,status}:v);
  await save('genehmVorpruefung');
  render();
}
function addVPItem(){
  const label=prompt('Bezeichnung des Prüfpunkts:'); if(!label) return;
  if(!state.genehmVorpruefung) state.genehmVorpruefung=[];
  state.genehmVorpruefung.push({id:uid(),kategorie:'Sonstige',label,status:'offen',notizen:'',custom:true,projektId:state.currentProject||null});
  save('genehmVorpruefung');
  render();
}
async function deleteVPItem(id){
  const v=(state.genehmVorpruefung||[]).find(x=>x.id===id);
  if(!confirm(`Prüfpunkt „${v?.label||'?'}" löschen?`)) return;
  state.genehmVorpruefung=(state.genehmVorpruefung||[]).filter(v=>v.id!==id);
  await save('genehmVorpruefung');
  render();
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function renderAnlageTab(){
  const gen = allGenehmigungen().filter(g=>g.bereich==='anlage');
  return `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:14px;font-weight:600;color:var(--primary)">📜 Genehmigungen</span>
        <button class="btn btn-sm" onclick="openAddGenehmPicker('anlage')">+ Hinzufügen</button>
      </div>
      ${gen.length===0?emptyHint('Noch keine Genehmigungen hinterlegt'):gen.map(g=>renderGenehmCard(g)).join('')}
    </div>
  `;
}

function renderKabeltrasseTab(){
  const qs = allQuerungen();
  return `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <h3 style="color:var(--primary);font-size:15px;margin:0">🔀 Querungsgenehmigungen</h3>
        <button class="btn btn-sm" onclick="editQuerung(null)">+ Querung</button>
      </div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Genehmigungen für Querungen unter Autobahnen, Gewässern, Bahnanlagen etc. Nebenbestimmungen (Verlegetiefe, Schutzmaßnahmen) je Querung hinterlegen.</p>
      ${qs.length===0?emptyHint('Noch keine Querungen hinterlegt'):`<div style="display:flex;flex-direction:column;gap:8px">${qs.map(renderQuerungCard).join('')}</div>`}
    </div>
  `;
}

function renderWegebauTab(){
  const gen = allGenehmigungen().filter(g=>g.bereich==='wegebau');
  return `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:14px;font-weight:600;color:var(--primary)">📜 Genehmigungen</span>
        <button class="btn btn-sm" onclick="openAddGenehmPicker('wegebau')">+ Hinzufügen</button>
      </div>
      ${gen.length===0?emptyHint('Noch keine Genehmigungen hinterlegt'):gen.map(g=>renderGenehmCard(g)).join('')}
    </div>
  `;
}

function renderNutzungsvertraegeTab(){
  const all = allNV();
  const now = new Date(); now.setHours(0,0,0,0);
  const expiring = all.filter(n=>{
    if(!n.laufzeit_bis||n.status==='abgelaufen'||n.status==='gekuendigt') return false;
    return Math.ceil((new Date(n.laufzeit_bis)-now)/864e5)<=90;
  });
  const bereiche = [
    {key:'anlage',      label:'🏭 Anlage'},
    {key:'kabeltrasse', label:'⚡ Kabeltrasse'},
    {key:'wegebau',     label:'🛤️ Wegebau'},
  ];
  return `
    ${expiring.length?`
    <div class="card" style="margin-bottom:16px;border-left:4px solid var(--accent)">
      <h3 style="color:var(--accent);font-size:14px;margin-bottom:8px">⚠️ Verträge laufen bald aus</h3>
      ${expiring.map(n=>{
        const d=Math.ceil((new Date(n.laufzeit_bis)-now)/864e5);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:13px">
          <span>${esc(n.bezeichnung)}</span>
          <span style="color:${d<=30?'var(--red)':'var(--yellow)'};font-weight:600">in ${d} Tagen (${fmtDate(n.laufzeit_bis)})</span>
        </div>`;
      }).join('')}
    </div>`:''}
    ${bereiche.map(b=>{
      const nvB = all.filter(n=>(n.bereich||[]).includes(b.key));
      return `<div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h3 style="color:var(--primary);font-size:15px;margin:0">${b.label}</h3>
          <button class="btn btn-sm" onclick="editNutzungsvertrag(null,'${b.key}')">+ Vertrag</button>
        </div>
        ${nvB.length===0?emptyHint('Noch keine Nutzungsverträge für diesen Bereich'):`
        <div style="display:flex;flex-direction:column;gap:8px">
          ${nvB.map(n=>{
            const s=NV_STATUS[n.status]||NV_STATUS.ausstehend;
            const days=n.laufzeit_bis?Math.ceil((new Date(n.laufzeit_bis)-now)/864e5):null;
            return `<div onclick="editNutzungsvertrag('${n.id}')" style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:10px;background:var(--surface-2);cursor:pointer;border:1px solid var(--border)" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
              <div style="flex:1;min-width:0">
                <div style="font-size:14px;font-weight:600;margin-bottom:3px">${esc(n.bezeichnung)}</div>
                <div style="font-size:12px;color:var(--muted)">${n.eigentuemer?esc(n.eigentuemer):''}${n.typ?' · '+esc(n.typ):''}</div>
                ${n.laufzeit_bis?`<div style="font-size:12px;color:${days!==null&&days<=30?'var(--red)':days!==null&&days<=90?'var(--yellow)':'var(--muted)'};margin-top:2px">Läuft bis: ${fmtDate(n.laufzeit_bis)} (in ${days} Tagen)</div>`:''}
                ${n.tiefe_max?`<div style="font-size:12px;color:var(--muted)">Verlegetiefe max. ${esc(n.tiefe_max)} m</div>`:''}
              </div>
              <span style="background:${s.color};color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;flex-shrink:0">${s.label}</span>
            </div>`;
          }).join('')}
        </div>`}
      </div>`;
    }).join('')}
  `;
}

// ─── Add Genehmigung Picker ───────────────────────────────────────────────────

function openAddGenehmPicker(bereich){
  openModal(`
    <h3 style="margin-bottom:14px">Genehmigung hinzufügen</h3>
    <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Aus Vorprüfung übernehmen</div>
    ${VP_GENEHM_OPTIONS.map(o=>`
      <button class="btn btn-secondary" style="width:100%;text-align:left;margin-bottom:6px;padding:10px 14px;font-size:13px"
        onclick="addGenehmFromVP('${o.label.replace(/'/g,"\\'")}','${o.typ}','${bereich}')">
        ${esc(o.label)}
      </button>`).join('')}
    <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:8px">
      <button class="btn" style="width:100%" onclick="closeModal();editGenehmigung(null,'${bereich}')">
        + Eigene / Andere Genehmigung anlegen
      </button>
    </div>
    <div class="modal-actions" style="margin-top:14px">
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
    </div>
  `);
}

function addGenehmFromVP(label, typ, bereich){
  closeModal();
  editGenehmigung(null, bereich, typ, label);
}

// ─── Card Renderers ───────────────────────────────────────────────────────────

function renderGenehmCard(g){
  const s = GENEHM_STATUS[g.status]||GENEHM_STATUS.ausstehend;
  const nbs = g.nebenbestimmungen||[];
  const nbOffen = nbs.filter(n=>n.status!=='erfuellt').length;
  const isGutachten = g.kategorie==='gutachten';
  const displayName = g.bezeichnung || (isGutachten ? (g.typ||'Gutachten') : (GENEHM_TYP_LABELS[g.typ]||g.typ));
  const editAction = isGutachten ? `editGutachten('${g.id}')` : `editGenehmigung('${g.id}')`;
  return `<div style="border:1px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden">
    <div style="display:flex;align-items:flex-start;gap:8px;padding:12px;background:var(--surface-2)">
      <div onclick="${editAction}" style="flex:1;min-width:0;cursor:pointer" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
        <div style="font-size:14px;font-weight:600;margin-bottom:2px">${esc(displayName)}${g.bescheid_nr?` <span style="font-size:11px;color:var(--muted);font-weight:400">Nr. ${esc(g.bescheid_nr)}</span>`:''}</div>
        <div style="font-size:12px;color:var(--muted)">${g.behoerde?esc(g.behoerde):''}${g.datum_bescheid?' · '+fmtDate(g.datum_bescheid):''}</div>
        ${nbs.length?`<div style="font-size:12px;margin-top:3px;color:${nbOffen?'var(--accent)':'var(--green)'}">📌 ${nbOffen?nbOffen+' NB offen':'Alle NB erfüllt'}</div>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
        <span style="background:${s.color};color:#fff;border-radius:4px;padding:2px 8px;font-size:11px">${s.label}</span>
        <button onclick="event.stopPropagation();openGenehmActions('${g.id}')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:20px;padding:0 4px;line-height:1;border-radius:4px" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--muted)'" title="Aktionen">⋮</button>
      </div>
    </div>
    <div style="padding:8px 12px;border-top:1px solid var(--border);background:var(--card)">
      ${renderNBBlock(nbs,'genehmigung',g.id)}
    </div>
  </div>`;
}

function openGenehmActions(id){
  const g=(state.genehmigungen||[]).find(x=>x.id===id); if(!g) return;
  const isGutachten = g.kategorie==='gutachten';
  const s = GENEHM_STATUS[g.status]||GENEHM_STATUS.ausstehend;
  const displayName = g.bezeichnung || (isGutachten ? (g.typ||'Gutachten') : (GENEHM_TYP_LABELS[g.typ]||g.typ));
  openModal(`
    <div style="text-align:center;padding-bottom:14px;border-bottom:1px solid var(--border);margin-bottom:14px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">${esc(displayName)}</div>
      <span style="background:${s.color};color:#fff;border-radius:4px;padding:2px 10px;font-size:12px">${s.label}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="btn btn-secondary" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="closeModal();${isGutachten?`editGutachten('${id}')`:`editGenehmigung('${id}')`}">✏️  Bearbeiten</button>
      <button class="btn btn-secondary" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="closeModal();openInlineNBForm('genehmigung','${id}',null)">📌  Nebenbestimmung hinzufügen</button>
      <button class="btn btn-danger" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="${isGutachten?`deleteGutachten('${id}')`:`deleteGenehmigung('${id}')`}">🗑️  Löschen</button>
    </div>
    <div class="modal-actions" style="margin-top:14px">
      <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
    </div>
  `);
}

function openNBActions(nbId, parentType, parentId){
  const p=(state.genehmigungen||[]).find(g=>g.id===parentId)||(state.querungen||[]).find(q=>q.id===parentId);
  const nb=p?(p.nebenbestimmungen||[]).find(n=>n.id===nbId):null; if(!nb) return;
  const ns = NB_STATUS[nb.status]||NB_STATUS.offen;
  const hasAufgabe = nb.aufgabeId && (state.tasks||[]).some(t=>t.id===nb.aufgabeId);
  const hasKalender = nb.kalenderEntryId && (state.kalenderEntries||[]).some(k=>k.id===nb.kalenderEntryId);
  openModal(`
    <div style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:12px">
      <div style="font-size:13px;line-height:1.5;margin-bottom:6px">${esc(nb.text)}</div>
      <span style="background:${ns.color};color:#fff;border-radius:4px;padding:1px 8px;font-size:11px">${ns.label}</span>
      ${nb.frist?`<span style="font-size:12px;color:var(--muted);margin-left:8px">📅 ${fmtDate(nb.frist)}</span>`:''}
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="btn btn-secondary" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="closeModal();openInlineNBForm('${parentType}','${parentId}','${nbId}')">✏️  Bearbeiten</button>
      <button class="btn btn-secondary" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="closeModal();openInlineSubNBForm('${parentType}','${parentId}','${nbId}',null)">⤷  Sub-Nebenbestimmung hinzufügen</button>
      ${hasAufgabe
        ? `<button class="btn btn-secondary" style="width:100%;text-align:left;padding:6px 12px;font-size:13px;color:var(--muted)" onclick="closeModal();nbRemoveAufgabe('${nbId}','${parentType}','${parentId}')">↩  Aufgabe rückgängig</button>`
        : `<button class="btn btn-secondary" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="closeModal();nbToAufgabe('${nbId}','${parentType}','${parentId}')">✅  Als Aufgabe anlegen</button>`}
      ${hasKalender
        ? `<button class="btn btn-secondary" style="width:100%;text-align:left;padding:6px 12px;font-size:13px;color:var(--muted)" onclick="closeModal();nbRemoveKalender('${nbId}','${parentType}','${parentId}')">↩  Kalendereintrag rückgängig</button>`
        : `<button class="btn btn-secondary" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="closeModal();nbToKalender('${nbId}','${parentType}','${parentId}')">📅  Frist im Kalender</button>`}
      <button class="btn btn-danger" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="closeModal();deleteInlineNB('${nbId}','${parentType}','${parentId}')">🗑️  Löschen</button>
    </div>
    <div class="modal-actions" style="margin-top:12px">
      <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
    </div>
  `);
}

function renderQuerungCard(q){
  const s=GENEHM_STATUS[q.status]||GENEHM_STATUS.ausstehend;
  const col=QUERUNG_TYP_COLOR[q.typ]||'#6b7280';
  const nbs=q.nebenbestimmungen||[];
  const nbOffen=nbs.filter(n=>n.status!=='erfuellt').length;
  return `<div style="border:1px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden">
    <div style="display:flex;align-items:flex-start;gap:8px;padding:12px;background:var(--surface-2)">
      <div onclick="editQuerung('${q.id}')" style="flex:1;min-width:0;display:flex;gap:8px;cursor:pointer" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
        <span style="background:${col};color:#fff;border-radius:4px;padding:2px 8px;font-size:10px;white-space:nowrap;flex-shrink:0;margin-top:2px">${esc(q.typ||'—')}</span>
        <div style="min-width:0">
          <div style="font-size:14px;font-weight:600;margin-bottom:2px">${esc(q.bezeichnung||'Ohne Bezeichnung')}</div>
          <div style="font-size:12px;color:var(--muted)">${q.behoerde?esc(q.behoerde):''}${q.lage?' · '+esc(q.lage):''}${q.tiefe_max?' · max. '+esc(q.tiefe_max)+' m':''}</div>
          ${nbs.length?`<div style="font-size:12px;margin-top:3px;color:${nbOffen?'var(--accent)':'var(--green)'}">📌 ${nbOffen?nbOffen+' NB offen':'Alle NB erfüllt'}</div>`:''}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
        <span style="background:${s.color};color:#fff;border-radius:4px;padding:2px 8px;font-size:11px">${s.label}</span>
        <button onclick="event.stopPropagation();openQuerungActions('${q.id}')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:20px;padding:0 4px;line-height:1;border-radius:4px" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--muted)'" title="Aktionen">⋮</button>
      </div>
    </div>
    <div style="padding:8px 12px;border-top:1px solid var(--border);background:var(--card)">
      ${renderNBBlock(nbs,'querung',q.id)}
    </div>
  </div>`;
}

function openQuerungActions(id){
  const q=(state.querungen||[]).find(x=>x.id===id); if(!q) return;
  const s=GENEHM_STATUS[q.status]||GENEHM_STATUS.ausstehend;
  const col=QUERUNG_TYP_COLOR[q.typ]||'#6b7280';
  openModal(`
    <div style="text-align:center;padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:12px">
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">${esc(q.bezeichnung||'Querung')}</div>
      <span style="background:${col};color:#fff;border-radius:4px;padding:1px 8px;font-size:11px;margin-right:6px">${esc(q.typ||'—')}</span>
      <span style="background:${s.color};color:#fff;border-radius:4px;padding:1px 8px;font-size:11px">${s.label}</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="btn btn-secondary" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="closeModal();editQuerung('${id}')">✏️  Bearbeiten</button>
      <button class="btn btn-danger" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="deleteQuerung('${id}')">🗑️  Löschen</button>
    </div>
    <div class="modal-actions" style="margin-top:12px">
      <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
    </div>
  `);
}

function emptyHint(txt){ return `<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">${txt}</div>`; }

// ─── NB Block (shared by GenehmCard + QuerungCard) ───────────────────────────

function renderNBBlock(nbs, parentType, parentId){
  const act = activeInlineNB;
  const mine = act?.parentId===parentId;
  const isSub = mine && (act?.isSub||false);
  const activeNbId = mine ? (act?.nbId||null) : null;
  const activeSubId = mine && isSub ? (act?.subNbId||null) : null;

  const rows = nbs.map(nb=>{
    if(mine && !isSub && activeNbId===nb.id) return renderInlineNBForm(parentType,parentId,nb);
    const ns=NB_STATUS[nb.status]||NB_STATUS.offen;
    const now=new Date(); now.setHours(0,0,0,0);
    const days=nb.frist?Math.ceil((new Date(nb.frist)-now)/864e5):null;
    const subNBs=nb.subNB||[];
    const showSub=subNBs.length||(mine&&isSub&&activeNbId===nb.id);
    return `<div style="border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:flex-start;gap:8px;padding:7px 2px">
        <div onclick="openInlineNBForm('${parentType}','${parentId}','${nb.id}')" style="flex:1;min-width:0;cursor:pointer" onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'">
          <div style="font-size:13px;line-height:1.4">${esc(nb.text)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:3px">
            ${nb.frist?`<span style="font-size:11px;color:${days<0?'var(--red)':days<=14?'var(--accent)':'var(--muted)'}">📅 ${fmtDate(nb.frist)}${days!==null?' ('+(days<0?Math.abs(days)+' T überfällig':'in '+days+' T')+')':''}</span>`:''}
            ${nb.zustaendiger?`<span style="font-size:11px;color:var(--muted)">👤 ${esc(nb.zustaendiger)}</span>`:''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:3px;flex-shrink:0">
          <span style="background:${ns.color};color:#fff;border-radius:4px;padding:1px 6px;font-size:10px">${ns.label}</span>
          <button onclick="event.stopPropagation();openNBActions('${nb.id}','${parentType}','${parentId}')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:20px;padding:0 4px;line-height:1;border-radius:4px" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--muted)'">⋮</button>
        </div>
      </div>
      ${showSub?`<div style="margin-left:18px;border-left:2px solid var(--border);padding-left:10px;margin-bottom:6px">
        ${subNBs.map(snb=>{
          if(mine&&isSub&&activeNbId===nb.id&&activeSubId===snb.id) return renderInlineNBForm(parentType,parentId,snb);
          const ss=NB_STATUS[snb.status]||NB_STATUS.offen;
          const sdays=snb.frist?Math.ceil((new Date(snb.frist)-now)/864e5):null;
          return `<div style="display:flex;align-items:flex-start;gap:8px;padding:5px 2px;border-bottom:1px solid var(--border)">
            <div onclick="openInlineSubNBForm('${parentType}','${parentId}','${nb.id}','${snb.id}')" style="flex:1;min-width:0;cursor:pointer" onmouseover="this.style.opacity='.7'" onmouseout="this.style.opacity='1'">
              <div style="font-size:12px;line-height:1.4">${esc(snb.text)}</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:2px">
                ${snb.frist?`<span style="font-size:10px;color:${sdays<0?'var(--red)':sdays<=14?'var(--accent)':'var(--muted)'}">📅 ${fmtDate(snb.frist)}${sdays!==null?' ('+(sdays<0?Math.abs(sdays)+' T überfällig':'in '+sdays+' T')+')':''}</span>`:''}
                ${snb.zustaendiger?`<span style="font-size:10px;color:var(--muted)">👤 ${esc(snb.zustaendiger)}</span>`:''}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:3px;flex-shrink:0">
              <span style="background:${ss.color};color:#fff;border-radius:4px;padding:1px 5px;font-size:9px">${ss.label}</span>
              <button onclick="event.stopPropagation();openSubNBActions('${snb.id}','${nb.id}','${parentType}','${parentId}')" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:18px;padding:0 3px;line-height:1;border-radius:4px" onmouseover="this.style.color='var(--text)'" onmouseout="this.style.color='var(--muted)'">⋮</button>
            </div>
          </div>`;
        }).join('')}
        ${mine&&isSub&&activeNbId===nb.id&&!activeSubId?renderInlineNBForm(parentType,parentId,null):''}
      </div>`:''}
    </div>`;
  }).join('');

  const addRow = mine&&!isSub&&!activeNbId
    ? renderInlineNBForm(parentType,parentId,null)
    : `<div onclick="openInlineNBForm('${parentType}','${parentId}',null)"
           style="margin-top:6px;padding:8px 10px;border:1.5px dashed var(--border);border-radius:8px;color:var(--muted);font-size:12px;cursor:pointer;text-align:center"
           onmouseover="this.style.borderColor='var(--primary)';this.style.color='var(--primary)'"
           onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--muted)'">
         + Nebenbestimmung hinzufügen
       </div>`;
  return rows + addRow;
}

// ─── Inline NB ────────────────────────────────────────────────────────────────

function renderInlineNBForm(parentType, parentId, nb){
  const isEdit = !!nb;
  return `<div style="background:var(--surface-2);border-radius:8px;padding:10px;margin-top:6px">
    <div style="font-size:11px;font-weight:600;color:var(--muted);margin-bottom:8px">${isEdit?'Nebenbestimmung bearbeiten':'Neue Nebenbestimmung'}</div>
    <textarea id="nb-inline-text" rows="3" style="width:100%;margin-bottom:8px;padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text);font-size:13px;resize:vertical;box-sizing:border-box">${esc(nb?.text||'')}</textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <div style="flex:1;min-width:110px">
        <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:3px">Frist</label>
        <input type="date" id="nb-inline-frist" value="${nb?.frist||''}" style="width:100%;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text);box-sizing:border-box">
      </div>
      <div style="flex:1;min-width:110px">
        <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:3px">Zuständig</label>
        <input id="nb-inline-zustaendiger" value="${esc(nb?.zustaendiger||'')}" placeholder="Name" style="width:100%;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text);box-sizing:border-box">
      </div>
      <div style="flex:1;min-width:110px">
        <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:3px">Status</label>
        <select id="nb-inline-status" style="width:100%;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text);box-sizing:border-box">
          ${Object.entries(NB_STATUS).map(([k,v])=>`<option value="${k}" ${(nb?.status||'offen')===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:flex;gap:6px;justify-content:flex-end">
      <button class="btn btn-secondary btn-sm" onclick="closeInlineNBForm()">Abbrechen</button>
      <button class="btn btn-sm" onclick="saveInlineNBForm('${parentType}','${parentId}','${nb?.id||''}',${isEdit})">Speichern</button>
    </div>
  </div>`;
}

function openInlineNBForm(parentType, parentId, nbId){
  activeInlineNB = {parentType, parentId, nbId: nbId||null};
  render();
}
function closeInlineNBForm(){
  activeInlineNB = null;
  render();
}
async function saveInlineNBForm(parentType, parentId, nbId, isEdit){
  const text = (document.getElementById('nb-inline-text')?.value||'').trim();
  if(!text){alert('Bitte Text eingeben.');return;}
  const frist        = document.getElementById('nb-inline-frist')?.value||'';
  const zustaendiger = document.getElementById('nb-inline-zustaendiger')?.value||'';
  const status       = document.getElementById('nb-inline-status')?.value||'offen';
  const data = {id: isEdit&&nbId ? nbId : uid(), text, frist, zustaendiger, status};
  const isSub = activeInlineNB?.isSub;
  const parentNbId = isSub ? activeInlineNB?.nbId : null;

  function patchItems(arr){
    return arr.map(item=>{
      if(item.id!==parentId) return item;
      if(isSub){
        return {...item, nebenbestimmungen:(item.nebenbestimmungen||[]).map(nb=>{
          if(nb.id!==parentNbId) return nb;
          const sub=nb.subNB||[];
          return {...nb, subNB: isEdit ? sub.map(s=>s.id===nbId?data:s) : [...sub,data]};
        })};
      }
      const nbs=item.nebenbestimmungen||[];
      return {...item, nebenbestimmungen: isEdit ? nbs.map(n=>n.id===nbId?data:n) : [...nbs,data]};
    });
  }
  if(parentType==='genehmigung'){ state.genehmigungen=patchItems(state.genehmigungen||[]); await save('genehmigungen'); }
  else { state.querungen=patchItems(state.querungen||[]); await save('querungen'); }
  activeInlineNB = null;
  render();
}
async function deleteInlineNB(nbId, parentType, parentId){
  if(!confirm('Nebenbestimmung löschen?')) return;
  if(parentType==='genehmigung'){
    state.genehmigungen=(state.genehmigungen||[]).map(g=>g.id!==parentId?g:{...g,nebenbestimmungen:(g.nebenbestimmungen||[]).filter(n=>n.id!==nbId)});
    await save('genehmigungen');
  } else {
    state.querungen=(state.querungen||[]).map(q=>q.id!==parentId?q:{...q,nebenbestimmungen:(q.nebenbestimmungen||[]).filter(n=>n.id!==nbId)});
    await save('querungen');
  }
  render();
}

function openInlineSubNBForm(parentType, parentId, parentNbId, subNbId){
  activeInlineNB = {parentType, parentId, nbId: parentNbId, isSub: true, subNbId: subNbId||null};
  render();
}

function openSubNBActions(subNbId, parentNbId, parentType, parentId){
  const parent=parentType==='genehmigung'?(state.genehmigungen||[]).find(g=>g.id===parentId):(state.querungen||[]).find(q=>q.id===parentId);
  const nb=parent?(parent.nebenbestimmungen||[]).find(n=>n.id===parentNbId):null;
  const snb=nb?(nb.subNB||[]).find(s=>s.id===subNbId):null; if(!snb) return;
  const ss=NB_STATUS[snb.status]||NB_STATUS.offen;
  openModal(`
    <div style="padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:12px">
      <div style="font-size:12px;line-height:1.5;margin-bottom:6px">${esc(snb.text)}</div>
      <span style="background:${ss.color};color:#fff;border-radius:4px;padding:1px 8px;font-size:11px">${ss.label}</span>
      ${snb.frist?`<span style="font-size:12px;color:var(--muted);margin-left:8px">📅 ${fmtDate(snb.frist)}</span>`:''}
    </div>
    <div style="display:flex;flex-direction:column;gap:6px">
      <button class="btn btn-secondary" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="closeModal();openInlineSubNBForm('${parentType}','${parentId}','${parentNbId}','${subNbId}')">✏️  Bearbeiten</button>
      <button class="btn btn-danger" style="width:100%;text-align:left;padding:6px 12px;font-size:13px" onclick="closeModal();deleteInlineSubNB('${subNbId}','${parentNbId}','${parentType}','${parentId}')">🗑️  Löschen</button>
    </div>
    <div class="modal-actions" style="margin-top:12px">
      <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
    </div>
  `);
}

async function deleteInlineSubNB(subNbId, parentNbId, parentType, parentId){
  if(!confirm('Sub-Nebenbestimmung löschen?')) return;
  function patch(arr){
    return arr.map(item=>item.id!==parentId?item:{...item,
      nebenbestimmungen:(item.nebenbestimmungen||[]).map(nb=>nb.id!==parentNbId?nb:
        {...nb,subNB:(nb.subNB||[]).filter(s=>s.id!==subNbId)})});
  }
  if(parentType==='genehmigung'){ state.genehmigungen=patch(state.genehmigungen||[]); await save('genehmigungen'); }
  else { state.querungen=patch(state.querungen||[]); await save('querungen'); }
  render();
}

// ─── NB Row (used by Querung detail modal) ────────────────────────────────────

function renderNBRow(nb, parentType, parentId){
  const s=NB_STATUS[nb.status]||NB_STATUS.offen;
  const now=new Date(); now.setHours(0,0,0,0);
  const days=nb.frist?Math.ceil((new Date(nb.frist)-now)/864e5):null;
  return `<div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:6px;background:var(--card)">
    <div style="display:flex;align-items:flex-start;gap:10px">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;line-height:1.5">${esc(nb.text)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:5px;align-items:center">
          ${nb.frist?`<span style="font-size:11px;color:${days<0?'var(--red)':days<=14?'var(--accent)':'var(--muted)'}">📅 ${fmtDate(nb.frist)} ${days!==null?'('+( days<0?Math.abs(days)+' T überfällig':'in '+days+' T')+')':''}</span>`:''}
          ${nb.zustaendiger?`<span style="font-size:11px;color:var(--muted)">👤 ${esc(nb.zustaendiger)}</span>`:''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;align-items:flex-end">
        <span style="background:${s.color};color:#fff;border-radius:4px;padding:1px 6px;font-size:10px">${s.label}</span>
        <div style="display:flex;gap:3px;margin-top:2px">
          <button class="btn btn-sm btn-secondary" onclick="editNebenbestimmung('${nb.id}','${parentType}','${parentId}')" title="Bearbeiten">✏️</button>
          <button class="btn btn-sm btn-secondary" onclick="nbToAufgabe('${nb.id}','${parentType}','${parentId}')" title="→ Aufgabe">✅</button>
          <button class="btn btn-sm btn-secondary" onclick="nbToKalender('${nb.id}','${parentType}','${parentId}')" title="→ Frist im Kalender">📅</button>
        </div>
      </div>
    </div>
  </div>`;
}

// ─── Querung Detail Modal ─────────────────────────────────────────────────────

function openQuerungDetail(id){
  const q=(state.querungen||[]).find(x=>x.id===id); if(!q) return;
  const s=GENEHM_STATUS[q.status]||GENEHM_STATUS.ausstehend;
  const col=QUERUNG_TYP_COLOR[q.typ]||'#6b7280';
  const nbs=q.nebenbestimmungen||[];
  openModal(`
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;gap:12px">
      <div>
        <h3 style="margin:0 0 6px">${esc(q.bezeichnung||'Querung')}</h3>
        <span style="background:${col};color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;margin-right:6px">${esc(q.typ||'—')}</span>
        <span style="background:${s.color};color:#fff;border-radius:4px;padding:2px 8px;font-size:11px">${s.label}</span>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn btn-sm btn-secondary" onclick="editQuerung('${q.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteQuerung('${q.id}')">🗑️</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;font-size:13px">
      ${q.behoerde?`<div><span style="color:var(--muted)">Behörde:</span> ${esc(q.behoerde)}</div>`:''}
      ${q.lage?`<div><span style="color:var(--muted)">Lage/Station:</span> ${esc(q.lage)}</div>`:''}
      ${q.tiefe_max?`<div><span style="color:var(--muted)">Max. Verlegetiefe:</span> ${esc(q.tiefe_max)} m</div>`:''}
      ${q.genehmigung_nr?`<div><span style="color:var(--muted)">Genehm.-Nr.:</span> ${esc(q.genehmigung_nr)}</div>`:''}
      ${q.datum_genehmigung?`<div><span style="color:var(--muted)">Genehmigt am:</span> ${fmtDate(q.datum_genehmigung)}</div>`:''}
    </div>
    ${q.notizen?`<div style="background:var(--surface-2);border-radius:8px;padding:10px;font-size:13px;margin-bottom:14px">${esc(q.notizen)}</div>`:''}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <h4 style="margin:0;font-size:14px">📌 Nebenbestimmungen</h4>
      <button class="btn btn-sm" onclick="editNebenbestimmung(null,'querung','${q.id}')">+ Hinzufügen</button>
    </div>
    ${nbs.length===0?emptyHint('Keine Nebenbestimmungen hinterlegt'):nbs.map(nb=>renderNBRow(nb,'querung',q.id)).join('')}
    <div class="modal-actions" style="margin-top:20px">
      <button class="btn btn-secondary" onclick="closeModal()">Schließen</button>
    </div>
  `);
}

// ─── Edit: Genehmigung ────────────────────────────────────────────────────────

function editGenehmigung(id, bereich, defaultTyp, defaultBezeichnung){
  const existing=(state.genehmigungen||[]).find(g=>g.id===id&&g.kategorie!=='gutachten');
  bereich = bereich || existing?.bereich || 'anlage';
  const typen = ['BImSchG','Baugenehmigung','LBP','Wasserrecht_Verrohrung','Wasserrecht_GWA'];
  const g = existing || {id:uid(),kategorie:'genehmigung',bereich,typ:defaultTyp||typen[0],bezeichnung:defaultBezeichnung||'',bescheid_nr:'',behoerde:'',datum_bescheid:'',datum_bestandskraft:'',status:'ausstehend',nebenbestimmungen:[],notizen:'',projektId:state.currentProject||null};
  openModal(`
    <h3>${id?'Genehmigung bearbeiten':'Neue Genehmigung'}</h3>
    <form onsubmit="saveGenehmigung(event,'${g.id}',${!!id})">
      <input type="hidden" name="bereich" value="${bereich}">
      <div class="form-group"><label>Bezeichnung (optional)</label><input name="bezeichnung" value="${esc(g.bezeichnung||defaultBezeichnung||'')}" placeholder="Freitext-Name, z.B. Bescheid vom 01.03.2025"></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Typ *</label>
          <select name="typ">${typen.map(t=>`<option value="${t}" ${g.typ===t?'selected':''}>${GENEHM_TYP_LABELS[t]||t}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="flex:1"><label>Status</label>
          <select name="status">${Object.entries(GENEHM_STATUS).map(([k,v])=>`<option value="${k}" ${g.status===k?'selected':''}>${v.label}</option>`).join('')}</select>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Bescheid-Nr.</label><input name="bescheid_nr" value="${esc(g.bescheid_nr||'')}"></div>
        <div class="form-group" style="flex:1"><label>Behörde</label><input name="behoerde" value="${esc(g.behoerde||'')}"></div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Bescheiddatum</label><input type="date" name="datum_bescheid" value="${g.datum_bescheid||''}"></div>
        <div class="form-group" style="flex:1"><label>Bestandskraft ab</label><input type="date" name="datum_bestandskraft" value="${g.datum_bestandskraft||''}"></div>
      </div>
      <div class="form-group"><label>Notizen</label><textarea name="notizen">${esc(g.notizen||'')}</textarea></div>
      <div class="modal-actions">
        ${id?`<button type="button" class="btn btn-danger" onclick="deleteGenehmigung('${g.id}')">Löschen</button>`:''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}
async function saveGenehmigung(ev,id,exists){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  if(!state.genehmigungen) state.genehmigungen=[];
  const nbs=(state.genehmigungen.find(g=>g.id===id)||{}).nebenbestimmungen||[];
  const data={id,kategorie:'genehmigung',bereich:fd.get('bereich'),bezeichnung:fd.get('bezeichnung'),typ:fd.get('typ'),bescheid_nr:fd.get('bescheid_nr'),behoerde:fd.get('behoerde'),datum_bescheid:fd.get('datum_bescheid'),datum_bestandskraft:fd.get('datum_bestandskraft'),status:fd.get('status'),notizen:fd.get('notizen'),nebenbestimmungen:nbs,projektId:state.currentProject||null};
  if(exists) state.genehmigungen=state.genehmigungen.map(g=>g.id===id?{...g,...data}:g);
  else state.genehmigungen.push(data);
  await save('genehmigungen'); closeModal(); render();
}
async function deleteGenehmigung(id){
  const g=(state.genehmigungen||[]).find(x=>x.id===id);
  if(!confirm(`Genehmigung „${g?.bezeichnung||g?.typ||'?'}" wirklich löschen?`)) return;
  state.genehmigungen=(state.genehmigungen||[]).filter(g=>g.id!==id);
  await save('genehmigungen'); closeModal(); render();
}

// ─── Edit: Gutachten ──────────────────────────────────────────────────────────

function editGutachten(id, bereich){
  const existing=(state.genehmigungen||[]).find(g=>g.id===id&&g.kategorie==='gutachten');
  bereich = bereich || existing?.bereich || 'anlage';
  const g = existing || {id:uid(),kategorie:'gutachten',bereich,typ:GUTACHTEN_TYPEN[0],bezeichnung:'',behoerde:'',datum_bescheid:'',status:'ausstehend',nebenbestimmungen:[],notizen:'',projektId:state.currentProject||null};
  openModal(`
    <h3>${id?'Gutachten bearbeiten':'Neues Gutachten'}</h3>
    <form onsubmit="saveGutachten(event,'${g.id}',${!!id})">
      <input type="hidden" name="bereich" value="${bereich}">
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:2"><label>Typ *</label>
          <select name="typ">${GUTACHTEN_TYPEN.map(t=>`<option value="${t}" ${g.typ===t?'selected':''}>${t}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="flex:1"><label>Status</label>
          <select name="status">${Object.entries(GENEHM_STATUS).map(([k,v])=>`<option value="${k}" ${g.status===k?'selected':''}>${v.label}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group"><label>Bezeichnung (optional)</label><input name="bezeichnung" value="${esc(g.bezeichnung||'')}" placeholder="Freitext-Name"></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:2"><label>Ersteller / Auftragnehmer</label><input name="behoerde" value="${esc(g.behoerde||'')}" placeholder="z.B. Ing.-Büro Müller GmbH"></div>
        <div class="form-group" style="flex:1"><label>Datum</label><input type="date" name="datum_bescheid" value="${g.datum_bescheid||''}"></div>
      </div>
      <div class="form-group"><label>Notizen</label><textarea name="notizen">${esc(g.notizen||'')}</textarea></div>
      <div class="modal-actions">
        ${id?`<button type="button" class="btn btn-danger" onclick="deleteGutachten('${g.id}')">Löschen</button>`:''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}
async function saveGutachten(ev,id,exists){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  if(!state.genehmigungen) state.genehmigungen=[];
  const nbs=(state.genehmigungen.find(g=>g.id===id)||{}).nebenbestimmungen||[];
  const data={id,kategorie:'gutachten',bereich:fd.get('bereich'),typ:fd.get('typ'),bezeichnung:fd.get('bezeichnung'),behoerde:fd.get('behoerde'),datum_bescheid:fd.get('datum_bescheid'),status:fd.get('status'),notizen:fd.get('notizen'),nebenbestimmungen:nbs,projektId:state.currentProject||null};
  if(exists) state.genehmigungen=state.genehmigungen.map(g=>g.id===id?{...g,...data}:g);
  else state.genehmigungen.push(data);
  await save('genehmigungen'); closeModal(); render();
}
async function deleteGutachten(id){
  const g=(state.genehmigungen||[]).find(x=>x.id===id);
  if(!confirm(`Gutachten „${g?.bezeichnung||g?.typ||'?'}" wirklich löschen?`)) return;
  state.genehmigungen=(state.genehmigungen||[]).filter(g=>g.id!==id);
  await save('genehmigungen'); closeModal(); render();
}

// ─── Edit: Querung ────────────────────────────────────────────────────────────

function editQuerung(id){
  const q=(state.querungen||[]).find(x=>x.id===id)||{id:uid(),typ:'BAB',bezeichnung:'',lage:'',behoerde:'',tiefe_max:'',genehmigung_nr:'',datum_genehmigung:'',status:'ausstehend',nebenbestimmungen:[],notizen:'',projektId:state.currentProject||null};
  const typen=['BAB','Gewässer','Bahn','Gemeindestraße','Privatweg','Leitung','Sonstige'];
  openModal(`
    <h3>${id?'Querung bearbeiten':'Neue Querungsgenehmigung'}</h3>
    <form onsubmit="saveQuerung(event,'${q.id}',${!!id})">
      <div class="form-group"><label>Bezeichnung *</label><input name="bezeichnung" required value="${esc(q.bezeichnung||'')}"></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Typ</label>
          <select name="typ">${typen.map(t=>`<option value="${t}" ${q.typ===t?'selected':''}>${t}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="flex:1"><label>Status</label>
          <select name="status">${Object.entries(GENEHM_STATUS).map(([k,v])=>`<option value="${k}" ${q.status===k?'selected':''}>${v.label}</option>`).join('')}</select>
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Lage / Station</label><input name="lage" value="${esc(q.lage||'')}" placeholder="z.B. Bau-km 1+234"></div>
        <div class="form-group" style="flex:1"><label>Max. Verlegetiefe (m)</label><input name="tiefe_max" type="number" step="0.1" value="${esc(q.tiefe_max||'')}"></div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Behörde / Baulastträger</label><input name="behoerde" value="${esc(q.behoerde||'')}"></div>
        <div class="form-group" style="flex:1"><label>Genehmigung-Nr.</label><input name="genehmigung_nr" value="${esc(q.genehmigung_nr||'')}"></div>
      </div>
      <div class="form-group"><label>Genehmigt am</label><input type="date" name="datum_genehmigung" value="${q.datum_genehmigung||''}"></div>
      <div class="form-group"><label>Notizen / Auflagen</label><textarea name="notizen">${esc(q.notizen||'')}</textarea></div>
      <div class="modal-actions">
        ${id?`<button type="button" class="btn btn-danger" onclick="deleteQuerung('${q.id}')">Löschen</button>`:''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}
async function saveQuerung(ev,id,exists){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  if(!state.querungen) state.querungen=[];
  const nbs=(state.querungen.find(q=>q.id===id)||{}).nebenbestimmungen||[];
  const data={id,typ:fd.get('typ'),bezeichnung:fd.get('bezeichnung'),lage:fd.get('lage'),behoerde:fd.get('behoerde'),tiefe_max:fd.get('tiefe_max'),genehmigung_nr:fd.get('genehmigung_nr'),datum_genehmigung:fd.get('datum_genehmigung'),status:fd.get('status'),notizen:fd.get('notizen'),nebenbestimmungen:nbs,projektId:state.currentProject||null};
  if(exists) state.querungen=state.querungen.map(q=>q.id===id?{...q,...data}:q);
  else state.querungen.push(data);
  await save('querungen'); closeModal(); render();
}
async function deleteQuerung(id){
  const q=(state.querungen||[]).find(x=>x.id===id);
  if(!confirm(`Querung „${q?.bezeichnung||q?.typ||'?'}" wirklich löschen?`)) return;
  state.querungen=(state.querungen||[]).filter(q=>q.id!==id);
  await save('querungen'); closeModal(); render();
}

// ─── Edit: Nutzungsvertrag ────────────────────────────────────────────────────

function editNutzungsvertrag(id, defaultBereich){
  const n=(state.nutzungsvertraege||[]).find(x=>x.id===id)||{id:uid(),bezeichnung:'',eigentuemer:'',flaeche_ha:'',bereich:defaultBereich?[defaultBereich]:[],typ:'Nutzungsvertrag',laufzeit_bis:'',kuendigung_monate:'',tiefe_max:'',status:'ausstehend',notizen:'',projektId:state.currentProject||null};
  const typen=['Nutzungsvertrag','Pachtvertrag','Gestattungsvertrag','Kreuzungsvertrag','Sonstiger Vertrag'];
  const bereiche=['anlage','kabeltrasse','wegebau'];
  const bLabel={anlage:'Anlage',kabeltrasse:'Kabeltrasse',wegebau:'Wegebau'};
  openModal(`
    <h3>${id?'Nutzungsvertrag bearbeiten':'Neuer Nutzungsvertrag'}</h3>
    <form onsubmit="saveNutzungsvertrag(event,'${n.id}',${!!id})">
      <div class="form-group"><label>Bezeichnung *</label><input name="bezeichnung" required value="${esc(n.bezeichnung||'')}"></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Eigentümer / Vertragspartner</label><input name="eigentuemer" value="${esc(n.eigentuemer||'')}"></div>
        <div class="form-group" style="flex:1"><label>Fläche (ha)</label><input name="flaeche_ha" type="number" step="0.01" value="${esc(n.flaeche_ha||'')}"></div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Vertragstyp</label>
          <select name="typ">${typen.map(t=>`<option value="${t}" ${n.typ===t?'selected':''}>${t}</option>`).join('')}</select>
        </div>
        <div class="form-group" style="flex:1"><label>Status</label>
          <select name="status">${Object.entries(NV_STATUS).map(([k,v])=>`<option value="${k}" ${n.status===k?'selected':''}>${v.label}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-group">
        <label>Bereich</label>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px">
          ${bereiche.map(b=>`<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" name="bereich_${b}" ${(n.bereich||[]).includes(b)?'checked':''}> ${bLabel[b]}</label>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Laufzeit bis</label><input type="date" name="laufzeit_bis" value="${n.laufzeit_bis||''}"></div>
        <div class="form-group" style="flex:1"><label>Kündigungsfrist (Monate)</label><input name="kuendigung_monate" type="number" value="${esc(n.kuendigung_monate||'')}"></div>
      </div>
      <div class="form-group"><label>Max. Verlegetiefe (m)</label><input name="tiefe_max" type="number" step="0.1" value="${esc(n.tiefe_max||'')}" placeholder="nur für Kabeltrasse relevant"></div>
      <div class="form-group"><label>Notizen</label><textarea name="notizen">${esc(n.notizen||'')}</textarea></div>
      <div class="modal-actions">
        ${id?`<button type="button" class="btn btn-danger" onclick="deleteNutzungsvertrag('${n.id}')">Löschen</button>`:''}
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}
async function saveNutzungsvertrag(ev,id,exists){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  if(!state.nutzungsvertraege) state.nutzungsvertraege=[];
  const bereich=['anlage','kabeltrasse','wegebau'].filter(b=>fd.get('bereich_'+b)==='on');
  const data={id,bezeichnung:fd.get('bezeichnung'),eigentuemer:fd.get('eigentuemer'),flaeche_ha:fd.get('flaeche_ha'),bereich,typ:fd.get('typ'),laufzeit_bis:fd.get('laufzeit_bis'),kuendigung_monate:fd.get('kuendigung_monate'),tiefe_max:fd.get('tiefe_max'),status:fd.get('status'),notizen:fd.get('notizen'),projektId:state.currentProject||null};
  if(exists) state.nutzungsvertraege=state.nutzungsvertraege.map(n=>n.id===id?{...n,...data}:n);
  else state.nutzungsvertraege.push(data);
  await save('nutzungsvertraege'); closeModal(); render();
}
async function deleteNutzungsvertrag(id){
  const n=(state.nutzungsvertraege||[]).find(x=>x.id===id);
  if(!confirm(`Nutzungsvertrag „${n?.bezeichnung||'?'}" wirklich löschen?`)) return;
  state.nutzungsvertraege=(state.nutzungsvertraege||[]).filter(n=>n.id!==id);
  await save('nutzungsvertraege'); closeModal(); render();
}

// ─── Nebenbestimmungen (Querung modal flow) ───────────────────────────────────

function editNebenbestimmung(nbId, parentType, parentId){
  const parent=parentType==='querung'?(state.querungen||[]).find(q=>q.id===parentId):null;
  if(!parent) return;
  const nb=nbId?(parent.nebenbestimmungen||[]).find(n=>n.id===nbId):{id:uid(),text:'',frist:'',zustaendiger:'',status:'offen'};
  openModal(`
    <h3>${nbId?'Nebenbestimmung bearbeiten':'Neue Nebenbestimmung'}</h3>
    <form onsubmit="saveNebenbestimmung(event,'${nb.id}','${parentType}','${parentId}',${!!nbId})">
      <div class="form-group"><label>Text / Auflage *</label><textarea name="text" required rows="4">${esc(nb.text||'')}</textarea></div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Frist</label><input type="date" name="frist" value="${nb.frist||''}"></div>
        <div class="form-group" style="flex:1"><label>Zuständig</label><input name="zustaendiger" value="${esc(nb.zustaendiger||'')}"></div>
      </div>
      <div class="form-group"><label>Status</label>
        <select name="status">${Object.entries(NB_STATUS).map(([k,v])=>`<option value="${k}" ${nb.status===k?'selected':''}>${v.label}</option>`).join('')}</select>
      </div>
      <div class="modal-actions">
        ${nbId?`<button type="button" class="btn btn-danger" onclick="deleteNebenbestimmung('${nb.id}','${parentType}','${parentId}')">Löschen</button>`:''}
        <button type="button" class="btn btn-secondary" onclick="openQuerungDetail('${parentId}')">Zurück</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}
async function saveNebenbestimmung(ev,nbId,parentType,parentId,exists){
  ev.preventDefault();
  const fd=new FormData(ev.target);
  const data={id:nbId,text:fd.get('text'),frist:fd.get('frist'),zustaendiger:fd.get('zustaendiger'),status:fd.get('status')};
  state.querungen=(state.querungen||[]).map(q=>{
    if(q.id!==parentId) return q;
    const nbs=q.nebenbestimmungen||[];
    return {...q,nebenbestimmungen:exists?nbs.map(n=>n.id===nbId?data:n):[...nbs,data]};
  });
  await save('querungen');
  openQuerungDetail(parentId);
}
async function deleteNebenbestimmung(nbId,parentType,parentId){
  if(!confirm('Nebenbestimmung löschen?')) return;
  state.querungen=(state.querungen||[]).map(q=>q.id!==parentId?q:{...q,nebenbestimmungen:(q.nebenbestimmungen||[]).filter(n=>n.id!==nbId)});
  await save('querungen'); openQuerungDetail(parentId);
}

// ─── NB → Aufgabe / Kalender ─────────────────────────────────────────────────

async function nbUpdateField(nbId, parentType, parentId, fields){
  if(parentType==='genehmigung'){
    state.genehmigungen=(state.genehmigungen||[]).map(g=>g.id!==parentId?g:{...g,nebenbestimmungen:(g.nebenbestimmungen||[]).map(n=>n.id===nbId?{...n,...fields}:n)});
    await save('genehmigungen');
  } else {
    state.querungen=(state.querungen||[]).map(q=>q.id!==parentId?q:{...q,nebenbestimmungen:(q.nebenbestimmungen||[]).map(n=>n.id===nbId?{...n,...fields}:n)});
    await save('querungen');
  }
}

async function nbToAufgabe(nbId,parentType,parentId){
  const p=parentType==='genehmigung'?(state.genehmigungen||[]).find(g=>g.id===parentId):(state.querungen||[]).find(q=>q.id===parentId);
  const nb=p?(p.nebenbestimmungen||[]).find(n=>n.id===nbId):null; if(!nb) return;
  if(!state.projects.length){alert('Bitte zuerst ein Projekt anlegen.');return;}
  const taskId=uid();
  const task={id:taskId,title:nb.text.slice(0,100),description:'Nebenbestimmung: '+nb.text,type:'aufgabe',priority:'mittel',status:'offen',trade:'',location:'',assignee:nb.zustaendiger||'',due:nb.frist||'',photo:'',projectId:state.currentProject||state.projects[0].id,created:new Date().toISOString()};
  state.tasks.push(task);
  await save('tasks');
  await nbUpdateField(nbId,parentType,parentId,{aufgabeId:taskId});
  if(parentType==='querung') openQuerungDetail(parentId); else render();
}
async function nbRemoveAufgabe(nbId,parentType,parentId){
  const p=parentType==='genehmigung'?(state.genehmigungen||[]).find(g=>g.id===parentId):(state.querungen||[]).find(q=>q.id===parentId);
  const nb=p?(p.nebenbestimmungen||[]).find(n=>n.id===nbId):null; if(!nb?.aufgabeId) return;
  state.tasks=(state.tasks||[]).filter(t=>t.id!==nb.aufgabeId);
  await save('tasks');
  await nbUpdateField(nbId,parentType,parentId,{aufgabeId:null});
  if(parentType==='querung') openQuerungDetail(parentId); else render();
}

async function nbToKalender(nbId,parentType,parentId){
  const p=parentType==='genehmigung'?(state.genehmigungen||[]).find(g=>g.id===parentId):(state.querungen||[]).find(q=>q.id===parentId);
  const nb=p?(p.nebenbestimmungen||[]).find(n=>n.id===nbId):null; if(!nb) return;
  if(!nb.frist){alert('Bitte zuerst eine Frist für die Nebenbestimmung hinterlegen.');return;}
  if(!state.kalenderEntries) state.kalenderEntries=[];
  const entryId=uid();
  state.kalenderEntries.push({id:entryId,title:nb.text.slice(0,80),description:'Nebenbestimmung',type:'frist',date:nb.frist,source:'manual',projectId:state.currentProject||null});
  await save('kalenderEntries');
  await nbUpdateField(nbId,parentType,parentId,{kalenderEntryId:entryId});
  if(parentType==='querung') openQuerungDetail(parentId); else render();
}
async function nbRemoveKalender(nbId,parentType,parentId){
  const p=parentType==='genehmigung'?(state.genehmigungen||[]).find(g=>g.id===parentId):(state.querungen||[]).find(q=>q.id===parentId);
  const nb=p?(p.nebenbestimmungen||[]).find(n=>n.id===nbId):null; if(!nb?.kalenderEntryId) return;
  state.kalenderEntries=(state.kalenderEntries||[]).filter(k=>k.id!==nb.kalenderEntryId);
  await save('kalenderEntries');
  await nbUpdateField(nbId,parentType,parentId,{kalenderEntryId:null});
  if(parentType==='querung') openQuerungDetail(parentId); else render();
}

// ─── Exports ──────────────────────────────────────────────────────────────────
window.renderGenehmigungen    = renderGenehmigungen;
window.setGenehmTab           = setGenehmTab;
window.toggleVorpruefung      = toggleVorpruefung;
window.openVorpruefungPage    = openVorpruefungPage;
window.updateVPStatus         = updateVPStatus;
window.addVPItem              = addVPItem;
window.deleteVPItem           = deleteVPItem;
window.openAddGenehmPicker    = openAddGenehmPicker;
window.addGenehmFromVP        = addGenehmFromVP;
window.editGenehmigung        = editGenehmigung;
window.saveGenehmigung        = saveGenehmigung;
window.deleteGenehmigung      = deleteGenehmigung;
window.editGutachten          = editGutachten;
window.saveGutachten          = saveGutachten;
window.deleteGutachten        = deleteGutachten;
window.openGenehmActions      = openGenehmActions;
window.openNBActions          = openNBActions;
window.openInlineNBForm       = openInlineNBForm;
window.closeInlineNBForm      = closeInlineNBForm;
window.saveInlineNBForm       = saveInlineNBForm;
window.deleteInlineNB         = deleteInlineNB;
window.openInlineSubNBForm    = openInlineSubNBForm;
window.openSubNBActions       = openSubNBActions;
window.deleteInlineSubNB      = deleteInlineSubNB;
window.editQuerung            = editQuerung;
window.saveQuerung            = saveQuerung;
window.deleteQuerung          = deleteQuerung;
window.openQuerungDetail      = openQuerungDetail;
window.openQuerungActions     = openQuerungActions;
window.editNutzungsvertrag    = editNutzungsvertrag;
window.saveNutzungsvertrag    = saveNutzungsvertrag;
window.deleteNutzungsvertrag  = deleteNutzungsvertrag;
window.editNebenbestimmung    = editNebenbestimmung;
window.saveNebenbestimmung    = saveNebenbestimmung;
window.deleteNebenbestimmung  = deleteNebenbestimmung;
window.nbToAufgabe            = nbToAufgabe;
window.nbRemoveAufgabe        = nbRemoveAufgabe;
window.nbToKalender           = nbToKalender;
window.nbRemoveKalender       = nbRemoveKalender;
window.resetGenehmTab = function(){ genehmTab='anlage'; sessionStorage.setItem('genehmTab','anlage'); genehmSubView=null; activeInlineNB=null; };
