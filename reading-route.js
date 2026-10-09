(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReadingRoute=api;})(typeof window==='object'?window:globalThis,function(){
 const holds=[0,2.7,.7,.85,.85,1.8,.9,3.6,.9,.9,.9,.9,1.1,1,1.2,0],starts=[0];
 for(let i=1;i<holds.length;i++)starts[i]=starts[i-1]+holds[i-1]+1;
 const total=starts[15],clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const ease=t=>t*t*t*(t*(t*6-15)+10);
 function inverse(v){let a=0,b=1;for(let i=0;i<32;i++){const m=(a+b)/2;if(ease(m)<v)a=m;else b=m;}return(a+b)/2;}
 function sample(value){
  const x=clamp(value,0,total);
  for(let i=0;i<15;i++){
   if(holds[i]&&x>=starts[i]&&x<=starts[i]+holds[i])return {position:i,page:i,progress:clamp((x-starts[i])/holds[i]),holding:true,cursor:x,total};
   if(x<starts[i+1]){const t=ease(clamp(x-starts[i]-holds[i]));return {position:i+t,page:t<.5?i:i+1,progress:t<.5?1:0,holding:false,cursor:x,total};}
  }
  return {position:15,page:15,progress:1,holding:false,cursor:x,total};
 }
 function locate(page,progress=0){const p=clamp(page,0,15),i=Math.floor(p),f=p-i;return starts[i]+(f?holds[i]+inverse(f):holds[i]*clamp(progress));}
 function scene(s){
  const p=s.page,t=s.progress;
  if(p===1)return {stage:t<.12?0:t<.36?1:t<.64?2:3,stages:4,cup:ease(clamp((t-.64)/.2)),local:t};
  if(p===7)return {stage:Math.min(3,Math.floor(t*4)),stages:4,local:t>=1?1:(t*4)%1};
  if(p===5)return {stage:t<.6?0:1,stages:2,local:t<.6?t/.6:(t-.6)/.4};
  return {stage:t<.16?0:t<.44?1:2,stages:3,local:t};
 }
 function advance(cursor,target,delta){return clamp(clamp(target+delta,cursor-.62,cursor+.62),0,total);}
 return {holds,starts,total,ease,sample,locate,scene,advance};
});
