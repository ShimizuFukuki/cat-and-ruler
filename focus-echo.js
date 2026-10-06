(() => {
 'use strict';
 const D=window.echoData,A=window.HerArchive,R=window.ReadingRoute,$=id=>document.getElementById(id),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const panels=[$('echo-left'),$('echo-right')],intro=$('opening-note'),outro=$('closing-note'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let ship=-1,sea=-1;const panelKeys=['',''];
 const shipPlates=window.PlateMotion.create($('ship-image-open'),$('ship-process-image'),D.stages,A.asset,reduced);
 const seaPlates=window.PlateMotion.create($('sea-image-open'),$('sea-process-image'),D.sea.map((s,i)=>({...s,title:i?'抽屉里的海 · 差两指':'抽屉里的海'})),A.asset,reduced);
 function show(node,on){node.hidden=!on;node.inert=!on;node.setAttribute('aria-hidden',String(!on));}
 function renderQuotes(keys){panels.forEach((node,i)=>{
   const key=keys[i],wasHidden=node.hidden;show(node,!!key);if(!key){panelKeys[i]='';return;}if(panelKeys[i]===key&&!wasHidden)return;panelKeys[i]=key;
   const q=D.quotes[key];node.querySelector('.margin-kicker').textContent=q.person;
   node.querySelector('.echo-date').textContent=q.date||(q.diary?'日记摘录':'作品摘录');node.querySelector('.echo-folio').textContent=q.person.slice(0,1);
   node.querySelector('blockquote').textContent=q.text;
   const b=node.querySelector('button');b.textContent=q.letter?'留言 '+String(q.letter).padStart(2,'0')+' ↗':q.work!=null?'作品原文 ↗':'日记原文 ↗';
   b.onclick=()=>q.work!=null?A.work(q.work):A.open(q.diary?'diary':'letters',q.person,{target:q.letter,find:q.diary?q.text:undefined});
   // Keep the entry movement in the words; never filter or brighten their backdrop.
   if(!reduced.matches)node.querySelectorAll('.echo-byline,blockquote,.echo-source,.echo-folio,.thought-thread').forEach(ink=>{
     if(!ink.animate)return;ink.getAnimations().forEach(a=>a.cancel());ink.animate([{filter:'blur(8px)',transform:'translateY(9px)'},{filter:'blur(0)',transform:'translateY(0)'}],{duration:680,easing:'cubic-bezier(.18,.65,.24,1)'});
   });
 });}
 function openImage(file,title,person,n){
   $('music').pause();$('art-title').textContent=title;$('art-person').textContent=person;$('art-note').textContent='';
   const body=$('art-body');body.className='';body.replaceChildren();const img=document.createElement('img');img.src=A.asset(file);img.alt=title;body.append(img);
   $('art-original').href=A.asset(file);const context=$('art-context');context.hidden=false;context.onclick=()=>{$('art-view').close();A.open('letters',person,{target:n})};A.show($('art-view'));
 }
 function shipStage(index){
   if(index===ship)return;ship=index;const s=D.stages[index];
   $('ship-credit').textContent=String(index+1).padStart(2,'0')+' / 04  ·  '+s.person+' / '+s.label;
   document.querySelectorAll('[data-ship-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.shipStage)===index)));
   $('ship-source').onclick=()=>A.open('letters',s.person,{target:s.letter});$('ship-image-open').onclick=()=>openImage(s.file,'浅湾号 · '+s.label,s.person,s.letter);
 }
 function seaStage(index){
   if(index===sea)return;sea=index;const s=D.sea[index],title=index?'抽屉里的海 · 差两指':'抽屉里的海';
   document.querySelectorAll('[data-sea-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.seaStage)===index)));
   $('sea-image-open').onclick=()=>openImage(s.file,title,'Judas',s.letter);
 }
 function update(state){
   const p=state.position,index=state.page,t=state.progress,scene=R.scene(state),opening=p<.55,closing=p>14.45;
   show(intro,opening);show(outro,closing);document.body.classList.toggle('at-opening',opening);document.body.classList.toggle('at-closing',closing);
   if(index===7){shipStage(scene.stage);shipPlates.set(t);}else if(ship<0)shipStage(0);
   if(index===5){seaStage(scene.stage);seaPlates.set(t);}else if(sea<0)seaStage(0);
   let keys=D.pages[index]||[];
   if(index===1){keys=[t>=.12?'lamp':null,t>=.84?'cupdone':t>=.36?'cup':null];}
   else if(index===7){keys=D.stages[scene.stage].echo.map((k,i)=>scene.local>=(i?.43:.14)?k:null);}
   else if(index===5){keys=[t>=.16?'sea':null,t>=.72?'seaclosed':null];}
   else keys=keys.map((k,i)=>t>=(i?.44:.16)?k:null);
   if(opening||closing)keys=[];renderQuotes(keys);
   window.MarginInk?.invalidate();
 }
 document.querySelectorAll('[data-ship-stage]').forEach(b=>b.addEventListener('click',()=>window.BookNavigation.seek(7,(Number(b.dataset.shipStage)+.65)/4)));
 document.querySelectorAll('[data-sea-stage]').forEach(b=>b.addEventListener('click',()=>window.BookNavigation.seek(5,Number(b.dataset.seaStage)?.9:.4)));
 window.BookEcho={setScene:update};update(window.BookNavigation.state());
})();
