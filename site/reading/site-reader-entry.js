(()=>{'use strict';const api=window.LightBook,q=new URLSearchParams(location.search),channel='cat-ruler:thin-reader',embedded=parent!==window;
 const send=data=>{if(embedded)parent.postMessage({channel,...data},location.origin);else location.href='../index.html';};let leaving=false;
 const oldClose=document.getElementById('close').onclick;
 function close(){if(leaving)return;if(q.get('entry')==='shelf'&&!api.state.closed){leaving=true;oldClose();const wait=()=>{if(api.state.busy)requestAnimationFrame(wait);else{leaving=false;send({type:'close'});}};requestAnimationFrame(wait);}else send({type:'close'});}
 const edition=q.get('person')==='Judas'?1:0,position=()=>{const date=q.get('date'),find=q.get('find');if(date||find){const i=api.pages.findIndex(p=>p.items.some(item=>find?item.text?.includes(find):item.day===date));if(i>=0){api.state.page=matchMedia('(max-width:980px)').matches?i:i-i%2;api.render();}}};api.select(edition);api.reflow();position();document.fonts?.ready.then(()=>{if(!api.state.busy&&api.state.edition===edition){api.reflow();position();}});
 document.getElementById('close').onclick=close;document.querySelector('.brand').href='../index.html';document.querySelector('.brand').onclick=e=>{e.preventDefault();close();};
 document.querySelectorAll('[data-full-archive]').forEach(b=>b.onclick=()=>send({type:'archive',mode:b.dataset.fullArchive,person:api.state.edition===1?'Judas':'Ambrose'}));
 addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.channel===channel&&e.data.type==='close-request')close();});
})();
