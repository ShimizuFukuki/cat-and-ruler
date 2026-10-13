/* Evidence beside the original: pictures, pages and files, without interpretive notes. */
(()=>{
 'use strict';
 const base=new URL('.',document.currentScript.src);
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=window.CatRulerRelease.url('site/styles/archive-annotations.css');document.head.append(stylesheet);
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 function external(raw,title){try{const u=new URL(raw);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;const a=node('a','material-source',title||u.hostname);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return null;}}
 function local(file,root){return window.CatRulerRelease.asset('@working/'+root+'/'+file);}
 let viewer=null,returnFocus=null;
 const smallScreen=window.matchMedia('(max-width: 900px)');
 smallScreen.addEventListener('change',event=>{document.querySelectorAll('.material-pocket').forEach(pocket=>{pocket.open=!event.matches;});});
 function enlarge(src,title,source){
  if(!viewer){viewer=node('dialog','material-viewer');viewer.setAttribute('aria-label','查看图片');document.body.append(viewer);viewer.addEventListener('close',()=>returnFocus?.focus?.({preventScroll:true}));}
  returnFocus=document.activeElement;viewer.replaceChildren();
  const head=node('header'),caption=node('h2',null,title),close=node('button','material-close','关闭 ×');close.type='button';close.onclick=()=>viewer.close();head.append(caption,close);
  const img=node('img');img.src=src;img.alt=title;const frame=node('div','material-viewer-image');frame.append(img);viewer.append(head,frame);if(source&&source.tagName==='A')viewer.append(source.cloneNode(true));viewer.showModal();close.focus();
 }
 function render(entry,ctx,host){
  const aside=node('aside','reading-materials');aside.setAttribute('aria-label','本段资料');
  const items=node('div','material-items'),seen=new Set();
  for(const item of entry?.items||[]){
   const exact=item.url||item.file||'project:'+item.project;if(seen.has(exact))continue;seen.add(exact);
   const card=node('figure','reading-material');card.dataset.material=exact;
   let url=item.url|| (item.origin==='archive'?ctx.asset(item.file):item.file?local(item.file,item.supplementRoot):null);
   const title=item.title||item.file?.split('/').at(-1)||'';
   let source=item.url?external(url,title+' ↗'):node(item.kind==='work'?'button':'a','material-source',title+(item.kind==='work'?'':' ↗'));
   if(!source)continue;
   if(item.kind==='work'){source.type='button';source.onclick=()=>ctx.work(item.project);}else if(!item.url){source.href=url;source.target='_blank';source.rel='noopener';}
   // A project's latest cover can postdate this passage. Only explicitly selected
   // images illustrate a historical moment; project cards open all versions.
   const preview=item.kind==='image'? (item.origin==='archive'?ctx.display(item.file):url):item.kind!=='work'&&item.preview?ctx.display(item.preview):null;
   if(preview){
    const button=node('button','material-picture'),image=node('img');button.type='button';button.setAttribute('aria-label','放大图片：'+title);image.alt=title;image.src=preview;image.loading='lazy';image.decoding='async';button.append(image);
    button.onclick=()=>enlarge(item.kind==='image'&&item.origin==='archive'?ctx.display(item.file,true):preview,title,source);
    image.onerror=()=>button.replaceWith(node('span','material-missing','图片暂未载入'));card.append(button);
   }
   if(['audio','video'].includes(item.kind)){
    const media=node(item.kind);media.src=url;media.controls=true;media.preload='none';media.setAttribute('aria-label',title);media.addEventListener('play',()=>{document.getElementById('music')?.pause();document.querySelectorAll('dialog audio,dialog video').forEach(other=>{if(other!==media)other.pause();});});card.append(media);
   }
   const caption=node('figcaption');caption.append(source);const facts=[];
   if(item.kind==='web')facts.push(new URL(item.url).hostname.replace(/^www\./,''));
   if(item.origin==='supplement')facts.push('网页截图 · '+item.captured);
   if(item.origin==='archive-page')facts.push('第 '+item.page+' 页');
   if(item.origin==='recovered')facts.push('当时保存的画面');
   if(item.origin==='derived')facts.push('根据当时的棋盘记录复现');
   if(item.kind==='work')facts.push('查看作品与版本');
   if(item.credit)facts.push(item.credit);
   if(facts.length)caption.append(node('small','material-facts',facts.join(' · ')));
   if(item.sourceUrl){const a=external(item.sourceUrl,'原页面 ↗');if(a)caption.append(a);}
   if(item.sourceFile){const a=node('a','material-source',(item.sourceLabel||'原 PDF')+' ↗');a.href=ctx.asset(item.sourceFile)+(Number.isInteger(item.page)?'#page='+item.page:'');a.target='_blank';a.rel='noopener';caption.append(a);}
   if(item.licenseUrl){const a=external(item.licenseUrl,item.license||'图片许可');if(a)caption.append(a);}
   card.append(caption);items.append(card);
  }
  if(host){for(const existing of [...host.querySelectorAll('.conversation-materials,.letter-materials')]){
   for(const child of [...existing.children]){
    const image=child.querySelector('img'),link=child.querySelector('a[href]');
    if(image&&[...items.querySelectorAll('img')].some(i=>i.getAttribute('src')===image.getAttribute('src')))continue;
    if(!image&&link&&[...items.querySelectorAll('a[href]')].some(a=>a.getAttribute('href')===link.getAttribute('href')))continue;
    items.append(child);
   }existing.remove();
  }}
  if(!items.childElementCount)return null;
  const pocket=node('details','material-pocket'),summary=node('summary',null,'资料 · '+items.childElementCount);pocket.open=!smallScreen.matches;pocket.append(summary,items);aside.append(pocket);return aside;
 }
 function mount(host,entry,ctx){
  for(const replacement of entry?.fileReplacements||[]){
   const before=ctx.asset(replacement.from),after=ctx.asset(replacement.to);
   for(const link of host.querySelectorAll('a[href]')){
    if(link.href===before)link.href=after;
   }
  }
  const original=host.querySelector('.diary-original'),prose=host.querySelector('.archive-prose'),segments=[];
  const segment=content=>{const row=node('div','passage-segment');row.append(content);segments.push(row);return row;};
  if(original){
   const text=original.textContent,parts=text.match(/[\s\S]+?(?:(?:\r\n|\n|\r){2,}|$)/g)||[text];
   for(const part of parts)if(part)segment(node('div','diary-original',part));
   original.closest('.paragraph-main').remove();
  }else if(prose){
   for(const child of [...prose.childNodes]){
    if(child.nodeType===3&&!child.textContent.trim()&&segments.length){segments.at(-1).firstChild.append(child);continue;}
    const p=node('div','archive-prose');p.append(child);segment(p);
   }prose.remove();
  }
  if(!segments.length)segment(node('div','archive-prose'));
  const attached=host.querySelector('.conversation-materials');if(attached)segments.at(-1).append(attached);
  host.classList.add('material-sequence');
  const assignments=segments.map(()=>[]);
  for(const item of entry?.items||[]){
   const index=item.anchor?segments.findIndex(s=>s.textContent.includes(item.anchor)):0;
   assignments[Math.max(0,index)].push(item);
  }
  segments.forEach((row,index)=>{
   const native=node('div','letter-materials');
   for(const image of [...row.querySelectorAll('.archive-prose img,.archive-prose audio,.archive-prose video')]){
    const figure=node('figure','conversation-material'),a=image.closest('a');figure.append(a&&a.childNodes.length===1?a:image);if(image.alt)figure.append(node('figcaption',null,image.alt));native.append(figure);
   }
   if(native.childElementCount)row.append(native);
   const aside=render({items:assignments[index]},ctx,row);if(aside)row.append(aside);host.append(row);
  });
 }
 window.ReadingMaterials={render,mount};
})();
