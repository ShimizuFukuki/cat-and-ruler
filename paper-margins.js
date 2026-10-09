/* Soft local light follows the quotation while preserving the defocused artwork. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else{root.PaperMargins=api;api.mount(document);}
})(typeof window==='object'?window:globalThis,function(){
 function shape(rect,bounds){
  return {x:rect.left-bounds.left+rect.width*.5,y:rect.top-bounds.top+rect.height*.5,
   rx:Math.max(265,rect.width*1.48),ry:Math.max(300,rect.height*1.5)};
 }
 function mount(doc){
  const pairs=[['echo-left','.exposure-left'],['echo-right','.exposure-right']].map(([id,selector])=>({text:doc.getElementById(id),wash:doc.querySelector(selector)}));
  let pending=0;
  function measure(){
   pending=0;
   pairs.forEach(({text,wash})=>{
    if(text.hidden)return;
    const r=text.getBoundingClientRect(),b=wash.getBoundingClientRect();
    if(!r.width||!b.width)return;
    const s=shape(r,b);
    for(const [key,value] of Object.entries({'--wash-x':s.x,'--wash-y':s.y,'--wash-w':s.rx,'--wash-h':s.ry}))wash.style.setProperty(key,value+'px');
   });
  }
  function schedule(){if(!pending)pending=requestAnimationFrame(measure);}
  if(typeof ResizeObserver!=='undefined'){
   const observer=new ResizeObserver(schedule);pairs.forEach(({text})=>observer.observe(text));observer.observe(doc.getElementById('book-viewport'));
  }
  if(typeof MutationObserver!=='undefined'){
   const observer=new MutationObserver(schedule);pairs.forEach(({text})=>observer.observe(text,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true}));
  }
  addEventListener('resize',schedule);doc.fonts?.ready.then(schedule);schedule();
 }
 return {shape,mount};
});
