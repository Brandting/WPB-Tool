// ============================================================================
//  TOOLS — Berechnungen & Daten für PV/BESS/Wind
//  Platzhalter-Modul; einzelne Tools werden nach und nach ergänzt.
// ============================================================================

function renderTools(){
  return `
    <div class="page-header">
      <h2>🛠️ Tools</h2>
    </div>

    <div class="card" style="margin-bottom:18px">
      <h3 style="color:var(--primary);margin-bottom:8px">Geplante Tools</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:14px">
        Hier werden nach und nach Mini-Rechner und Stammdaten für den Bauleiter-Alltag erscheinen.
        Sag Bescheid, was du als erstes brauchst.
      </p>
      <ul style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;list-style:none;padding:0;margin:0">
        ${[
          ['📐 PV-Stringauslegung',  'Modul-Anzahl, Vmpp/Voc, Wechselrichter-Bereich'],
          ['⚡ Spannungsfall',       'Querschnitt, Länge, Strom → Verlust in %'],
          ['🔌 Kabelquerschnitt',    'Ampacity nach DIN VDE'],
          ['🔋 BESS-Auslegung',      'Kapazität, C-Rate, Zyklen'],
          ['💨 Wind-Kapazitätsfaktor','Energieertrag aus Leistungskennlinie'],
          ['🌞 Eigenverbrauchsquote', 'PV + Last-Profil → ENV / Autarkie'],
          ['📊 kWp ↔ m² Konverter',  'Modul-spezifisch'],
          ['📋 Stammdaten',          'Querschnitte, Sicherungen, Module'],
        ].map(([title, desc])=>`
          <li style="padding:14px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);opacity:.6">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px">${title}</div>
            <div style="font-size:12px;color:var(--muted);line-height:1.5">${desc}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:6px;font-style:italic">Kommt bald</div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

window.renderTools = renderTools;
