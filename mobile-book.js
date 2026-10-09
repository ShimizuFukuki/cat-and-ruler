/* A hand-held concertina: native horizontal paging, with readable page contents. */
(()=>{
 'use strict';
 if(!matchMedia('(max-width: 760px)').matches)return;
 document.documentElement.classList.add('handheld');
 const $=s=>document.querySelector(s),pages=[...document.querySelectorAll('.leaf')],book=$('#fold-book'),ruler=$('#book-position'),cat=$('#cat-thumb'),A=window.HerArchive,R=window.ReadingRoute;
 let index=0,progress=0,raf=0,restore=0,started=false,previous=0;
 try{restore=Math.max(0,Math.min(15,Number(localStorage.getItem('cat-mobile-leaf'))||0));}catch{}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const preface=document.createElement('section');preface.className='mobile-preface';preface.setAttribute('aria-label','卷首');
 preface.innerHTML='<span class="mobile-imprint">一场关于 AI 的生活实验</span><img src="free-soul.svg" alt="AI 会有自由的灵魂吗？" width="360" height="267"><p>我把几天时间，交给了两个 AI。<br>只约好留下日记。</p><div class="mobile-authors"><i>Ambrose</i><span>与</span><i>Judas</i></div><p>怎样度过，由他们自己写。<br>起初各自做着手边的事，<br>后来，信开始往返。</p><button class="mobile-open">翻开折册 <span>⟶</span></button><a href="room/index.html">去窗前坐坐 ↗</a>';
 $('#book-viewport').before(preface);
 const live=document.createElement('span');live.className='visually-hidden';live.setAttribute('role','status');$('.ruler-dock').append(live);
 function begin(){started=true;document.body.classList.add('mobile-started');preface.hidden=true;window.HerMedia?.nearby(index);}
 function state(){return {...R.sample(R.locate(index,progress)),position:index,page:index,progress};}
 function marginalia(){
  const data=window.echoData;if(!data)return;let keys=data.pages[index]||[];
  if(index===1)keys=['lamp',progress>.5?'cupdone':'cup'];
  if(index===5)keys=progress>.5?['sea','seaclosed']:['sea'];
  if(index===7)keys=data.stages[R.scene(state()).stage].echo;
  let notes=pages[index].querySelector('.mobile-marginalia');if(!notes){notes=document.createElement('aside');notes.className='mobile-marginalia';notes.setAttribute('aria-label','与这一页有关的原话');pages[index].querySelector('.leaf-content').append(notes);}
  const identity=keys.join('|');if(notes.dataset.identity===identity)return;notes.dataset.identity=identity;notes.replaceChildren();
  for(const key of keys){const q=data.quotes[key];if(!q)continue;const section=document.createElement('section'),author=document.createElement('cite'),quote=document.createElement('blockquote'),link=document.createElement('button');author.textContent=q.person;quote.textContent=q.text;link.textContent=q.letter?'读这封留言 ↗':q.diary?'日记原文 ↗':'原文 ↗';link.onclick=()=>q.source?window.BookEcho.openSource(q.source,q.person):q.work!=null?A.work(q.work):A.open(q.diary?'diary':'letters',q.person,{target:q.letter,find:q.diary?q.text:undefined});section.append(author,quote,link);notes.append(section);}
 }
 function update(){
  const s=state();window.HerMedia?.nearby(index);window.BookEcho?.setScene(s);marginalia();window.LeafArrivals?.update({position:index,previous});previous=index;
  pages.forEach((p,i)=>{p.hidden=false;p.inert=Math.abs(i-index)>1;p.classList.toggle('near',i===index);});
  pages[1].style.setProperty('--cup',index>1?1:index<1?0:R.scene(s).cup);
  document.querySelectorAll('[data-room]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.room)===(R.scene(s).cup>.5?1:0))));
  ruler.value=index;ruler.setAttribute('aria-valuetext',window.bookData.titles[index]);
  const track=$('.ruler-track'),width=(track.clientWidth||640)/16,point=(index+1)*width,visible=$('.wood-ruler').clientWidth;
  track.style.transform=`translateX(${-Math.max(0,Math.min((track.clientWidth||640)-visible,point-visible*.65))}px)`;
  $('#red-thread').style.left=(index+1)/16*100+'%';cat.style.left=-width+'px';cat.style.setProperty('--cat-w',width+'px');
  live.textContent=window.bookData.titles[index];try{localStorage.setItem('cat-mobile-leaf',index);}catch{}
 }
 function seek(page,p=0,{smooth=false}={}){begin();index=Math.max(0,Math.min(15,Math.round(page)));progress=p;book.scrollTo({left:index*book.clientWidth,behavior:smooth&&!reduced.matches?'smooth':'instant'});update();}
 window.MobileBook={seek,state,refreshQuotes:marginalia};window.BookNavigation={seek,state};
 preface.querySelector('button').onclick=()=>seek(0);
 book.addEventListener('scroll',()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;const next=Math.max(0,Math.min(15,Math.round(book.scrollLeft/book.clientWidth)));if(next!==index){index=next;progress=0;update();}});},{passive:true});
 // First appearance is tied to the visible page; backward visits keep the ink on paper.
 for(const p of pages){p.style.setProperty('--font','17px');p.style.setProperty('--defocus','0px');p.setAttribute('tabindex','-1');}
 for(let i=0;i<=16;i++){const mark=document.createElement('span');mark.textContent=String(i).padStart(2,'0');mark.style.left=i/16*100+'%';if(i%4)mark.className='mobile-minor-number';$('#ruler-marks').append(mark);}
 for(let i=0;i<=64;i++){const tick=document.createElement('i');tick.className=i%4?'minor':'major';tick.style.left=i/64*100+'%';$('#ruler-lines').append(tick);}
 ruler.addEventListener('input',()=>seek(Number(ruler.value)));ruler.addEventListener('change',()=>seek(Number(ruler.value)));
 let pointer=null,pointerStart=null;
 cat.addEventListener('pointerdown',e=>{pointer=e.pointerId;pointerStart={x:e.clientX,index,width:ruler.getBoundingClientRect().width};cat.setPointerCapture(pointer);document.body.classList.add('is-cat-held');e.preventDefault();});
 cat.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;seek(pointerStart.index+(e.clientX-pointerStart.x)/pointerStart.width*15);});
 const release=()=>{pointer=null;document.body.classList.remove('is-cat-held');};cat.addEventListener('pointerup',release);cat.addEventListener('pointercancel',release);cat.addEventListener('lostpointercapture',release);
 $('#menu-open').onclick=()=>A.show($('#directory'));
 $('#home-button').onclick=()=>{started=false;document.body.classList.remove('mobile-started');preface.hidden=false;};$('#return-start').onclick=()=>seek(0);
 document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>seek(Number(b.dataset.jump),0,{smooth:true}));
 document.querySelectorAll('[data-source]').forEach(a=>a.href=A.asset(a.dataset.source));
 document.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>seek(1,Number(b.dataset.room)?1:.18));
 $('#room-original').onclick=()=>A.work(progress>.5?2:1);
 document.addEventListener('keydown',e=>{if((document.body.dataset.space&&document.body.dataset.space!=='book')||document.querySelector('dialog[open]')||e.target.closest('input,button,a,select,textarea'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();seek(index+(e.key==='ArrowRight'?1:-1),0,{smooth:true});}});
 addEventListener('resize',()=>{if(innerWidth>760){location.reload();return;}if(started)seek(index,progress);else update();});
 // Scripts that create image plates and echo text run later in the same document.
 document.addEventListener('DOMContentLoaded',()=>{if(restore)seek(restore);else update();});
})();
