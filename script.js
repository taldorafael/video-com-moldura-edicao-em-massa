const FFMPEG_SRC = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';
const CW = 1080, CH = 1942;
const PS = 180 / CW; // preview scale

const DEF = {
  bg: '#ffffff', profileShape: 'circle', profileImg: null,
  usernameText: '@usuario', captionText: 'legenda do vídeo aqui 🎬',
  usernameFont: 'Inter, system-ui, sans-serif', captionFont: 'Inter, system-ui, sans-serif',
  usernameSize: 42, captionSize: 48, textColorMode: 'auto', textColor: '#111111',
  profile:  { x: 386, y: 162, w: 308, h: 308 },
  username: { x: 390, y: 500 },
  caption:  { x: 100, y: 560, w: 880 },
  video:    { x: 77,  y: 638, w: 926, h: 1269 }
};

const S = {
  ffmpeg: null, loaded: false, fetchFile: null,
  frameFile: null, frameImg: null, frameHoleUrl: null, frameInfo: null,
  tmpl: JSON.parse(JSON.stringify(DEF)),
  videos: [], processing: false, idCounter: 0
};

const E = {
  warnBar: document.getElementById('warn-bar'),
  tabs: document.querySelectorAll('.tab'),
  modeUpload: document.getElementById('mode-upload'),
  modeCreate: document.getElementById('mode-create'),
  frameDrop: document.getElementById('frame-drop'),
  frameInput: document.getElementById('frame-input'),
  frameBlock: document.getElementById('frame-preview-block'),
  frameEditor: document.getElementById('frame-editor'),
  frameImg: document.getElementById('frame-img'),
  frameMeta: document.getElementById('frame-meta'),
  areaOverlay: document.getElementById('area-overlay'),
  ax: document.getElementById('ax'), ay: document.getElementById('ay'),
  aw: document.getElementById('aw'), ah: document.getElementById('ah'),
  autoDetect: document.getElementById('auto-detect-btn'),
  centerBtn: document.getElementById('center-btn'),
  removeFrame: document.getElementById('remove-frame-btn'),

  prevContainer: document.getElementById('template-preview-container'),
  prevBg: document.getElementById('preview-bg'),
  prevProfile: document.getElementById('prev-profile'),
  prevProfileImg: document.getElementById('prev-profile-img'),
  prevUsername: document.getElementById('prev-username'),
  prevCaption: document.getElementById('prev-caption'),
  prevVideo: document.getElementById('preview-video-area'),
  cProfileInput: document.getElementById('c-profile-input'),
  cUsername: document.getElementById('c-username'),
  cCaption: document.getElementById('c-caption'),
  cBg: document.getElementById('c-bg'),
  cTextColor: document.getElementById('c-textcolor'),
  cvX: document.getElementById('cv-x'), cvY: document.getElementById('cv-y'),
  cvW: document.getElementById('cv-w'), cvH: document.getElementById('cv-h'),
  finalizeBtn: document.getElementById('finalize-btn'),
  resetTemplateBtn: document.getElementById('reset-template-btn'),
  // videos
  videosDrop: document.getElementById('videos-drop'),
  videosInput: document.getElementById('videos-input'),
  queueSection: document.getElementById('queue-section'),
  queueList: document.getElementById('queue-list'),
  queueCount: document.getElementById('queue-count'),
  clearBtn: document.getElementById('clear-btn'),
  processBtn: document.getElementById('process-btn'),
  processLabel: document.getElementById('process-label'),
  progressCard: document.getElementById('progress-card'),
  progressLabel: document.getElementById('progress-label'),
  progressBar: document.getElementById('progress-bar'),
  progressPct: document.getElementById('progress-pct'),
  progressSub: document.getElementById('progress-sub'),
  resultsCard: document.getElementById('results-card'),
  resultsList: document.getElementById('results-list'),
  resultsCount: document.getElementById('results-count'),
  downloadAllBtn: document.getElementById('download-all-btn'),
  toasts: document.getElementById('toasts')
};


function fmtBytes(b) {
  if (!b) return '0 B';
  const k=1024, s=['B','KB','MB','GB'], i=Math.floor(Math.log(b)/Math.log(k));
  return (b/Math.pow(k,i)).toFixed(i?1:0)+' '+s[i];
}
function fmtDur(s) {
  if (!s||!isFinite(s)) return '--:--';
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=Math.floor(s%60);
  if(h) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}
function uid() { return `v_${++S.idCounter}_${Date.now()}`; }

function getVideoDuration(file) {
  return new Promise(res => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { res(v.duration); URL.revokeObjectURL(url); };
    v.onerror = () => { res(null); URL.revokeObjectURL(url); };
    v.src = url;
  });
}

function loadImgFromFile(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function toast(msg, type='info') {
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = icons[type] + `<span>${msg}</span>`;
  E.toasts.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 3500);
}


E.tabs.forEach(t => t.addEventListener('click', () => {
  E.tabs.forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  E.modeUpload.classList.toggle('active', t.dataset.mode === 'upload');
  E.modeCreate.classList.toggle('active', t.dataset.mode === 'create');
}));


if (typeof SharedArrayBuffer === 'undefined') E.warnBar.classList.remove('hidden');


setupDrop(E.frameDrop, files => { if (files[0]) handleFrameFile(files[0]); });
E.frameInput.addEventListener('change', e => { if (e.target.files[0]) handleFrameFile(e.target.files[0]); });
E.removeFrame.addEventListener('click', resetFrame);

async function handleFrameFile(file) {
  if (!file.type.includes('png')) { toast('A moldura deve ser PNG', 'error'); return; }
  S.frameFile = file;
  E.frameMeta.textContent = `${file.name}  •  ${fmtBytes(file.size)}`;
  try {
    const img = await loadImgFromFile(file);
    S.frameImg = img;
    S.frameInfo = analyzeFrame(img);
    clampFI();
    await refreshHolePreview();
    syncCoords();
    E.frameBlock.classList.add('visible');
    E.frameDrop.classList.add('hidden');
    toast(`Moldura: ${S.frameInfo.frameWidth}×${S.frameInfo.frameHeight}px`, 'success');
  } catch(err) { toast('Erro ao carregar moldura', 'error'); }
  updateProcessBtn();
}

function resetFrame() {
  S.frameFile = S.frameImg = S.frameInfo = null;
  if (S.frameHoleUrl) { URL.revokeObjectURL(S.frameHoleUrl); S.frameHoleUrl = null; }
  E.frameInput.value = '';
  E.frameImg.src = '';
  E.frameBlock.classList.remove('visible');
  E.frameDrop.classList.remove('hidden');
  updateProcessBtn();
}


function analyzeFrame(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0,0,c.width,c.height).data;
  let minX=c.width, maxX=0, minY=c.height, maxY=0, hasT=false;
  for (let y=0;y<c.height;y++) for (let x=0;x<c.width;x++) {
    if (d[(y*c.width+x)*4+3] < 10) {
      hasT=true; minX=Math.min(minX,x); maxX=Math.max(maxX,x);
      minY=Math.min(minY,y); maxY=Math.max(maxY,y);
    }
  }
  if (!hasT||minX>=maxX||minY>=maxY) {
    const m=0.1;
    return { frameWidth:c.width, frameHeight:c.height,
      videoX:Math.floor(c.width*m), videoY:Math.floor(c.height*m),
      videoWidth:Math.floor(c.width*(1-2*m)), videoHeight:Math.floor(c.height*(1-2*m)) };
  }
  return { frameWidth:c.width, frameHeight:c.height,
    videoX:minX, videoY:minY, videoWidth:maxX-minX, videoHeight:maxY-minY };
}

function clampFI() {
  const f=S.frameInfo; if(!f) return;
  f.videoWidth=Math.max(4,Math.min(f.videoWidth,f.frameWidth));
  f.videoHeight=Math.max(4,Math.min(f.videoHeight,f.frameHeight));
  f.videoX=Math.max(0,Math.min(f.videoX,f.frameWidth-f.videoWidth));
  f.videoY=Math.max(0,Math.min(f.videoY,f.frameHeight-f.videoHeight));
}

function genHoleBlob(img, fi) {
  return new Promise((res,rej) => {
    const c=document.createElement('canvas');
    c.width=fi.frameWidth; c.height=fi.frameHeight;
    const ctx=c.getContext('2d');
    ctx.drawImage(img,0,0,fi.frameWidth,fi.frameHeight);
    ctx.clearRect(fi.videoX,fi.videoY,fi.videoWidth,fi.videoHeight);
    c.toBlob(b=>b?res(b):rej(new Error('toBlob failed')),'image/png');
  });
}

async function refreshHolePreview() {
  if (!S.frameImg||!S.frameInfo) return;
  const blob = await genHoleBlob(S.frameImg, S.frameInfo);
  const url = URL.createObjectURL(blob);
  if (S.frameHoleUrl) URL.revokeObjectURL(S.frameHoleUrl);
  S.frameHoleUrl = url;
  await new Promise(res => {
    E.frameImg.onload = () => { renderOverlay(); res(); };
    E.frameImg.src = url;
  });
}

function getScale() {
  const iw = E.frameImg.naturalWidth || S.frameInfo?.frameWidth || 1;
  const ih = E.frameImg.naturalHeight || S.frameInfo?.frameHeight || 1;
  return { sx: E.frameImg.clientWidth/iw, sy: E.frameImg.clientHeight/ih };
}

function renderOverlay() {
  const f=S.frameInfo; if(!f) return;
  const {sx,sy}=getScale();
  const o=E.areaOverlay;
  o.style.left=`${f.videoX*sx}px`; o.style.top=`${f.videoY*sy}px`;
  o.style.width=`${f.videoWidth*sx}px`; o.style.height=`${f.videoHeight*sy}px`;
}

function syncCoords() {
  const f=S.frameInfo; if(!f) return;
  E.ax.value=Math.round(f.videoX); E.ay.value=Math.round(f.videoY);
  E.aw.value=Math.round(f.videoWidth); E.ah.value=Math.round(f.videoHeight);
}

function applyCoords() {
  const f=S.frameInfo; if(!f) return;
  let x=+E.ax.value||0, y=+E.ay.value||0, w=+E.aw.value||100, h=+E.ah.value||100;
  w=Math.max(4,Math.min(w,f.frameWidth)); h=Math.max(4,Math.min(h,f.frameHeight));
  x=Math.max(0,Math.min(x,f.frameWidth-w)); y=Math.max(0,Math.min(y,f.frameHeight-h));
  f.videoX=x; f.videoY=y; f.videoWidth=w; f.videoHeight=h;
  renderOverlay(); syncCoords();
}

[E.ax,E.ay,E.aw,E.ah].forEach(i=>i.addEventListener('change',()=>{applyCoords();refreshHolePreview();}));

E.autoDetect.addEventListener('click', async () => {
  if(!S.frameImg) return;
  S.frameInfo=analyzeFrame(S.frameImg); clampFI(); syncCoords();
  await refreshHolePreview(); toast('Área detectada automaticamente','success');
});

E.centerBtn.addEventListener('click', async () => {
  const f=S.frameInfo; if(!f) return;
  const m=0.15;
  f.videoX=Math.floor(f.frameWidth*m); f.videoY=Math.floor(f.frameHeight*m);
  f.videoWidth=Math.floor(f.frameWidth*(1-2*m)); f.videoHeight=Math.floor(f.frameHeight*(1-2*m));
  syncCoords(); await refreshHolePreview();
});

window.addEventListener('resize', ()=>{ if(S.frameInfo) renderOverlay(); });


(function setupOverlayDrag() {
  const o=E.areaOverlay;
  let mode=null, pid=null, sx,sy, startF={};

  function down(e,m) {
    if(!S.frameInfo) return;
    e.preventDefault();
    mode=m; pid=e.pointerId;
    sx=e.clientX; sy=e.clientY;
    const f=S.frameInfo;
    startF={x:f.videoX,y:f.videoY,w:f.videoWidth,h:f.videoHeight};
    o.setPointerCapture(pid);
  }

  o.addEventListener('pointerdown', e=>{ if(!e.target.classList.contains('area-handle')) down(e,'move'); });
  o.querySelectorAll('.area-handle').forEach(h=>h.addEventListener('pointerdown',e=>{e.stopPropagation();down(e,h.dataset.h);}));

  o.addEventListener('pointermove', e=>{
    if(!mode) return; e.preventDefault();
    const {sx:scX,sy:scY}=getScale();
    const dx=(e.clientX-sx)/scX, dy=(e.clientY-sy)/scY;
    const f=S.frameInfo; let {x,y,w,h}=startF;
    if(mode==='move'){x+=dx;y+=dy;}
    else{
      if(mode.includes('w')){x+=dx;w-=dx;}
      if(mode.includes('e')) w+=dx;
      if(mode.includes('n')){y+=dy;h-=dy;}
      if(mode.includes('s')) h+=dy;
    }
    w=Math.max(4,w); h=Math.max(4,h);
    x=Math.max(0,Math.min(x,f.frameWidth-w)); y=Math.max(0,Math.min(y,f.frameHeight-h));
    w=Math.min(w,f.frameWidth-x); h=Math.min(h,f.frameHeight-y);
    f.videoX=x;f.videoY=y;f.videoWidth=w;f.videoHeight=h;
    renderOverlay(); syncCoords();
  });

  o.addEventListener('pointerup', e=>{
    if(!mode) return;
    o.releasePointerCapture(pid);
    mode=null;
    refreshHolePreview();
  });
})();


function autoTextColor(bg) {
  if(!bg||bg==='transparent') return '#111111';
  let h=bg.replace('#','');
  if(h.length===3) h=h.split('').map(c=>c+c).join('');
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  return (0.299*r+0.587*g+0.114*b)/255 < 0.55 ? '#ffffff' : '#111111';
}

function effTextColor(t) {
  return (!t.textColorMode||t.textColorMode==='auto') ? autoTextColor(t.bg) : t.textColorMode;
}

function updatePreview() {
  const t=S.tmpl, s=PS;
  const tc=effTextColor(t);
  t.textColor=tc;

  E.prevBg.style.background = t.bg==='transparent'
    ? 'repeating-conic-gradient(#ccc 0% 25%,#fff 0% 50%) 50%/12px 12px'
    : t.bg;

  E.prevProfile.className = `preview-layer shape-${t.profileShape}`;
  E.prevProfile.style.cssText = `left:${t.profile.x*s}px;top:${t.profile.y*s}px;width:${t.profile.w*s}px;height:${t.profile.h*s}px;`;
  if(t.profileImg) E.prevProfileImg.src=t.profileImg.src;

  const us=Math.max(8,Math.round(t.usernameSize*s));
  E.prevUsername.innerHTML=(t.usernameText||'')+'';
  E.prevUsername.style.cssText=`left:${t.username.x*s}px;top:${t.username.y*s}px;color:${tc};font-size:${us}px;`;

  const cs=Math.max(8,Math.round(t.captionSize*s));
  E.prevCaption.textContent=t.captionText||'';
  E.prevCaption.style.cssText=`left:${t.caption.x*s}px;top:${t.caption.y*s}px;width:${t.caption.w*s}px;color:${tc};font-size:${cs}px;white-space:normal;`;

  E.prevVideo.style.cssText=`left:${t.video.x*s}px;top:${t.video.y*s}px;width:${t.video.w*s}px;height:${t.video.h*s}px;`;
  E.cvX.value=Math.round(t.video.x); E.cvY.value=Math.round(t.video.y);
  E.cvW.value=Math.round(t.video.w); E.cvH.value=Math.round(t.video.h);
}

E.cProfileInput.addEventListener('change', e=>{
  const f=e.target.files[0]; if(!f) return;
  const img=new Image(); img.onload=()=>{S.tmpl.profileImg=img;updatePreview();};
  img.src=URL.createObjectURL(f);
});
document.querySelectorAll('input[name=pshape]').forEach(r=>r.addEventListener('change',e=>{S.tmpl.profileShape=e.target.value;updatePreview();}));
E.cUsername.addEventListener('input',e=>{S.tmpl.usernameText=e.target.value;updatePreview();});
E.cCaption.addEventListener('input',e=>{S.tmpl.captionText=e.target.value;updatePreview();});
E.cBg.addEventListener('change',e=>{S.tmpl.bg=e.target.value;updatePreview();});
E.cTextColor.addEventListener('change',e=>{S.tmpl.textColorMode=e.target.value;updatePreview();});
[E.cvX,E.cvY,E.cvW,E.cvH].forEach(i=>i.addEventListener('change',()=>{
  S.tmpl.video.x=+E.cvX.value||0; S.tmpl.video.y=+E.cvY.value||0;
  S.tmpl.video.w=Math.max(50,+E.cvW.value||100); S.tmpl.video.h=Math.max(50,+E.cvH.value||100);
  updatePreview();
}));

E.resetTemplateBtn.addEventListener('click',()=>{
  S.tmpl=JSON.parse(JSON.stringify(DEF));
  E.cUsername.value=S.tmpl.usernameText;
  E.cCaption.value=S.tmpl.captionText;
  E.cBg.value=S.tmpl.bg;
  E.cTextColor.value='auto';
  document.querySelector('input[name=pshape][value=circle]').checked=true;
  updatePreview(); toast('Template resetado','info');
});

// Preview drag & resize for create mode
(function setupCreateDrag() {
  let mode=null,el=null,pid=null,sx,sy,sl,st,sw,sh;

  function pos(e) {
    const r=E.prevContainer.getBoundingClientRect();
    const cx=e.clientX??e.touches?.[0]?.clientX;
    const cy=e.clientY??e.touches?.[0]?.clientY;
    return {x:(cx-r.left)/PS,y:(cy-r.top)/PS};
  }

  E.prevContainer.addEventListener('pointerdown',e=>{
    const t=e.target;
    if(t.classList.contains('create-area-handle')){mode=t.dataset.handle;el='video';}
    else if(t.closest('.preview-layer')){mode='move';el=t.closest('.preview-layer').dataset.el;}
    else return;
    e.preventDefault();
    pid=e.pointerId;
    const p=pos(e); sx=p.x; sy=p.y;
    const d=S.tmpl[el]; sl=d.x; st=d.y; sw=d.w||0; sh=d.h||0;
    E.prevContainer.setPointerCapture(pid);
  });

  E.prevContainer.addEventListener('pointermove',e=>{
    if(!mode) return; e.preventDefault();
    const p=pos(e), dx=p.x-sx, dy=p.y-sy;
    const d=S.tmpl[el];
    if(mode==='move'){
      d.x=sl+dx; d.y=st+dy;
      if(el==='video'||el==='profile'){
        d.x=Math.max(0,Math.min(d.x,CW-(d.w||0)));
        d.y=Math.max(0,Math.min(d.y,CH-(d.h||0)));
      }
    } else {
      let nx=sl,ny=st,nw=sw,nh=sh;
      if(mode.includes('e')) nw=sw+dx;
      if(mode.includes('w')){nx=sl+dx;nw=sw-dx;}
      if(mode.includes('s')) nh=sh+dy;
      if(mode.includes('n')){ny=st+dy;nh=sh-dy;}
      nw=Math.max(50,nw); nh=Math.max(50,nh);
      nx=Math.max(0,Math.min(nx,CW-nw)); ny=Math.max(0,Math.min(ny,CH-nh));
      d.x=nx;d.y=ny;d.w=nw;d.h=nh;
    }
    updatePreview();
  });

  E.prevContainer.addEventListener('pointerup',e=>{
    if(mode){mode=null;E.prevContainer.releasePointerCapture(pid);}
  });
})();

async function generateMask() {
  const c=document.createElement('canvas');
  c.width=CW; c.height=CH;
  const ctx=c.getContext('2d');
  const t=S.tmpl;

  if(t.bg!=='transparent'){ctx.fillStyle=t.bg;ctx.fillRect(0,0,CW,CH);}

  // Foto de perfil
  if(t.profileImg){
    ctx.save();
    if(t.profileShape==='circle'){
      ctx.beginPath();
      ctx.arc(t.profile.x+t.profile.w/2,t.profile.y+t.profile.h/2,t.profile.w/2,0,Math.PI*2);
      ctx.clip();
    } else {
      ctx.beginPath(); ctx.roundRect(t.profile.x,t.profile.y,t.profile.w,t.profile.h,24); ctx.clip();
    }
    ctx.drawImage(t.profileImg,t.profile.x,t.profile.y,t.profile.w,t.profile.h);
    ctx.restore();
  } else {
    ctx.save();
    if(t.profileShape==='circle'){
      ctx.beginPath(); ctx.arc(t.profile.x+t.profile.w/2,t.profile.y+t.profile.h/2,t.profile.w/2,0,Math.PI*2); ctx.clip();
    }
    const g=ctx.createLinearGradient(t.profile.x,t.profile.y,t.profile.x+t.profile.w,t.profile.y+t.profile.h);
    g.addColorStop(0,'#6366f1'); g.addColorStop(1,'#06b6d4');
    ctx.fillStyle=g; ctx.fillRect(t.profile.x,t.profile.y,t.profile.w,t.profile.h);
    ctx.restore();
  }

  const tc=effTextColor(t);
  ctx.textBaseline='top';
  ctx.fillStyle=tc;
  ctx.font=`bold ${t.usernameSize||42}px ${t.usernameFont||'Inter,sans-serif'}`;
  const ustr=t.usernameText||'';
  ctx.fillText(ustr,t.username.x,t.username.y);
  const uw=ctx.measureText(ustr).width;
  ctx.fillStyle='#1d9bf0';
  ctx.font=`bold ${Math.round((t.usernameSize||42)*0.85)}px ${t.usernameFont||'Inter,sans-serif'}`;
  ctx.fillText('',t.username.x+uw+8,t.username.y+2);


  ctx.fillStyle=tc;
  ctx.font=`bold ${t.captionSize||48}px ${t.captionFont||'Inter,sans-serif'}`;
  const words=(t.captionText||'').split(' ');
  let line='',cy2=t.caption.y;
  const lh=Math.round((t.captionSize||48)*1.2);
  for(let i=0;i<words.length;i++){
    const test=line+words[i]+' ';
    if(ctx.measureText(test).width>t.caption.w&&i>0){
      ctx.fillText(line,t.caption.x,cy2); line=words[i]+' '; cy2+=lh;
    } else line=test;
  }
  ctx.fillText(line,t.caption.x,cy2);

  // Furo
  ctx.clearRect(t.video.x,t.video.y,t.video.w,t.video.h);

  return new Promise(res=>c.toBlob(b=>res(b),'image/png'));
}

E.finalizeBtn.addEventListener('click', async()=>{
  E.finalizeBtn.disabled=true;
  E.finalizeBtn.innerHTML='<span class="spinner"></span> Gerando...';
  try {
    const blob=await generateMask();
    S.frameFile=new File([blob],'moldura.png',{type:'image/png'});
    S.frameImg=await loadImgFromFile(S.frameFile);
    S.frameInfo={frameWidth:CW,frameHeight:CH,
      videoX:S.tmpl.video.x,videoY:S.tmpl.video.y,
      videoWidth:S.tmpl.video.w,videoHeight:S.tmpl.video.h};
    E.frameMeta.textContent=`moldura.png  •  ${fmtBytes(blob.size)}`;
    await refreshHolePreview();
    syncCoords();
    E.frameBlock.classList.add('visible');
    E.frameDrop.classList.add('hidden');

    E.tabs.forEach(t=>{t.classList.toggle('active',t.dataset.mode==='upload');});
    E.modeUpload.classList.add('active'); E.modeCreate.classList.remove('active');
    updateProcessBtn();
    toast('Moldura criada! Adicione os vídeos agora.','success');
  } catch(err){ console.error(err); toast('Erro ao gerar moldura','error'); }
  finally {
    E.finalizeBtn.disabled=false;
    E.finalizeBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Gerar moldura';
  }
});


setupDrop(E.videosDrop, files=>{
  handleVideoFiles(Array.from(files).filter(f=>f.type.startsWith('video/')));
});
E.videosInput.addEventListener('change', e=>{
  handleVideoFiles(Array.from(e.target.files));
  e.target.value='';
});

async function handleVideoFiles(files) {
  if(S.processing){toast('Aguarde o processamento atual','info');return;}
  let added=0;
  for(const f of files){
    if(!f.type.startsWith('video/')){toast(`"${f.name}" não é um vídeo`,'error');continue;}
    const dur=await getVideoDuration(f);
    const v={id:uid(),file:f,name:f.name,size:f.size,duration:dur,
      status:'waiting',progress:0,outputBlob:null,outputUrl:null};
    S.videos.push(v); renderVideoItem(v); added++;
  }
  updateQueueUI();
  if(added) toast(`${added} vídeo(s) adicionado(s)`,'success');
}

function renderVideoItem(v) {
  const li=document.createElement('li');
  li.className='video-entry'; li.dataset.id=v.id;
  const url=URL.createObjectURL(v.file);

  li.innerHTML=`
    <div class="video-thumb"><video src="${url}" muted playsinline preload="metadata"></video></div>
    <div class="video-info">
      <div class="video-name" title="${v.name}">${v.name}</div>
      <div class="video-meta">${fmtBytes(v.size)} • ${fmtDur(v.duration)}</div>
      <div class="video-bar"><div class="fill"></div></div>
    </div>
    <span class="status-badge waiting">Aguardando</span>
    <button class="btn-remove-icon" title="Remover">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;

  const vid=li.querySelector('video');
  vid.addEventListener('loadeddata',()=>{vid.currentTime=1;});

  li.querySelector('.btn-remove-icon').addEventListener('click',()=>removeVideo(v.id));
  E.queueList.appendChild(li);
}

function removeVideo(id) {
  if(S.processing){toast('Não é possível remover durante o processamento','info');return;}
  const i=S.videos.findIndex(v=>v.id===id);
  if(i<0) return;
  if(S.videos[i].outputUrl) URL.revokeObjectURL(S.videos[i].outputUrl);
  S.videos.splice(i,1);
  E.queueList.querySelector(`[data-id="${id}"]`)?.remove();
  updateQueueUI();
}

function updateQueueUI() {
  const n=S.videos.length;
  E.queueCount.textContent=n;
  E.queueSection.classList.toggle('hidden',n===0);
  updateProcessBtn();
}

E.clearBtn.addEventListener('click',()=>{
  if(S.processing){toast('Não é possível limpar durante o processamento','info');return;}
  S.videos.forEach(v=>{if(v.outputUrl)URL.revokeObjectURL(v.outputUrl);});
  S.videos=[]; E.queueList.innerHTML=''; updateQueueUI();
});

function updateProcessBtn() {
  E.processBtn.disabled=!(S.frameFile&&S.videos.length>0)||S.processing;
}


async function loadFFmpeg() {
  if(S.loaded) return;
  if(!window.FFmpeg) await loadScript(FFMPEG_SRC);
  const {createFFmpeg,fetchFile}=window.FFmpeg;
  S.ffmpeg=createFFmpeg({log:false,progress:p=>{
    const pct=Math.min(100,Math.max(0,p.ratio*100));
    const cur=S.videos.find(v=>v.status==='processing');
    if(cur){cur.progress=pct;updateVideoBar(cur.id,pct);}
  }});
  await S.ffmpeg.load();
  S.fetchFile=fetchFile; S.loaded=true;
  toast('FFmpeg carregado','success');
}


E.processBtn.addEventListener('click', async()=>{
  if(S.processing||!S.frameFile||!S.videos.length) return;
  try { await loadFFmpeg(); } catch(e){ toast('Erro ao carregar FFmpeg. Use Chrome/Edge via HTTPS.','error'); return; }

  let frameBlob=S.frameFile;
  if(S.frameImg&&S.frameInfo){
    try { frameBlob=await genHoleBlob(S.frameImg,S.frameInfo); }
    catch(e){ toast('Erro ao preparar moldura','error'); return; }
  }

  S.processing=true; updateProcessBtn();
  E.processLabel.textContent='Processando...';
  E.progressCard.classList.remove('hidden');
  E.resultsCard.classList.remove('hidden');
  E.resultsList.innerHTML='';
  E.downloadAllBtn.classList.add('hidden');
  setOverallProgress(0);

  let done=0;
  const total=S.videos.length;

  for(let i=0;i<total;i++){
    const v=S.videos[i];
    if(v.status==='completed'){done++;continue;}
    E.progressLabel.textContent=`Processando ${i+1} de ${total}: ${v.name}`;
    setVideoStatus(v.id,'processing');
    try {
      await processVideo(v,frameBlob);
      v.status='completed'; setVideoStatus(v.id,'done');
      addResultItem(v); done++;
      toast(`"${v.name}" processado!`,'success');
    } catch(e){
      console.error(e); v.status='error'; setVideoStatus(v.id,'error');
      toast(`Erro em "${v.name}"`,'error');
    }
    setOverallProgress((done/total)*100);
  }

  S.processing=false;
  E.processLabel.textContent='Aplicar moldura nos vídeos';
  E.progressLabel.textContent='Processamento concluído!';
  updateProcessBtn();

  const ok=S.videos.filter(v=>v.status==='completed').length;
  E.resultsCount.textContent=ok;
  if(ok>0) E.downloadAllBtn.classList.remove('hidden');
  toast('Processamento finalizado!','success');
});

async function processVideo(v, frameSource) {
  const ff=S.ffmpeg, fetch=S.fetchFile;
  const iname=`in_${v.id}.mp4`, fname=`fr_${v.id}.png`, oname=`out_${v.id}.mp4`;
  const fi=S.frameInfo;
  const dur=v.duration&&isFinite(v.duration)?v.duration:3600;

  await ff.FS('writeFile',iname,await fetch(v.file));
  await ff.FS('writeFile',fname,await fetch(frameSource||S.frameFile));

  let cmd;
  if(!fi) {
    cmd=['-i',iname,'-loop','1','-i',fname,'-t',String(dur),
      '-filter_complex','[1:v]format=rgba[fr];[0:v][fr]overlay=(W-w)/2:(H-h)/2:format=auto:eof_action=pass[out]',
      '-map','[out]','-map','0:a?','-c:a','copy',
      '-c:v','libx264','-preset','ultrafast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',oname];
  } else {
    cmd=['-i',iname,'-loop','1','-i',fname,'-t',String(dur),
      '-filter_complex',
      `[0:v]scale=${fi.videoWidth}:${fi.videoHeight}:force_original_aspect_ratio=decrease,`+
      `pad=${fi.videoWidth}:${fi.videoHeight}:(ow-iw)/2:(oh-ih)/2:black,`+
      `pad=${fi.frameWidth}:${fi.frameHeight}:${fi.videoX}:${fi.videoY}:black[vid];`+
      `[1:v]scale=${fi.frameWidth}:${fi.frameHeight},format=rgba[fr];`+
      `[vid][fr]overlay=0:0:format=auto:eof_action=pass[out]`,
      '-map','[out]','-map','0:a?','-c:a','copy',
      '-c:v','libx264','-preset','ultrafast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',oname];
  }

  await ff.run(...cmd);
  const data=ff.FS('readFile',oname);
  const blob=new Blob([data.buffer],{type:'video/mp4'});
  v.outputBlob=blob; v.outputUrl=URL.createObjectURL(blob);
  v.progress=100; updateVideoBar(v.id,100);
  try{ ff.FS('unlink',iname); ff.FS('unlink',fname); ff.FS('unlink',oname); }catch(e){}
}

function setOverallProgress(pct) {
  pct=Math.min(100,Math.max(0,pct));
  E.progressBar.style.width=`${pct}%`;
  E.progressPct.textContent=`${Math.round(pct)}%`;
  const d=S.videos.filter(v=>v.status==='completed'||v.status==='error').length;
  E.progressSub.textContent=`${d} de ${S.videos.length} concluídos`;
}

function updateVideoBar(id, pct) {
  const el=E.queueList.querySelector(`[data-id="${id}"] .fill`);
  if(el) el.style.width=`${pct}%`;
}

function setVideoStatus(id, s) {
  const el=E.queueList.querySelector(`[data-id="${id}"]`); if(!el) return;
  const b=el.querySelector('.status-badge'); if(!b) return;
  const labels={waiting:'Aguardando',processing:'Processando',done:'Pronto',error:'Erro'};
  b.className=`status-badge ${s}`;
  b.textContent=labels[s]||s;
}

function addResultItem(v) {
  const name=v.name.replace(/\.[^.]+$/,'')+'_moldura.mp4';
  const li=document.createElement('li'); li.className='result-entry';
  li.innerHTML=`
    <div class="result-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    </div>
    <div class="result-info">
      <div class="result-name" title="${name}">${name}</div>
      <div class="result-size">${fmtBytes(v.outputBlob.size)}</div>
    </div>`;
  const dl=document.createElement('button');
  dl.className='btn-download';
  dl.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Baixar';
  dl.addEventListener('click',()=>dlFile(v.outputUrl,name));
  li.appendChild(dl);
  E.resultsList.appendChild(li);
}

function dlFile(url,name) {
  const a=document.createElement('a'); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

E.downloadAllBtn.addEventListener('click', async()=>{
  const done=S.videos.filter(v=>v.status==='completed'&&v.outputBlob);
  if(!done.length) return;
  E.downloadAllBtn.disabled=true;
  const orig=E.downloadAllBtn.innerHTML;
  E.downloadAllBtn.innerHTML='<span class="spinner" style="border-color:currentColor;border-top-color:transparent;"></span> Gerando ZIP...';
  try {
    if(!window.JSZip) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    const zip=new JSZip(), used=new Set();
    for(const v of done){
      let n=v.name.replace(/\.[^.]+$/,'')+'_moldura.mp4',c=2;
      while(used.has(n)){n=v.name.replace(/\.[^.]+$/,'')+`_moldura_${c++}.mp4`;}
      used.add(n); zip.file(n,v.outputBlob);
    }
    const zb=await zip.generateAsync({type:'blob'});
    const zu=URL.createObjectURL(zb);
    dlFile(zu,`moldura-studio-${Date.now()}.zip`);
    setTimeout(()=>URL.revokeObjectURL(zu),60000);
    toast('ZIP gerado!','success');
  } catch(e){ toast('Erro ao gerar ZIP','error'); }
  finally { E.downloadAllBtn.disabled=false; E.downloadAllBtn.innerHTML=orig; }
});

function setupDrop(zone, onDrop) {
  ['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev,e=>{
    e.preventDefault(); e.stopPropagation(); zone.classList.add('over');
  }));
  ['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{
    e.preventDefault(); e.stopPropagation(); zone.classList.remove('over');
  }));
  zone.addEventListener('drop',e=>{
    if(e.dataTransfer?.files?.length) onDrop(Array.from(e.dataTransfer.files));
  });
}

updatePreview();
updateProcessBtn();
