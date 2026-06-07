const $=id=>document.getElementById(id);
const slugInput=$('slugInput'),createForm=$('createForm'),createBtn=$('createBtn');
const loginBtn=$('loginBtn'),installBtn=$('installBtn'),manifestBox=$('manifestBox');
const prefsForm=$('prefsForm'),focusMode=$('focusMode'),previewGrid=$('previewGrid');
const syncBtn=$('syncBtn'),syncStatus=$('syncStatus'),udidValue=$('udidValue'),udidCopyBtn=$('udidCopyBtn');
const accountBadge=$('accountBadge'),uname=$('uname'),syncInfoMini=$('syncInfoMini');
const pathParts=location.pathname.split('/').filter(Boolean);
let configId=pathParts[1]||null,manifestUrl='';

// Sections show/hide
function show(id){const e=$(id);if(e)e.classList.remove('hide')}
function hide(id){const e=$(id);if(e)e.classList.add('hide')}

// Nav tabs
document.querySelectorAll('.nav-tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.nav-tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
  });
});

// Card tab filter
document.querySelectorAll('.seg-btn').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.seg-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const cat=b.dataset.tab;
    document.querySelectorAll('.chip').forEach(c=>c.classList.toggle('hide',cat!=='all'&&c.dataset.cat!==cat));
  });
});

// Chip toggle
document.querySelectorAll('.chip').forEach(el=>{
  el.addEventListener('click',()=>{
    const cb=el.querySelector('input[type="checkbox"]');
    if(!cb)return;
    cb.checked=!cb.checked;
    el.classList.toggle('active',cb.checked);
  });
});

function selTypes(){return[...document.querySelectorAll('input[name="c"]:checked')].map(e=>e.value)}

function updManifest(ls){
  manifestUrl=`${location.origin}/${configId}/manifest.json?_=${Date.now()}`;
  manifestBox.textContent=manifestUrl;
  const si=$('syncInfo');
  if(si&&ls)si.textContent=`Ultimo sync: ${new Date(ls).toLocaleDateString('it-IT')}`;
  else if(si)si.textContent='';
}

async function loadPreview(){
  if(!configId||!previewGrid)return;
  previewGrid.innerHTML='<div class="pempty"><div class="spin" style="width:16px;height:16px"></div><p>Caricamento...</p></div>';
  document.querySelector('[data-section="preview"]')?.click();
  try{
    const r=await fetch(`/${configId}/catalog/movie/adaptive-insights.json`);
    const d=await r.json();
    if(!d.metas||!d.metas.length){previewGrid.innerHTML='<div class="pempty"><p>Nessuna card. Fai il sync.</p></div>';return}
    previewGrid.innerHTML='';
    for(const m of d.metas){
      const c=document.createElement('div');c.className='pcard';
      const fb=`data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22><rect fill=%22%23000%22 width=%22200%22 height=%22300%22/><text x=%22100%22 y=%22150%22 fill=%22%23666%22 font-size=%2213%22 text-anchor=%22middle%22 font-family=%22Arial%22>${encodeURIComponent(m.name)}</text></svg>`;
      c.innerHTML=`<img src="${m.poster}" alt="${m.name}" loading="lazy" onerror="this.src='${fb}'"><div class="plabel">${m.name}</div>`;
      previewGrid.appendChild(c);
    }
  }catch{
    previewGrid.innerHTML='<div class="pempty"><p>Errore caricamento</p></div>';
  }
}

async function loadConfig(){
  if(!configId)return;
  const r=await fetch(`/api/config/${configId}`);
  const d=await r.json();
  if(!r.ok)return;
  show('section-trakt');show('section-cards');show('section-sync');
  // Account
  if(accountBadge&&d.trakt_username){accountBadge.classList.remove('hide');uname.textContent=d.trakt_username}
  // Token
  if(udidValue&&d.udid){show('section-token');udidValue.textContent=d.udid}
  // Trakt
  if(d.trakt_username){loginBtn.style.display='none';accountBadge.classList.remove('hide');}
  else{loginBtn.href=`/auth/login/${configId}`;loginBtn.style.display='';}
  syncInfoMini.textContent=d.last_sync_at?`Ultimo sync: ${new Date(d.last_sync_at).toLocaleDateString('it-IT')}`:'';
  // Prefs
  if(d.preferences){
    focusMode.value=d.preferences.focus_mode||'adaptive';
    const sv=d.preferences.enabled_card_types||[];
    const def=['totals','streak','peak','weekly','genre','binge','monthly','recurring','rewatch','seasonal','actor','director','anime','ranking','memories','giorni','migliore','anno','mese','split','notturno'];
    document.querySelectorAll('input[name="c"]').forEach(el=>{
      const ch=sv.includes(el.value)||(sv.length===0&&def.includes(el.value));
      el.checked=ch;el.closest('.chip')?.classList.toggle('active',ch);
    });
  }
  updManifest(d.last_sync_at);
  // Status
  try{
    const sr=await fetch(`/api/status/${configId}`);const sd=await sr.json();
    if(sd.ok){
      const st=$('sTables'),tt=$('sTrakt'),sy=$('sSync'),sc=$('sCards'),si=$('sIssues');
      if(st)st.className='sdot '+(sd.database?.all_tables_ok?'ok':'fail');
      if(tt)tt.className='sdot '+(sd.config?.trakt_connected?'ok':'fail');
      if(sy)sy.textContent=sd.config?.last_sync?new Date(sd.config.last_sync).toLocaleDateString('it-IT'):'—';
      if(sc)sc.textContent=sd.database?.actual_cards_in_row??'—';
      if(si&&(sd.issues?.length||sd.suggestions?.length)){
        si.classList.add('show');si.innerHTML='';
        (sd.issues||[]).forEach(i=>{si.innerHTML+=`<div>⚠️ ${i}</div>`});
        (sd.suggestions||[]).forEach(s=>{si.innerHTML+=`<div style="color:var(--m)">💡 ${s}</div>`});
      }
    }
  }catch{}
  if(d.last_sync_at)loadPreview();
}

// UDID copy
if(udidCopyBtn){
  udidCopyBtn.addEventListener('click',async()=>{
    const v=udidValue?.textContent;if(!v)return;
    try{await navigator.clipboard.writeText(v);
      udidCopyBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 10l3 3 7-7" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/></svg>';
      setTimeout(()=>{udidCopyBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="4" y="4" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 2h6a2 2 0 012 2v10" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>'},2000);
    }catch{}
  });
}

// Install copy
installBtn.onclick=async()=>{
  await navigator.clipboard.writeText(manifestUrl);
  installBtn.textContent='Copiato!';installBtn.style.background='#22c55e';installBtn.style.color='#000';
  setTimeout(()=>{installBtn.textContent='Copia';installBtn.style.background='';installBtn.style.color=''},2000);
};

// Create
createForm.onsubmit=async(e)=>{
  e.preventDefault();
  const slug=slugInput.value.trim().replace(/[^a-zA-Z0-9_-]/g,'').toLowerCase();
  if(!slug)return;
  createBtn.disabled=true;createBtn.textContent='...';
  const r=await fetch('/api/config',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({slug,enabled_card_types:selTypes(),focus_mode:focusMode.value,seasonal_enabled:true,festive_enabled:true,style_mode:'cinematic'})
  });
  const d=await r.json();
  createBtn.disabled=false;createBtn.textContent='Crea';
  if(r.ok)window.location.href=`/configure/${d.slug}`;
};

// Save prefs
prefsForm.addEventListener('submit',async(e)=>{
  e.preventDefault();if(!configId)return;
  const sb=$('savePrefsBtn');sb.disabled=true;sb.textContent='Salvataggio...';
  const r=await fetch(`/api/config/${configId}/preferences`,{
    method:'PUT',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({enabled_card_types:selTypes(),focus_mode:focusMode.value,seasonal_enabled:true,festive_enabled:true,style_mode:'cinematic'})
  });
  sb.disabled=false;
  if(r.ok){sb.textContent='Salvato!';sb.style.background='#22c55e';sb.style.color='#000';
    setTimeout(()=>{sb.textContent='Salva';sb.style.background='';sb.style.color=''},2000)}
  else{sb.textContent='Errore';setTimeout(()=>{sb.textContent='Salva'},2000)}
});

// Sync
syncBtn.addEventListener('click',async()=>{
  if(!configId)return;
  syncBtn.disabled=true;syncBtn.textContent='Sincronizzazione...';
  syncStatus.textContent='';syncStatus.className='ssync';
  const r=await fetch(`/api/config/${configId}/sync`,{method:'POST'});
  const d=await r.json();
  syncBtn.disabled=false;
  syncBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 10a6 6 0 0112 0M16 10l-3-3M4 10l3-3" stroke="#000" stroke-width="2" stroke-linecap="round"/></svg> Sincronizza con Trakt';
  if(d.ok){syncStatus.textContent=`Sync riuscita! ${d.count} eventi.`;syncStatus.className='ssync ok';loadConfig()}
  else{syncStatus.textContent=d.error||'Errore sync';syncStatus.className='ssync err'}
});

// Refresh preview
$('refreshPreviewBtn')?.addEventListener('click',loadPreview);

loadConfig();
