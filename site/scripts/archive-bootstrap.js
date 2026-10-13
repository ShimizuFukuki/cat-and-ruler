/* The reading archive loads when a reader opens it, not on the front cover. */
(()=>{
 'use strict';
 const scriptBase=new URL('.',document.currentScript.src);
 const asset=window.CatRulerRelease.asset;
 let promise=null,lastFocus=null;
 async function unpack(data){const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0)),stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return JSON.parse(await new Response(stream).text());}
 const packed=typeof DecompressionStream==='function'&&typeof Blob==='function'&&typeof Response==='function';
 if(packed)window.HerPacked={unpack};
 function script(url){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=()=>{s.remove();resolve();};s.onerror=()=>{s.remove();reject(new Error('这部分记录没有打开，请重试。'));};document.head.append(s);});}
 async function paths(){if(window.archivePaths)return;await script(window.CatRulerRelease.url('site/data/historical-paths.js'));}
 async function ensure(){
  if(window.ArchiveReader)return window.ArchiveReader;
  if(!promise)promise=(async()=>{
   await Promise.all([window.marked?null:script(window.CatRulerRelease.url('site/vendor/marked.umd.js')),paths()]);
   await script(new URL("project-collection.js",document.currentScript?.src||scriptBase).href);
   await script(new URL("archive-annotations.js",document.currentScript?.src||scriptBase).href);
   await script(new URL("archive-reader.js",document.currentScript?.src||scriptBase).href);return window.ArchiveReader;
  })().catch(error=>{promise=null;throw error;});
  return promise;
 }
 const status=document.createElement('div');status.className='archive-load-status';status.hidden=true;status.setAttribute('role','status');document.body.append(status);
 let request=0;
 async function call(method,args){if(method==='open'&&args[0]==='diary'&&window.ThinReaderHost){window.ThinReaderHost.open(args[1],args[2]||{});return;}const token=++request;status.hidden=false;status.textContent='正在取出这一册……';try{const reader=await ensure();if(token!==request)return;status.hidden=true;reader[method](...args);}catch(e){if(token!==request)return;status.textContent=e.message;const b=document.createElement('button');b.textContent='重试';b.onclick=()=>call(method,args);status.append(b);}}
 function show(dialog){lastFocus=document.activeElement;document.querySelectorAll('dialog[open]').forEach(other=>{if(other!==dialog)other.close();});if(!dialog.open)dialog.showModal();document.body.classList.add('modal-open');}
 window.HerArchive={asset,show,open:(...args)=>call('open',args),work:(...args)=>call('work',args)};
 window.ArchiveLoader={ensure};
 document.addEventListener('click',event=>{
  const close=event.target.closest('[data-close]');if(close){const d=document.getElementById(close.dataset.close);d?.close();lastFocus?.focus?.({preventScroll:true});return;}
  if(window.ArchiveReader)return;
  const b=event.target.closest('[data-open],[data-letter],[data-work]');if(!b)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(b.dataset.open)window.HerArchive.open(b.dataset.open,b.dataset.person||'Ambrose',{find:b.dataset.find});
  else if(b.dataset.letter)window.HerArchive.open('letters','Ambrose',{target:Number(b.dataset.letter)});
  else window.HerArchive.work(Number(b.dataset.work));
 },true);
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('modal-open');}));
})();
