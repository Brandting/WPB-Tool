// ============================================================================
// GRUPPEN-KATALOG — Vorlagen-Manager für Gruppen-Strukturen aus Schätzungen.
// Aufgeteilt aus pruefungen.js am 2026-05-05.
// ============================================================================

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

