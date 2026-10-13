(function(root){'use strict';
 const Curl=typeof module!=='undefined'?require('./page-curl'):root.PageCurl;
 function surface(w,h,t){const f=Curl.frame(w,h,Math.max(.00001,Math.min(1,t))),r=w*.115*Math.sin(Math.PI*t),n=f.normal,d=(w+f.corner.x)*n.x/2+(h+f.corner.y)*n.y/2,a=d-Math.PI*r/2;
  function map(x,y){if(t<=.00001)return{x,y,z:0,angle:0};if(t>=.99999)return{x:-x,y,z:0,angle:Math.PI};const u=x*n.x+y*n.y-a;let along=u,z=0,angle=0;if(u>0){angle=Math.min(Math.PI,u/r);if(angle<Math.PI){along=r*Math.sin(angle);z=r*(1-Math.cos(angle));}else{along=Math.PI*r-u;z=2*r;}}
   const delta=along-u;return{x:x+n.x*delta+z*.055,y:y+n.y*delta-z*.16,z,angle};
  }
  return {map,r,n,a,d,frame:f};
 }
 function clip(p,n,d,positive){const out=[];for(let i=0;i<p.length;i++){const u=p[i],v=p[(i+1)%p.length],du=u.x*n.x+u.y*n.y-d,dv=v.x*n.x+v.y*n.y-d,inside=positive?du>=0:du<=0,next=positive?dv>=0:dv<=0;if(inside)out.push(u);if(inside!==next){const t=du/(du-dv);out.push({x:u.x+(v.x-u.x)*t,y:u.y+(v.y-u.y)*t});}}return out;}
 function path(c,points){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();}
 function triangle(c,img,uv,dst,w,h,shades){const [u,v,z]=uv,[a,b,d]=dst,det=(v.x-u.x)*(z.y-u.y)-(z.x-u.x)*(v.y-u.y);if(Math.abs(det)<1e-8)return;const A=((b.x-a.x)*(z.y-u.y)-(d.x-a.x)*(v.y-u.y))/det,B=((b.y-a.y)*(z.y-u.y)-(d.y-a.y)*(v.y-u.y))/det,C=((d.x-a.x)*(v.x-u.x)-(b.x-a.x)*(z.x-u.x))/det,D=((d.y-a.y)*(v.x-u.x)-(b.y-a.y)*(z.x-u.x))/det,E=a.x-A*u.x-C*u.y,F=a.y-B*u.x-D*u.y;
  const cx=(a.x+b.x+d.x)/3,cy=(a.y+b.y+d.y)/3,expanded=dst.map(p=>{const dx=p.x-cx,dy=p.y-cy,len=Math.hypot(dx,dy)||1;return{x:p.x+dx/len*.45,y:p.y+dy/len*.45};});
  c.save();path(c,expanded);c.clip();c.transform(A,B,C,D,E,F);c.drawImage(img,0,0,w,h);c.restore();if(Math.max(...shades)>.001){c.save();path(c,expanded);const low=shades.indexOf(Math.min(...shades)),high=shades.indexOf(Math.max(...shades));if(low===high)c.fillStyle='rgba(68,56,38,'+shades[0]+')';else{const g=c.createLinearGradient(dst[low].x,dst[low].y,dst[high].x,dst[high].y);g.addColorStop(0,'rgba(68,56,38,'+shades[low]+')');g.addColorStop(1,'rgba(68,56,38,'+shades[high]+')');c.fillStyle=g;}c.fill();c.restore();}
 }
 function render(c,front,back,w,h,t,quality=34){if(t<=.00001){c.drawImage(front,0,0,w,h);return {triangles:0,radius:0};}if(t>=.99999){c.drawImage(back,-w,0,w,h);return {triangles:0,radius:0};}const s=surface(w,h,t),rect=[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],lift=Math.sin(Math.PI*t);
  c.save();
  // A lifted sheet casts a broad soft shadow; contact is darker and narrower.
  if(lift>.002){const outline=[];for(let k=0;k<4;k++)for(let j=0;j<=24;j++){const p=rect[k],q=rect[(k+1)%4],v=s.map(p.x+(q.x-p.x)*j/24,p.y+(q.y-p.y)*j/24);outline.push({x:v.x+v.z*.14,y:v.y+v.z*.25});}
   c.save();c.shadowColor='rgba(47,42,31,'+(.34*lift)+')';c.shadowBlur=5+s.r*.32;c.shadowOffsetX=2;c.shadowOffsetY=3;path(c,outline);c.fillStyle='rgba(53,45,31,'+(.20*lift)+')';c.fill();c.restore();
  }
  const flat=clip(rect,s.n,s.a,false);if(flat.length>2){c.save();path(c,flat);c.clip();c.drawImage(front,0,0,w,h);c.restore();}
  const cols=quality,rows=Math.round(quality*h/w),vertices=[];for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const u={x:w*x/cols,y:h*y/rows};vertices.push({uv:u,...s.map(u.x,u.y)});}
  const triangles=[];for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const k=y*(cols+1)+x,quad=[vertices[k],vertices[k+1],vertices[k+cols+2],vertices[k+cols+1]];for(const tri of [[quad[0],quad[1],quad[2]],[quad[0],quad[2],quad[3]]]){if(tri.every(v=>v.angle===0)||tri.every(v=>v.angle>=Math.PI))continue;tri.z=tri.reduce((sum,v)=>sum+v.z,0)/3;tri.angle=tri.reduce((sum,v)=>sum+v.angle,0)/3;triangles.push(tri);}}
  triangles.sort((a,b)=>a.z-b.z);
  for(const tri of triangles){const backFace=tri.angle>Math.PI/2,uv=tri.map(v=>({x:backFace?w-v.uv.x:v.uv.x,y:v.uv.y})),shades=tri.map(v=>.36*Math.pow(Math.sin(v.angle),2)*lift);triangle(c,backFace?back:front,uv,tri,w,h,shades);}
  const folded=clip(rect,s.n,s.a+Math.PI*s.r,true);if(folded.length>2){c.save();path(c,folded.map(p=>s.map(p.x,p.y)));c.clip();const m=s.frame.matrix;c.transform(m[0],m[1],m[2],m[3],m[4]+2*s.r*.055,m[5]-2*s.r*.16);c.drawImage(back,0,0,w,h);c.restore();}
  // Fine paper rim follows the curved boundary, rather than a straight fold.
  if(lift>.015){c.beginPath();for(let j=0;j<=60;j++){const p=s.map(w,h*j/60);j?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.strokeStyle='rgba(255,249,227,'+(.6*lift)+')';c.lineWidth=.75;c.stroke();}
  c.restore();return {triangles:triangles.length,radius:s.r};
 }
 const api={surface,render};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PaperSurface=api;
})(typeof window!=='undefined'?window:globalThis);
