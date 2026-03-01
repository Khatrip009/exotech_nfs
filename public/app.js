const apiBase = '/api';

function el(id){return document.getElementById(id)}

async function api(path, opts = {}){
  opts.headers = opts.headers || {};
  opts.headers['Content-Type'] = 'application/json';
  opts.credentials = 'same-origin';
  const res = await fetch(apiBase + path, opts);
  const json = await res.json().catch(()=>({}));
  if(!res.ok) throw json;
  return json;
}

function showMessage(msg, isError = false) {
  const msgEl = document.createElement('div');
  msgEl.textContent = msg;
  msgEl.style.cssText = `position:fixed;top:20px;right:20px;padding:12px 20px;background:${isError?'#f44':'#4caf50'};color:#fff;border-radius:4px;z-index:1000`;
  document.body.appendChild(msgEl);
  setTimeout(() => msgEl.remove(), 3000);
}

// Auth
el('registerBtn').addEventListener('click', async ()=>{
  try{
    const email = el('regEmail').value; const password = el('regPassword').value;
    await api('/register', { method:'POST', body: JSON.stringify({ email, password }) });
    initApp();
  }catch(err){ showMessage(err.error || 'Register failed', true) }
});
el('loginBtn').addEventListener('click', async ()=>{
  try{
    const email = el('loginEmail').value; const password = el('loginPassword').value;
    await api('/login', { method:'POST', body: JSON.stringify({ email, password }) });
    initApp();
  }catch(err){ showMessage(err.error || 'Login failed', true) }
});
el('logoutBtn').addEventListener('click', async ()=>{ 
  await api('/logout', { method:'POST' });
  showAuth(); 
});

async function initApp(){
  try{
    const me = await api('/me');
    el('userEmail').textContent = me.user.email;
    el('auth').style.display = 'none';
    el('app').style.display = 'block';
    loadCodes();
  }catch(e){ showAuth(); }
}
function showAuth(){ el('auth').style.display = 'block'; el('app').style.display = 'none'; }

// Preview
function drawPreview({ color, frame, design, code }){
  const c = el('preview'); const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  // background
  ctx.fillStyle = color || '#000';
  if(design === 'stripes'){
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = color; for(let i=0;i<10;i++){ ctx.fillRect(i*60,0,30,c.height); }
  } else if(design === 'dots'){
    ctx.fillStyle = color; ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = '#fff'; for(let x=20;x<c.width;x+=40){ for(let y=20;y<c.height;y+=40){ ctx.beginPath(); ctx.arc(x,y,8,0,Math.PI*2); ctx.fill(); }}
  } else {
    ctx.fillStyle = color; ctx.fillRect(0,0,c.width,c.height);
  }
  // frame
  ctx.lineWidth = 6; ctx.strokeStyle = '#fff';
  if(frame === 'rounded'){
    roundRect(ctx,10,10,c.width-20,c.height-20,20); ctx.stroke();
  } else if(frame === 'double'){
    ctx.strokeRect(8,8,c.width-16,c.height-16);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.strokeRect(20,20,c.width-40,c.height-40);
  } else if(frame === 'shadow'){
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 12;
    ctx.strokeRect(6,6,c.width-12,c.height-12);
    ctx.shadowBlur = 0;
  }
  // code text
  ctx.fillStyle = '#fff'; ctx.font = 'bold 42px monospace'; ctx.textAlign = 'center';
  ctx.fillText(code || 'NFS-'+Math.random().toString(36).slice(2,8).toUpperCase(), c.width/2, c.height/2 + 12);
}
function roundRect(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

el('previewBtn').addEventListener('click', ()=>{
  drawPreview({ color: el('color').value, frame: el('frame').value, design: el('design').value, code: el('codeValue').value });
});

el('downloadPreview').addEventListener('click', ()=>{
  const c = el('preview'); const link = document.createElement('a'); link.download = 'nfs-code.png'; link.href = c.toDataURL('image/png'); link.click();
});

el('saveBtn').addEventListener('click', async ()=>{
  try{
    const payload = { color: el('color').value, frame: el('frame').value, design: el('design').value, code: el('codeValue').value };
    await api('/codes', { method:'POST', body: JSON.stringify(payload) });
    el('codeValue').value = '';
    loadCodes();
    showMessage('Saved');
  }catch(err){ showMessage(err.error || 'Save failed', true) }
});

async function loadCodes(){
  try{
    const r = await api('/codes');
    const list = el('codesList'); list.innerHTML = '';
    if(!r.codes.length) list.innerHTML = '<div class="small">No codes yet</div>';
    r.codes.forEach(c => {
      const d = document.createElement('div'); d.className = 'codeItem';
      const left = document.createElement('div'); left.innerHTML = `<div><strong>${c.code}</strong></div><div class="small">${new Date(c.created_at).toLocaleString()}</div>`;
      const right = document.createElement('div');
      const view = document.createElement('button'); view.textContent='Preview'; view.onclick = ()=>{ drawPreview(c); };
      const dl = document.createElement('button'); dl.textContent='Download'; dl.onclick = ()=>{ downloadFromData(c); };
      const del = document.createElement('button'); del.textContent='Delete'; del.onclick = async ()=>{ if(window.confirm('Delete?')){ await api('/codes/'+c.id, { method:'DELETE' }); loadCodes(); } };
      right.appendChild(view); right.appendChild(dl); right.appendChild(del);
      d.appendChild(left); d.appendChild(right);
      list.appendChild(d);
    });
  }catch(err){ console.error(err); el('codesList').innerHTML = '<div class="small">Failed to load</div>' }
}

function downloadFromData(c){ drawPreview(c); const link = document.createElement('a'); link.href = el('preview').toDataURL('image/png'); link.download = `${c.code}.png`; link.click(); }

// Initialize
window.addEventListener('load', ()=>{
  el('previewBtn').click();
  initApp();
});
