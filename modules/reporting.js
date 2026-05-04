// ============ PROTOKOLLE ============
// ============ ANLAGEN (pro Projekt) ============
// Status-Palette global
const ANLAGEN_STATUS = [
  {key:'geplant',    label:'Geplant',    color:'#94a3b8', textColor:'#fff'},
  {key:'bestellt',   label:'Bestellt',   color:'#3b82f6', textColor:'#fff'},
  {key:'angeliefert',label:'Angeliefert',color:'#eab308', textColor:'#1a1a1a'},
  {key:'errichtet',  label:'Errichtet',  color:'#16a34a', textColor:'#fff'},
];
function statusColor(key){ return (ANLAGEN_STATUS.find(s=>s.key===key)||ANLAGEN_STATUS[0]).color; }
function statusLabel(key){ return (ANLAGEN_STATUS.find(s=>s.key===key)||ANLAGEN_STATUS[0]).label; }
function statusTextColor(key){ return (ANLAGEN_STATUS.find(s=>s.key===key)||ANLAGEN_STATUS[0]).textColor; }

// WEA-Bauteile (für Wind-Projekte)
const WEA_BAUTEILE = [
  {key:'zuwegung',     label:'Zuwegung'},
  {key:'kranstell',    label:'Kranstellfläche'},
  {key:'fundament',    label:'Fundamentbau'},
  {key:'turm',         label:'Turmbau'},
  {key:'gondel',       label:'Gondel/Maschinenhaus'},
  {key:'blatt1',       label:'Rotorblatt 1'},
  {key:'blatt2',       label:'Rotorblatt 2'},
  {key:'blatt3',       label:'Rotorblatt 3'},
  {key:'kabeltrasse',  label:'Interne Kabeltrasse'},
];
const DEFAULT_TURM_SEGMENTE = 4;

// Liefert alle tatsächlich existierenden Bauteil-Keys (Turm aufgespalten in Segmente)
function weaTeileKeys(a){
  const segs = Math.max(1, Math.min(10, a.turmSegmente||DEFAULT_TURM_SEGMENTE));
  const keys = [];
  WEA_BAUTEILE.forEach(b=>{
    if(b.key==='turm'){
      for(let i=0;i<segs;i++) keys.push(`turm_s${i+1}`);
    } else {
      keys.push(b.key);
    }
  });
  return keys;
}
function weaStatusCounts(a){
  const counts={geplant:0,bestellt:0,angeliefert:0,errichtet:0};
  weaTeileKeys(a).forEach(k=>{
    const st=(a.teile&&a.teile[k])||'geplant';
    counts[st]=(counts[st]||0)+1;
  });
  return counts;
}

// BESS-Bauabschnitte + Bauteile je Container
const BESS_ABSCHNITTE = [
  {key:'netzanschluss',  label:'Netzanschluss / Übergabestation'},
  {key:'trafo',          label:'Transformatorstation(en)'},
  {key:'container_array',label:'Container-Array'},
  {key:'verkabelung',    label:'Verkabelung / Kabeltrassen'},
  {key:'zaun',           label:'Zaun / Sicherheitstechnik'},
  {key:'zuwegung',       label:'Zuwegung / Kranstellfläche'},
];
const BESS_CONTAINER_TEILE = [
  {key:'fundament', label:'Fundament'},
  {key:'container', label:'Batterie-Container'},
  {key:'mvskid',    label:'MV-Skid (verknüpft)'},
];

function getAnlagen(p){ return p.anlagen || (p.anlagen=[]); }
function getMvSkids(p){ return p.mvSkids || (p.mvSkids=[]); }
function getBessAbschnitte(p){
  if(!p.bessAbschnitte){
    p.bessAbschnitte = BESS_ABSCHNITTE.map(a=>({key:a.key,label:a.label,status:'geplant',notes:''}));
  }
  return p.bessAbschnitte;
}

window._selectedWeaId = null;
window._selectedTeilKey = null;

function renderAnlagenSection(p){
  if(!p.type) return '';
  if(p.type==='wind') return renderWindAnlagen(p);
  if(p.type==='bess') return renderBessAnlagen(p);
  return `<div class="card" style="margin-bottom:16px">
    <h3 style="color:var(--primary);font-size:15px;margin-bottom:8px">🔧 Anlagen</h3>
    <p style="font-size:13px;color:var(--muted)">Für Projekttyp „${esc(EST_TEMPLATES[p.type]?.label||p.type)}" ist noch keine Anlagenverwaltung hinterlegt.</p>
  </div>`;
}

// ---- Wind-Anlagen (Projektverwaltung - nur Liste) ----
function renderWindAnlagen(p){
  const anlagen=getAnlagen(p);
  return `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3 style="color:var(--primary);font-size:15px;margin:0">🌬️ Windenergieanlagen <span style="font-size:12px;color:var(--muted);font-weight:400;margin-left:6px">${anlagen.length}</span></h3>
        <button class="btn btn-sm" onclick="addWeaAnlage('${p.id}')">+ WEA hinzufügen</button>
      </div>
      ${anlagen.length===0
        ? `<p style="font-size:13px;color:var(--muted)">Noch keine Anlagen erfasst.</p>`
        : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
          ${anlagen.map(a=>{
            const counts=weaStatusCounts(a);
            const total=weaTeileKeys(a).length;
            const pct=Math.round(counts.errichtet/total*100);
            return `<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:10px 12px">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <strong style="font-size:14px">${esc(a.name)}</strong>
                <span style="font-size:11px;font-weight:700;color:${pct===100?'var(--green)':'var(--muted)'}">${pct}%</span>
              </div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px">${a.turmSegmente||DEFAULT_TURM_SEGMENTE} Turmsegment${(a.turmSegmente||DEFAULT_TURM_SEGMENTE)!==1?'e':''}</div>
              <div style="background:var(--border);border-radius:4px;overflow:hidden;height:5px;margin-top:8px;display:flex">
                ${ANLAGEN_STATUS.map(s=>{
                  const w=(counts[s.key]||0)/total*100;
                  return w>0?`<div style="width:${w}%;background:${s.color}"></div>`:'';
                }).join('')}
              </div>
              <div style="display:flex;gap:6px;margin-top:10px">
                <button class="btn btn-sm btn-secondary" style="flex:1;padding:4px 8px;font-size:11px" onclick="renameWea('${p.id}','${a.id}')">✏️ Umbenennen</button>
                <button class="btn btn-sm btn-danger" style="padding:4px 8px" onclick="deleteAnlage('${p.id}','${a.id}')">🗑️</button>
              </div>
            </div>`;
          }).join('')}
        </div>`
      }
      <p style="font-size:12px;color:var(--muted);margin-top:12px">ℹ️ Die interaktive Bauteil-Ansicht findest du im <strong>Reporting → Baustatusbericht</strong>.</p>
    </div>
  `;
}

function renderWeaSvg(a, opts={}){
  const compact = opts.compact;
  const teile=a.teile||{};
  const g=(k)=>teile[k]||'geplant';
  const segCount = Math.max(1, Math.min(10, a.turmSegmente||DEFAULT_TURM_SEGMENTE));
  const partClass=(k)=>`wea-part${!compact&&_selectedTeilKey===k?' wea-part-active':''}`;
  const click=(k)=>compact?'':`onclick="selectWeaTeil('${k}')" style="cursor:pointer"`;

  // Turm-Geometrie: leicht konisch
  const hubX = 210, hubY = 155;
  const topY = 182;
  const botY = 525;
  const topHalf = 7;
  const botHalf = 22;
  const segHeight = (botY - topY) / segCount;

  const segmentPaths = [];
  for(let i=0;i<segCount;i++){
    const yBottom = botY - i*segHeight;
    const yTop    = botY - (i+1)*segHeight;
    const halfBottom = botHalf - (botHalf-topHalf) * (i/segCount);
    const halfTop    = botHalf - (botHalf-topHalf) * ((i+1)/segCount);
    segmentPaths.push({
      yTop, yBottom,
      xLB: hubX - halfBottom, xRB: hubX + halfBottom,
      xLT: hubX - halfTop,    xRT: hubX + halfTop
    });
  }

  const turmSegStatus = (i)=>teile[`turm_s${i+1}`] || 'geplant';

  const cFund   = statusColor(g('fundament'));
  const cGondel = statusColor(g('gondel'));
  const cBlatt1 = statusColor(g('blatt1'));
  const cBlatt2 = statusColor(g('blatt2'));
  const cBlatt3 = statusColor(g('blatt3'));
  const cZuweg  = statusColor(g('zuwegung'));
  const cKran   = statusColor(g('kranstell'));
  const cKabel  = statusColor(g('kabeltrasse'));

  // Rotor-Perspektive: leicht von schräg vorne gesehen
  // Rotor-Ebene 3D-ähnlich verkippt: X horizontal gestaucht (cos 20°≈0.94),
  // Y leicht schräg mit sin 20°≈0.34 → gibt elliptische Wirkung
  // Rotor sitzt VOR der Gondel, etwas links versetzt
  const rotorCx = hubX - 18;
  const rotorCy = hubY;
  // Rotation-Winkel für Blätter in 3D; wir projizieren auf 2D mit Perspektive
  // Blatt-Positionen: 90° (oben), 210°, 330° → gleichmäßig 120° versetzt
  const bladeLen = 130;
  const bladeChord = 14; // Sehnenbreite

  // Projektion: auf Ebene die um Y-Achse um ~20° gekippt ist
  // Resultat: horizontale Komponente * 0.5 (perspektivische Verkürzung),
  // vertikale Komponente * 0.95
  const persp = (angleDeg) => {
    const rad = (angleDeg - 90) * Math.PI / 180;  // 0° = rechts → verschieben: 0° = oben
    const x = Math.cos(rad);
    const y = Math.sin(rad);
    // Rotor-Ebene von leicht schräg gesehen: x-Komponente stärker gestaucht
    return {
      x: x * 0.55,     // horizontale Stauchung → perspektivisch schräg
      y: y * 1.0,      // vertikal voll
    };
  };

  // Blatt als geschwungene, asymmetrische Linse
  // Die Blatt-Richtung ergibt sich aus dem Winkel; die Sehnenbreite variiert
  // mit der Sichtbarkeit (Blätter die "nach vorn" zeigen sind breiter,
  // Blätter die "nach hinten" zeigen sind schmaler).
  const blade = (angleDeg, color, key, depth) => {
    const p = persp(angleDeg);
    const tipX = rotorCx + p.x * bladeLen;
    const tipY = rotorCy - p.y * bladeLen;  // y-flip (SVG)
    // Normale senkrecht zur Blattrichtung (im 2D)
    const dirLen = Math.sqrt(p.x*p.x + p.y*p.y) || 1;
    const nx = -p.y / dirLen;
    const ny = -p.x / dirLen;  // Hinweis: in SVG y invertiert
    // Perspektivische Breite: vorne (depth>0) breiter, hinten schmaler
    const widthFactor = 0.55 + 0.5 * depth;
    const w = bladeChord * widthFactor;
    // Kontrollpunkte: Blatt ist an der Wurzel dünn, in der Mitte am breitesten, an Spitze dünn
    const rootX = rotorCx, rootY = rotorCy;
    const midX = rotorCx + p.x * bladeLen * 0.45;
    const midY = rotorCy - p.y * bladeLen * 0.45;
    // Schwingende Kante
    const curveOffset = 3 * depth;
    const d = `M ${rootX} ${rootY}
               Q ${midX + nx*w + nx*curveOffset} ${midY + ny*w + ny*curveOffset}, ${tipX} ${tipY}
               Q ${midX - nx*(w*0.3)} ${midY - ny*(w*0.3)}, ${rootX} ${rootY} Z`;
    return {d, depth, color, key, tipX, tipY};
  };

  // Depth = wie viel das Blatt "nach vorne" zeigt (1 = vorne, -1 = hinten)
  // Bei Perspektive cos: Blatt mit Winkel 0° = nach oben → depth variiert mit x-Komponente
  // Einfache Heuristik: nehm den Sinus des rotierten Winkels als Tiefe
  // Winkel 90° (oben): neutral (0), 210° (links unten): nach hinten-links, 330° (rechts unten): nach vorne-rechts
  // Um alle 3 Blätter sichtbar zu machen, wähle ich die 3 Winkel so dass:
  // - Blatt 1: 90° (nach oben)
  // - Blatt 2: 210° (links-unten, leicht hinten)
  // - Blatt 3: 330° (rechts-unten, leicht vorne)
  const depthOf = (angleDeg) => {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return Math.cos(rad) * 0.7;  // -0.7 bis +0.7
  };

  const blades = [
    blade(90,  cBlatt1, 'blatt1', depthOf(90)),
    blade(210, cBlatt2, 'blatt2', depthOf(210)),
    blade(330, cBlatt3, 'blatt3', depthOf(330)),
  ];
  // Von hinten nach vorne zeichnen (depth aufsteigend)
  blades.sort((a,b)=>a.depth-b.depth);

  return `
    <svg viewBox="0 0 420 620" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:420px;height:auto;display:block;margin:0 auto">
      <defs>
        <linearGradient id="gground-${a.id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#d4c9a8" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#a89870" stop-opacity="0.35"/>
        </linearGradient>
        <radialGradient id="spinner-${a.id}" cx="0.3" cy="0.3" r="0.8">
          <stop offset="0%" stop-color="${cGondel}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${cGondel}" stop-opacity="0.7"/>
        </radialGradient>
      </defs>

      <!-- Boden -->
      <path d="M 0 525 L 420 525 L 420 620 L 0 620 Z" fill="url(#gground-${a.id})"/>
      <line x1="0" y1="525" x2="420" y2="525" stroke="var(--border)" stroke-width="1" opacity="0.4"/>

      <!-- Zuwegung -->
      <g class="${partClass('zuwegung')}" ${click('zuwegung')}>
        <path d="M 0 585 Q 95 580, 175 572 L 255 570 L 420 575 L 420 600 L 255 596 Q 175 605, 95 612 L 0 617 Z"
              fill="${cZuweg}" opacity="0.92" stroke="${cZuweg}" stroke-width="1.5"/>
        <text x="30" y="598" font-size="10" font-weight="700" fill="${statusTextColor(g('zuwegung'))}" letter-spacing="0.5">ZUWEGUNG</text>
      </g>

      <!-- Kranstellfläche -->
      <g class="${partClass('kranstell')}" ${click('kranstell')}>
        <rect x="255" y="540" width="145" height="28" rx="3"
              fill="${cKran}" opacity="0.92" stroke="${cKran}" stroke-width="1.5"/>
        <text x="268" y="559" font-size="10" font-weight="700" fill="${statusTextColor(g('kranstell'))}" letter-spacing="0.5">KRANSTELLFLÄCHE</text>
      </g>

      <!-- Kabeltrasse -->
      <g class="${partClass('kabeltrasse')}" ${click('kabeltrasse')}>
        <line x1="0" y1="560" x2="186" y2="538" stroke="${cKabel}" stroke-width="4" stroke-dasharray="7 4" stroke-linecap="round" opacity="0.9"/>
        <text x="14" y="554" font-size="9" font-weight="700" fill="var(--text)" style="text-shadow:0 0 3px var(--bg),0 0 3px var(--bg)">⚡ KABELTRASSE</text>
      </g>

      <!-- Fundament -->
      <g class="${partClass('fundament')}" ${click('fundament')}>
        <path d="M 170 523 L 175 585 L 245 585 L 250 523 Z" fill="${cFund}" stroke="${cFund}" stroke-width="1.5"/>
        <ellipse cx="210" cy="525" rx="40" ry="5" fill="${cFund}" opacity="0.5"/>
        <text x="187" y="562" font-size="10" font-weight="700" fill="${statusTextColor(g('fundament'))}" letter-spacing="0.5">FUNDAMENT</text>
      </g>

      <!-- Turm-Segmente -->
      ${segmentPaths.map((s,i)=>{
        const st = turmSegStatus(i);
        const col = statusColor(st);
        return `<g class="${partClass('turm_s'+(i+1))}" ${click('turm_s'+(i+1))}>
          <path d="M ${s.xLB} ${s.yBottom} L ${s.xLT} ${s.yTop} L ${s.xRT} ${s.yTop} L ${s.xRB} ${s.yBottom} Z"
                fill="${col}" stroke="rgba(0,0,0,0.15)" stroke-width="1" opacity="0.95"/>
        </g>`;
      }).join('')}

      ${segCount<=8?segmentPaths.map((s,i)=>{
        const midY=(s.yTop+s.yBottom)/2;
        return `<text x="${s.xRB+6}" y="${midY+3}" font-size="8" font-weight="600" fill="var(--muted)" pointer-events="none">S${i+1}</text>`;
      }).join(''):''}

      <!-- Gondel: schlanke Kapsel, schräg perspektivisch -->
      <g class="${partClass('gondel')}" ${click('gondel')}>
        <!-- Gondel-Körper (eine ovale Kapsel, die nach rechts zeigt) -->
        <path d="M 195 ${hubY-14}
                 L 262 ${hubY-14}
                 Q 274 ${hubY-12}, 276 ${hubY-6}
                 L 276 ${hubY+8}
                 Q 274 ${hubY+14}, 262 ${hubY+16}
                 L 195 ${hubY+16}
                 Q 190 ${hubY+14}, 190 ${hubY+10}
                 L 190 ${hubY-10}
                 Q 190 ${hubY-14}, 195 ${hubY-14} Z"
              fill="${cGondel}" stroke="${cGondel}" stroke-width="1.5"/>
        <!-- Akzentlinie (Dachkante) -->
        <line x1="195" y1="${hubY-9}" x2="262" y2="${hubY-9}" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
      </g>

      <!-- Rotornabe / Spinner (vorne links an Gondel) -->
      <g class="${partClass('gondel')}" ${click('gondel')}>
        <ellipse cx="${rotorCx}" cy="${rotorCy}" rx="16" ry="12" fill="url(#spinner-${a.id})" stroke="${cGondel}" stroke-width="1.5"/>
      </g>

      <!-- Rotorblätter in richtiger Z-Reihenfolge -->
      ${blades.map(b=>`<g class="${partClass(b.key)}" ${click(b.key)}>
        <path d="${b.d}" fill="${b.color}" stroke="rgba(0,0,0,0.15)" stroke-width="1" stroke-linejoin="round"/>
      </g>`).join('')}

      <!-- Zentrale Naben-Spitze vorne -->
      <circle cx="${rotorCx}" cy="${rotorCy}" r="6" fill="rgba(255,255,255,0.85)" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
      <circle cx="${rotorCx-1}" cy="${rotorCy-1}" r="2" fill="rgba(0,0,0,0.3)"/>

      <!-- Blattbeschriftungen (nur in nicht-compact-Ansicht) -->
      ${!compact?`
        <text x="${rotorCx+5}" y="30" font-size="9" font-weight="600" fill="var(--muted)">Blatt 1</text>
        <text x="${rotorCx+85}" y="${rotorCy+125}" font-size="9" font-weight="600" fill="var(--muted)">Blatt 3</text>
        <text x="${rotorCx-120}" y="${rotorCy+125}" font-size="9" font-weight="600" fill="var(--muted)">Blatt 2</text>
      `:''}
    </svg>
  `;
}

function renderWeaIllustration(p,a){
  const picker=_selectedTeilKey?renderWeaStatusPicker(p,a,_selectedTeilKey):`
    <div style="color:var(--muted);font-size:13px;text-align:center;padding:40px 20px;line-height:1.6">
      👈 Klicke auf ein Bauteil<br>um den Status zu ändern
    </div>`;

  return `
    <style>
      .wea-part { transition:opacity .15s, filter .15s; }
      .wea-part:hover { opacity:0.8; filter:brightness(1.15); }
      .wea-part-active { filter:drop-shadow(0 0 6px var(--primary)) brightness(1.1); }
    </style>
    <div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(220px,1fr);gap:20px;align-items:start;margin-top:10px">
      <div style="background:var(--surface-2);border-radius:var(--radius);padding:16px;border:1px solid var(--border);position:relative">
        <div style="position:absolute;top:10px;left:14px;font-size:14px;font-weight:700;color:var(--primary);z-index:2">${esc(a.name)}</div>
        <div style="position:absolute;top:10px;right:14px;z-index:2;display:flex;align-items:center;gap:6px">
          <label style="font-size:11px;color:var(--muted)" title="Turmsegmente">Turm:</label>
          <input type="number" min="1" max="10" value="${a.turmSegmente||DEFAULT_TURM_SEGMENTE}"
            style="width:52px;padding:4px 6px;font-size:12px"
            onchange="setWeaTurmSegmente('${p.id}','${a.id}',this.value)">
          <button class="btn btn-sm btn-secondary" onclick="renameWea('${p.id}','${a.id}')" title="Umbenennen">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAnlage('${p.id}','${a.id}')" title="Löschen">🗑️</button>
        </div>
        ${renderWeaSvg(a)}
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px;font-size:10px">
          ${ANLAGEN_STATUS.map(s=>`<span style="display:inline-flex;align-items:center;gap:4px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${s.color}"></span>${s.label}
          </span>`).join('')}
        </div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;min-height:200px">
        ${picker}
      </div>
    </div>
  `;
}

function renderWeaStatusPicker(pid,a,teilKey){
  // Turm-Segment?
  let teilLabel = null;
  if(teilKey.startsWith('turm_s')){
    const n=parseInt(teilKey.replace('turm_s',''),10);
    teilLabel = `Turmsegment ${n}`;
  } else {
    const teil=WEA_BAUTEILE.find(b=>b.key===teilKey);
    if(teil) teilLabel=teil.label;
  }
  if(!teilLabel) return '';

  const current=(a.teile&&a.teile[teilKey])||'geplant';
  return `
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Bauteil</div>
    <h4 style="color:var(--primary);font-size:17px;margin-bottom:16px">${esc(teilLabel)}</h4>
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Status</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${ANLAGEN_STATUS.map(s=>`
        <button onclick="updateAnlageTeil('${pid}','${a.id}','${teilKey}','${s.key}')"
          style="padding:10px 14px;border-radius:10px;cursor:pointer;border:2px solid ${current===s.key?s.color:'var(--border)'};
                 background:${current===s.key?s.color:'var(--card)'};color:${current===s.key?s.textColor:'var(--text)'};
                 font-size:14px;font-weight:${current===s.key?'700':'500'};text-align:left;
                 display:flex;align-items:center;gap:10px;font-family:var(--font);transition:all .15s">
          <span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${s.color};flex-shrink:0;border:1px solid rgba(0,0,0,.1)"></span>
          ${s.label}
          ${current===s.key?'<span style="margin-left:auto">✓</span>':''}
        </button>
      `).join('')}
    </div>
    <button class="btn btn-sm btn-secondary" style="margin-top:16px;width:100%" onclick="_selectedTeilKey=null;render()">Schließen</button>
  `;
}

function selectWea(id){
  _selectedWeaId=id;
  _selectedTeilKey=null;
  render();
}
function selectWeaTeil(key){
  _selectedTeilKey=key;
  render();
}

async function addWeaAnlage(pid){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const anlagen=getAnlagen(p);
  const n=anlagen.length+1;
  const teile=Object.fromEntries(WEA_BAUTEILE.map(b=>[b.key,'geplant']));
  // Turm-Segmente initialisieren
  for(let i=0;i<DEFAULT_TURM_SEGMENTE;i++){
    teile[`turm_s${i+1}`]='geplant';
  }
  const neu={
    id:uid(),
    name:`WEA ${String(n).padStart(2,'0')}`,
    turmSegmente: DEFAULT_TURM_SEGMENTE,
    teile
  };
  anlagen.push(neu);
  _selectedWeaId=neu.id;
  await save('projects'); render();
}

async function setWeaTurmSegmente(pid, aid, value){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const a=getAnlagen(p).find(x=>x.id===aid); if(!a) return;
  const n=Math.max(1, Math.min(10, parseInt(value)||1));
  a.turmSegmente=n;
  if(!a.teile) a.teile={};
  // Fehlende Segmente initialisieren, überzählige entfernen
  Object.keys(a.teile).forEach(k=>{
    if(k.startsWith('turm_s')){
      const idx=parseInt(k.replace('turm_s',''),10);
      if(idx>n) delete a.teile[k];
    }
  });
  for(let i=0;i<n;i++){
    const k=`turm_s${i+1}`;
    if(!a.teile[k]) a.teile[k]='geplant';
  }
  // Selected segment resetten wenn außerhalb
  if(_selectedTeilKey&&_selectedTeilKey.startsWith('turm_s')){
    const idx=parseInt(_selectedTeilKey.replace('turm_s',''),10);
    if(idx>n) _selectedTeilKey=null;
  }
  await save('projects'); render();
}
async function renameWea(pid,aid){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const a=getAnlagen(p).find(x=>x.id===aid); if(!a) return;
  const name=prompt('Neuer Name:',a.name);
  if(!name) return;
  a.name=name;
  await save('projects'); render();
}
async function deleteAnlage(pid,aidOrIdx){
  if(!confirm('Anlage löschen?')) return;
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const anlagen=getAnlagen(p);
  if(typeof aidOrIdx==='number'){
    anlagen.splice(aidOrIdx,1);
  } else {
    const idx=anlagen.findIndex(a=>a.id===aidOrIdx);
    if(idx>=0) anlagen.splice(idx,1);
  }
  if(_selectedWeaId && !anlagen.find(a=>a.id===_selectedWeaId)) _selectedWeaId=null;
  await save('projects'); render();
}
async function updateAnlage(pid,ai,field,value){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const anlagen=getAnlagen(p);
  if(!anlagen[ai]) return;
  anlagen[ai][field]=value;
  await save('projects');
}
async function updateAnlageTeil(pid,aidOrIdx,teilKey,value){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const anlagen=getAnlagen(p);
  let a;
  if(typeof aidOrIdx==='number') a=anlagen[aidOrIdx];
  else a=anlagen.find(x=>x.id===aidOrIdx);
  if(!a) return;
  if(!a.teile) a.teile={};
  a.teile[teilKey]=value;
  await save('projects');
  render();
}

// ---- BESS-Anlagen ----
function renderBessAnlagen(p){
  const containers=getAnlagen(p);
  const skids=getMvSkids(p);
  const abschnitte=getBessAbschnitte(p);
  const cols=p.bessCols||6;
  const rows=p.bessRows||4;

  // Baufelder (Abschnitte)
  const abschnitteHtml=`
    <div class="card" style="margin-bottom:16px">
      <h3 style="color:var(--primary);font-size:15px;margin-bottom:12px">🏗️ Bauabschnitte</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
        ${abschnitte.map((a,ai)=>`
          <div style="border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--surface-2)">
            <div style="font-size:13px;font-weight:700;margin-bottom:6px">${esc(a.label)}</div>
            <select onchange="updateBessAbschnitt('${p.id}',${ai},'status',this.value)"
              style="width:100%;padding:6px 8px;border-radius:6px;border:none;font-size:12px;font-weight:700;cursor:pointer;
                     background:${statusColor(a.status||'geplant')};color:${statusTextColor(a.status||'geplant')}">
              ${ANLAGEN_STATUS.map(s=>`<option value="${s.key}" ${(a.status||'geplant')===s.key?'selected':''} style="background:var(--card);color:var(--text)">${s.label}</option>`).join('')}
            </select>
          </div>
        `).join('')}
      </div>
    </div>`;

  // Container-Grid (Draufsicht + Tabellenansicht)
  const gridView=p.bessView||'grid';
  const gridHtml=`
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h3 style="color:var(--primary);font-size:15px;margin:0">🔋 Container-Array
          <span style="font-size:12px;color:var(--muted);font-weight:400;margin-left:6px">${containers.length} Container · ${skids.length} MV-Skids</span>
        </h3>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:var(--radius-btn);overflow:hidden">
            <button class="btn btn-sm ${gridView==='grid'?'':'btn-secondary'}" style="border-radius:0" onclick="setBessView('${p.id}','grid')">🗺️ Draufsicht</button>
            <button class="btn btn-sm ${gridView==='list'?'':'btn-secondary'}" style="border-radius:0" onclick="setBessView('${p.id}','list')">📋 Liste</button>
          </div>
          <label style="font-size:12px;color:var(--muted)">Raster:</label>
          <input type="number" min="1" max="20" value="${cols}" style="width:50px" onchange="setBessGrid('${p.id}','cols',this.value)">×
          <input type="number" min="1" max="20" value="${rows}" style="width:50px" onchange="setBessGrid('${p.id}','rows',this.value)">
          <button class="btn btn-sm" onclick="openBessMvSkidManager('${p.id}')">⚡ MV-Skids</button>
        </div>
      </div>
      ${gridView==='grid'?renderBessGrid(p,containers,skids,cols,rows):renderBessList(p,containers,skids)}
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;font-size:11px">
        <span style="color:var(--muted)">Legende:</span>
        ${ANLAGEN_STATUS.map(s=>`<span style="display:inline-flex;align-items:center;gap:4px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${s.color}"></span>${s.label}
        </span>`).join('')}
      </div>
    </div>`;

  return abschnitteHtml + gridHtml;
}

function renderBessGrid(p,containers,skids,cols,rows){
  // Gittergröße: cols×rows, Container werden an Position {row,col} gelegt
  const total=cols*rows;
  const byPos={};
  containers.forEach(c=>{ if(c.row!=null&&c.col!=null) byPos[`${c.row},${c.col}`]=c; });

  let html=`<div style="display:grid;gap:4px;grid-template-columns:repeat(${cols},minmax(52px,1fr));max-width:${cols*80}px">`;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const cont=byPos[`${r},${c}`];
      if(cont){
        const skid=skids.find(s=>s.id===cont.mvSkidId);
        const st=cont.status||'geplant';
        html+=`<div onclick="openBessContainer('${p.id}','${cont.id}')"
          style="aspect-ratio:1;border-radius:6px;padding:4px;cursor:pointer;
                 background:${statusColor(st)};color:${statusTextColor(st)};
                 display:flex;flex-direction:column;align-items:center;justify-content:center;
                 font-size:10px;font-weight:700;text-align:center;box-shadow:var(--shadow);
                 border:2px solid ${cont.mvSkidId?statusColor(skid?.status||'geplant'):'transparent'}"
          title="${esc(cont.name)} · ${statusLabel(st)}${skid?' · '+esc(skid.name):''}">
          <div style="font-size:11px">${esc(cont.name)}</div>
          ${skid?`<div style="font-size:8px;opacity:.85;margin-top:2px">⚡${esc(skid.name)}</div>`:''}
        </div>`;
      } else {
        html+=`<div onclick="addBessContainerAt('${p.id}',${r},${c})"
          style="aspect-ratio:1;border-radius:6px;border:2px dashed var(--border);
                 cursor:pointer;display:flex;align-items:center;justify-content:center;
                 color:var(--muted);font-size:18px;opacity:.5;transition:opacity .15s"
          onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=.5"
          title="Container hier anlegen">+</div>`;
      }
    }
  }
  html+=`</div>`;
  return html;
}

function renderBessList(p,containers,skids){
  if(containers.length===0) return `<p style="font-size:13px;color:var(--muted);margin:6px 0">Noch keine Container. Wechsle zur Draufsicht und klicke auf ein Feld.</p>`;
  return `
    <table style="font-size:12px">
      <thead><tr>
        <th>Container</th>
        ${BESS_CONTAINER_TEILE.map(t=>`<th style="text-align:center;min-width:110px">${esc(t.label)}</th>`).join('')}
        <th style="width:50px"></th>
      </tr></thead>
      <tbody>
      ${containers.map(c=>{
        const skid=skids.find(s=>s.id===c.mvSkidId);
        return `<tr>
          <td><input type="text" value="${esc(c.name)}" style="width:90px;font-weight:700;border:none;background:transparent;color:var(--text)"
            onchange="updateBessContainer('${p.id}','${c.id}','name',this.value)"></td>
          <td style="padding:3px 2px">
            <select onchange="updateBessContainer('${p.id}','${c.id}','fundamentStatus',this.value)"
              style="width:100%;padding:5px;border-radius:6px;border:none;font-size:11px;font-weight:700;cursor:pointer;
                     background:${statusColor(c.fundamentStatus||'geplant')};color:${statusTextColor(c.fundamentStatus||'geplant')}">
              ${ANLAGEN_STATUS.map(s=>`<option value="${s.key}" ${(c.fundamentStatus||'geplant')===s.key?'selected':''} style="background:var(--card);color:var(--text)">${s.label}</option>`).join('')}
            </select>
          </td>
          <td style="padding:3px 2px">
            <select onchange="updateBessContainer('${p.id}','${c.id}','status',this.value)"
              style="width:100%;padding:5px;border-radius:6px;border:none;font-size:11px;font-weight:700;cursor:pointer;
                     background:${statusColor(c.status||'geplant')};color:${statusTextColor(c.status||'geplant')}">
              ${ANLAGEN_STATUS.map(s=>`<option value="${s.key}" ${(c.status||'geplant')===s.key?'selected':''} style="background:var(--card);color:var(--text)">${s.label}</option>`).join('')}
            </select>
          </td>
          <td style="padding:3px 2px">
            <select onchange="updateBessContainer('${p.id}','${c.id}','mvSkidId',this.value||null)"
              style="width:100%;padding:5px;border-radius:6px;border:1px solid var(--border);font-size:11px;background:var(--card);color:var(--text)">
              <option value="">—</option>
              ${skids.map(s=>`<option value="${s.id}" ${c.mvSkidId===s.id?'selected':''}>${esc(s.name)} (${statusLabel(s.status||'geplant')})</option>`).join('')}
            </select>
          </td>
          <td style="text-align:center"><button class="btn btn-sm btn-danger" style="padding:2px 7px" onclick="deleteBessContainer('${p.id}','${c.id}')">×</button></td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>`;
}

async function setBessView(pid,v){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  p.bessView=v; await save('projects'); render();
}
async function setBessGrid(pid,field,value){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  p[field==='cols'?'bessCols':'bessRows']=Math.max(1,Math.min(20,parseInt(value)||6));
  await save('projects'); render();
}
async function addBessContainerAt(pid,row,col){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const containers=getAnlagen(p);
  const n=containers.length+1;
  containers.push({
    id:uid(),
    name:`C${String(n).padStart(2,'0')}`,
    row,col,
    status:'geplant',
    fundamentStatus:'geplant',
    mvSkidId:null
  });
  await save('projects'); render();
}
async function openBessContainer(pid,cid){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const c=getAnlagen(p).find(x=>x.id===cid); if(!c) return;
  const skids=getMvSkids(p);
  openModal(`
    <h3>🔋 Container ${esc(c.name)}</h3>
    <div class="form-group"><label>Name</label><input id="bc-name" value="${esc(c.name)}"></div>
    <div style="display:flex;gap:10px">
      <div class="form-group" style="flex:1"><label>Fundament</label>
        <select id="bc-fund">${ANLAGEN_STATUS.map(s=>`<option value="${s.key}" ${(c.fundamentStatus||'geplant')===s.key?'selected':''}>${s.label}</option>`).join('')}</select>
      </div>
      <div class="form-group" style="flex:1"><label>Container</label>
        <select id="bc-stat">${ANLAGEN_STATUS.map(s=>`<option value="${s.key}" ${(c.status||'geplant')===s.key?'selected':''}>${s.label}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-group"><label>Verknüpfter MV-Skid</label>
      <select id="bc-skid">
        <option value="">— kein —</option>
        ${skids.map(s=>`<option value="${s.id}" ${c.mvSkidId===s.id?'selected':''}>${esc(s.name)} (${statusLabel(s.status||'geplant')})</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-danger" onclick="deleteBessContainer('${pid}','${cid}');closeModal()">🗑 Löschen</button>
      <button class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
      <button class="btn" onclick="saveBessContainerModal('${pid}','${cid}')">Speichern</button>
    </div>
  `);
}
async function saveBessContainerModal(pid,cid){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const c=getAnlagen(p).find(x=>x.id===cid); if(!c) return;
  c.name=document.getElementById('bc-name').value;
  c.fundamentStatus=document.getElementById('bc-fund').value;
  c.status=document.getElementById('bc-stat').value;
  c.mvSkidId=document.getElementById('bc-skid').value||null;
  await save('projects'); closeModal(); render();
}
async function updateBessContainer(pid,cid,field,value){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const c=getAnlagen(p).find(x=>x.id===cid); if(!c) return;
  c[field]=value; await save('projects'); render();
}
async function deleteBessContainer(pid,cid){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  p.anlagen=getAnlagen(p).filter(x=>x.id!==cid);
  await save('projects'); render();
}
async function updateBessAbschnitt(pid,idx,field,value){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const abs=getBessAbschnitte(p);
  if(!abs[idx]) return;
  abs[idx][field]=value; await save('projects'); render();
}

// ---- MV-Skid Manager ----
function openBessMvSkidManager(pid){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const skids=getMvSkids(p);
  openModal(`
    <h3>⚡ MV-Skids verwalten</h3>
    <p style="color:var(--muted);font-size:13px;margin-bottom:10px">Ein MV-Skid kann mehreren Containern zugeordnet werden.</p>
    ${skids.length===0?'<p style="color:var(--muted);font-size:13px;padding:10px 0">Noch keine MV-Skids.</p>':
      `<div style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto">
        ${skids.map((s,si)=>`
          <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface-2);border-radius:8px">
            <input type="text" value="${esc(s.name)}" style="flex:1;font-weight:700"
              onchange="updateMvSkid('${pid}',${si},'name',this.value)">
            <select onchange="updateMvSkid('${pid}',${si},'status',this.value)"
              style="width:140px;padding:6px;border-radius:6px;border:none;font-size:12px;font-weight:700;cursor:pointer;
                     background:${statusColor(s.status||'geplant')};color:${statusTextColor(s.status||'geplant')}">
              ${ANLAGEN_STATUS.map(o=>`<option value="${o.key}" ${(s.status||'geplant')===o.key?'selected':''} style="background:var(--card);color:var(--text)">${o.label}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-danger" onclick="deleteMvSkid('${pid}',${si})">×</button>
          </div>
        `).join('')}
      </div>`}
    <div class="modal-actions" style="margin-top:14px">
      <button class="btn btn-secondary" onclick="addMvSkid('${pid}')">+ MV-Skid</button>
      <button class="btn" onclick="closeModal();render()">Schließen</button>
    </div>
  `);
}
async function addMvSkid(pid){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const skids=getMvSkids(p);
  skids.push({id:uid(),name:`MV-Skid ${skids.length+1}`,status:'geplant'});
  await save('projects'); openBessMvSkidManager(pid);
}
async function updateMvSkid(pid,si,field,value){
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const skids=getMvSkids(p);
  if(!skids[si]) return;
  skids[si][field]=value; await save('projects');
  openBessMvSkidManager(pid);
}
async function deleteMvSkid(pid,si){
  if(!confirm('MV-Skid löschen? Verknüpfungen zu Containern werden entfernt.')) return;
  const p=state.projects.find(x=>x.id===pid); if(!p) return;
  const skids=getMvSkids(p);
  const id=skids[si].id;
  skids.splice(si,1);
  getAnlagen(p).forEach(c=>{ if(c.mvSkidId===id) c.mvSkidId=null; });
  await save('projects'); openBessMvSkidManager(pid);
}

// ============ REPORTING ============
window._reportType=null; // null | 'fortschritt' | 'status'

function renderProtokolle(){
  if(_reportType==='status') return renderBaustatusBericht();
  if(_reportType==='fortschritt') return renderBaufortschrittBericht();
  return renderReportingHub();
}

function renderReportingHub(){
  const p=state.projects.find(x=>x.id===state.currentProject);
  const list=projectProtocols().sort((a,b)=>b.date.localeCompare(a.date));
  return `
    <div class="page-header">
      <h2>📊 Reporting</h2>
      <button class="btn btn-secondary" onclick="editProtocol()" ${state.projects.length===0?'disabled':''}>+ Protokoll</button>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-bottom:24px">
      <div class="card" style="cursor:pointer;transition:all .15s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''"
        onclick="_reportType='status';render()">
        <div style="font-size:32px;margin-bottom:6px">🏗️</div>
        <h3 style="color:var(--primary);font-size:16px;margin-bottom:6px">Baustatusbericht</h3>
        <p style="font-size:13px;color:var(--muted);line-height:1.5">Aktueller Stand aller Anlagen und Bauabschnitte ${p?'von '+esc(p.name):'im aktuellen Projekt'}.</p>
      </div>
      <div class="card" style="cursor:pointer;transition:all .15s;opacity:.6" title="Kommt bald"
        onclick="_reportType='fortschritt';render()">
        <div style="font-size:32px;margin-bottom:6px">📈</div>
        <h3 style="color:var(--primary);font-size:16px;margin-bottom:6px">Baufortschrittbericht</h3>
        <p style="font-size:13px;color:var(--muted);line-height:1.5">Fortschrittsquote, Aufgaben und Mängel pro Zeitraum.</p>
      </div>
    </div>

    <h3 style="color:var(--primary);font-size:15px;margin-bottom:12px">📄 Bauprotokolle</h3>
    ${list.length === 0 ? '<div class="card empty"><span class="empty-icon">📄</span>Noch keine Protokolle</div>' :
    `<table><thead><tr><th>Nr.</th><th>Datum</th><th>Art</th><th>Titel</th><th>Teilnehmer</th><th></th></tr></thead><tbody>
    ${list.map((p,i)=>`<tr>
      <td>${list.length-i}</td>
      <td>${fmtDate(p.date)}</td>
      <td><span class="badge bearbeitung">${esc(p.type)}</span></td>
      <td><strong>${esc(p.title)}</strong></td>
      <td>${esc(p.attendees||'')}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-secondary" onclick="viewProtocol('${p.id}')">👁</button>
        <button class="btn btn-sm btn-secondary" onclick="editProtocol('${p.id}')">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProtocol('${p.id}')">🗑️</button>
      </td>
    </tr>`).join('')}
    </tbody></table>`}
  `;
}

function renderBaufortschrittBericht(){
  return `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn btn-secondary btn-sm" onclick="_reportType=null;render()">← Zurück</button>
        <h2 style="margin:0">📈 Baufortschrittbericht</h2>
      </div>
    </div>
    <div class="card empty"><span class="empty-icon">🚧</span>
      <strong>In Arbeit</strong><br>
      <span style="font-size:13px;color:var(--muted)">Der Baufortschrittbericht wird in einem späteren Schritt umgesetzt.</span>
    </div>
  `;
}

function renderBaustatusBericht(){
  const p=state.projects.find(x=>x.id===state.currentProject);
  if(!p){
    return `
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="_reportType=null;render()">← Zurück</button>
          <h2 style="margin:0">🏗️ Baustatusbericht</h2>
        </div>
      </div>
      <div class="card empty"><span class="empty-icon">📁</span>Bitte oben zuerst ein Projekt auswählen.</div>
    `;
  }

  return `
    <style>
      @media print {
        nav, header, .page-header button, .no-print { display:none !important; }
        body { background:#fff !important; }
        main { padding:0 !important; }
      }
    </style>
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm no-print" onclick="_reportType=null;render()">← Zurück</button>
        <h2 style="margin:0">🏗️ Baustatusbericht</h2>
      </div>
      <button class="btn btn-secondary no-print" onclick="window.print()">🖨️ Drucken / PDF</button>
    </div>

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Projekt</div>
          <div style="font-size:22px;font-weight:700;color:var(--primary)">${esc(p.name)}</div>
          ${p.address?`<div style="font-size:13px;color:var(--muted);margin-top:2px">${esc(p.address)}</div>`:''}
          ${p.client?`<div style="font-size:13px;color:var(--muted)">Bauherr: ${esc(p.client)}</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Stand</div>
          <div style="font-size:15px;font-weight:700">${new Date().toLocaleDateString('de-DE')}</div>
          ${p.type?`<span class="badge aufgabe" style="margin-top:4px">${esc(EST_TEMPLATES[p.type]?.label||p.type)}</span>`:''}
        </div>
      </div>
    </div>

    ${!p.type?`<div class="card empty"><span class="empty-icon">⚙️</span>Bitte zuerst Projekttyp im Projekt setzen.</div>`:
      p.type==='wind' ? renderWindStatusReport(p) :
      p.type==='bess' ? renderBessStatusReport(p) :
      `<div class="card empty">Für „${esc(EST_TEMPLATES[p.type]?.label)}" ist noch kein Baustatusbericht definiert.</div>`}
  `;
}

// ---- Wind-Statusbericht ----
function renderWindStatusReport(p){
  const anlagen=getAnlagen(p);
  if(anlagen.length===0) return `<div class="card empty"><span class="empty-icon">🌬️</span>Noch keine WEA im Projekt erfasst.<br><span style="font-size:13px;color:var(--muted)">Gehe in das Projekt, um Anlagen anzulegen.</span></div>`;

  if(_selectedWeaId && !anlagen.find(a=>a.id===_selectedWeaId)) _selectedWeaId=null;
  if(!_selectedWeaId) _selectedWeaId=anlagen[0].id;
  const selected=anlagen.find(a=>a.id===_selectedWeaId);

  // Gesamt-Fortschritt
  let totalTeile=0;
  const counts={geplant:0,bestellt:0,angeliefert:0,errichtet:0};
  anlagen.forEach(a=>{
    const ac=weaStatusCounts(a);
    Object.keys(counts).forEach(k=>counts[k]+=ac[k]);
    totalTeile+=weaTeileKeys(a).length;
  });
  const errichtetPct=totalTeile>0?Math.round(counts.errichtet/totalTeile*100):0;

  const summary=`
    <div class="card" style="margin-bottom:16px">
      <h3 style="color:var(--primary);font-size:15px;margin-bottom:12px">📊 Gesamt-Fortschritt</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px">
        ${ANLAGEN_STATUS.map(s=>`
          <div style="background:${s.color};color:${s.textColor};padding:12px;border-radius:10px;text-align:center">
            <div style="font-size:24px;font-weight:700">${counts[s.key]||0}</div>
            <div style="font-size:11px;opacity:.9;text-transform:uppercase;letter-spacing:.5px">${s.label}</div>
          </div>
        `).join('')}
      </div>
      <div style="background:var(--surface-2);border-radius:8px;overflow:hidden;height:24px;position:relative">
        <div style="position:absolute;inset:0;display:flex">
          ${ANLAGEN_STATUS.map(s=>{
            const w=(counts[s.key]||0)/totalTeile*100;
            return w>0?`<div style="width:${w}%;background:${s.color}"></div>`:'';
          }).join('')}
        </div>
        <div style="position:relative;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5)">
          ${errichtetPct}% errichtet
        </div>
      </div>
    </div>`;

  // Anlagen-Liste als Button-Reihe
  const anlagenListe=`
    <div class="card" style="margin-bottom:16px">
      <h3 style="color:var(--primary);font-size:15px;margin-bottom:10px">🌬️ Anlagen</h3>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${anlagen.map(a=>{
          const ac=weaStatusCounts(a);
          const aTot=weaTeileKeys(a).length;
          const pct=Math.round(ac.errichtet/aTot*100);
          const active=a.id===_selectedWeaId;
          return `<button onclick="selectWea('${a.id}')"
            style="padding:8px 14px;border-radius:var(--radius-btn);cursor:pointer;border:2px solid ${active?'var(--primary)':'var(--border)'};
                   background:${active?'var(--info-bg)':'var(--card)'};color:var(--text);font-size:13px;font-weight:600;
                   display:inline-flex;align-items:center;gap:8px;font-family:var(--font)">
            <span>${esc(a.name)}</span>
            <span style="font-size:10px;font-weight:700;color:${pct===100?'var(--green)':'var(--muted)'}">${pct}%</span>
          </button>`;
        }).join('')}
      </div>
    </div>`;

  // Detail-Illustration
  const detail = selected ? renderWeaIllustration(p, selected) : '';

  return summary + anlagenListe + detail;
}


// ---- BESS-Statusbericht ----
function renderBessStatusReport(p){
  const containers=getAnlagen(p);
  const skids=getMvSkids(p);
  const abschnitte=getBessAbschnitte(p);
  const cols=p.bessCols||6;
  const rows=p.bessRows||4;

  const contCounts={geplant:0,bestellt:0,angeliefert:0,errichtet:0};
  containers.forEach(c=>contCounts[c.status||'geplant']++);
  const errichtetPct=containers.length>0?Math.round(contCounts.errichtet/containers.length*100):0;

  const abschnittHtml=`
    <div class="card" style="margin-bottom:16px">
      <h3 style="color:var(--primary);font-size:15px;margin-bottom:12px">🏗️ Bauabschnitte</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
        ${abschnitte.map(a=>`
          <div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;background:var(--card)">
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">${esc(a.label)}</div>
            <span style="display:inline-block;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:700;
                         background:${statusColor(a.status||'geplant')};color:${statusTextColor(a.status||'geplant')}">
              ${statusLabel(a.status||'geplant')}
            </span>
          </div>
        `).join('')}
      </div>
    </div>`;

  const summary=containers.length===0?'':`
    <div class="card" style="margin-bottom:16px">
      <h3 style="color:var(--primary);font-size:15px;margin-bottom:12px">📊 Container-Status (${containers.length})</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:14px">
        ${ANLAGEN_STATUS.map(s=>`
          <div style="background:${s.color};color:${s.textColor};padding:12px;border-radius:10px;text-align:center">
            <div style="font-size:24px;font-weight:700">${contCounts[s.key]||0}</div>
            <div style="font-size:11px;opacity:.9;text-transform:uppercase;letter-spacing:.5px">${s.label}</div>
          </div>
        `).join('')}
      </div>
      <div style="background:var(--surface-2);border-radius:8px;overflow:hidden;height:24px;position:relative">
        <div style="position:absolute;inset:0;display:flex">
          ${ANLAGEN_STATUS.map(s=>{
            const w=(contCounts[s.key]||0)/containers.length*100;
            return w>0?`<div style="width:${w}%;background:${s.color}"></div>`:'';
          }).join('')}
        </div>
        <div style="position:relative;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.5)">
          ${errichtetPct}% errichtet
        </div>
      </div>
    </div>`;

  // Draufsicht
  const gridHtml=containers.length===0?'':`
    <div class="card" style="margin-bottom:16px">
      <h3 style="color:var(--primary);font-size:15px;margin-bottom:12px">🗺️ Draufsicht Container-Array</h3>
      ${renderBessStatusGrid(p,containers,skids,cols,rows)}
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;font-size:11px">
        <span style="color:var(--muted)">Legende:</span>
        ${ANLAGEN_STATUS.map(s=>`<span style="display:inline-flex;align-items:center;gap:4px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${s.color}"></span>${s.label}
        </span>`).join('')}
      </div>
    </div>`;

  // MV-Skids
  const skidsHtml=skids.length===0?'':`
    <div class="card" style="margin-bottom:16px">
      <h3 style="color:var(--primary);font-size:15px;margin-bottom:12px">⚡ MV-Skids</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
        ${skids.map(s=>{
          const verknuepft=containers.filter(c=>c.mvSkidId===s.id);
          return `<div style="border:1px solid var(--border);border-radius:10px;padding:12px;background:var(--card)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <strong style="font-size:13px">${esc(s.name)}</strong>
              <span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;
                           background:${statusColor(s.status||'geplant')};color:${statusTextColor(s.status||'geplant')}">
                ${statusLabel(s.status||'geplant')}
              </span>
            </div>
            <div style="font-size:11px;color:var(--muted)">Verknüpft: ${verknuepft.length} Container${verknuepft.length>0?' ('+verknuepft.map(c=>esc(c.name)).join(', ')+')':''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  return abschnittHtml + summary + gridHtml + skidsHtml;
}

function renderBessStatusGrid(p,containers,skids,cols,rows){
  const byPos={};
  containers.forEach(c=>{ if(c.row!=null&&c.col!=null) byPos[`${c.row},${c.col}`]=c; });

  let html=`<div style="display:grid;gap:4px;grid-template-columns:repeat(${cols},minmax(52px,1fr));max-width:${cols*80}px">`;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const cont=byPos[`${r},${c}`];
      if(cont){
        const skid=skids.find(s=>s.id===cont.mvSkidId);
        const st=cont.status||'geplant';
        html+=`<div style="aspect-ratio:1;border-radius:6px;padding:4px;
               background:${statusColor(st)};color:${statusTextColor(st)};
               display:flex;flex-direction:column;align-items:center;justify-content:center;
               font-size:10px;font-weight:700;text-align:center;
               border:2px solid ${cont.mvSkidId?statusColor(skid?.status||'geplant'):'transparent'}"
          title="${esc(cont.name)}">
          <div style="font-size:11px">${esc(cont.name)}</div>
          ${skid?`<div style="font-size:8px;opacity:.85;margin-top:2px">⚡${esc(skid.name)}</div>`:''}
        </div>`;
      } else {
        html+=`<div style="aspect-ratio:1;border-radius:6px;border:2px dashed var(--border);opacity:.3"></div>`;
      }
    }
  }
  html+=`</div>`;
  return html;
}

// ============ PROTOKOLLE (unverändert im Reporting eingebettet) ============
function editProtocol(id){
  if(state.projects.length===0){alert('Bitte zuerst ein Projekt anlegen.');return;}
  const p = id ? state.protocols.find(x=>x.id===id) : {
    id:uid(),date:today(),type:'Baubesprechung',title:'',attendees:'',content:'',
    projectId:state.currentProject||state.projects[0].id
  };
  openModal(`
    <h3>${id?'Protokoll bearbeiten':'Neues Bauprotokoll'}</h3>
    <form onsubmit="saveProtocol(event,'${p.id}',${id?'true':'false'})">
      <div style="display:flex;gap:10px">
        <div class="form-group" style="flex:1"><label>Datum *</label><input type="date" name="date" required value="${p.date}"></div>
        <div class="form-group" style="flex:1"><label>Art</label>
          <select name="type">
            <option ${p.type==='Baubesprechung'?'selected':''}>Baubesprechung</option>
            <option ${p.type==='Mängelbegehung'?'selected':''}>Mängelbegehung</option>
            <option ${p.type==='Bauabnahme'?'selected':''}>Bauabnahme</option>
            <option ${p.type==='Begehung'?'selected':''}>Begehung</option>
            <option ${p.type==='Sonstiges'?'selected':''}>Sonstiges</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Projekt</label>
        <select name="projectId">
          ${state.projects.map(pr=>`<option value="${pr.id}" ${p.projectId===pr.id?'selected':''}>${esc(pr.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Titel *</label><input name="title" required value="${esc(p.title)}"></div>
      <div class="form-group"><label>Teilnehmer</label><input name="attendees" value="${esc(p.attendees||'')}"></div>
      <div class="form-group"><label>Inhalt / Beschlüsse</label><textarea name="content" style="min-height:160px">${esc(p.content||'')}</textarea></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Abbrechen</button>
        <button type="submit" class="btn">Speichern</button>
      </div>
    </form>
  `);
}
async function saveProtocol(e,id,exists){
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = {id,date:fd.get('date'),type:fd.get('type'),title:fd.get('title'),
    attendees:fd.get('attendees'),content:fd.get('content'),projectId:fd.get('projectId')};
  if(exists==='true' || exists===true){
    state.protocols = state.protocols.map(p=>p.id===id?{...p,...data}:p);
  } else {
    state.protocols.push(data);
  }
  await save('protocols');
  closeModal();
  render();
}
function viewProtocol(id){
  const p = state.protocols.find(x=>x.id===id);
  const proj = state.projects.find(x=>x.id===p.projectId);
  openModal(`
    <h3>${esc(p.title)}</h3>
    <p style="color:var(--muted);margin-bottom:14px">${esc(p.type)} • ${fmtDate(p.date)} • ${esc(proj?.name||'')}</p>
    ${p.attendees?`<div style="margin-bottom:10px"><strong>Teilnehmer:</strong> ${esc(p.attendees)}</div>`:''}
    <div style="white-space:pre-wrap;background:#f8fafc;padding:14px;border-radius:6px;font-size:14px">${esc(p.content||'')}</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="window.print()">🖨 Drucken</button>
      <button class="btn" onclick="closeModal()">Schließen</button>
    </div>
  `);
}
async function deleteProtocol(id){
  if(!confirm('Protokoll wirklich löschen?')) return;
  state.protocols = state.protocols.filter(p=>p.id!==id);
  await save('protocols');
  render();
}



// Exports
window.statusColor = statusColor;
window.statusLabel = statusLabel;
window.statusTextColor = statusTextColor;
window.ANLAGEN_STATUS = ANLAGEN_STATUS;
window.weaTeileKeys = weaTeileKeys;
window.weaStatusCounts = weaStatusCounts;
window.getAnlagen = getAnlagen;
window.addAnlage = addWeaAnlage;
window.addWeaAnlage = addWeaAnlage;
window.saveAnlageName = renameWea;
window.renameWea = renameWea;
window.selectWea = selectWea;
window.deleteAnlage = deleteAnlage;
window.updateAnlageTeil = updateAnlageTeil;
window.setWeaTurmSegmente = setWeaTurmSegmente;
window.renderWeaSvg = renderWeaSvg;
window.selectWeaTeil = selectWeaTeil;
window.addBessContainer = addBessContainerAt;
window.addBessContainerAt = addBessContainerAt;
window.openBessContainer = openBessContainer;
window.saveContainerName = saveBessContainerModal;
window.saveBessContainerModal = saveBessContainerModal;
window.updateBessContainer = updateBessContainer;
window.deleteContainer = deleteBessContainer;
window.deleteBessContainer = deleteBessContainer;
window.toggleBessView = setBessView;
window.setBessView = setBessView;
window.setBessGridSize = setBessGrid;
window.setBessGrid = setBessGrid;
window.openSkidManager = openBessMvSkidManager;
window.openBessMvSkidManager = openBessMvSkidManager;
window.addSkid = addMvSkid;
window.addMvSkid = addMvSkid;
window.saveSkidName = updateMvSkid;
window.updateMvSkid = updateMvSkid;
window.deleteSkid = deleteMvSkid;
window.deleteMvSkid = deleteMvSkid;
window.setBessAbschnittStatus = updateBessAbschnitt;
window.updateBessAbschnitt = updateBessAbschnitt;
window.renderProtokolle = renderProtokolle;
window.renderProtokollDetail = viewProtocol;
window.viewProtocol = viewProtocol;
window.renderReporting = renderReportingHub;
window.renderReportingHub = renderReportingHub;
window.editProtocol = editProtocol;
window.saveProtocol = saveProtocol;
window.deleteProtocol = deleteProtocol;
