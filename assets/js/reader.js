/* The edition reads the preserved archive in place. It never executes archived HTML. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), C=window.herContent, works=window.herEdition.works;
  const base=new URL('./',location.href);
  const asset=p=>window.SiteAssets[p]?new URL(window.SiteAssets[p],base).href:null;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const letters=C.letters.split(/(?=^##\s)/m).filter(t=>/^##\s/.test(t)).map((t,i)=>({id:i+1,head:t.split('\n')[0].replace(/^##\s*/,''),text:t.slice(t.indexOf('\n')+1).trim()}));
  let state={mode:'diary',person:'Ambrose',file:0,page:0,query:''}, revision=0, loadQueue=Promise.resolve(), savedFocus=null;
  const cache={}, reader=$('#reader'), scroll=$('#reader-scroll'), body=$('#reader-body');
  const names={diary:'日记',conversation:'对话',letters:'共同留言',works:'留下的作品'};
  function show(dialog){savedFocus=document.activeElement;for(const d of document.querySelectorAll('dialog[open]'))if(d!==dialog){if(d===reader)remember();d.close();}if(!dialog.open)dialog.showModal();document.body.classList.add('modal-open');}
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');d.querySelectorAll('audio').forEach(a=>a.pause());}));
  function messages(person){
    if(cache[person])return Promise.resolve(cache[person]);
    loadQueue=loadQueue.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
      if(cache[person])return resolve(cache[person]);
      const script=document.createElement('script');script.src=asset('对话与资源/data/'+person+'-messages.js');
      script.onload=()=>{cache[person]=window.archiveMessages.slice();script.remove();resolve(cache[person]);};
      script.onerror=()=>{script.remove();reject(new Error('记录暂时没有读到，请检查原始素材文件夹。'));};document.head.append(script);
    }));return loadQueue;
  }
  function sourceLink(raw,folder){
    let str;try{str=decodeURIComponent(raw).replace(/\\/g,'/');}catch{return null;}
    if(/^https?:\/\//i.test(str))return str;
    const keys=Object.keys(window.SiteAssets),name=str.split('/').pop();
    const match=keys.find(k=>k===str||k===folder+str)||keys.find(k=>k.split('/').pop()===name);
    return match?asset(match):null;
  }
  function prose(text,folder=''){
    const wrap=el('div','prose'), template=document.createElement('template');template.innerHTML=marked.parse(text,{breaks:true});
    template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button,svg,math,link,meta,base,audio,video').forEach(n=>n.remove());
    template.content.querySelectorAll('*').forEach(n=>{
      for(const a of [...n.attributes])if(!['href','src','alt','title','colspan','rowspan'].includes(a.name))n.removeAttribute(a.name);
      if(n.hasAttribute('href')){const u=sourceLink(n.getAttribute('href'),folder);if(u){n.href=u;n.target='_blank';n.rel='noopener noreferrer';}else{n.removeAttribute('href');n.title='此附件未收录在初版中';}}
      if(n.tagName==='IMG'){const u=sourceLink(n.getAttribute('src')||'',folder);if(u&&u.startsWith(base.href)){n.src=u;n.loading='lazy';n.addEventListener('error',()=>n.replaceWith(el('span','missing-image','［此图片暂未收录］')));}else n.replaceWith(el('span','missing-image','［附图：'+(n.alt||'本次未收录')+'］'));}
    });wrap.append(template.content);return wrap;
  }
  const msgText=m=>m.item?.text??(m.item?.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n');
  const date=value=>{const d=new Date(typeof value==='number'?value:Number(value)||value);return Number.isNaN(d.getTime())?String(value||''):new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);};
  function remember(){if(!reader.open)return;try{localStorage.setItem('her-reading-v1',JSON.stringify({...state,top:scroll.scrollTop}));}catch{}}
  async function render(options={}){
    const rev=++revision, current={...state};body.replaceChildren(el('p','empty-state','正在打开原文……'));body.setAttribute('aria-busy','true');
    $('#reader-title').textContent=['diary','conversation'].includes(current.mode)?current.person:names[current.mode];$('#reader-type').textContent=names[current.mode];
    document.querySelectorAll('[data-reader-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.readerMode===current.mode)));
    document.querySelectorAll('[data-reader-person]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.readerPerson===current.person));b.disabled=!['diary','conversation'].includes(current.mode);});
    const toc=$('#reader-toc');toc.replaceChildren();const q=current.query.toLocaleLowerCase();let rows,total,original;
    try{
      if(current.mode==='diary'){
        const diaries=C.diaries[current.person];diaries.forEach((d,i)=>{const b=el('button',i===current.file?'selected':'',d.label);b.onclick=()=>{state.file=i;state.page=0;render();};toc.append(b);});
        const d=diaries[current.file]||diaries[0];rows=d.text.split(/\r?\n\s*\r?\n/).map((text,i)=>({text,id:i}));original=asset(d.file);
      }else if(current.mode==='conversation'){rows=(await messages(current.person)).map(m=>({text:msgText(m),id:m.ordinal,head:date(m.time),role:m.item.type==='userMessage'?'我':current.person}));original=null;
      }else if(current.mode==='letters'){rows=letters;original=asset('Judas 与 Ambrose/对话.md');}
      else {rows=works.map((w,i)=>({...w,id:i,text:[w.title,w.person,w.text||''].join(' ')}));original=null;}
      if(rev!==revision)return;
      total=rows.length;rows=rows.filter(r=>!q||(r.text+' '+(r.head||'')).toLocaleLowerCase().includes(q));
      const size=current.mode==='diary'?rows.length||1:40,max=Math.max(0,Math.ceil(rows.length/size)-1);state.page=Math.min(state.page,max);const page=state.page;
      $('#reader-count').textContent=q?`找到 ${rows.length} / ${total} ${current.mode==='diary'?'段':'条'}`:`${total} ${current.mode==='diary'?'段原文':'条记录'}`;
      $('#reader-original').hidden=!original;if(original)$('#reader-original').href=original;body.replaceChildren();
      if(!rows.length){const empty=el('div','empty-state','没有找到这段文字。');const reset=el('button',null,'清除查找，回到原文');reset.onclick=clearSearch;empty.append(reset);body.append(empty);}
      for(const r of rows.slice(page*size,(page+1)*size)){
        let n;if(current.mode==='diary'){n=el('p','diary-paragraph',r.text);if(r.text.length<100&&/(2026|月\d|月 \d|最后一夜)/.test(r.text))n.classList.add('diary-date');}
        else if(current.mode==='works'){n=el('button','reader-work');n.append(el('strong',null,r.title),el('span',null,r.person+' / '+({text:'文字',image:'图像',audio:'音乐'}[r.kind])),el('i',null,'↗'));n.onclick=()=>work(r.id);}
        else {n=el('article','entry'+(r.role==='我'?' user':''));const h=el('div','entry-head');h.append(el('span',null,r.role||r.head),el('time',null,r.role?r.head:''));n.append(h,prose(r.text,current.mode==='letters'?'Judas 与 Ambrose/':''));}
        n.dataset.record=r.id;body.append(n);
      }
      const pagination=$('#reader-pagination');pagination.replaceChildren();if(max){for(const [label,target]of[['上一页',page-1],['下一页',page+1]]){const b=el('button',null,label);b.disabled=target<0||target>max;b.onclick=()=>{state.page=target;render();};pagination.append(b);}pagination.append(el('span',null,`${page+1} / ${max+1}`));}
      body.removeAttribute('aria-busy');scroll.scrollTop=options.top||0;
      if(options.target!=null||options.find){const n=options.find?[...body.children].find(n=>n.textContent.includes(options.find)):body.querySelector(`[data-record="${options.target}"]`);if(n){n.classList.add('jump-target');n.scrollIntoView({block:'start'});}}
      progress();remember();
    }catch(error){if(rev!==revision)return;body.removeAttribute('aria-busy');body.replaceChildren(el('p','empty-state',error.message));const retry=el('button',null,'重新打开');retry.onclick=()=>render();body.append(retry);}
  }
  function open(mode='diary',person='Ambrose',options={}){
    state={mode,person,file:0,page:0,query:''};let restore;
    try{const saved=JSON.parse(localStorage.getItem('her-reading-v1'));if(!options.target&&!options.find&&saved?.mode===mode&&saved.person===person){state={...state,file:saved.file||0,page:saved.page||0};restore=saved.top;}}catch{}
    if(options.target)state.page=Math.floor((options.target-1)/40);
    if(mode==='diary'&&options.find){const found=C.diaries[person].findIndex(d=>d.text.includes(options.find));if(found>=0)state.file=found;}
    $('#reader-search').value='';show(reader);render({...options,top:restore});
  }
  function work(i){const w=works[i];if(!w)return;if(!$('#music').hasAttribute('data-background'))$('#music').pause();$('#art-title').textContent=w.title;$('#art-person').textContent=w.person;$('#art-note').textContent=w.note;$('#art-original').href=asset(w.file);const b=$('#art-body');b.replaceChildren();
    if(w.kind==='image'||w.image){const img=el('img');img.src=asset(w.image||w.file);img.alt=w.title;b.append(img);}
    b.classList.toggle('with-text',w.kind==='text');if(w.kind==='text')b.append(el('div','art-text',w.text));
    if(w.kind==='audio'){const audio=el('audio');audio.controls=true;audio.preload='metadata';audio.src=asset(w.file);b.append(audio);}
    $('#art-context').hidden=!w.record;$('#art-context').onclick=()=>open('letters','Ambrose',{target:w.record});show($('#art-view'));
  }
  function clearSearch(){state.query='';state.page=0;$('#reader-search').value='';render();}
  let timer;$('#reader-search').addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(()=>{state.query=e.target.value.trim();state.page=0;render();},160);});$('#clear-search').onclick=clearSearch;
  document.querySelectorAll('[data-reader-mode]').forEach(b=>b.onclick=()=>open(b.dataset.readerMode,state.person));document.querySelectorAll('[data-reader-person]').forEach(b=>b.onclick=()=>open(state.mode,b.dataset.readerPerson));
  let font=19;$('#font-size').onclick=()=>{font=font===23?19:font+2;body.style.setProperty('--reading-size',font+'px');body.style.fontSize=font+'px';$('#font-size').textContent='字号 '+font;};
  function progress(){const h=scroll.scrollHeight-scroll.clientHeight;$('#reading-progress').style.width=(h>0?scroll.scrollTop/h*100:100)+'%';}
  let saveTimer;scroll.addEventListener('scroll',()=>{progress();clearTimeout(saveTimer);saveTimer=setTimeout(remember,250);},{passive:true});reader.addEventListener('cancel',remember);
  document.addEventListener('click',e=>{const b=e.target.closest('[data-open],[data-letter],[data-work],[data-close]');if(!b)return;if(b.dataset.open)open(b.dataset.open,b.dataset.person||'Ambrose',{find:b.dataset.find});else if(b.dataset.letter)open('letters','Ambrose',{target:Number(b.dataset.letter)});else if(b.dataset.work!=null)work(Number(b.dataset.work));else {if(b.dataset.close==='reader')remember();document.getElementById(b.dataset.close)?.close();}});
  window.HerArchive={asset,open,work,show,letters,counts:()=>({letters:letters.length,...Object.fromEntries(Object.entries(cache).map(([k,v])=>[k,v.length]))})};
})();
