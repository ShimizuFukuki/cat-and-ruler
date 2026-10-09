/* Physical book/drawer handoff to the complete archive reader. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s),names=['下层','中层','上层'];
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 let collection=[],page=0,request=0,lastFocus=null,activeDrawer=null,contextRevision=null,viewerFromTray=false;
 const tray=el('dialog','drawer-tray');tray.id='drawer-tray';tray.setAttribute('aria-labelledby','tray-title');
 tray.innerHTML='<div class="tray-rim"><header><div><span class="tray-kicker">作品</span><h2 id="tray-title"></h2></div><button class="tray-close" aria-label="收回抽屉">收回抽屉 <span aria-hidden="true">×</span></button></header><div class="tray-scroll"><div class="tray-grid"></div></div><footer><button class="tray-more">全部作品 ↗</button><nav aria-label="抽屉翻页"><button class="tray-prev" aria-label="上一页">←</button><span class="tray-count"></span><button class="tray-next" aria-label="下一页">→</button></nav></footer></div>';
 document.body.append(tray);
 const stillHere=()=>contextRevision===window.RoomScene?.navigationRevision;
 function restore(){setTimeout(()=>{
  if(document.querySelector('dialog[open]'))return;
  ++request;window.ArchiveReader?.cancelPendingWork?.();viewerFromTray=false;activeDrawer=null;window.RoomScene?.returnBook();window.RoomScene?.returnFromArt();
  if(lastFocus?.isConnected)lastFocus.focus?.();else $('#selection-body button')?.focus?.();
 },0);}
 async function prepare(){
  const status=$('.archive-load-status');let timer;
  if(status)timer=setTimeout(()=>{status.hidden=false;status.textContent='正在打开…';},450);
  try{const reader=await window.ArchiveLoader.ensure(),d=$('#archive-room'),art=$('#cabinet-view');
   if(!d.dataset.room){d.dataset.room='true';d.querySelector('.archive-home').ariaLabel='收起阅读，回到房间';d.addEventListener('close',()=>{viewerFromTray=false;restore();});art.addEventListener('close',restore);
    art.addEventListener('click',e=>{if(!viewerFromTray||!e.target.closest('.exhibit-back')||!stillHere())return;e.preventDefault();e.stopImmediatePropagation();art.close();showTray();},true);
   }return reader;
  }finally{clearTimeout(timer);if(status)status.hidden=true;}
 }
 async function open(kind,person='Ambrose',day='all',entry=null){
  const token=++request,revision=window.RoomScene?.navigationRevision;lastFocus=document.activeElement;viewerFromTray=false;
  try{const reader=await prepare();if(token!==request||revision!==window.RoomScene?.navigationRevision)return;reader.open(kind,person,{...(day==='all'?{}:{date:day}),...(entry==null?{}:{target:entry})});}
  catch{if(token===request&&revision===window.RoomScene?.navigationRevision)window.HerArchive.open(kind,person);}
 }
 function selectCollection(drawer,catalog){return catalog.projects.filter(p=>p.drawer===drawer);}
 function renderTray(){
  $('#tray-title').textContent=names[activeDrawer]+'抽屉';const grid=tray.querySelector('.tray-grid');grid.replaceChildren();
  const pages=Math.max(1,Math.ceil(collection.length/12));page=Math.min(page,pages-1);
  for(const w of collection.slice(page*12,page*12+12)){
   const card=el('button','tray-piece');card.setAttribute('aria-label',w.authors.join(' / ')+' · '+w.title);card.dataset.workId=String(w.id);
   const mount=el('div','tray-mount');
   if(w.cover){const img=el('img');img.src=window.HerMedia.image(w.cover);img.alt='';img.loading='lazy';img.decoding='async';mount.append(img);}
   else{const kind=w.media[0];mount.classList.add('tray-type-'+kind);mount.append(el('span','tray-mark',kind==='audio'?'♪':kind==='model'?'模型':kind==='web'?'↗':'文稿'));mount.append(el('span','tray-paper-title',w.title));}
   card.append(mount,el('span','tray-piece-title',w.title),el('small',null,w.authors.join(' / ')));
   card.onclick=async()=>{const token=++request,reader=await prepare();if(token!==request||!stillHere()||!tray.open)return;viewerFromTray=true;await reader.work(w.id);if(token===request&&stillHere()&&$('#cabinet-view')?.open)$('#cabinet-view .exhibit-back').textContent='← 回到'+names[activeDrawer]+'抽屉';};grid.append(card);
  }
  if(!collection.length)grid.append(el('p','tray-empty','这一格暂时没有可显示的作品。'));
  tray.querySelector('.tray-count').textContent=(page+1)+' / '+pages;tray.querySelector('.tray-prev').disabled=page===0;tray.querySelector('.tray-next').disabled=page>=pages-1;
 }
 function showTray(){viewerFromTray=false;renderTray();window.HerArchive.show(tray);tray.querySelector('.tray-close').focus();}
 async function art(drawer){
  if(!Number.isInteger(drawer)||drawer<0||drawer>2)return;
  const token=++request;contextRevision=window.RoomScene?.navigationRevision;lastFocus=document.activeElement;
  try{const reader=await prepare(),works=await reader.load('projects');if(token!==request||!stillHere())return;activeDrawer=drawer;collection=selectCollection(drawer,works);page=0;showTray();}
  catch{if(token===request&&stillHere())window.HerArchive.open('works','all');}
 }
 tray.querySelector('.tray-close').onclick=()=>tray.close();tray.addEventListener('close',restore);
 tray.querySelector('.tray-prev').onclick=()=>{if(page>0){page--;renderTray();tray.querySelector('.tray-scroll').scrollTop=0;}};
 tray.querySelector('.tray-next').onclick=()=>{if((page+1)*12<collection.length){page++;renderTray();tray.querySelector('.tray-scroll').scrollTop=0;}};
 tray.querySelector('.tray-more').onclick=()=>open('works','all');
 document.addEventListener('archive:work',()=>{if(viewerFromTray&&activeDrawer!==null&&stillHere())$('#cabinet-view .exhibit-back').textContent='← 回到'+names[activeDrawer]+'抽屉';});
 function cancelPending(){++request;window.ArchiveReader?.cancelPendingWork?.();}
 window.RoomReader={open,art,selectCollection,cancelPending};
 tray.addEventListener('click',e=>{if(e.target!==tray)return;const b=tray.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)tray.close();});
 function fallback(){
  document.body.classList.add('room-fallback','entered');$('#loading').hidden=true;$('#welcome').hidden=true;$('#selection').hidden=false;$('#selection-eyebrow').textContent='';$('#selection-title').textContent='阅读';const body=$('#selection-body');body.replaceChildren();
  for(const who of ['Ambrose','Judas'])for(const kind of ['diary','conversation']){const b=el('button',null,who+' · '+(kind==='diary'?'日记':'对话'));b.onclick=()=>open(kind,who);body.append(b);}
  const works=el('button',null,'作品');works.onclick=()=>open('works');body.append(works);
  document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>open(b.dataset.place==='cabinet'?'works':b.dataset.place==='desk'?'letters':'diary'));
 }
 if(!window.RoomScene){$('#sound').hidden=true;fallback();}document.addEventListener('room:unavailable',fallback);
})();

