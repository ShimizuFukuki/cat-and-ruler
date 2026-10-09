/* Reading notes are sidecars: no replacement or rewriting of an original paragraph. */
(()=>{
 'use strict';
 const base=new URL('.',document.currentScript.src),supplements=new URL("assets/猫与尺-逐段批注-20261009/",window.CatRulerRelease.root);
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('archive-annotations.css',base).href;document.head.append(stylesheet);
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 function external(url,title){try{const u=new URL(url);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;const a=node('a','annotation-link',title||u.hostname);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return null;}}
 function target(t,ctx){const b=node('button','annotation-link',t.title);b.type='button';if(t.project)b.onclick=()=>ctx.work(t.project);else b.onclick=()=>ctx.open(t.mode,t.person||ctx.person,{date:'all',target:t.id});return b;}
 function supplemental(file){const u=new URL(file.split('/').map(encodeURIComponent).join('/'),supplements);return u.href.startsWith(supplements.href)?u.href:null;}
 function figure(m,ctx){
  const url=m.origin==='archive'?ctx.asset(m.file):supplemental(m.file);if(!url)return null;
  const f=node('figure','annotation-figure'),image=node('img'),b=node('button','annotation-picture');b.type='button';b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','展开图片：'+m.alt);
  image.alt=m.alt;image.src=m.origin==='archive'?ctx.display(m.file):url;image.loading='lazy';image.decoding='async';
  image.onerror=()=>{b.replaceWith(node('p','annotation-image-error','图片暂时无法读取，仍可打开来源。'));};
  b.append(image);b.onclick=()=>{const expanded=f.classList.toggle('expanded');b.setAttribute('aria-expanded',String(expanded));b.setAttribute('aria-label',(expanded?'收起图片：':'展开图片：')+m.alt);if(expanded&&m.origin==='archive')image.src=ctx.display(m.file,true);};
  const caption=node('figcaption');caption.append(node('span','annotation-provenance',m.origin==='archive'?'原档案配图':m.origin==='recovered'?'原记录恢复 · '+m.recordOrdinal:m.origin==='archive-page'?'原档案 PDF · 第 '+m.page+' 页':'补查截图 · '+m.captured),node('span',null,m.caption));
  if(m.recovery)caption.append(node('span','annotation-credit',m.recovery));
  if(m.credit)caption.append(node('span','annotation-credit',m.credit));
  if(m.licenseUrl){const license=external(m.licenseUrl,m.license||'图片许可');if(license)caption.append(license);}
  const a=m.sourceUrl?external(m.sourceUrl,'图片出处 ↗'):node('a','annotation-link','打开原图 ↗');if(a){if(!m.sourceUrl){a.href=url;a.target='_blank';a.rel='noopener';}caption.append(a);}
  if(m.origin==='archive-page'){const pdf=node('a','annotation-link','打开原 PDF 的这一页 ↗');pdf.href=ctx.asset(m.sourceFile)+'#page='+m.page;pdf.target='_blank';pdf.rel='noopener';caption.append(pdf);}
  f.append(b,caption);return f;
 }
 function render(entry,ctx,host){
  if(!entry)return null;
  const aside=node('aside','reading-annotations');aside.setAttribute('aria-label','这一段的批注与资料');
  const shown=new Set();host?.querySelectorAll('img').forEach(i=>{if(i.getAttribute('src'))shown.add(i.getAttribute('src'));});
  for(const n of entry.notes||[]){
   const card=node('section','reading-annotation');card.append(node('h3','annotation-title',n.title),node('p','annotation-body',n.body));
   for(const m of n.media||[]){if(m.origin==='archive'&&(shown.has(ctx.asset(m.file))||shown.has(ctx.display(m.file))))continue;const f=figure(m,ctx);if(f){card.append(f);shown.add(ctx.display(m.file));}}
   const links=node('div','annotation-links');
   for(const s of n.sources||[]){const a=external(s.url,s.title);if(a)links.append(a);}
   for(const d of n.documents||[]){const url=ctx.asset(d.file),a=node('a','annotation-link',d.title);a.href=url;a.target='_blank';a.rel='noopener';links.append(a);if(/\.(wav|mp3|ogg|m4a)$/i.test(d.file)){const player=node('audio','annotation-audio');player.controls=true;player.preload='none';player.src=url;player.setAttribute('aria-label',d.title);player.addEventListener('play',()=>{document.getElementById('music')?.pause();document.querySelectorAll('dialog audio,dialog video').forEach(other=>{if(other!==player)other.pause();});});card.append(player);}}
   for(const t of n.targets||[])links.append(target(t,ctx));
   if(links.childElementCount)card.append(links);aside.append(card);
  }
  const resources=node('div','annotation-resources');resources.setAttribute('aria-label','相关资料');
  for(const r of entry.resources||[]){
   let a;if(r.project)a=target(r,ctx);else if(r.url){if([...host?.querySelectorAll('a[href]')||[]].some(n=>n.getAttribute('href')===r.url))continue;a=external(r.url,r.title);}else if(r.file){
    // Original inline links already provide access; do not repeat the same filename.
    const url=ctx.asset(r.file);if([...host?.querySelectorAll('a[href]')||[]].some(n=>n.getAttribute('href')===url))continue;a=node('a','annotation-link',r.title);a.href=url;a.target='_blank';a.rel='noopener';
   }if(a)resources.append(a);
  }
  if(resources.childElementCount){resources.prepend(node('span','annotation-resource-label','相关资料'));aside.append(resources);}
  return aside.childElementCount?aside:null;
 }
 window.ReadingAnnotations={render};
})();
