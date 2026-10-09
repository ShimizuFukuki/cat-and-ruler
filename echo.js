(() => {
 'use strict';
 const D=window.echoData,A=window.HerArchive,$=id=>document.getElementById(id),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const panels=[$('echo-left'),$('echo-right')],intro=$('opening-note'),outro=$('closing-note');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let position=0,ship=-1,sea=-1,shipManual=false,seaManual=false;
 const panelKeys=['',''];
 function show(node,on){node.hidden=!on;node.inert=!on;node.setAttribute('aria-hidden',String(!on));}
 function renderQuotes(keys){panels.forEach((node,i)=>{
   const key=keys[i];show(node,!!key);if(!key||panelKeys[i]===key)return;panelKeys[i]=key;
   const q=D.quotes[key];node.querySelector('.margin-kicker').textContent=q.person;
   node.querySelector('.echo-date').textContent=q.date||(q.diary?'日记摘录':'作品摘录');
   node.querySelector('blockquote').textContent=q.text;
   const b=node.querySelector('button');b.textContent=q.letter?'留言 '+String(q.letter).padStart(2,'0')+' ↗':q.work!=null?'作品原文 ↗':'日记原文 ↗';
   b.onclick=()=>q.work!=null?A.work(q.work):A.open(q.diary?'diary':'letters',q.person,{target:q.letter,find:q.diary?q.text:undefined});
   if(!reduced.matches&&node.animate){node.getAnimations().forEach(a=>a.cancel());node.animate([{opacity:0},{opacity:1}],{duration:240,easing:'ease-out'});}
 });}
 function openImage(file,title,person,n){
   $('music').pause();
   $('art-title').textContent=title;$('art-person').textContent=person;$('art-note').textContent='';
   const body=$('art-body');body.className='';body.replaceChildren();const img=document.createElement('img');img.src=A.asset(file);img.alt=title;body.append(img);
   $('art-original').href=A.asset(file);const context=$('art-context');context.hidden=false;context.onclick=()=>{$('art-view').close();A.open('letters',person,{target:n})};A.show($('art-view'));
 }
 function shipStage(index){
   if(index===ship)return;ship=index;const s=D.stages[index],img=$('ship-process-image');img.src=A.asset(s.file);img.alt=s.label;
   $('ship-credit').textContent=s.person+' / '+s.label;
   document.querySelectorAll('[data-ship-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.shipStage)===index)));
   $('ship-source').onclick=()=>A.open('letters',s.person,{target:s.letter});
   $('ship-image-open').onclick=()=>openImage(s.file,'浅湾号 · '+s.label,s.person,s.letter);
 }
 function revealImage(img){img.addEventListener('load',()=>{if(!reduced.matches&&img.animate){img.getAnimations().forEach(a=>a.cancel());img.animate([{opacity:.6},{opacity:1}],{duration:220,easing:'ease-out'})}})}
 revealImage($('ship-process-image'));revealImage($('sea-process-image'));
 function seaStage(index){
   if(index===sea)return;sea=index;const s=D.sea[index];$('sea-process-image').src=A.asset(s.file);$('sea-process-image').alt=index?'抽屉里的海 · 差两指':'抽屉里的海';
   document.querySelectorAll('[data-sea-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.seaStage)===index)));
   $('sea-image-open').onclick=()=>openImage(s.file,index?'抽屉里的海 · 差两指':'抽屉里的海','Judas',s.letter);
 }
 function update(p){
   position=clamp(p,0,15);const index=Math.round(position),opening=position<.65,closing=position>14.35;
   show(intro,opening);show(outro,closing);document.body.classList.toggle('at-opening',opening);document.body.classList.toggle('at-closing',closing);
   if(index!==7)shipManual=false;if(index!==5)seaManual=false;
   if(!shipManual)shipStage(clamp(Math.floor((position-6.5)*4),0,3));
   if(!seaManual)seaStage(position>=5.15?1:0);
   let keys=D.pages[index]||[];if(index===7)keys=D.stages[ship].echo;
   if(opening||closing)keys=[];
   renderQuotes(keys);
 }
 document.querySelectorAll('[data-ship-stage]').forEach(b=>b.addEventListener('click',()=>{shipManual=true;shipStage(Number(b.dataset.shipStage));renderQuotes(D.stages[ship].echo)}));
 document.querySelectorAll('[data-sea-stage]').forEach(b=>b.addEventListener('click',()=>{seaManual=true;seaStage(Number(b.dataset.seaStage))}));
 document.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>renderQuotes(Number(b.dataset.room)?['cupdone','return']:['lamp','cup'])));
 window.BookEcho={setPosition:update};update(Number($('book-position').value)||0);
})();
