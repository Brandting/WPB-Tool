// ============ PROJEKTE ============
function completionDots(p){
  const cats = [
    {label:'Stammdaten', ok:!!(p.address&&p.client)},
    {label:'Kennwerte',  ok:!!(p.type&&p.params&&Object.keys(p.params).length>0)},
    {label:'Bauzeit',    ok:!!(p.timeline&&(p.timeline.buildStart||p.timeline.commDate))},
    {label:'Dokumente',  ok:!!(p.docChecklist&&p.docChecklist.some(d=>d.status==='freigegeben'))},
    {label:'Schätzungen',ok:state.estimates.some(e=>e.projectId===p.id)},
  ];
  return cats.map(c=>`<span title="${c.label}" style="display:inline-flex;align-items:center;gap:2px;font-size:11px;color:${c.ok?'var(--green)':'var(--border)'}">
    <span style="font-size:13px">${c.ok?'✅':'⬜'}</span>
    <span style="color:${c.ok?'var(--green)':'var(--muted)'}">${c.label}</span>
  </span>`).join(' ');
}

function renderProjekte(){
  if(currentProjectDetailId) return renderProjektDetail();
  return `
    <div class="page-header">
      <h2>Projekte</h2>
      <button class="btn" onclick="editProject()">+ Neues Projekt</button>
    </div>
    ${state.projects.length===0?emptyState('📁','Noch kein Projekt angelegt.'):
    `<table><thead><tr>
      <th>Name</th><th>Bauherr</th><th>Start</th><th>Ende</th><th>Status</th>
      <th>Vollständigkeit</th><th></th>
    </tr></thead><tbody>
    ${state.projects.map(p=>`<tr>
      <td><strong>${esc(p.name)}</strong>${p.address?`<br><small style="color:var(--muted)">📍 ${esc(p.address)}</small>`:''}</td>
      <td>${esc(p.client||'—')}</td>
      <td>${fmtDate(p.start)}</td>
      <td>${fmtDate(p.end)}</td>
      <td>${badge(p.status||'aktiv',p.status||'bearbeitung')}</td>
      <td style="min-width:200px;line-height:1.9">${completionDots(p)}</td>
      <td class="actions-cell">${actionButtons(p.id,{
        edit:'editProject',
        del:'deleteProject',
        extra:`<button class="btn btn-sm btn-secondary" onclick="currentProjectDetailId='${p.id}';render()" title="Projektdetails">📋</button>`
      })}</td>
    </tr>`).join('')}
    </tbody></table>`}
  `;
}

function renderProjektDetail(){
  const p = state.projects.find(x=>x.id===currentProjectDetailId);
  if(!p){currentProjectDetailId=null; return renderProjekte();}
  const tpl = p.type ? EST_TEMPLATES[p.type] : null;
  const tl = p.timeline||{};
  const estimates = state.estimates.filter(e=>e.projectId===p.id);

  return `
    <div class="page-header">
      <div>
        <h2 style="display:inline-block">${esc(p.name)}</h2>
        ${badge(p.status||'aktiv',p.status||'bearbeitung','margin-left:8px')}
      </div>
      <button class="btn btn-secondary" onclick="editProject('${p.id}')">✏️ Stammdaten bearbeiten</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">

      <!-- Stammdaten -->
      <div class="card">
        <h3 style="color:var(--primary);font-size:15px;margin-bottom:12px">📋 Stammdaten
          ${p.address&&p.client?'<span style="color:var(--green);font-size:12px;margin-left:6px">✅</span>':'<span style="color:var(--muted);font-size:12px;margin-left:6px">⬜ unvollständig</span>'}
        </h3>
        <table style="box-shadow:none;border:none;font-size:13px">
          <tr><td style="color:var(--muted);padding:4px 8px 4px 0;border:none;width:110px">Adresse</td><td style="border:none;padding:4px 0">${esc(p.address||'—')}</td></tr>
          <tr><td style="color:var(--muted);padding:4px 8px 4px 0;border:none">Bauherr</td><td style="border:none;padding:4px 0">${esc(p.client||'—')}</td></tr>
          <tr><td style="color:var(--muted);padding:4px 8px 4px 0;border:none">Typ</td><td style="border:none;padding:4px 0">${p.type ? esc(EST_TEMPLATES[p.type]?.label||p.type) : '<span style="color:var(--muted)">— kein Typ —</span>'}</td></tr>
          <tr><td style="color:var(--muted);padding:4px 8px 4px 0;border:none">Laufzeit</td><td style="border:none;padding:4px 0">${p.start?fmtDate(p.start):'—'} → ${p.end?fmtDate(p.end):'—'}</td></tr>
        </table>
      </div>

      <!-- Verknüpfte Schätzungen -->
      <div class="card">
        <h3 style="color:var(--primary);font-size:15px;margin-bottom:12px">💰 Kostenschätzungen
          <span style="color:${estimates.length?'var(--green)':'var(--muted)'};font-size:12px;margin-left:6px">${estimates.length?'✅ '+estimates.length+' vorhanden':'⬜ keine'}</span>
        </h3>
        ${estimates.length===0?'<div style="color:var(--muted);font-size:13px">Noch keine Kostenschätzung für dieses Projekt.</div>':
        estimates.map(e=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
          <div>
            <strong style="font-size:13px">${esc(e.name)}</strong>
            <span class="badge aufgabe" style="margin-left:6px;font-size:10px">${esc(EST_TEMPLATES[e.type]?.label||e.type)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <strong style="color:var(--primary)">${fmtEur(estTotal(e))}</strong>
            <button class="btn btn-sm btn-secondary" onclick="showView('schaetzung');setTimeout(()=>{currentEstimateId='${e.id}';render()},50)">Öffnen</button>
          </div>
        </div>`).join('')}
        <div style="margin-top:10px">
          <button class="btn btn-sm btn-secondary" onclick="showView('schaetzung');setTimeout(()=>newEstimate(),50)">+ Neue Schätzung</button>
        </div>
      </div>
    </div>

    <!-- Projektkennwerte -->
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
        <h3 style="color:var(--primary);font-size:15px;margin:0">📐 Projektkennwerte</h3>
        <button class="btn btn-sm btn-secondary" onclick="addProjektParam('${p.id}')">+ Kennwert</button>
      </div>
      ${(p.customParams||[]).length===0
        ? `<div style="font-size:13px;color:var(--muted)">Noch keine Kennwerte. Klicke auf <strong>+ Kennwert</strong> um z.B. Trassen- oder Wegebaulängen zu erfassen.</div>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:7px">
          ${(p.customParams||[]).map((cp,ci)=>`
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:7px;padding:7px 9px">
              <div style="font-size:10px;color:var(--muted);margin-bottom:3px;display:flex;justify-content:space-between;align-items:center">
                <input type="text" value="${esc(cp.label)}" style="border:none;background:transparent;color:var(--muted);font-size:10px;flex:1;padding:0"
                  onchange="updateProjektParam('${p.id}',${ci},'label',this.value)">
                <button onclick="deleteProjektParam('${p.id}',${ci})" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;padding:0 0 0 4px" title="Kennwert löschen">×</button>
              </div>
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
                <input type="number" step="any" value="${cp.value||0}" style="flex:1;font-weight:700;font-size:13px"
                  onchange="updateProjektParam('${p.id}',${ci},'value',parseFloat(this.value)||0)">
                <input type="text" value="${esc(cp.unit||'')}" placeholder="Einh." style="width:36px;border:none;background:transparent;color:var(--muted);font-size:11px;text-align:right"
                  onchange="updateProjektParam('${p.id}',${ci},'unit',this.value)">
              </div>
              <code style="font-size:9px;color:var(--blue)">${esc(cp.key)}</code>
            </div>`).join('')}
          </div>`}
    </div>

    <!-- Anlagen -->
    ${renderAnlagenSection(p)}

    <!-- Bauzeit & Meilensteine -->
    <div class="card">
      <h3 style="color:var(--primary);font-size:15px;margin-bottom:14px">📅 Bauzeit & Meilensteine
        ${tl.buildStart||tl.commDate?'<span style="color:var(--green);font-size:12px;margin-left:6px">✅</span>':'<span style="color:var(--muted);font-size:12px;margin-left:6px">⬜ unvollständig</span>'}
      </h3>
      <form onsubmit="saveProjektTimeline(event,'${p.id}')">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;display:block">📋 Planungsphase</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="date" name="planStart" value="${tl.planStart||''}" style="flex:1">
              <span style="color:var(--muted);font-size:12px">bis</span>
              <input type="date" name="planEnd" value="${tl.planEnd||''}" style="flex:1">
            </div>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;display:block">📄 Genehmigungsphase</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="date" name="permitStart" value="${tl.permitStart||''}" style="flex:1">
              <span style="color:var(--muted);font-size:12px">bis</span>
              <input type="date" name="permitEnd" value="${tl.permitEnd||''}" style="flex:1">
            </div>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;display:block">🏗️ Bauphase</label>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="date" name="buildStart" value="${tl.buildStart||''}" style="flex:1">
              <span style="color:var(--muted);font-size:12px">bis</span>
              <input type="date" name="buildEnd" value="${tl.buildEnd||''}" style="flex:1">
            </div>
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;display:block">⚡ Inbetriebnahme</label>
            <input type="date" name="commDate" value="${tl.commDate||''}" style="width:100%">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;display:block">🔌 Netzanschluss</label>
            <input type="date" name="gridDate" value="${tl.gridDate||''}" style="width:100%">
          </div>
          <div>
            <label style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;display:block">🔧 Abnahme / FAT / SAT</label>
            <input type="date" name="acceptanceDate" value="${tl.acceptanceDate||''}" style="width:100%">
          </div>
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>Bemerkungen zur Bauzeit</label>
          <textarea name="notes" style="min-height:60px">${esc(tl.notes||'')}</textarea>
        </div>
        <button type="submit" class="btn">💾 Bauzeit speichern</button>
      </form>
    </div>

    <!-- Proaktive Workflow-Hinweise -->
    ${(()=>{
      const alerts=computeWorkflowAlerts(p,90).filter(a=>!a.done);
      if(!alerts.length) return '';
      return `<div class="card">
        <h3 style="color:var(--primary);font-size:15px;margin-bottom:12px">⚡ Proaktive Hinweise</h3>
        <table><thead><tr><th>Hinweis</th><th>Bezug</th><th style="text-align:right">Termin in</th></tr></thead><tbody>
        ${alerts.map(a=>`<tr style="${a.urgent?'background:var(--warn-bg)':''}">
          <td>${esc(a.text)}</td>
          <td style="font-size:12px;color:var(--muted)">${esc(a.fieldLabel)}: ${fmtDate(a.eventDate)}</td>
          <td style="text-align:right;font-weight:600;color:${a.urgent?'var(--red)':a.daysUntilTrigger<14?'var(--accent)':'var(--text)'}">
            ${a.urgent?'Jetzt!':a.daysUntilTrigger+'T'}
          </td>
        </tr>`).join('')}
        </tbody></table>
      </div>`;
    })()}

    <!-- BZP Schnellgenerator -->
    <div class="card">
      <h3 style="color:var(--primary);font-size:15px;margin-bottom:6px">📅 Bauzeitplan-Generator</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:16px">
        Generiert einen Muster-Bauzeitplan aus den Projektkennwerten. Aktiviere nur die Gewerke die in deinem Projekt vorkommen — Dauern werden aus Kennwerten + Kolonnen berechnet.
        ${!p.type?'<br><strong style="color:var(--accent)">⚠ Bitte zuerst Projekttyp und Kennwerte setzen.</strong>':
        (!p.params||!Object.keys(p.params).length)?'<br><strong style="color:var(--accent)">⚠ Bitte Kennwerte ausfüllen.</strong>':''}
      </p>
      ${p.type&&p.params&&Object.keys(p.params).length?renderBzpGenerator(p):''}
    </div>
  `;
}

// ============ DOKUMENTPRÜFUNG ============
function renderDokumentpruefung(){
  const projId = state.currentProject || (state.projects[0]?.id ?? null);
  const p = projId ? state.projects.find(x=>x.id===projId) : null;

  if(!p) return `
    <div class="page-header"><h2>Genehmigungen</h2></div>
    <div class="card empty"><span class="empty-icon">📋</span>Bitte zuerst ein Projekt auswählen.</div>`;

  const docs = p.docChecklist||[];
  const cats = [...new Set(docs.map(d=>d.category))];
  const statusCount = {};
  DOC_STATUS.forEach(s=>{ statusCount[s.key]=docs.filter(d=>d.status===s.key).length; });
  const pct = docCompletionPct(p);

  return `
    <div class="page-header">
      <div>
        <h2>Genehmigungen</h2>
        <span style="font-size:13px;color:var(--muted);margin-left:4px">${esc(p.name)}</span>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="addCustomDoc('${p.id}')">+ Dokument</button>
    </div>

    ${docs.length>0?`
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Fortschritt (freigegeben/geprüft)</div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:10px;background:var(--border);border-radius:5px">
              <div style="height:100%;width:${pct}%;background:${pct>=80?'var(--green)':pct>=50?'var(--yellow)':'var(--red)'};border-radius:5px;transition:.3s"></div>
            </div>
            <strong style="font-size:14px;color:${pct>=80?'var(--green)':pct>=50?'var(--yellow)':'var(--red)'}">${pct}%</strong>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${DOC_STATUS.map(s=>statusCount[s.key]>0?`<span style="background:${s.color};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600">${s.label}: ${statusCount[s.key]}</span>`:'').join('')}
        </div>
      </div>
    </div>`:''}

    <div class="card">
      ${!p.type
        ? `<p style="color:var(--muted);font-size:13px">Bitte zuerst den Projekttyp in den Stammdaten setzen, um die Checkliste zu initialisieren.</p>`
        : docs.length===0
          ? `<div style="display:flex;gap:10px;align-items:center">
              <p style="color:var(--muted);font-size:13px;margin:0">Checkliste noch nicht initialisiert.</p>
              <button class="btn btn-sm" onclick="initDocChecklist('${p.id}')">Checkliste erstellen</button>
             </div>`
          : cats.map(cat=>`
              <div style="margin-bottom:16px">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:.5px;margin-bottom:6px;padding-bottom:4px;border-bottom:2px solid var(--border)">${esc(cat)}</div>
                ${docs.filter(d=>d.category===cat).map(doc=>`
                  <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
                    <span style="flex:1;font-size:13px">${esc(doc.name)}${doc.custom?'<span style="color:var(--accent);font-size:10px;margin-left:6px">✎ eigene</span>':''}</span>
                    <select style="width:140px;font-size:12px;padding:4px 6px" onchange="setDocStatus('${p.id}','${doc.id}',this.value)">
                      ${DOC_STATUS.map(s=>`<option value="${s.key}" ${doc.status===s.key?'selected':''}>${s.label}</option>`).join('')}
                    </select>
                    ${doc.custom?`<button class="btn btn-sm btn-danger" style="padding:3px 8px" onclick="removeCustomDoc('${p.id}','${doc.id}')">×</button>`:'<div style="width:34px"></div>'}
                  </div>`).join('')}
              </div>`).join('')}
    </div>
  `;
}

// ============ BZP GENERATOR ============
// Tagesleistungen (m/Tag oder Stk/Tag je Kolonne)
const BZP_PERF = {
  trench_open:    160,  // m/Tag offene Bauweise (1 Kolonne)
  trench_hdd:     30,   // m/Tag HDD-Querung (1 Gerät)
  road:           80,   // m/Tag Wegebau (1 Kolonne)
  road_main:      50,   // m/Tag Hauptbaustraße (1 Kolonne)
  fence:          200,  // m/Tag Zaunmontage (1 Kolonne)
  pv_modules:     400,  // Stk/Tag Montage (1 Kolonne)
  pv_string:      2000, // m/Tag DC-Stringverkabelung (1 Kolonne)
  mv_cable:       200,  // m/Tag MV-Kabelverlegung (1 Kolonne)
  foundation_ram: 80,   // Stk/Tag Rammpfähle (1 Gerät)
  bess_found:     2,    // Stk/Tag Betonfundamente Container (1 Kolonne)
  bess_container: 1,    // Stk/Tag Container setzen (1 Kran)
  wea_found:      0.5,  // Stk/Tag Fundamentherstellung WEA (1 Kolonne)
  wea_erect:      0.5,  // Stk/Tag WEA-Errichtung (1 Kran)
};

// Template-Definition: Gruppen mit Vorgängen
// each item: {id, label, unit, perfKey, quantityFn, level, depIds, optional, defaultActive}
const BZP_TEMPLATES = {
  pv: {
    kolonnen: [
      {key:'kol_tiefbau',  label:'Tiefbau-Kolonnen',    default:1},
      {key:'kol_zaun',     label:'Zaun-Kolonnen',        default:1},
      {key:'kol_montage',  label:'Montage-Kolonnen',     default:2},
      {key:'kol_kabel',    label:'Kabel-Kolonnen (DC)',  default:1},
      {key:'kol_mv',       label:'MV-Kabel-Kolonne',     default:1},
      {key:'ger_ramm',     label:'Rammgeräte',            default:1},
    ],
    toggles: [
      {key:'t_baustr',  label:'Hauptbaustraße bauen',      default:true},
      {key:'t_infield', label:'Infield-Wegebau',           default:true},
      {key:'t_hdd',     label:'HDD-Querungen',             default:false},
      {key:'t_zaun',    label:'Zaunanlage',                default:true},
      {key:'t_ramm',    label:'Rammpfähle (Aufständerung)',default:true},
      {key:'t_dc',      label:'DC-Stringverkabelung',      default:true},
      {key:'t_mv',      label:'MV-Kabeltrasse',            default:true},
      {key:'t_station', label:'MS-Station(en)',            default:true},
      {key:'t_montage', label:'Modulmontage',              default:true},
      {key:'t_com',     label:'Commissioning',             default:true},
    ],
    tasks: (p,kol,tog)=>{
      const params=p.params||{};
      const trM=params.trenchM||0, roadM=params.roadM||0, fenceM=params.fenceM||0;
      const mwp=params.mwp||1, mods=params.moduleCount||Math.round(mwp*1800);
      const mvSt=params.mvStations||2;
      const hddM=Math.round(trM*0.15); // Annahme 15% HDD
      const tasks=[];
      let lastId=null;
      const add=(id,name,days,level,dep,optional,togKey)=>{
        if(optional&&!tog[togKey]) return;
        tasks.push({id,name,duration:Math.max(1,Math.round(days)),level,depId:dep});
        lastId=id;
      };
      add('bzp_baustr','Baustraße / Zufahrt',roadM*0.3/BZP_PERF.road_main/kol.kol_tiefbau,1,null,true,'t_baustr');
      add('bzp_einricht','Baustelleneinrichtung',3,1,null,false,null);
      const afterSetup=tog.t_baustr?'bzp_baustr':'bzp_einricht';
      add('bzp_ramm','Rammpfähle setzen',mods*0.55/BZP_PERF.foundation_ram/kol.ger_ramm,1,afterSetup,true,'t_ramm');
      add('bzp_zaun','Zaunanlage',fenceM/BZP_PERF.fence/kol.kol_zaun,1,afterSetup,true,'t_zaun');
      add('bzp_infield','Infield-Wegebau',roadM/BZP_PERF.road/kol.kol_tiefbau,1,afterSetup,true,'t_infield');
      const afterPara=tasks.length?tasks[tasks.length-1].id:afterSetup;
      add('bzp_mv','Kabeltrasse MV (offen)',(trM-(tog.t_hdd?hddM:0))/BZP_PERF.mv_cable/kol.kol_mv,1,afterSetup,true,'t_mv');
      add('bzp_hdd','HDD-Querungen',hddM/BZP_PERF.trench_hdd/1,2,'bzp_mv',true,'t_hdd');
      add('bzp_mvcable','MV-Kabelzug',trM/BZP_PERF.mv_cable/kol.kol_mv,2,tog.t_hdd?'bzp_hdd':'bzp_mv',true,'t_mv');
      add('bzp_station','MS-Station(en) setzen',mvSt*5,1,'bzp_mvcable',true,'t_station');
      add('bzp_montage','Modulaufständerung & -montage',mods/BZP_PERF.pv_modules/kol.kol_montage,1,tog.t_ramm?'bzp_ramm':afterSetup,true,'t_montage');
      add('bzp_dc','DC-Stringverkabelung',mods*2/BZP_PERF.pv_string/kol.kol_kabel,1,'bzp_montage',true,'t_dc');
      add('bzp_com','Commissioning & IBN',Math.max(5,Math.round(mwp*2)),1,tog.t_station?'bzp_station':'bzp_dc',true,'t_com');
      return tasks;
    }
  },
  bess: {
    kolonnen: [
      {key:'kol_tiefbau',  label:'Tiefbau-Kolonnen',      default:1},
      {key:'kol_zaun',     label:'Zaun-Kolonnen',          default:1},
      {key:'kol_found',    label:'Fundamentkolonnen',      default:1},
      {key:'kol_mv',       label:'MV-Kabel-Kolonne',       default:1},
      {key:'ger_kran',     label:'Kräne (Container)',       default:1},
    ],
    toggles: [
      {key:'t_baustr',  label:'Baustraße bauen',            default:true},
      {key:'t_zaun',    label:'Zaunanlage',                 default:true},
      {key:'t_found',   label:'Betonfundamente',            default:true},
      {key:'t_screw',   label:'Schraubpfähle',              default:false},
      {key:'t_mv',      label:'MV-Kabeltrasse',             default:true},
      {key:'t_station', label:'Übergabestation',            default:true},
      {key:'t_com',     label:'FAT / SAT / Commissioning',  default:true},
    ],
    tasks: (p,kol,tog)=>{
      const params=p.params||{};
      const containers=params.containers||Math.ceil((params.mwh||20)/2);
      const trM=params.trenchM||600, roadM=params.roadM||250, fenceM=params.fenceM||600;
      const tasks=[];
      const add=(id,name,days,level,dep,optional,togKey)=>{
        if(optional&&!tog[togKey]) return;
        tasks.push({id,name,duration:Math.max(1,Math.round(days)),level,depId:dep});
      };
      add('bzp_baustr','Baustraße / Zufahrt',roadM/BZP_PERF.road_main/kol.kol_tiefbau,1,null,true,'t_baustr');
      add('bzp_einricht','Baustelleneinrichtung',3,1,null,false,null);
      const s=tog.t_baustr?'bzp_baustr':'bzp_einricht';
      add('bzp_zaun','Zaunanlage',fenceM/BZP_PERF.fence/kol.kol_zaun,1,s,true,'t_zaun');
      add('bzp_found','Betonfundamente Container',containers/BZP_PERF.bess_found/kol.kol_found,1,s,true,'t_found');
      add('bzp_screw','Schraubpfähle setzen',containers*6/BZP_PERF.foundation_ram,1,s,true,'t_screw');
      const foundDone=tog.t_found?'bzp_found':(tog.t_screw?'bzp_screw':s);
      add('bzp_container','Container setzen & ausrichten',containers/BZP_PERF.bess_container/kol.ger_kran,1,foundDone,false,null);
      add('bzp_mv','Kabeltrasse & MV-Kabel',trM/BZP_PERF.mv_cable/kol.kol_mv,1,s,true,'t_mv');
      add('bzp_lv','LV-Verbindungen & Verkabelung',containers*2,1,'bzp_container',false,null);
      add('bzp_station','Übergabestation',15,1,'bzp_mv',true,'t_station');
      add('bzp_com','FAT / SAT / Commissioning',Math.max(10,containers*2),1,'bzp_lv',true,'t_com');
      return tasks;
    }
  },
  wind: {
    kolonnen: [
      {key:'kol_tiefbau', label:'Tiefbau-Kolonnen',        default:1},
      {key:'kol_mv',      label:'MV-Kabel-Kolonne',        default:1},
      {key:'kol_found',   label:'WEA-Fundamentkolonnen',   default:1},
      {key:'ger_kran',    label:'Kräne (WEA-Errichtung)',  default:1},
    ],
    toggles: [
      {key:'t_baustr',  label:'Zuwegung ausbauen',          default:true},
      {key:'t_kranstell','label':'Kranstellflächen anlegen', default:true},
      {key:'t_found',   label:'WEA-Fundamente',             default:true},
      {key:'t_mv',      label:'Infield MV-Kabel',           default:true},
      {key:'t_station', label:'Übergabestation 110kV',      default:true},
      {key:'t_erect',   label:'WEA-Errichtung',             default:true},
      {key:'t_com',     label:'Einmessung / Abnahme',       default:true},
    ],
    tasks: (p,kol,tog)=>{
      const params=p.params||{};
      const weaCount=params.weaCount||5;
      const roadM=params.roadM||5000, trM=params.trenchM||8000;
      const cranePad=params.cranePadM2||1200;
      const tasks=[];
      const add=(id,name,days,level,dep,optional,togKey)=>{
        if(optional&&!tog[togKey]) return;
        tasks.push({id,name,duration:Math.max(1,Math.round(days)),level,depId:dep});
      };
      add('bzp_zuwegung','Zuwegung ausbauen',roadM/BZP_PERF.road/kol.kol_tiefbau,1,null,true,'t_baustr');
      add('bzp_einricht','Baustelleneinrichtung',5,1,null,false,null);
      const s=tog.t_baustr?'bzp_zuwegung':'bzp_einricht';
      add('bzp_kran','Kranstellflächen anlegen',weaCount*cranePad/5000/kol.kol_tiefbau*5,1,s,true,'t_kranstell');
      add('bzp_found','WEA-Fundamente',weaCount/BZP_PERF.wea_found/kol.kol_found,1,s,true,'t_found');
      add('bzp_mv','Infield MV-Kabel',trM/BZP_PERF.mv_cable/kol.kol_mv,1,s,true,'t_mv');
      add('bzp_station','Übergabestation 110kV',30,1,'bzp_mv',true,'t_station');
      const foundDone=tog.t_found?'bzp_found':s;
      add('bzp_erect','WEA-Errichtung',weaCount/BZP_PERF.wea_erect/kol.ger_kran,1,foundDone,true,'t_erect');
      add('bzp_com','Einmessung & Abnahme',weaCount*3,1,tog.t_erect?'bzp_erect':foundDone,true,'t_com');
      return tasks;
    }
  }
};

function renderBzpGenerator(p){
  const tpl=BZP_TEMPLATES[p.type]; if(!tpl) return '<p style="color:var(--muted);font-size:13px">Kein Template für diesen Projekttyp.</p>';
  const cfg=p.bzpConfig||{};
  const params=p.params||{};

  // Preview-Berechnung
  const kol={};
  tpl.kolonnen.forEach(k=>{ kol[k.key]=cfg[k.key]??k.default; });
  const tog={};
  tpl.toggles.forEach(t=>{ tog[t.key]=cfg[t.key]??t.default; });
  const preview=tpl.tasks(p,kol,tog);
  const totalDays=preview.reduce((s,t)=>s+t.duration,0);

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <!-- Gewerke-Checkboxen -->
      <div>
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Gewerke aktivieren</div>
        ${tpl.toggles.map(t=>`
          <label style="display:flex;align-items:center;gap:8px;padding:5px 0;cursor:pointer;font-size:13px;border-bottom:1px solid var(--border)">
            <input type="checkbox" ${tog[t.key]?'checked':''} style="width:auto;margin:0"
              onchange="setBzpConfig('${p.id}','${t.key}',this.checked)">
            ${esc(t.label)}
          </label>`).join('')}
      </div>

      <!-- Kolonnen-Eingaben -->
      <div>
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Kolonnen & Geräte</div>
        ${tpl.kolonnen.map(k=>`
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
            <span style="flex:1;font-size:13px">${esc(k.label)}</span>
            <input type="number" min="1" max="20" value="${kol[k.key]}" style="width:60px;text-align:center;font-size:13px"
              onchange="setBzpConfig('${p.id}','${k.key}',parseInt(this.value)||1)">
          </div>`).join('')}

        <!-- Startdatum -->
        <div style="margin-top:14px">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Startdatum</div>
          <input type="date" id="bzpStartDate" value="${cfg.startDate||p.timeline?.buildStart||today()}"
            style="width:100%;font-size:13px" onchange="setBzpConfig('${p.id}','startDate',this.value)">
        </div>
      </div>
    </div>

    <!-- Vorschau -->
    <div style="margin-top:16px;padding:12px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:10px">
        Vorschau — ${preview.length} Vorgänge
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
        ${preview.map(t=>`<span style="background:var(--card);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:12px">
          ${esc(t.name)} <strong style="color:var(--primary)">${t.duration}T</strong>
        </span>`).join('')}
      </div>
      <div style="font-size:13px;color:var(--muted)">
        Gesamtlaufzeit sequenziell: <strong style="color:var(--text)">${totalDays} Arbeitstage</strong>
        (effektiv kürzer durch Parallelisierung)
      </div>
    </div>

    <div style="margin-top:16px;display:flex;gap:10px;align-items:center">
      <button class="btn" onclick="generateBzp('${p.id}',false)">📅 BZP erstellen (anfügen)</button>
      <button class="btn btn-danger" onclick="generateBzp('${p.id}',true)">🔄 BZP erstellen (ersetzen)</button>
      <span style="font-size:12px;color:var(--muted)">„Ersetzen" löscht bestehende Vorgänge dieses Projekts</span>
    </div>
  `;
}

async function setBzpConfig(projId, key, value){
  const p=state.projects.find(x=>x.id===projId);
  if(!p.bzpConfig) p.bzpConfig={};
  p.bzpConfig[key]=value;
  state.projects=state.projects.map(x=>x.id===projId?p:x);
  await save('projects');
  render();
}

async function generateBzp(projId, replace){
  const p=state.projects.find(x=>x.id===projId);
  const tpl=BZP_TEMPLATES[p.type]; if(!tpl) return;
  const cfg=p.bzpConfig||{};

  const kol={};
  tpl.kolonnen.forEach(k=>{ kol[k.key]=cfg[k.key]??k.default; });
  const tog={};
  tpl.toggles.forEach(t=>{ tog[t.key]=cfg[t.key]??t.default; });

  const taskDefs=tpl.tasks(p,kol,tog);
  if(!taskDefs.length){alert('Keine Vorgänge generiert. Bitte mindestens ein Gewerk aktivieren.');return;}

  const startDate=cfg.startDate||p.timeline?.buildStart||today();

  // Build id map: template id → real internal id
  const idMap={};
  taskDefs.forEach(td=>{ idMap[td.id]='sch_'+uid(); });

  // Compute dates sequentially (respecting EA deps)
  const computed={};
  for(const td of taskDefs){
    let start=startDate;
    if(td.depId&&computed[td.depId]){
      start=computed[td.depId].end;
    }
    const end=dateAddDays(start,td.duration);
    computed[td.id]={start,end};
  }

  const newTasks=taskDefs.map(td=>({
    id: idMap[td.id],
    projectId: projId,
    name: td.name,
    start: computed[td.id].start,
    end: computed[td.id].end,
    duration: td.duration,
    level: td.level||1,
    assignee: '',
    progress: 0,
    checklist: [],
    reminder: null,
    reminders: [],
    deps: td.depId&&idMap[td.depId] ? [{predId:idMap[td.depId],type:'EA',lag:0}] : [],
  }));

  if(replace){
    if(!confirm(`Alle ${state.schedule.filter(t=>t.projectId===projId).length} vorhandenen Vorgänge dieses Projekts löschen und durch ${newTasks.length} neue ersetzen?`)) return;
    state.schedule=state.schedule.filter(t=>t.projectId!==projId);
  }
  state.schedule=[...state.schedule,...newTasks];
  await save('schedule');
  alert(`✓ ${newTasks.length} Vorgänge erstellt. Du findest den BZP unter „📅 Bauzeitplan".`);
  showView('bauzeitplan');
}


function updateDetailKennwerte(type){
  const div=document.getElementById('detailKennwerteFields'); if(!div) return;
  const p=state.projects.find(x=>x.id===currentProjectDetailId);
  const params=p?.params||{};
  if(!type){div.innerHTML='<p style="color:var(--muted);font-size:13px">Bitte zuerst einen Projekttyp wählen.</p>';return;}
  const tpl=EST_TEMPLATES[type]; if(!tpl){div.innerHTML='';return;}
  const primary=tpl.params.filter(pr=>pr.primary);
  div.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">
    ${primary.map(pr=>`<div>
      <label style="font-size:11px;color:var(--muted)">${esc(pr.label)}</label>
      <div style="display:flex;align-items:center;gap:4px;margin-top:3px">
        <input type="number" step="any" name="param_${pr.key}" value="${params[pr.key]??pr.default}" style="flex:1;font-size:13px">
        <span style="font-size:11px;color:var(--muted)">${esc(pr.unit)}</span>
      </div>
    </div>`).join('')}
  </div>`;
}

async function setProjektType(projId, type){
  const proj=state.projects.find(p=>p.id===projId); if(!proj) return;
  proj.type=type||null;
  // Init checklist if needed
  if(type&&DOC_TEMPLATES[type]&&(!proj.docChecklist||proj.docChecklist.length===0)){
    proj.docChecklist=buildDocChecklist(type);
  }
  await save('projects'); render();
}

async function setProjektParam(projId, key, value){
  const proj=state.projects.find(p=>p.id===projId); if(!proj) return;
  if(!proj.params) proj.params={};
  proj.params[key]=value;
  // Bidirektional: alle verknüpften Schätzungen aktualisieren
  state.estimates.filter(e=>e.projectId===projId&&e.type===proj.type).forEach(est=>{
    if(!est.paramOverrides) est.paramOverrides={};
    // Nur setzen wenn kein estimate-spezifischer Override existiert
    if(est.paramOverrides[key]===undefined||est.paramOverrides[key]===null){
      _recomputeFormulas(est);
    }
  });
  await save('projects'); await save('estimates'); render();
}

async function addProjektParam(projId){
  const proj=state.projects.find(p=>p.id===projId); if(!proj) return;
  const label=prompt('Bezeichnung des Kennwerts:','Länge geschl. Bauweise');
  if(!label) return;
  let key=label.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9_]/g,'_').replace(/^[^a-z_]/,'p$&').replace(/__+/g,'_').slice(0,20);
  if(!proj.customParams) proj.customParams=[];
  const existing=[...proj.customParams.map(c=>c.key)];
  let attempt=key, n=2;
  while(existing.includes(attempt)) attempt=key+'_'+n++;
  proj.customParams.push({id:uid(),key:attempt,label,value:0,unit:''});
  // Sync to linked estimates as paramDefinitions
  state.estimates.filter(e=>e.projectId===projId).forEach(est=>{
    if(!est.paramDefinitions) est.paramDefinitions=[];
    if(!est.paramDefinitions.find(d=>d.key===attempt)){
      est.paramDefinitions.push({id:uid(),key:attempt,label,value:0,unit:''});
    }
  });
  await save('projects'); await save('estimates'); render();
}

async function updateProjektParam(projId, ci, field, value){
  const proj=state.projects.find(p=>p.id===projId); if(!proj) return;
  if(!proj.customParams?.[ci]) return;
  proj.customParams[ci][field]=value;
  // Sync value to linked estimates
  if(field==='value'){
    const key=proj.customParams[ci].key;
    state.estimates.filter(e=>e.projectId===projId).forEach(est=>{
      const pd=(est.paramDefinitions||[]).find(d=>d.key===key);
      if(pd) pd.value=value;
      _recomputeFormulas(est);
    });
    await save('estimates');
  }
  await save('projects'); render();
}

async function deleteProjektParam(projId, ci){
  const proj=state.projects.find(p=>p.id===projId); if(!proj) return;
  const cp=proj.customParams?.[ci]; if(!cp) return;
  if(!confirm(`Kennwert "${cp.label}" löschen?`)) return;
  proj.customParams.splice(ci,1);
  await save('projects'); render();
}

async function saveProjektKennwerte(e, id){
  e.preventDefault();
  const fd=new FormData(e.target);
  const type=fd.get('type')||null;
  const params={};
  if(type&&EST_TEMPLATES[type]){
    EST_TEMPLATES[type].params.filter(pr=>pr.primary).forEach(pr=>{
      const v=parseFloat(fd.get('param_'+pr.key));
      if(!isNaN(v)) params[pr.key]=v;
    });
  }
  const proj=state.projects.find(p=>p.id===id);
  let docChecklist=proj?.docChecklist||[];
  if(type&&DOC_TEMPLATES[type]&&docChecklist.length===0){
    docChecklist=buildDocChecklist(type);
  }
  state.projects=state.projects.map(p=>p.id===id?{...p,type:type||null,params,docChecklist}:p);
  await save('projects'); render();
}

function buildDocChecklist(type){
  if(!DOC_TEMPLATES[type]) return [];
  return DOC_TEMPLATES[type].flatMap(cat=>
    cat.items.map(name=>({id:uid(),name,category:cat.cat,status:'fehlt',notes:'',custom:false}))
  );
}

async function initDocChecklist(id){
  const proj=state.projects.find(p=>p.id===id);
  if(!proj||!proj.type) return;
  const docChecklist=buildDocChecklist(proj.type);
  state.projects=state.projects.map(p=>p.id===id?{...p,docChecklist}:p);
  await save('projects'); render();
}

async function setDocStatus(projId,docId,status){
  const proj=state.projects.find(p=>p.id===projId);
  if(!proj) return;
  proj.docChecklist=proj.docChecklist.map(d=>d.id===docId?{...d,status}:d);
  state.projects=state.projects.map(p=>p.id===projId?proj:p);
  await save('projects'); render();
}

function addCustomDoc(projId){
  openModal(`
    <h3>Eigenes Dokument</h3>
    <div class="form-group"><label>Bezeichnung *</label><input id="custDocName" placeholder="z.B. Kreuzungsvertrag Gemeinde"></div>
    <div class="form-group"><label>Kategorie</label><input id="custDocCat" placeholder="z.B. Unterlagen" value="Unterlagen"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn" onclick="confirmAddCustomDoc('${projId}')">Hinzufügen</button>
    </div>
  `);
}
async function confirmAddCustomDoc(projId){
  const name=(document.getElementById('custDocName').value||'').trim();
  if(!name) return;
  const cat=(document.getElementById('custDocCat').value||'').trim()||'Unterlagen';
  const proj=state.projects.find(p=>p.id===projId);
  if(!proj.docChecklist) proj.docChecklist=[];
  proj.docChecklist.push({id:uid(),name,category:cat,status:'fehlt',notes:'',custom:true});
  state.projects=state.projects.map(p=>p.id===projId?proj:p);
  await save('projects'); closeModal(); render();
}
async function removeCustomDoc(projId,docId){
  const proj=state.projects.find(p=>p.id===projId);
  proj.docChecklist=proj.docChecklist.filter(d=>d.id!==docId);
  state.projects=state.projects.map(p=>p.id===projId?proj:p);
  await save('projects'); render();
}

async function saveProjektTimeline(e, id){
  e.preventDefault();
  const fd=new FormData(e.target);
  const timeline={
    planStart:fd.get('planStart')||'',
    planEnd:fd.get('planEnd')||'',
    permitStart:fd.get('permitStart')||'',
    permitEnd:fd.get('permitEnd')||'',
    buildStart:fd.get('buildStart')||'',
    buildEnd:fd.get('buildEnd')||'',
    commDate:fd.get('commDate')||'',
    gridDate:fd.get('gridDate')||'',
    acceptanceDate:fd.get('acceptanceDate')||'',
    notes:fd.get('notes')||''
  };
  state.projects=state.projects.map(p=>p.id===id?{...p,timeline}:p);
  await save('projects');
  render();
}

function editProject(id){
  const p = id ? state.projects.find(x=>x.id===id) : {id:uid(),name:'',address:'',client:'',start:today(),end:'',status:'aktiv',type:''};
  openModal(`
    <h3>${id?'Stammdaten bearbeiten':'Neues Projekt'}</h3>
    <form onsubmit="saveProject(event,'${p.id}',${id?'true':'false'})">
      <div class="form-group"><label>Projektname *</label><input name="name" required value="${esc(p.name)}"></div>
      <div class="form-group"><label>Adresse</label><input name="address" value="${esc(p.address||'')}"></div>
      <div class="form-group"><label>Bauherr / Auftraggeber</label><input name="client" value="${esc(p.client||'')}"></div>
      <div class="form-group"><label>Typ</label>
        <select name="type">
          <option value="">— kein Typ —</option>
          ${Object.entries(EST_TEMPLATES).map(([k,t])=>`<option value="${k}" ${p.type===k?'selected':''}>${esc(t.label)}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Baubeginn</label><input type="date" name="start" value="${p.start||''}"></div>
        <div class="form-group" style="flex:1"><label>Bauende (geplant)</label><input type="date" name="end" value="${p.end||''}"></div>
      </div>
      <div class="form-group"><label>Status</label>
        <select name="status">
          <option value="aktiv" ${(p.status||'aktiv')==='aktiv'?'selected':''}>Aktiv</option>
          <option value="planung" ${p.status==='planung'?'selected':''}>Planung</option>
          <option value="abgeschlossen" ${p.status==='abgeschlossen'?'selected':''}>Abgeschlossen</option>
          <option value="pausiert" ${p.status==='pausiert'?'selected':''}>Pausiert</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}
async function saveProject(e,id,exists){
  e.preventDefault();
  const fd=new FormData(e.target);
  const data={id,name:fd.get('name'),address:fd.get('address'),client:fd.get('client'),
    type:fd.get('type')||null,start:fd.get('start'),end:fd.get('end'),status:fd.get('status')};
  if(exists==='true'||exists===true){
    state.projects=state.projects.map(p=>p.id===id?{...p,...data}:p);
  } else {
    state.projects.push({...data, params:{}, timeline:{}});
    if(!state.currentProject){ switchProject(id); }
  }
  await save('projects'); closeModal(); render();
}
async function deleteProject(id){
  const p=state.projects.find(x=>x.id===id);
  if(!confirm(`Projekt „${p?.name||'?'}" wirklich löschen?\nZugehörige Aufgaben & Einträge bleiben erhalten.`)) return;
  state.projects = state.projects.filter(p=>p.id!==id);
  if(state.currentProject===id){ switchProject(null); }
  await save('projects');
  render();
}



// Exports
window.renderProjekte = renderProjekte;
window.renderProjektDetail = renderProjektDetail;
window.renderDokumentpruefung = renderDokumentpruefung;
window.renderBzpGenerator = renderBzpGenerator;
window.setBzpConfig = setBzpConfig;
window.generateBzp = generateBzp;
window.updateDetailKennwerte = updateDetailKennwerte;
window.setProjektType = setProjektType;
window.setProjektParam = setProjektParam;
window.addProjektParam = addProjektParam;
window.updateProjektParam = updateProjektParam;
window.deleteProjektParam = deleteProjektParam;
window.saveProjektKennwerte = saveProjektKennwerte;
window.buildDocChecklist = buildDocChecklist;
window.initDocChecklist = initDocChecklist;
window.setDocStatus = setDocStatus;
window.addCustomDoc = addCustomDoc;
window.confirmAddCustomDoc = confirmAddCustomDoc;
window.removeCustomDoc = removeCustomDoc;
window.saveProjektTimeline = saveProjektTimeline;
window.editProject = editProject;
window.saveProject = saveProject;
window.deleteProject = deleteProject;
window.completionDots = completionDots;
