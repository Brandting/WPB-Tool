// ============ DASHBOARD ============
function renderDashboard(){
  const tasks = projectTasks();
  const offen = tasks.filter(t=>t.status==='offen').length;
  const bearbeitung = tasks.filter(t=>t.status==='bearbeitung').length;
  const erledigt = tasks.filter(t=>t.status==='erledigt').length;
  const maengel = tasks.filter(t=>t.type==='mangel' && t.status!=='erledigt').length;
  const recent = [...tasks].sort((a,b)=>b.created.localeCompare(a.created)).slice(0,5);
  const now = new Date(); now.setHours(0,0,0,0);
  const in14days = new Date(now.getTime()+14*864e5);

  // Bauzeitplan-Erinnerungen (alle reminders über alle Tasks)
  const upcoming = state.schedule.flatMap(t=>{
    if(state.currentProject && t.projectId!==state.currentProject) return [];
    const allR = t.reminders?.length ? t.reminders : (t.reminder ? [t.reminder] : []);
    return allR.filter(r=>r&&r.date&&new Date(r.date)<=in14days).map(r=>({...t,_r:r}));
  }).sort((a,b)=>a._r.date.localeCompare(b._r.date));

  // Workflow-Alerts über alle Projekte
  const allAlerts = state.projects.flatMap(p=>{
    if(state.currentProject&&p.id!==state.currentProject) return [];
    return computeWorkflowAlerts(p,14).filter(a=>!a.done).map(a=>({...a,projName:p.name,projId:p.id}));
  }).sort((a,b)=>a.daysUntilTrigger-b.daysUntilTrigger);

  return `
    <div class="page-header">
      <h2>Dashboard</h2>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="editProject()">+ Neues Projekt</button>
        <button class="btn btn-secondary btn-sm" onclick="requestNotificationPermission()">🔔 Benachrichtigungen</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="color:var(--primary);margin-bottom:12px;font-size:15px">📁 Projekte</h3>
      ${state.projects.length===0
        ? `<div class="empty"><span class="empty-icon">📁</span>Noch kein Projekt angelegt. Klicke auf <strong>+ Neues Projekt</strong>.</div>`
        : `<table><thead><tr>
            <th>Projekt</th><th>Status</th><th>Vollständigkeit</th><th>Dokumente</th><th style="text-align:center">Bauzeit</th><th>Max. Schätzung</th><th></th>
          </tr></thead><tbody>
          ${state.projects.map(p=>{
            const a=projAmpel(p);
            return `<tr>
              <td>
                <strong>${esc(p.name)}</strong>
                ${p.address?`<br><small style="color:var(--muted)">📍 ${esc(p.address)}</small>`:''}
                ${p.type?`<br><small style="color:var(--muted)">${esc(EST_TEMPLATES[p.type]?.label||p.type)}</small>`:''}
              </td>
              <td><span class="badge ${p.status||'bearbeitung'}">${p.status||'aktiv'}</span></td>
              <td style="min-width:180px;line-height:1.9">${completionDots(p)}</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px">
                  <div style="flex:1;height:8px;background:var(--border);border-radius:4px;min-width:50px">
                    <div style="height:100%;width:${a.docPct}%;background:${a.docColor};border-radius:4px;transition:.3s"></div>
                  </div>
                  <span style="font-size:12px;color:${a.docColor};font-weight:600">${a.docPct}%</span>
                </div>
              </td>
              <td style="text-align:center;font-weight:600;color:${a.zeitColor}">${a.zeitLabel}</td>
              <td style="color:var(--primary);font-weight:600">${a.budget}</td>
              <td class="actions-cell">
                <button class="btn btn-sm btn-secondary" onclick="state.currentProject='${p.id}';save('currentProject');currentProjectDetailId='${p.id}';showView('projektdetail')" title="Projektdaten">📋</button>
                <button class="btn btn-sm btn-secondary" onclick="editProject('${p.id}')" title="Bearbeiten">✏️</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProject('${p.id}')" title="Löschen">🗑️</button>
              </td>
            </tr>`;
          }).join('')}
          </tbody></table>`}
    </div>

    <div class="grid grid-stats">
      <div class="card stat-card red"><div class="num">${offen}</div><div class="label">Offene Aufgaben</div></div>
      <div class="card stat-card yellow"><div class="num">${bearbeitung}</div><div class="label">In Bearbeitung</div></div>
      <div class="card stat-card green"><div class="num">${erledigt}</div><div class="label">Erledigt</div></div>
      <div class="card stat-card red"><div class="num">${maengel}</div><div class="label">Offene Mängel</div></div>
    </div>

    ${allAlerts.length>0?`
    <div class="card" style="margin-bottom:16px;border-left:4px solid var(--accent)">
      <h3 style="color:var(--primary);margin-bottom:12px">⚡ Proaktive Hinweise (nächste 14 Tage)</h3>
      <table><thead><tr><th>Projekt</th><th>Hinweis</th><th>Bezug</th><th>Fälligkeit</th></tr></thead><tbody>
      ${allAlerts.map(a=>`<tr style="${a.urgent?'background:var(--warn-bg)':''}">
        <td><strong>${esc(a.projName)}</strong></td>
        <td>${esc(a.text)}</td>
        <td style="font-size:12px;color:var(--muted)">${esc(a.fieldLabel)}: ${fmtDate(a.eventDate)}</td>
        <td style="font-size:12px;color:${a.urgent?'var(--red)':'var(--accent)'}">
          ${a.urgent?`<strong>Jetzt!</strong>`:`in ${a.daysUntilTrigger} Tagen`}
        </td>
      </tr>`).join('')}
      </tbody></table>
    </div>`:''}

    ${upcoming.length>0?`
    <div class="card" style="margin-bottom:16px;border-left:4px solid var(--primary)">
      <h3 style="color:var(--primary);margin-bottom:12px">🔔 Erinnerungen Bauzeitplan (14 Tage)</h3>
      <table><thead><tr><th>Datum</th><th>Vorgang</th><th>Erinnerung</th><th>Tage</th><th></th></tr></thead><tbody>
      ${upcoming.map(t=>{
        const days=Math.ceil((new Date(t._r.date)-now)/864e5);
        const dl=days<0?`<span style="color:var(--red)">${Math.abs(days)}T überfällig</span>`:days===0?'<strong style="color:var(--accent)">heute</strong>':`in ${days}T`;
        return `<tr><td>${fmtDate(t._r.date)}</td><td><strong>${esc(t.name)}</strong></td>
          <td>${esc(t._r.message||'')}</td><td>${dl}</td>
          <td><button class="btn btn-sm btn-secondary" onclick="showView('bauzeitplan');setTimeout(()=>editScheduleTask('${t.id}'),100)">Öffnen</button></td>
        </tr>`;
      }).join('')}
      </tbody></table>
    </div>`:''}

    <div class="card">
      <h3 style="color:var(--primary);margin-bottom:12px">Letzte Aufgaben</h3>
      ${recent.length===0?'<div class="empty"><span class="empty-icon">📋</span>Noch keine Aufgaben erfasst</div>':
      `<table><thead><tr><th>Titel</th><th>Typ</th><th>Priorität</th><th>Status</th><th>Frist</th></tr></thead><tbody>
      ${recent.map(t=>`<tr>
        <td>${esc(t.title)}</td>
        <td><span class="badge ${t.type}">${t.type==='mangel'?'Mangel':'Aufgabe'}</span></td>
        <td><span class="badge ${t.priority}">${t.priority}</span></td>
        <td><span class="badge ${t.status}">${t.status}</span></td>
        <td>${fmtDate(t.due)}</td>
      </tr>`).join('')}
      </tbody></table>`}
    </div>
  `;
}



// Exports
window.renderDashboard = renderDashboard;
