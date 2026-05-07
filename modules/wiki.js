// ============================================================================
//  WIKI — interaktives Wissenssystem mit Markdown + Bildern
// ============================================================================
//  Artikel-Inhalte (Text) → state.wikiArticles → localStorage
//  Bilder als Blob → IndexedDB (Key: 'wiki_img_'+imageId)
//  Im Markdown referenziert: ![alt](wiki:imageId)
// ============================================================================

const _wikiImageURLs = new Map();   // imageId → blob URL (Session-Cache)
let _wikiSelectedId = null;
let _wikiSearch = '';
let _wikiTagFilter = null;
let _wikiViewMode = 'split';        // 'edit' | 'split' | 'preview'

window.resetWikiFilter = function(){
  _wikiSelectedId = null;
  _wikiSearch = '';
  _wikiTagFilter = null;
};

// ── Tags sammeln ─────────────────────────────────────────────────────────────
function _wikiAllTags(){
  const set = new Set();
  (state.wikiArticles||[]).forEach(a => (a.tags||[]).forEach(t => set.add(t)));
  return [...set].sort();
}

// ── Bilder vom Artikel preloaden ─────────────────────────────────────────────
async function _wikiLoadImages(article){
  if(!article || !article.content) return;
  const ids = [...article.content.matchAll(/!\[[^\]]*\]\(wiki:([^)]+)\)/g)].map(m => m[1]);
  let needsRerender = false;
  for(const id of ids){
    if(_wikiImageURLs.has(id)) continue;
    try{
      const blob = await dbGet('wiki_img_' + id);
      if(blob){
        _wikiImageURLs.set(id, URL.createObjectURL(blob));
        needsRerender = true;
      }
    }catch(_){}
  }
  if(needsRerender){
    // Nur Preview neu rendern, kein voller render() (Editor-Cursor bleibt erhalten)
    const a = (state.wikiArticles||[]).find(x => x.id === article.id);
    const prev = document.getElementById('wiki-preview');
    if(a && prev) prev.innerHTML = _wikiRenderMarkdown(a.content||'');
  }
}

// ── Mini-Markdown-Renderer ───────────────────────────────────────────────────
function _wikiRenderMarkdown(md){
  if(!md) return '<p style="color:var(--muted);font-style:italic">Leerer Artikel.</p>';

  // 1. Code-Blöcke ```...``` rauslösen (verhindert dass darin geparst wird)
  const codeBlocks = [];
  md = md.replace(/```([\s\S]*?)```/g, (m, code) => {
    codeBlocks.push(code);
    return `\x00CB${codeBlocks.length-1}\x00`;
  });

  // 2. HTML escapen (sicher!)
  md = esc(md);

  // 3. Inline-Code
  md = md.replace(/`([^`\n]+)`/g,
    '<code style="background:var(--surface-2);padding:1px 6px;border-radius:4px;font-family:Consolas,monospace;font-size:.9em">$1</code>');

  // 4. Wiki-Bilder ![alt](wiki:id)
  md = md.replace(/!\[([^\]]*)\]\(wiki:([^)]+)\)/g, (m, alt, id) => {
    const url = _wikiImageURLs.get(id);
    if(!url){
      return `<div style="display:inline-block;padding:30px 20px;background:var(--surface-2);border:1px dashed var(--border);border-radius:8px;color:var(--muted);font-size:12px;margin:8px 0">📷 Bild lädt … (${esc(alt)||'Bild'})</div>`;
    }
    return `<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;border-radius:8px;margin:10px 0;display:block;box-shadow:0 1px 4px rgba(0,0,0,.08)">`;
  });

  // 5. Externe Bilder ![alt](url)
  md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;height:auto;border-radius:8px;margin:10px 0;display:block">');

  // 6. Links [text](url)
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline">$1</a>');

  // 7. Bold + Italic
  md = md.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  // 8. Headings, hr, blockquote line-by-line
  md = md.split('\n').map(line => {
    if(/^#\s/.test(line))    return `<h1 style="font-size:24px;font-weight:800;margin:18px 0 10px;color:var(--primary);border-bottom:1px solid var(--border);padding-bottom:6px">${line.slice(2)}</h1>`;
    if(/^##\s/.test(line))   return `<h2 style="font-size:19px;font-weight:700;margin:16px 0 8px">${line.slice(3)}</h2>`;
    if(/^###\s/.test(line))  return `<h3 style="font-size:16px;font-weight:700;margin:14px 0 6px;color:var(--primary)">${line.slice(4)}</h3>`;
    if(/^####\s/.test(line)) return `<h4 style="font-size:14px;font-weight:700;margin:12px 0 4px">${line.slice(5)}</h4>`;
    if(/^---+$/.test(line.trim())) return '<hr style="border:0;border-top:1px solid var(--border);margin:14px 0">';
    if(/^&gt;\s/.test(line)) return `<blockquote style="border-left:3px solid var(--primary);padding:6px 14px;margin:10px 0;color:var(--muted);font-style:italic;background:var(--surface-2)">${line.slice(5)}</blockquote>`;
    return line;
  }).join('\n');

  // 9. Listen (ungeordnet + geordnet)
  md = md.replace(/((?:^- .+(?:\n|$))+)/gm, m => {
    const items = m.split('\n').filter(l => l.startsWith('- ')).map(l => `<li style="margin:2px 0">${l.slice(2)}</li>`).join('');
    return `<ul style="margin:8px 0 8px 22px;line-height:1.7">${items}</ul>\n`;
  });
  md = md.replace(/((?:^\d+\. .+(?:\n|$))+)/gm, m => {
    const items = m.split('\n').filter(l => /^\d+\. /.test(l)).map(l => `<li style="margin:2px 0">${l.replace(/^\d+\.\s/, '')}</li>`).join('');
    return `<ol style="margin:8px 0 8px 22px;line-height:1.7">${items}</ol>\n`;
  });

  // 10. Paragraphen (durch leere Zeilen getrennt)
  md = md.split(/\n\s*\n/).map(block => {
    if(!block.trim()) return '';
    if(/^\s*<(h[1-6]|ul|ol|hr|blockquote|img|pre|div)/i.test(block)) return block;
    return `<p style="margin:0 0 10px;line-height:1.7">${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  // 11. Code-Blöcke wieder einsetzen (mit eigener HTML-Escape, weil esc oben übersprungen wurde)
  md = md.replace(/\x00CB(\d+)\x00/g, (m, idx) => {
    return `<pre style="background:var(--surface-2);padding:12px 14px;border-radius:8px;overflow:auto;font-family:Consolas,monospace;font-size:13px;margin:10px 0;line-height:1.5"><code>${esc(codeBlocks[parseInt(idx)]||'')}</code></pre>`;
  });

  return md;
}

// ── Render: Hauptseite ───────────────────────────────────────────────────────
function renderWiki(){
  const articles = state.wikiArticles || [];

  let filtered = articles;
  if(_wikiSearch){
    const q = _wikiSearch.toLowerCase();
    filtered = filtered.filter(a =>
      (a.title||'').toLowerCase().includes(q) ||
      (a.content||'').toLowerCase().includes(q) ||
      (a.tags||[]).some(t => t.toLowerCase().includes(q))
    );
  }
  if(_wikiTagFilter){
    filtered = filtered.filter(a => (a.tags||[]).includes(_wikiTagFilter));
  }
  filtered = [...filtered].sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));

  if(!_wikiSelectedId && filtered.length > 0) _wikiSelectedId = filtered[0].id;
  const selected = articles.find(a => a.id === _wikiSelectedId);
  if(selected) _wikiLoadImages(selected);

  const allTags = _wikiAllTags();

  return `
    <div class="page-header">
      <h2>📚 Wiki</h2>
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="addWikiArticle()">+ Artikel</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:300px 1fr;gap:14px;height:calc(100vh - 180px);min-height:520px">
      <!-- Sidebar -->
      <div style="display:flex;flex-direction:column;gap:10px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:12px;overflow:hidden;min-height:0">
        <input type="text" placeholder="🔍 Suche…" value="${esc(_wikiSearch)}"
          oninput="setWikiSearch(this.value)"
          style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text);font-size:13px;font-family:var(--font)">
        ${allTags.length > 0 ? `
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          <button data-action="setWikiTagFilter" data-id=""
            style="padding:3px 10px;font-size:11px;border-radius:10px;border:1px solid var(--border);
                   background:${!_wikiTagFilter?'var(--primary)':'var(--surface-2)'};
                   color:${!_wikiTagFilter?'#fff':'var(--text)'};cursor:pointer;font-weight:600">Alle</button>
          ${allTags.map(tag => {
            const active = tag === _wikiTagFilter;
            return `<button data-action="setWikiTagFilter" data-id="${esc(tag)}"
              style="padding:3px 10px;font-size:11px;border-radius:10px;border:1px solid var(--border);
                     background:${active?'var(--primary)':'var(--surface-2)'};
                     color:${active?'#fff':'var(--text)'};cursor:pointer">${esc(tag)}</button>`;
          }).join('')}
        </div>` : ''}
        <div style="overflow-y:auto;display:flex;flex-direction:column;gap:3px;flex:1;min-height:0">
          ${filtered.length === 0 ?
            `<div style="padding:30px 12px;text-align:center;color:var(--muted);font-size:13px">${
              articles.length===0 ? '📚<br><br>Noch keine Artikel.<br>Klicke „+ Artikel" um zu starten.' : 'Keine Treffer.'
            }</div>` :
            filtered.map(a => {
              const sel = a.id === _wikiSelectedId;
              const date = a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('de-DE') : '';
              return `<div data-action="selectWikiArticle" data-id="${esc(a.id)}"
                style="padding:8px 10px;border-radius:8px;cursor:pointer;
                       background:${sel?'var(--primary)':'transparent'};
                       color:${sel?'#fff':'var(--text)'};
                       transition:background .1s">
                <div style="font-weight:600;font-size:13px;line-height:1.3;margin-bottom:2px">${esc(a.title||'(ohne Titel)')}</div>
                <div style="font-size:11px;opacity:.75">
                  ${(a.tags||[]).slice(0,3).map(t=>esc(t)).join(' · ')}${(a.tags||[]).length>0?' · ':''}${date}
                </div>
              </div>`;
            }).join('')
          }
        </div>
      </div>

      <!-- Editor / Preview -->
      ${selected ? _wikiRenderEditor(selected) : `
        <div class="empty" style="display:flex;align-items:center;justify-content:center;flex-direction:column">
          <span class="empty-icon">📚</span>
          <p>Wähle links einen Artikel oder erstelle einen neuen.</p>
        </div>
      `}
    </div>
  `;
}

// ── Editor / Preview-Pane ────────────────────────────────────────────────────
function _wikiRenderEditor(a){
  const tagsStr = (a.tags||[]).join(', ');
  const mode = _wikiViewMode;
  const btnStyle = active => active
    ? 'background:var(--primary);color:#fff;border-color:var(--primary)'
    : '';

  return `
    <div style="display:flex;flex-direction:column;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;min-height:0">
      <div style="padding:12px 14px;border-bottom:1px solid var(--border);background:var(--surface-2)">
        <input type="text" value="${esc(a.title||'')}" placeholder="Artikel-Titel"
          oninput="saveWikiField('${a.id}','title',this.value)"
          style="width:100%;font-size:18px;font-weight:700;border:none;background:transparent;color:var(--text);padding:0;margin-bottom:8px;font-family:var(--font);outline:none">
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <input type="text" value="${esc(tagsStr)}" placeholder="Tags (Komma-getrennt)"
            onchange="saveWikiField('${a.id}','tags',this.value)"
            style="flex:1;min-width:160px;padding:5px 8px;font-size:12px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text);font-family:var(--font)">
          <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden">
            <button onclick="setWikiViewMode('edit')" style="padding:5px 10px;font-size:12px;border:none;cursor:pointer;${btnStyle(mode==='edit')}">✏️ Edit</button>
            <button onclick="setWikiViewMode('split')" style="padding:5px 10px;font-size:12px;border:none;border-left:1px solid var(--border);cursor:pointer;${btnStyle(mode==='split')}">⫶ Split</button>
            <button onclick="setWikiViewMode('preview')" style="padding:5px 10px;font-size:12px;border:none;border-left:1px solid var(--border);cursor:pointer;${btnStyle(mode==='preview')}">👁 Preview</button>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="pickWikiImage('${a.id}')">📷 Bild</button>
          <button class="btn btn-sm btn-danger" onclick="deleteWikiArticle('${a.id}')">🗑</button>
        </div>
      </div>

      <div style="flex:1;display:grid;grid-template-columns:${mode==='split'?'1fr 1fr':'1fr'};overflow:hidden;min-height:0">
        ${mode!=='preview' ? `
        <textarea id="wiki-editor"
          oninput="saveWikiField('${a.id}','content',this.value);updateWikiPreview()"
          placeholder="Schreibe hier dein Markdown…&#10;&#10;# Überschrift&#10;## Unterüberschrift&#10;**Fett**, *kursiv*, \`Code\`&#10;- Liste&#10;1. Nummeriert&#10;[Link](https://...)&#10;> Zitat&#10;\`\`\`Code-Block\`\`\`"
          style="border:none;${mode==='split'?'border-right:1px solid var(--border);':''}background:var(--card);color:var(--text);padding:14px;font-family:Consolas,monospace;font-size:13px;line-height:1.7;resize:none;outline:none;min-height:0">${esc(a.content||'')}</textarea>` : ''}
        ${mode!=='edit' ? `
        <div id="wiki-preview" style="overflow-y:auto;padding:14px 18px;font-size:14px;color:var(--text);min-height:0">${_wikiRenderMarkdown(a.content||'')}</div>` : ''}
      </div>
    </div>
  `;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
async function addWikiArticle(){
  state.wikiArticles ??= [];
  const a = {
    id: uid(),
    title: 'Neuer Artikel',
    content: '# Neuer Artikel\n\nHier schreibst du deinen Inhalt.\n\n## Tipps\n\n- **Fett** mit `**Text**`\n- *Kursiv* mit `*Text*`\n- Listen mit `-`\n- Bilder einfügen über den 📷-Button',
    tags: [],
    updatedAt: Date.now(),
  };
  state.wikiArticles.unshift(a);
  await save('wikiArticles');
  _wikiSelectedId = a.id;
  _wikiViewMode = 'split';
  render();
}

async function deleteWikiArticle(id){
  const a = (state.wikiArticles||[]).find(x => x.id === id);
  if(!a) return;
  if(!confirm(`Artikel „${a.title||'?'}" löschen? Alle eingefügten Bilder werden ebenfalls entfernt.`)) return;

  // Bilder aus IndexedDB löschen
  const imgIds = [...(a.content||'').matchAll(/!\[[^\]]*\]\(wiki:([^)]+)\)/g)].map(m => m[1]);
  for(const imgId of imgIds){
    const url = _wikiImageURLs.get(imgId);
    if(url) URL.revokeObjectURL(url);
    _wikiImageURLs.delete(imgId);
    try{ await dbDel('wiki_img_' + imgId); }catch(_){}
  }

  state.wikiArticles = (state.wikiArticles||[]).filter(x => x.id !== id);
  await save('wikiArticles');
  if(_wikiSelectedId === id) _wikiSelectedId = null;
  render();
}

async function saveWikiField(id, field, value){
  const a = (state.wikiArticles||[]).find(x => x.id === id);
  if(!a) return;
  if(field === 'tags'){
    a.tags = value.split(',').map(t => t.trim()).filter(Boolean);
  }else{
    a[field] = value;
  }
  a.updatedAt = Date.now();
  await save('wikiArticles');
  // Bei title/tags muss die Sidebar refresht werden — aber NUR wenn Editor nicht aktiv getippt wird (Cursor-Bug)
  if(field === 'tags'){
    // Tags-Input verliert Focus erst beim onchange — jetzt kann sicher re-rendered werden
    render();
  }
  // title: re-render Sidebar-Titel via direktes DOM-Update (Cursor bleibt drin)
  // Erstmal einfach: nur Sidebar-Item aktualisieren
}

function selectWikiArticle(id){
  _wikiSelectedId = id;
  render();
}
function setWikiSearch(q){
  _wikiSearch = q;
  // Re-render kostet Cursor-Position im Suchfeld → Workaround: nur Liste neu malen
  render();
  const inp = document.querySelector('input[placeholder^="🔍"]');
  if(inp){ inp.focus(); inp.setSelectionRange(q.length, q.length); }
}
function setWikiTagFilter(t){
  _wikiTagFilter = t || null;
  render();
}
function setWikiViewMode(m){
  _wikiViewMode = m;
  render();
}

// ── Bild einfügen ────────────────────────────────────────────────────────────
async function pickWikiImage(articleId){
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = async () => {
    const file = inp.files[0];
    if(!file) return;
    const a = (state.wikiArticles||[]).find(x => x.id === articleId);
    if(!a) return;
    const imgId = uid();
    try{
      await dbSet('wiki_img_' + imgId, file);
      _wikiImageURLs.set(imgId, URL.createObjectURL(file));
    }catch(e){
      alert('Bild konnte nicht gespeichert werden: ' + e);
      return;
    }
    const editor = document.getElementById('wiki-editor');
    const snippet = `\n![${file.name.replace(/[\[\]]/g,'')}](wiki:${imgId})\n`;
    if(editor){
      const start = editor.selectionStart;
      const before = editor.value.slice(0, start);
      const after = editor.value.slice(editor.selectionEnd);
      editor.value = before + snippet + after;
      a.content = editor.value;
      editor.selectionStart = editor.selectionEnd = start + snippet.length;
      editor.focus();
    }else{
      a.content = (a.content || '') + snippet;
    }
    a.updatedAt = Date.now();
    await save('wikiArticles');
    updateWikiPreview();
  };
  inp.click();
}

// ── Live-Preview-Update ohne render() (Editor-Cursor bleibt) ─────────────────
function updateWikiPreview(){
  const editor = document.getElementById('wiki-editor');
  const preview = document.getElementById('wiki-preview');
  if(editor && preview) preview.innerHTML = _wikiRenderMarkdown(editor.value);
}

window.renderWiki         = renderWiki;
window.addWikiArticle     = addWikiArticle;
window.deleteWikiArticle  = deleteWikiArticle;
window.saveWikiField      = saveWikiField;
window.selectWikiArticle  = selectWikiArticle;
window.setWikiSearch      = setWikiSearch;
window.setWikiTagFilter   = setWikiTagFilter;
window.setWikiViewMode    = setWikiViewMode;
window.pickWikiImage      = pickWikiImage;
window.updateWikiPreview  = updateWikiPreview;
