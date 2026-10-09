/* Authored works, grouped by project. This module never interprets source text as code. */
(()=>{
 'use strict';
 const filters={all:'全部作品',text:'文字',drawing:'绘图',ai:'AI 生成图',model:'三维模型',simulation:'模拟',render:'三维渲染',audio:'声音',video:'影像',web:'网页',template:'模板'};
 const marks={text:'文',drawing:'图',ai:'图',model:'模',simulation:'流',render:'景',audio:'♪',video:'影',web:'↗',template:'页'};
 const webEditions=new URL("assets/猫与尺-藏品按项目整理-20261009/web-editions/",window.CatRulerRelease.root);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 function card(p,{display,open}){
  const button=el('button','project-card');button.dataset.project=p.id;button.setAttribute('aria-label','打开作品：'+p.title);
  const cover=el('div','project-cover');
  if(p.cover){const img=el('img');img.src=display(p.cover);img.alt='';img.loading='lazy';img.decoding='async';cover.append(img);}
  else{cover.classList.add('project-typeset');cover.append(el('span','project-monogram',marks[p.media[0]]||'文'),el('span','project-paper-title',p.title));if(p.excerpt)cover.append(el('span','project-excerpt',p.excerpt));}
  const info=el('div','project-card-info');info.append(el('small','project-credit',p.authors.join(' / ')),el('h2',null,p.title),el('p','project-medium',p.media.map(m=>filters[m]).join(' · ')));
  button.append(cover,info);button.onclick=()=>open(p.id);return button;
 }
 function exhibit(p,catalog,{root,display,asset,load,markdown,open,valid,initial}){
  let revision=0;const object=root.querySelector('.exhibit-object'),writing=root.querySelector('#exhibit-writing'),connections=root.querySelector('#exhibit-connections'),original=root.querySelector('#exhibit-original');
  writing.append(el('p','project-description',p.description));
  const stage=el('div','project-stage'),caption=el('div','project-asset-caption'),downloads=el('div','project-downloads'),navigator=el('nav','project-contents');navigator.setAttribute('aria-label','这件作品的内容');
  object.append(stage,caption,downloads);writing.append(navigator);
  const groups=new Map(),buttons=new Map();
  for(const key of p.assets){const a=catalog.assets[key];if(!groups.has(a.section))groups.set(a.section,[]);groups.get(a.section).push(a);}
  function link(file,label){const a=el('a','project-file',label);a.href=asset(file);a.target='_blank';a.rel='noopener';return a;}
  async function select(key){
   const token=++revision,a=catalog.assets[key];if(!a||!p.assets.includes(key))return;
   root.dataset.asset=key;stage.querySelectorAll('audio,video').forEach(m=>m.pause());stage.replaceChildren();downloads.replaceChildren();caption.replaceChildren(el('h3',null,a.title),el('p',null,a.author+' · '+(catalog.labels[a.type]||a.type)));
   original.href=asset(a.file);original.textContent=a.originalLabel||'打开此项原文件 ↗';
   for(const [k,b] of buttons){b.setAttribute('aria-current',String(k===key));if(k===key){const details=b.closest('details');if(details)details.open=true;}}
   const current=()=>token===revision&&valid();
   const picture=(file)=>{const image=el('img','project-art');image.src=display(file,true);image.alt=a.title;image.decoding='async';image.onerror=()=>{if(current())image.replaceWith(el('p','project-unavailable','图片未能读取，可打开下方的原文件。'));};stage.append(image);};
   for(const file of a.sources){const format=file.split('.').pop().toUpperCase();downloads.append(link(file,(['BLEND','OBJ'].includes(format)?'模型源文件':format==='MTL'?'模型材质':format==='SVG'?'矢量源文件':['MID','MSCZ','MUSICXML'].includes(format)?'乐谱源文件':'配套文件')+' · '+format+' ↗'));}
   if(['ai','drawing','render','web-image'].includes(a.type)||a.type==='score'&&/\.(png|jpe?g|svg|webp)$/i.test(a.file))picture(a.file);
   else if(a.type==='text'||a.type==='template'){
    stage.append(el('p','archive-loading','正在展开……'));
    try{const text=await load(a.textResource);if(!current())return;stage.replaceChildren();if(a.markdown){stage.append(markdown(text,a.file.slice(0,a.file.lastIndexOf('/')+1)));}else stage.append(el('div','work-original',text));}
    catch(error){if(current()){stage.replaceChildren(el('p','project-unavailable',error.message));const retry=el('button','project-retry','重新读取');retry.onclick=()=>select(key);stage.append(retry);}}
   }else if(a.type==='audio'||a.type==='video'){
    if(a.type==='audio'){const face=el('div','project-sound');face.append(el('span',null,'♪'),el('p',null,a.title));stage.append(face);}
    const media=el(a.type);media.controls=true;media.preload='none';media.src=a.type==='audio'?(window.HerMedia?.audio(a.file)||asset(a.file)):asset(a.file);media.setAttribute('aria-label',a.title);if(a.type==='video')media.playsInline=true;
    media.addEventListener('play',()=>{document.getElementById('music')?.pause();document.querySelectorAll('audio,video').forEach(other=>{if(other!==media)other.pause();});});stage.append(media);
   }else if(a.type==='web'){
    if(a.preview)picture(a.preview);else if(p.cover)picture(p.cover);else{const face=el('div','project-web-face');face.append(el('span',null,'↗'),el('h3',null,a.title));stage.append(face);}
    const launch=link(a.file,'打开互动网页 ↗');if(a.playFile)launch.href=new URL(a.playFile,webEditions).href;stage.append(launch);
   }else if(a.type==='pdf'){
    // An accessible native PDF view keeps every page available; the link is the fallback.
    const frame=el('object','project-pdf');frame.type='application/pdf';frame.data=asset(a.file);frame.setAttribute('aria-label',a.title);frame.append(link(a.file,'打开整本 PDF ↗'));stage.append(frame);downloads.append(link(a.file,'阅读 / 下载 PDF ↗'));
   }else if(a.type==='simulation'){
    if(a.preview)picture(a.preview);stage.append(el('p','project-description','The Powder Toy 本地模拟存档。可下载后在该程序中打开；预览若有，是 Judas 重画的位置图。'),link(a.file,'下载模拟存档 · CPS ↗'));
   }else{
    if(a.preview)picture(a.preview);stage.append(link(a.file,'打开 '+a.file.split('.').pop().toUpperCase()+' 原作 ↗'));
   }
  }
  for(const [name,rows] of groups){
   const folded=['版本与改稿','其他版本'].includes(name),group=el(folded?'details':'section','project-part');
   group.append(el(folded?'summary':'h3',null,folded?name+' · '+rows.length:name));
   for(const a of rows){const b=el('button','project-part-button');b.dataset.assetKey=a.key;b.append(el('span',null,a.title),el('small',null,catalog.labels[a.type]));b.onclick=()=>select(a.key);buttons.set(a.key,b);group.append(b);}
   navigator.append(group);
  }
  if(p.related.length){connections.append(el('h3',null,'相连的作品'));for(const id of p.related){const q=catalog.projects.find(x=>x.id===id);if(!q)continue;const b=el('button','project-related',q.title+' ↗');b.onclick=()=>open(q.id);connections.append(b);}}
  select(initial&&p.assets.includes(initial)?initial:p.assets[0]);
  return ()=>{revision++;stage.querySelectorAll('audio,video').forEach(m=>m.pause());};
 }
 window.ProjectCollection={filters,card,exhibit};
})();
