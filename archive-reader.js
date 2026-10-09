/* A reading edition over immutable local records. Historical commands are only text. */
(()=>{
 'use strict';
 const legacy=window.HerArchive,asset=legacy.asset,el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const brandURL=new URL('cat-ruler.svg',(document.currentScript?.src||new URL('archive-reader.js',location.href))).href;
 const display=(file,large=false)=>window.HerMedia?.image(file,large)||(/^(?:file:|https?:)/.test(file)?file:asset(file));
 const dataRoot=new URL("assets/猫与尺-阅卷与藏品/data/",window.CatRulerRelease.root),pending=new Map();
 const load=name=>{
  if(window.ReadingArchive?.[name]!=null)return Promise.resolve(window.ReadingArchive[name]);if(pending.has(name))return pending.get(name);
  const usePacked=!!window.HerPacked&&!name.includes('/');
  const promise=new Promise((resolve,reject)=>{const s=el('script');s.src=new URL(usePacked?'packed/'+name+'.js':(name==='works'?'works-catalog':name)+'.js',dataRoot);
   s.onload=async()=>{s.remove();try{if(usePacked){window.ReadingArchive=window.ReadingArchive||{};window.ReadingArchive[name]=await window.HerPacked.unpack(window.HerPackedData[name]);delete window.HerPackedData[name];}const value=window.ReadingArchive?.[name];if(value==null)throw new Error('这一册没有完整读取，请重新打开。');resolve(value);}catch(e){pending.delete(name);reject(e);}};
   s.onerror=()=>{s.remove();pending.delete(name);reject(new Error('这一册暂时没有打开。请检查本地资料是否还在原处。'));};document.head.append(s);
  });pending.set(name,promise);return promise;
 };
 const clockFormat=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
 const clock=t=>clockFormat.format(new Date(t));
 // The archived dates are all in October 2026, in Shanghai (UTC+8).
 const day=t=>new Date(t+28800000).toISOString().slice(0,10);
 const dateLabel=d=>d==='all'?'全部':d==='undated'?'未定日期':`${Number(d.slice(5,7))} 月 ${Number(d.slice(8))} 日`;
 const labels={diary:'日记',conversation:'对话',letters:'来往',works:'藏品',references:'读过的页面'};
 let state={mode:'diary',person:'Ambrose',date:'all',page:0,query:'',layout:'folio',kind:'all',collection:'created'},revision=0,exhibitRevision=0,works=[],catalog=null,lastFocus=null,returnState=null,projectStop=null;
 const trail=[];let followingTrail=false;
 let readingNotes=null;
 function addReadingNotes(host,id){const entry=readingNotes?.entries?.[id];if(!entry)return;const note=window.ReadingAnnotations?.render(entry,{asset,display,open,work,person:state.person},host);if(note)host.append(note);}
 try{state.layout=localStorage.getItem('cat-reader-layout')||'folio';}catch{}
 const dialog=el('dialog','archive-room');dialog.id='archive-room';dialog.setAttribute('aria-labelledby','archive-heading');
 dialog.innerHTML=`<header class="archive-top"><button class="archive-home" aria-label="收起阅读，回到折页"><img src="${brandURL}" alt=""><span>猫与尺</span></button><nav class="archive-modes" aria-label="阅读目录">${Object.entries(labels).filter(([k])=>k!=='references').map(([k,v])=>`<button data-mode="${k}">${v}</button>`).join('')}</nav><div class="archive-tools"><button id="archive-layout" title="切换册页 / 案头排版">册页</button><button id="archive-size" aria-label="调节正文字号">字</button><button class="archive-exit" aria-label="收起阅读">收起 ×</button></div></header><div class="archive-shell"><aside class="archive-spine"><div class="archive-people"><button data-who="all" hidden>两人全部</button><button data-who="Ambrose">Ambrose</button><button data-who="Judas">Judas</button></div><div class="spine-caption">十月 · 二〇二六</div><nav id="archive-dates" aria-label="按日阅读"></nav><button id="archive-references">读过的页面 ↗</button><a id="archive-source" target="_blank" rel="noopener">原始档案 ↗</a></aside><main class="archive-main"><div class="archive-toolbar"><form id="archive-search-form"><label><span class="search-mark" aria-hidden="true">⌕</span><input type="search" id="archive-search" placeholder="在这一册查找" aria-label="查找这一册原文"></label><button type="submit">查找</button><button type="button" id="archive-clear" aria-label="清除查找">×</button></form><span id="archive-count" role="status" aria-live="polite"></span></div><div class="archive-scroll" tabindex="0"><div class="archive-heading"><span class="chapter-initial" aria-hidden="true">A</span><div><p id="archive-eyebrow"></p><h1 id="archive-heading"></h1><p id="archive-subtitle"></p></div></div><div id="archive-body"></div><nav id="archive-pages" aria-label="阅读分页"></nav><div class="archive-endmark" aria-hidden="true">·</div></div></main></div>`;
 document.body.append(dialog);
 const $=s=>dialog.querySelector(s),body=$('#archive-body'),scroll=$('.archive-scroll');
 const back=el('button','archive-return','↶ 返回上一处');back.hidden=true;$('.archive-tools').prepend(back);
 back.onclick=()=>{const previous=trail.pop();if(!previous)return;followingTrail=true;state={...previous};$('#archive-search').value=state.query;render({top:previous.top});followingTrail=false;back.hidden=!trail.length;};
 const exhibition=el('dialog','cabinet-view');exhibition.id='cabinet-view';exhibition.setAttribute('aria-labelledby','cabinet-title');
 exhibition.innerHTML='<header><button class="exhibit-back">← 收回抽屉</button><span id="cabinet-owner"></span><button class="exhibit-close" aria-label="关闭作品">×</button></header><div class="exhibit-scroll"><div class="exhibit-object"></div><aside class="exhibit-notes"><span class="exhibit-label">留下的东西</span><h2 id="cabinet-title"></h2><div id="exhibit-writing"></div><div id="exhibit-connections"></div><a id="exhibit-original" target="_blank" rel="noopener">打开原文件 ↗</a></aside></div>';
 document.body.append(exhibition);
 function close(d){d.close();if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');lastFocus?.focus?.({preventScroll:true});}
 function show(d){lastFocus=document.activeElement;for(const other of document.querySelectorAll('dialog[open]'))if(other!==d)other.close();if(!d.open)d.showModal();document.body.classList.add('modal-open');}
 for(const d of [dialog,exhibition])d.addEventListener('close',()=>{d.querySelectorAll('audio,video').forEach(m=>m.pause());if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');});
 $('.archive-home').onclick=$('.archive-exit').onclick=()=>{remember();close(dialog);};exhibition.querySelector('.exhibit-close').onclick=()=>close(exhibition);
 exhibition.querySelector('.exhibit-back').onclick=()=>{if(returnState){state={...returnState};show(dialog);render({top:returnState.top});}else close(exhibition);};
 function local(raw,folder=''){
  let s=String(raw||'');try{s=decodeURIComponent(s);}catch{}s=s.replace(/^file:\/*/i,'').replace(/^\/(?=[A-Za-z]:)/,'').replace(/\\+/g,'/');
  if((window.archivePaths||{})[s.toLowerCase()])return asset((window.archivePaths||{})[s.toLowerCase()]);
  if(/^https?:\/\//i.test(s))return s;
  if(/^[a-z][a-z\d+.-]*:/i.test(s)||s.startsWith('//'))return null;
  const base=new URL(asset(''));try{const u=new URL(s,new URL(folder,base));return u.href.startsWith(base.href)?u.href:null;}catch{return null;}
 }
 function markdown(text,folder=''){
  const n=el('div','archive-prose'),tpl=el('template');tpl.innerHTML=marked.parse(String(text||''),{breaks:false});
  const allowed=new Set('P BR STRONG EM B I DEL S H1 H2 H3 H4 H5 H6 BLOCKQUOTE UL OL LI PRE CODE HR TABLE THEAD TBODY TR TH TD A IMG SUP SUB'.split(' '));
  for(const a of [...tpl.content.querySelectorAll('*')]){
   if(!allowed.has(a.tagName)){a.remove();continue;}
   for(const at of [...a.attributes])if(!['href','src','alt','title','colspan','rowspan'].includes(at.name))a.removeAttribute(at.name);
   if(a.tagName==='A'){const u=local(a.getAttribute('href'),folder);if(u){a.href=u;a.target='_blank';a.rel='noopener noreferrer';}else a.removeAttribute('href');}
   if(a.tagName==='IMG'){const u=local(a.getAttribute('src'),folder);if(u?.startsWith(asset(''))&&/\.(wav|mp3|ogg|m4a|mp4|webm)(?:[?#]|$)/i.test(u)){const m=el(/\.(mp4|webm)(?:[?#]|$)/i.test(u)?'video':'audio');m.controls=true;m.preload='none';m.src=u;m.setAttribute('aria-label',a.alt||'原记录附件');m.addEventListener('play',()=>{document.getElementById('music')?.pause();body.querySelectorAll('audio,video').forEach(other=>{if(other!==m)other.pause();});});a.replaceWith(m);}else if(u?.startsWith(asset(''))){a.src=display(u);a.loading='lazy';a.decoding='async';a.onerror=()=>a.replaceWith(el('span','source-note','此图片未能读取。原引用保留在原文里。'));}else a.replaceWith(el('span','source-note','原记录的外部图片：'+(a.alt||'')));}
  }n.append(tpl.content);return n;
 }
 function sourceDetails(text,label='查看原文'){const d=el('details','source-details'),pre=el('pre');let filled=false;d.append(el('summary',null,label),pre);d.addEventListener('toggle',()=>{if(d.open&&!filled){pre.textContent=typeof text==='function'?text():text;filled=true;}});return d;}
 function safeLink(url,title){if(!/^https?:\/\//i.test(url))return null;let host;try{host=new URL(url).hostname;}catch{return null;}const a=el('a','reading-link',title||host);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function originalLink(row){const b=el('button','evidence-link',`对应记录 ${row.ordinal} ↗`);b.onclick=()=>open('conversation',state.person,{target:row.ordinal});return b;}
 function thumb(w,caption){const f=el('figure','reading-figure'),b=el('button','figure-open');b.setAttribute('aria-label','打开 '+w.title);const i=el('img');i.src=display(w.image||w.file);i.alt=w.title;i.loading='lazy';i.decoding='async';b.append(i);b.onclick=()=>work(w.id);f.append(b,el('figcaption',null,caption||w.title));return f;}
 function conversationText(text){
  // Display syntax from the export as its intended content, never as JSON/directives.
  return String(text).replace(/:::writing\{[^\n]*\}\s*\n/g,'').replace(/^:::\s*$/gm,'').replace(/visualize(.*?)/g,(_,value)=>{
   try{const path=JSON.parse(value).path,url=local(path);return url?'[打开这件作品](<'+path+'>)':'';}catch{return '';}
  });
 }
 function conversationMaterial(m){
  const n=el(m.kind==='image'?'figure':'div','conversation-material material-'+m.kind);n.dataset.ordinal=m.o;
  const w=m.work!=null?works[m.work]:null;
  if(m.kind==='link'){const a=safeLink(m.url,m.title);if(a)n.append(a);return n;}
  const url=asset(m.file);
  function opener(){if(w){const b=el('button','material-link',m.title+' ↗');b.onclick=()=>work(w.id);return b;}const a=el('a','material-link',m.title+' ↗');a.href=url;a.target='_blank';a.rel='noopener';return a;}
  if(m.kind==='image'){
   const control=opener(),image=el('img');control.textContent='';control.className='figure-open';control.setAttribute('aria-label','查看 '+m.title);
   image.src=display(m.file);image.alt=m.title;image.loading='lazy';image.decoding='async';control.append(image);n.append(control,el('figcaption',null,m.title));
  }else if(m.kind==='audio'||m.kind==='video'){
   const media=el(m.kind);media.controls=true;media.preload='none';media.src=window.HerMedia?.audio(m.file)||url;
   media.addEventListener('play',()=>{document.getElementById('music')?.pause();body.querySelectorAll('audio,video').forEach(other=>{if(other!==media)other.pause();});});
   n.append(media,opener());
  }else n.append(opener());
  return n;
 }
 function conversationTurn(group){
  const turn=el('article','record conversation-turn');turn.dataset.turn=group.o;
  const head=el('header','conversation-head');head.append(el('time',null,clock(group.t)),el('span','conversation-author',state.person));turn.append(head);
  let section=null,sectionPart=null;
  for(const entry of group.entries){
   const prose=markdown(conversationText(entry.text));prose.dataset.originalOrdinal=entry.o;
   const suppressed=new Set(readingNotes?.entries?.[entry.o]?.suppressOriginalMedia||[]),suppressedURLs=new Set([...suppressed].flatMap(file=>[asset(file),display(file)]));
   for(const image of prose.querySelectorAll('img,audio,video'))if(suppressedURLs.has(image.getAttribute('src')))image.replaceWith(el('span','source-note','同名附件后来被更新；当时的版本见下方批注，原引用保留在原文中。'));
   const block=el(entry.part==='prompt'?'details':'div',entry.part==='prompt'?'record-userMessage conversation-prompt':'conversation-passage');block.dataset.ordinal=entry.o;
   if(entry.part==='prompt'){block.append(el('summary',null,'人的话'),prose);turn.append(block);section=null;sectionPart=null;}
   else{
    if(sectionPart!==entry.part){
     const part=el('section','conversation-section conversation-'+entry.part),title=el('h2','conversation-section-title',entry.part==='thought'?'思考':'回答');
     title.id='conversation-'+group.o+'-'+entry.o;part.setAttribute('aria-labelledby',title.id);section=el('div','conversation-section-body');part.append(title,section);turn.append(part);sectionPart=entry.part;
    }
    block.append(prose);section.append(block);
   }
   const attached=el('div','conversation-materials'),inline=new Set();
   prose.querySelectorAll('[href],[src]').forEach(n=>{for(const key of ['href','src']){const v=n.getAttribute(key);if(v)inline.add(v);}});
   for(const m of entry.materials){
    if(suppressed.has(m.file))continue;
    const url=m.file?asset(m.file):m.url;
    if(inline.has(url)||m.file&&inline.has(display(m.file)))continue;
    const material=conversationMaterial(m);if(material.childElementCount)attached.append(material);
   }
   if(attached.childElementCount)block.append(attached);
   addReadingNotes(block,entry.o);
  }
  return turn;
 }
 function conversationMatch(group,query){
  return group.entries.some(e=>e.text.toLocaleLowerCase().includes(query)||e.materials.some(m=>m.title.toLocaleLowerCase().includes(query)));
 }
 function conversationTarget(rows,ordinal){
  return rows.find(r=>r.o<=ordinal&&r.end>=ordinal)||rows.find(r=>r.o>=ordinal)||rows.at(-1);
 }
 function remember(){if(!dialog.open)return;try{localStorage.setItem('cat-reader-'+state.person+'-'+state.mode,JSON.stringify({...state,conversationEdition:1,top:scroll.scrollTop}));}catch{}}
 function frame(){
  dialog.dataset.layout=state.layout;dialog.dataset.person=state.person;dialog.dataset.mode=state.mode;
  $('.chapter-initial').textContent=state.mode==='letters'||state.person==='all'?'A J':state.person[0];
  $('#archive-eyebrow').textContent=labels[state.mode]+' / '+(state.date==='all'?'二〇二六 · 十月':dateLabel(state.date));
  $('#archive-heading').textContent=state.mode==='letters'?'两人之间':state.mode==='works'?'藏品':state.mode==='references'?'读过的页面':state.person;
  $('#archive-subtitle').textContent=state.mode==='conversation'?'思考与回答，按当时的次序。':state.mode==='letters'?'纸条按原有编号排列。':state.mode==='works'?'作品与它们的不同版本。':state.mode==='references'?'原日记中的引用单独收在这里。':state.person==='Ambrose'?'按原文次序与对话时间分日；原段落保持完整。':'原日记，按日期翻阅。';
  dialog.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.mode===state.mode)));
  dialog.querySelectorAll('[data-who]').forEach(b=>{b.setAttribute('aria-current',String(b.dataset.who===state.person));b.hidden=state.mode==='letters'||b.dataset.who==='all'&&state.mode!=='works';});
  $('#archive-layout').textContent=state.layout==='folio'?'册页 / 换为案头':'案头 / 换为册页';
  $('#archive-search').placeholder=state.mode==='conversation'?'查找思考与回答':state.mode==='works'?'查找作品、作者或版本':'在这一册查找';
  $('#archive-search').setAttribute('aria-label',$('#archive-search').placeholder);
  $('#archive-references').textContent=state.mode==='references'?'回到日记 ↗':'读过的页面 ↗';
  $('#archive-references').hidden=!['diary','references'].includes(state.mode);
  $('#archive-source').textContent='阅读版原文 ↗';$('#archive-source').href=new URL('texts/'+(state.mode==='letters'?'letters':state.person+'-'+(state.mode==='conversation'?'conversation':'diary'))+'.md',window.CatRulerRelease.root).href;
 }
 function dates(values){const n=$('#archive-dates');n.replaceChildren();for(const d of ['all',...new Set(values.filter(Boolean))].filter((x,i,a)=>a.indexOf(x)===i)){const b=el('button',state.date===d?'selected':'',dateLabel(d));b.onclick=()=>{remember();state.date=d;state.page=0;render();};n.append(b);}}
 function pages(total,size){const max=Math.max(1,Math.ceil(total/size)),n=$('#archive-pages');n.replaceChildren();if(max<=1)return;const prev=el('button',null,'← 前一页'),next=el('button',null,'继续读 →'),sel=el('select');sel.setAttribute('aria-label','跳至阅读页');for(let i=0;i<max;i++){const o=el('option',null,`${i+1} / ${max}`);o.value=i;sel.append(o);}sel.value=state.page;prev.disabled=state.page===0;next.disabled=state.page>=max-1;prev.onclick=()=>{state.page--;render();};next.onclick=()=>{state.page++;render();};sel.onchange=()=>{state.page=Number(sel.value);render();};n.append(prev,sel,next);}
 function sharedWork(w){return /^Judas 与 Ambrose\/(?:合写|一起玩)\//.test(w.file);}
 function diaryPlates(p){if(!p.figures?.length)return null;const shown=new Set((readingNotes?.entries?.[p.id]?.notes||[]).flatMap(n=>(n.media||[]).filter(m=>m.origin==='archive').map(m=>m.file)));const plates=el('div','diary-plates');for(const f of p.figures){const w=works[f.work];if(w&&!shown.has(w.image||w.file))plates.append(thumb(w,f.caption));}plates.classList.toggle('plate-pair',plates.childElementCount>1);return plates.childElementCount?plates:null;}
 function annotation(p){const aside=el('aside','paragraph-margin');if(readingNotes){if(p.evidence)aside.append(originalLink(p.evidence));return aside;}const images=(p.works||[]).map(id=>works[id]).filter(w=>w&&(w.kind==='image'||w.image));if(images.length&&!p.figures?.length)aside.append(thumb(images[0],'相关作品 · '+images[0].title));
  if(p.works.length){const more=el('details','margin-fold');more.append(el('summary',null,'相关作品 · '+p.works.length));for(const id of p.works){const b=el('button','material-link',works[id].title);b.onclick=()=>work(id);more.append(b);}aside.append(more);}
  for(const ref of p.references||[]){const a=safeLink(ref.url,ref.title);if(a){a.title='日记引用中保存的链接';aside.append(a);}}
  for(const link of p.links||[]){const a=safeLink(link);if(a)aside.append(a);}
  if(p.evidence){const b=originalLink(p.evidence);b.title='这段原文在保存记录中的位置；不等于所述事件发生的准确时刻。';aside.append(b);}return aside;
 }
 async function render(options={}){
  const ticket=++revision;frame();body.replaceChildren(el('p','archive-loading','正在展开……'));body.setAttribute('aria-busy','true');$('#archive-pages').replaceChildren();
  try{
   works=await load('works');let rows,size=24;
   if(state.mode==='diary'||state.mode==='references'){
    const all=await load(state.person+'-diary');if(ticket!==revision)return;rows=all.filter(p=>p.reference===(state.mode==='references'));dates(rows.map(p=>p.day));
   }else if(state.mode==='conversation'){rows=await load(state.person+'-conversation');if(ticket!==revision)return;dates(rows.map(r=>r.day));size=8;
   }else if(state.mode==='letters'){rows=await load('letters');if(ticket!==revision)return;dates(rows.map(r=>r.head.match(/2026-10-\d\d/)?.[0]));size=14;
   }else{catalog=await load('projects');if(ticket!==revision)return;rows=catalog.projects.filter(p=>state.person==='all'||p.authors.includes(state.person));dates([]);size=12;}
   if(ticket!==revision)return;
   const unfiltered=rows;
   readingNotes=null;
   let annotationError=false;
   if(['diary','references','conversation','letters'].includes(state.mode)){
    const name='annotations-'+(state.mode==='letters'?'letters':state.person+'-'+(state.mode==='references'?'diary':state.mode));
    try{const notes=await load(name);if(ticket!==revision)return;readingNotes=notes;}catch{if(ticket!==revision)return;annotationError=true;}
   }
   if(options.find){const r=rows.find(r=>state.mode==='conversation'?conversationMatch(r,options.find.toLocaleLowerCase()):r.text?.includes(options.find));if(r){state.date='all';options.target=state.mode==='conversation'?r.entries.find(e=>e.text.includes(options.find))?.o||r.entries[0].o:r.id;}}
   const requestedTurn=state.mode==='conversation'&&options.target!=null?conversationTarget(rows,Number(options.target)):null;
   rows=rows.filter(r=>(state.date==='all'||(state.mode==='letters'?r.head.match(/2026-10-\d\d/)?.[0]:r.day)===state.date)&&(!state.query||(state.mode==='conversation'?conversationMatch(r,state.query.toLocaleLowerCase()):[r.text,r.title,r.head,r.label,...(state.mode==='works'?[r.description,r.authors.join(' '),...r.assets.map(k=>catalog.assets[k].title)]:[])].filter(Boolean).join(' ').toLocaleLowerCase().includes(state.query.toLocaleLowerCase()))));
   if(state.mode==='works'&&state.kind!=='all')rows=rows.filter(p=>p.media.includes(state.kind));
   if(options.target!=null){const idx=rows.findIndex(r=>state.mode==='conversation'?r===requestedTurn:r.id===Number(options.target));if(idx>=0)state.page=Math.floor(idx/size);}
   state.page=Math.max(0,Math.min(state.page,Math.max(0,Math.ceil(rows.length/size)-1)));const visible=rows.slice(state.page*size,(state.page+1)*size);
   body.replaceChildren();$('#archive-count').textContent=`${rows.length} ${state.mode==='works'?'件作品':state.mode==='conversation'?'段对话':state.mode==='diary'||state.mode==='references'?'段':'条'}`;
   if(annotationError)body.append(el('p','annotation-unavailable','这页的补充资料暂未打开，原文仍可阅读。重新打开这一册可重试。'));
   if(state.mode==='works')renderCabinet(visible);
   else if(state.mode==='conversation'){
    for(const group of visible)body.append(conversationTurn(group));
   }else if(state.mode==='letters')for(const r of visible){const n=el('article','correspondence '+r.person.toLowerCase());n.dataset.record=r.id;const h=el('header');h.append(el('span','letter-initial',r.person[0]),el('h2',null,r.person),el('span','letter-to','致 '+(r.person==='Ambrose'?'Judas':'Ambrose')));n.append(h,el('p','letter-date',r.head),markdown(r.text,'Judas 与 Ambrose/'),sourceDetails(r.text));const rw=works.filter(w=>w.record===r.id);for(const w of rw.filter(w=>![...n.querySelectorAll('img')].some(i=>i.getAttribute('src')===display(w.image||w.file))))n.append(w.kind==='image'||w.image?thumb(w):(()=>{const b=el('button','material-link',w.title+' ↗');b.onclick=()=>work(w.id);return b;})());addReadingNotes(n,r.id);body.append(n);}
   else {let previousDay=null;for(const r of visible){if(state.mode==='diary'&&r.day!==previousDay){const h=el('h2','diary-day-heading',dateLabel(r.day));body.append(h);previousDay=r.day;}const n=el('article','diary-sheet');n.dataset.record=r.id;const main=el('div','paragraph-main');if(state.mode==='diary'){const text=el('div','diary-original',r.text);if(/^[\s\d年月日:：.\-\ufeff]+$/.test(r.text)&&r.text.trim().length<32)n.classList.add('diary-time');main.append(text);}else main.append(markdown(r.text));addReadingNotes(main,r.id);const source=sourceDetails(r.text,'原文与分日依据');source.append(el('p','source-note',r.dateBasis||'日期来自原日记文件。'));if(r.evidence)source.append(el('p','source-note','原文见于记录 '+r.evidence.ordinal+' · '+clock(r.evidence.time)));main.append(source);n.append(main,annotation(r));if(state.mode==='diary'){const plates=diaryPlates(r);if(plates)n.append(plates);}body.append(n);}}
   if(!rows.length)body.append(el('p','archive-empty',state.mode==='works'?'没有找到这件作品。可以清除查找，或换一种媒介。':'这一处没有找到。可以清除查找，或换一个日期。'));
   pages(rows.length,size);body.removeAttribute('aria-busy');scroll.scrollTop=options.top||0;
   if(options.target!=null){const key=state.mode==='conversation'?'ordinal':'record';let target=body.querySelector(`[data-${key}="${Number(options.target)}"]`);
    if(!target&&requestedTurn){const entry=requestedTurn.entries.filter(e=>e.o<=Number(options.target)).at(-1)||requestedTurn.entries[0];target=body.querySelector(`[data-ordinal="${entry.o}"]`);}
    if(target){let d=target.closest('details');if(d)d.open=true;target.classList.add('found-record');target.scrollIntoView({block:'center',behavior:'instant'});}}
   remember();
  }catch(e){if(ticket!==revision)return;body.removeAttribute('aria-busy');body.replaceChildren(el('p','archive-empty',e.message));const b=el('button',null,'重新打开');b.onclick=()=>render(options);body.append(b);}
 }
 function renderCabinet(rows){
  const filter=el('nav','project-filters');filter.setAttribute('aria-label','按作品媒介筛选');
  for(const [key,name] of Object.entries(window.ProjectCollection.filters)){
   const button=el('button',null,name);button.setAttribute('aria-pressed',String(state.kind===key));button.dataset.medium=key;
   button.onclick=()=>{state.kind=key;state.page=0;render();};filter.append(button);
  }
  body.append(filter);const grid=el('div','project-grid');
  for(const p of rows)grid.append(window.ProjectCollection.card(p,{display,open:work}));body.append(grid);
 }
 async function work(id){
  const ticket=++exhibitRevision;projectStop?.();projectStop=null;
  try{
   catalog=await load('projects');if(ticket!==exhibitRevision)return;
   const route=typeof id==='number'?catalog.routes[id]:{project:id},p=route&&catalog.projects.find(p=>p.id===route.project);
   if(!p){await legacyWork(id);return;}
   if(dialog.open)returnState={...state,top:scroll.scrollTop};else if(!exhibition.open)returnState=null;
   exhibition.classList.add('project-exhibition');exhibition.dataset.project=p.id;
   for(const selector of ['.exhibit-object','#exhibit-writing','#exhibit-connections'])exhibition.querySelector(selector).replaceChildren();
   exhibition.querySelector('#cabinet-title').textContent=p.title;exhibition.querySelector('#cabinet-owner').textContent=p.authors.join(' / ');
   exhibition.querySelector('.exhibit-label').textContent=p.media.map(m=>catalog.labels[m]).join(' · ');
   exhibition.querySelector('.exhibit-back').textContent=returnState?(returnState.mode==='works'?'← 返回藏品':'← 返回阅读'):'← 收起';
   show(exhibition);exhibition.querySelector('.exhibit-scroll').scrollTop=0;
   projectStop=window.ProjectCollection.exhibit(p,catalog,{root:exhibition,display,asset,load,markdown,open:work,valid:()=>ticket===exhibitRevision&&exhibition.open,initial:route.asset});
   document.dispatchEvent(new CustomEvent('archive:work',{detail:{id,project:p.id}}));
  }catch(error){if(ticket!==exhibitRevision)return;show(dialog);body.replaceChildren(el('p','archive-empty',error.message));const retry=el('button',null,'重新打开');retry.onclick=()=>work(id);body.append(retry);}
 }
 async function legacyWork(id){
  exhibition.classList.remove('project-exhibition');delete exhibition.dataset.project;

  const ticket=++exhibitRevision;
  try{works=await load('works');if(ticket!==exhibitRevision)return;const w=works[id];if(!w)return;if(dialog.open)returnState={...state,top:scroll.scrollTop};else if(!exhibition.open)returnState=null;
   const obj=exhibition.querySelector('.exhibit-object'),writing=exhibition.querySelector('#exhibit-writing'),connections=exhibition.querySelector('#exhibit-connections');obj.querySelectorAll('audio,video').forEach(m=>m.pause());obj.replaceChildren();writing.replaceChildren();connections.replaceChildren();
   const shared=sharedWork(w);exhibition.querySelector('#cabinet-title').textContent=w.title;exhibition.querySelector('#cabinet-owner').textContent=shared?'Ambrose / Judas':w.person+(w.collection==='原作'?'':' · 留存');exhibition.querySelector('#exhibit-original').href=asset(w.file);exhibition.querySelector('.exhibit-label').textContent=shared?(w.file.includes('/一起玩/')?'一起玩':'合写'):w.collection||'留下的东西';
   exhibition.querySelector('.exhibit-back').textContent=returnState?'← 回到刚才那一处':'← 收起';
   if(w.kind==='image'||w.image){const image=el('img');image.src=display(w.image||w.file,true);image.alt=w.title;image.decoding='async';obj.append(image);}
   if(w.kind==='audio'||w.kind==='video'){document.getElementById('music')?.pause();const media=el(w.kind==='audio'?'audio':'video');media.controls=true;media.preload='none';media.src=window.HerMedia?.audio(w.file)||asset(w.file);obj.append(media);if(w.kind==='audio')obj.prepend(el('div','sound-score','♪'));}
   if(w.kind==='text'){const text=w.textResource?await load(w.textResource):w.text;if(ticket!==exhibitRevision)return;const t=el('div','work-original',text);obj.append(t);}
   if(w.kind==='interactive'){obj.append(el('div','interactive-symbol','↗'),el('p',null,'这件作品保留在原来的网页文件里。'));const a=el('a','material-link','打开原作');a.href=asset(w.file);a.target='_blank';a.rel='noopener';obj.append(a);}
   if(['document','model','score'].includes(w.kind)){obj.append(el('div','source-object-mark',w.kind==='model'?'模型':w.kind==='score'?'谱':'文献'));const a=el('a','material-link','打开保存的 '+w.file.split('.').pop().toUpperCase()+' 文件 ↗');a.href=asset(w.file);a.target='_blank';a.rel='noopener';obj.append(a);}
   const person=w.person,diaries=await Promise.all(['Ambrose','Judas'].map(async who=>({who,paragraphs:await load(who+'-diary')})));if(ticket!==exhibitRevision)return;
   const mentions=diaries.flatMap(({who,paragraphs})=>paragraphs.filter(p=>!p.reference&&p.works.includes(w.id)).map(p=>({...p,who}))).sort((a,b)=>a.day.localeCompare(b.day)||a.id-b.id);
   function mention(p,parent){parent.append(el('blockquote',null,p.text));const b=el('button','evidence-link',p.who+' · '+dateLabel(p.day)+' · 读这一段 ↗');b.onclick=()=>open('diary',p.who,{target:p.id});parent.append(b);}
   if(mentions.length){writing.append(el('p','source-note','日记中的相关文字'));for(const p of mentions.slice(0,3))mention(p,writing);if(mentions.length>3){const more=el('details','exhibit-more');more.append(el('summary',null,'还有 '+(mentions.length-3)+' 处提及'));let loaded=false;more.addEventListener('toggle',()=>{if(more.open&&!loaded){loaded=true;for(const p of mentions.slice(3))mention(p,more);}});writing.append(more);}}
   else if(w.note)writing.append(el('p','source-note',w.note));
   if(w.record){const b=el('button','material-link','他们的留言 ↗');b.onclick=()=>open('letters',person,{target:w.record});connections.append(b);}
   if(w.evidence){const b=el('button','material-link','第一次提及此文件的记录 ↗');b.onclick=()=>open('conversation',w.evidence.person,{target:w.evidence.ordinal});connections.append(b);}
   if(w.related?.length){const related=el('details','exhibit-more');related.open=w.related.length<7;related.append(el('summary',null,'相关稿子与资料 · '+w.related.length));for(const rid of w.related){const b=el('button','related-work',works[rid].title);b.onclick=()=>work(rid);related.append(b);}connections.append(related);}
   show(exhibition);exhibition.querySelector('.exhibit-scroll').scrollTop=0;
   document.dispatchEvent(new CustomEvent('archive:work',{detail:{id:w.id}}));
  }catch(e){show(dialog);body.replaceChildren(el('p','archive-empty',e.message));}
 }
 function open(mode='diary',person='Ambrose',options={}){
  if(mode==='works'&&!options.filterAuthor)person='all';else if(mode!=='works'&&person==='all')person='Ambrose';
  ++exhibitRevision;
  if(!followingTrail&&(dialog.open||exhibition.open&&returnState)){const previous=dialog.open?{...state,top:scroll.scrollTop}:returnState;trail.push({...previous});if(trail.length>24)trail.shift();back.hidden=false;}
  remember();let saved;try{saved=JSON.parse(localStorage.getItem('cat-reader-'+person+'-'+mode));}catch{}
  const layout=state.layout;state={mode,person,date:'all',page:0,query:'',layout,kind:'all',collection:'created'};
  const compatiblePosition=mode!=='conversation'||saved?.conversationEdition===1;
  if(options.target==null&&!options.find&&!options.date&&saved)state={...state,date:saved.date||'all',page:compatiblePosition?saved.page||0:0,query:saved.query||'',kind:saved.kind||'all',collection:saved.collection||'created'};
  if(options.date){state.date=options.date;state.page=0;}
  if(mode==='works'){state.date='all';if(!window.ProjectCollection.filters[state.kind])state.kind='all';}
  $('#archive-search').value=state.query;show(dialog);render({...options,top:options.target==null&&!options.find&&!options.date&&compatiblePosition?saved?.top:0});
 }
 dialog.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>open(b.dataset.mode,state.person));dialog.querySelectorAll('[data-who]').forEach(b=>b.onclick=()=>open(state.mode,b.dataset.who,{filterAuthor:true}));
 $('#archive-references').onclick=()=>open(state.mode==='references'?'diary':'references',state.person);
 $('#archive-layout').onclick=()=>{state.layout=state.layout==='folio'?'desk':'folio';dialog.dataset.layout=state.layout;frame();try{localStorage.setItem('cat-reader-layout',state.layout);}catch{}};
 let font=19;try{font=Number(localStorage.getItem('cat-reader-font'))||19;}catch{}font=Math.max(17,Math.min(25,font));dialog.style.setProperty('--reader-font',font+'px');$('#archive-size').onclick=()=>{font=font>=23?19:font+2;dialog.style.setProperty('--reader-font',font+'px');$('#archive-size').textContent='字 '+font;try{localStorage.setItem('cat-reader-font',font);}catch{}};
 $('#archive-search-form').onsubmit=e=>{e.preventDefault();state.query=$('#archive-search').value.trim();state.page=0;state.date='all';if(state.mode==='works')state.collection='all';render();};$('#archive-clear').onclick=()=>{$('#archive-search').value='';state.query='';state.page=0;render();};
 let saveTimer;scroll.addEventListener('scroll',()=>{clearTimeout(saveTimer);saveTimer=setTimeout(remember,300);},{passive:true});dialog.addEventListener('cancel',remember);
 dialog.addEventListener('close',()=>{remember();revision++;});
 exhibition.addEventListener('close',()=>{exhibitRevision++;projectStop?.();projectStop=null;});
 // Capture only archive controls; homepage navigation, audio and folding remain untouched.
 document.addEventListener('click',e=>{const b=e.target.closest('[data-open],[data-letter],[data-work]');if(!b||b.closest('#archive-room,#cabinet-view'))return;e.preventDefault();e.stopImmediatePropagation();if(b.dataset.open)open(b.dataset.open,b.dataset.person||'Ambrose',{find:b.dataset.find});else if(b.dataset.letter)open('letters','Ambrose',{target:Number(b.dataset.letter)});else work(/^\d+$/.test(b.dataset.work)?Number(b.dataset.work):b.dataset.work);},true);
 window.HerArchive={...legacy,open,work,show};window.ArchiveReader={open,work,cancelPendingWork:()=>{exhibitRevision++;},state:()=>({...state}),load,local,render};
})();

