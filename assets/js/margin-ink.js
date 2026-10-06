(() => {
 'use strict';
 const panels=[...document.querySelectorAll('.echo-panel')],tones=window.InkTones;
 const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
 const luminance=rgb=>.2126*linear(rgb[0]/255)+.7152*linear(rgb[1]/255)+.0722*linear(rgb[2]/255);
 const parse=color=>{const m=color.match(/[\d.]+/g);return m?luminance(m.slice(0,3).map(Number)):.72;};
 const inside=(r,x,y)=>x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 let raf=0,last=0;
 function wrap(node){
  if(node.dataset.inkText===node.textContent&&node.querySelector('.ink-letter'))return;
  const text=node.textContent;node.dataset.inkText=text;node.replaceChildren();
  for(const c of text){const span=document.createElement('span');span.className='ink-letter';span.textContent=c;node.append(span);}
 }
 function sample(image,x,y){
  const {rect:r,data:d,fit,alpha}=image;if(!inside(r,x,y)||!alpha)return null;
  const u=(x-r.left)/r.width,v=(y-r.top)/r.height;
  if(u<fit.x||u>fit.x+fit.w||v<fit.y||v>fit.y+fit.h)return null;
  const px=clamp((u-fit.x)/fit.w)*11,py=clamp((v-fit.y)/fit.h)*11;
  const x0=Math.floor(px),y0=Math.floor(py),x1=Math.min(11,x0+1),y1=Math.min(11,y0+1),fx=px-x0,fy=py-y0;
  const a=d.grid[y0*12+x0]*(1-fx)+d.grid[y0*12+x1]*fx,b=d.grid[y1*12+x0]*(1-fx)+d.grid[y1*12+x1]*fx;
  return {light:(a*(1-fy)+b*fy)/255,alpha};
 }
 function readPlates(){
  return [...document.querySelectorAll('.leaf')].filter(n=>!n.hidden).map(leaf=>{
   const images=[...leaf.querySelectorAll('img')].map(img=>{
    const data=tones[img.dataset.inkAsset||img.dataset.asset];if(!data)return null;
    const style=getComputedStyle(img),rect=img.getBoundingClientRect(),plate=img.closest('.process-plate');
    const alpha=Number(style.opacity)*(plate?Number(plate.style.opacity):1);
    const iw=img.clientWidth||rect.width,ih=img.clientHeight||rect.height;
    const scale=(style.objectFit==='cover'?Math.max:Math.min)(iw/data.w,ih/data.h);
    const w=data.w*scale/iw,h=data.h*scale/ih;
    return {rect,data,alpha,fit:{x:(1-w)/2,y:(1-h)/2,w,h}};
   }).filter(Boolean);
   return {rect:leaf.getBoundingClientRect(),light:parse(getComputedStyle(leaf).backgroundColor),images};
  });
 }
 function backdrop(leaves,x,y){
  let light=.73;
  for(const leaf of leaves){
   if(!inside(leaf.rect,x,y))continue;
   light=leaf.light;
   for(const image of leaf.images){const value=sample(image,x,y);if(value)light=value.light*value.alpha+light*(1-value.alpha);}
  }
  return light;
 }
 function refresh(now){
  if(now-last<64){raf=requestAnimationFrame(refresh);return;}raf=0;last=now;
  const visible=panels.filter(n=>!n.hidden&&n.getBoundingClientRect().width>0);if(!visible.length)return;
  visible.forEach(panel=>panel.querySelectorAll('.margin-kicker,.echo-date,blockquote,.echo-source').forEach(wrap));
  // Read geometry in one batch, then change ink only; never sample canvas pixels from file://.
  const leaves=readPlates(),updates=[];
  for(const panel of visible){
   let count=0,lights=0;
   for(const letter of panel.querySelectorAll('.ink-letter')){
    const r=letter.getBoundingClientRect();if(!r.width||!r.height)continue;
    const x=r.left+r.width/2,y=r.top+r.height/2;
    // The grid is averaged source luminance. Neighbour samples approximate the existing 15px blur.
    const light=(backdrop(leaves,x,y)*2+backdrop(leaves,x-8,y)+backdrop(leaves,x+8,y))/4;
    const threshold=letter.dataset.tone==='light'?.218:.198,tone=light<threshold?'light':'dark';
    updates.push([letter,tone]);count++;if(tone==='light')lights++;
   }
   updates.push([panel,lights>count*.5?'light':'dark']);
  }
  updates.forEach(([node,tone])=>{if(node.dataset.tone!==tone)node.dataset.tone=tone;});
 }
 function invalidate(){if(!raf)raf=requestAnimationFrame(refresh);}
 window.MarginInk={invalidate};addEventListener('resize',invalidate);
 document.fonts?.ready.then(invalidate);invalidate();
})();
