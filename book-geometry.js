(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FoldBook=api;})(typeof window==='object'?window:globalThis,function(){
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t;
  function dimensions(width,height){
    const h=Math.max(210,Math.min(790,height*.93));
    const w=Math.max(200,Math.min(560,h*.72,width<650?width*.84:560));
    return {w,h};
  }
  function frame(position,width,height,count,reduced=false){
    const {w,h}=dimensions(width,height),p=clamp(position,0,count-1),leaves=[];
    let x=0,z=0;
    for(let i=0;i<count;i++){
      const a=(i%2===0?1:-1)*(reduced?22:22+clamp(Math.abs(i-p)-.25,0,2.8)*11);
      const rad=a*Math.PI/180,dx=w*Math.cos(rad),dz=-w*Math.sin(rad);
      leaves.push({i,x:x+dx/2,z:z+dz/2,a,start:{x,z},end:{x:x+dx,z:z+dz}});
      x+=dx;z+=dz;
    }
    const left=Math.floor(p),f=p-left,right=Math.min(count-1,left+1);
    const centerX=mix(leaves[left].x,leaves[right].x,f),centerZ=mix(leaves[left].z,leaves[right].z,f);
    return {w,h,leaves:leaves.map(l=>({...l,x:l.x-centerX,z:l.z-centerZ,attention:clamp(1-Math.abs(l.i-p)/2.8)}))};
  }
  function wheelDelta(x,y,mode,height){let d=Math.abs(x)>Math.abs(y)?x:y;if(mode===1)d*=24;else if(mode===2)d*=height;return clamp(d,-350,350)/540;}
  function rulerPosition(clientX,left,width,count){return width>0?clamp((clientX-left)/width)*(count-1):0;}
  function catLayout(position,left,width,viewport,catWidth,count){
    const marker=left+clamp(position,0,count-1)/(count-1)*width;
    const unit=width/Math.max(1,count-1);
    return {offset:-unit,tailX:224,marker,width:unit};
  }
  return {clamp,mix,dimensions,frame,wheelDelta,rulerPosition,catLayout};
});
