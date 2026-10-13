(function(root){'use strict';
 const dot=(p,n)=>p.x*n.x+p.y*n.y;
 function clip(poly,n,d,positive){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=dot(a,n)-d,db=dot(b,n)-d,ia=positive?da>=-1e-8:da<=1e-8,ib=positive?db>=-1e-8:db<=1e-8;if(ia)out.push(a);if(ia!==ib){const t=da/(da-db);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}return out;}
 function frame(w,h,t){t=Math.min(1,Math.max(.00001,t));const c={x:w-2*w*t,y:h-h*.32*Math.sin(Math.PI*t)},dx=w-c.x,dy=h-c.y,l=Math.hypot(dx,dy),n={x:dx/l,y:dy/l},d=dot({x:(w+c.x)/2,y:(h+c.y)/2},n),rect=[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
  const front=clip(rect,n,d,false),fold=clip(rect,n,d,true),reflect=p=>({x:p.x-2*n.x*(dot(p,n)-d),y:p.y-2*n.y*(dot(p,n)-d)}),back=fold.map(reflect),seam=[];
  for(let i=0;i<rect.length;i++){const a=rect[i],b=rect[(i+1)%rect.length],da=dot(a,n)-d,db=dot(b,n)-d;if(da*db<=0&&Math.abs(da-db)>1e-8){const s=da/(da-db);if(s>=0&&s<=1)seam.push({x:a.x+(b.x-a.x)*s,y:a.y+(b.y-a.y)*s});}}
  const a=1-2*n.x*n.x,b=-2*n.x*n.y,dd=1-2*n.y*n.y,e=2*n.x*d,f=2*n.y*d;
  // The reverse leaf is mirrored before reflection, so text lands upright on the left.
  return {front,fold,back,seam,corner:c,normal:n,matrix:[-a,-b,b,dd,a*w+e,b*w+f],reflect};
 }
 function polygon(p){return 'polygon('+p.map(v=>v.x.toFixed(3)+'px '+v.y.toFixed(3)+'px').join(',')+')';}
 function area(p){return Math.abs(p.reduce((s,v,i)=>{const q=p[(i+1)%p.length];return s+v.x*q.y-v.y*q.x;},0)/2);}
 const api={frame,polygon,area};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PageCurl=api;
})(typeof window!=='undefined'?window:globalThis);
