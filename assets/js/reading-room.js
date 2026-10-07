/* Connected leaf shadows, fine motes, and the accepted opening's paper response. */
(function(root,factory){const room=factory(root);if(typeof module==='object'&&module.exports)module.exports=room;else{root.ReadingRoom=room;room.mount(document);}})(typeof window==='object'?window:globalThis,function(root){
 'use strict';
 const TAU=Math.PI*2,COUNT=32;
 function seed(i){const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);}
 function point(a,b,c,t){return{x:(1-t)*(1-t)*a.x+2*(1-t)*t*b.x+t*t*c.x,y:(1-t)*(1-t)*a.y+2*(1-t)*t*b.y+t*t*c.y};}
 function canopy(time,w,h){
  const layouts=[[-.12,.11,.04,.14,.25,.47,8,1],[1.08,-.06,.94,.25,.80,.59,8,1.12],[1.04,1.09,.91,.92,.77,.82,5,.8]];
  return layouts.map((q,k)=>{
   const wind=Math.sin(time*.29+k*.9)*.65+Math.sin(time*.137+k)*.35;
   const start={x:q[0]*w,y:q[1]*h},control={x:(q[2]+wind*.008)*w,y:(q[3]+wind*.006)*h},end={x:(q[4]+wind*.018)*w,y:(q[5]+wind*.024)*h};
   const leaves=[];
   for(let i=0;i<q[6];i++){
    const t=.16+i/(q[6]-1)*.79,p=point(start,control,end,t),side=i%2?1:-1;
    const tangent=Math.atan2(2*(1-t)*(control.y-start.y)+2*t*(end.y-control.y),2*(1-t)*(control.x-start.x)+2*t*(end.x-control.x));
    const angle=tangent+side*(.70+seed(i+k*13)*.58)+Math.sin(time*.42+i*.67+k)*.075;
    const length=w*(.034+seed(i+42+k*20)*.026)*q[7],twig=length*(.17+seed(i+7)*.12);
    leaves.push({joint:p,x:p.x+Math.cos(angle)*twig,y:p.y+Math.sin(angle)*twig,angle,length,width:length*(.30+seed(i+30)*.08),alpha:.23+seed(i+k*8)*.13});
   }
   return {start,control,end,leaves,blur:5+k*1.6,lineWidth:Math.max(3,w*.0035)*q[7]};
  });
 }
 function dust(i,time,w,h){
  const depth=seed(i+33),speed=5+depth*11,span=w+120;
  const x=((seed(i+1)*span+time*speed)%span)-60+Math.sin(time*(.11+depth*.12)+i)*12;
  const y=((seed(i+13)*(h+100)-time*(1+depth*3))%(h+100)+(h+100))%(h+100)-50+Math.sin(time*.17+i*2)*11;
  const edge=Math.min(1,Math.max(0,x/70),Math.max(0,(w-x)/70),Math.max(0,y/50),Math.max(0,(h-y)/50));
  const beam=Math.exp(-Math.pow((x-(w*.25+y*.35))/(w*.32),2)),breath=.62+.38*Math.pow(Math.sin(time*(.13+depth*.08)+i),2);
  const kind=seed(i+80)<.19?'soft':seed(i+70)<.28?'facet':'fine';
  return{x,y,r:.5+Math.pow(depth,2)*1.25+(kind==='soft'?.35:0),angle:time*(depth-.5)*.15+i,alpha:(.25+beam*.5)*edge*breath,depth,kind,light:seed(i+67)>.57};
 }
 function mount(doc){
  const background=doc.getElementById('room-shadows'),foreground=doc.getElementById('room-air');if(!background||!foreground)return;
  const bg=background.getContext('2d'),air=foreground.getContext('2d');if(!bg||!air)return;
  const reduced=root.matchMedia('(prefers-reduced-motion: reduce)'),fine=root.matchMedia('(hover: hover) and (pointer: fine)');
  const opening=doc.getElementById('opening-note'),echoes=[...doc.querySelectorAll('.echo-panel')];
  let w=0,h=0,dpr=1,frame=0,last=0,elapsed=7,painted=0,pointerFrame=0,pointer=null;
  function size(){w=doc.documentElement.clientWidth;h=doc.documentElement.clientHeight;dpr=1;for(const c of [background,foreground]){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}draw(elapsed);}
  function drawRoom(t){
   bg.setTransform(dpr,0,0,dpr,0,0);bg.clearRect(0,0,w,h);
   for(const b of canopy(t,w,h)){
    bg.save();bg.filter=`blur(${b.blur}px)`;bg.lineCap='round';bg.strokeStyle='rgba(71,83,55,.28)';bg.lineWidth=b.lineWidth;
    bg.beginPath();bg.moveTo(b.start.x,b.start.y);bg.quadraticCurveTo(b.control.x,b.control.y,b.end.x,b.end.y);bg.stroke();
    for(const leaf of b.leaves){
     bg.lineWidth=b.lineWidth*.7;bg.beginPath();bg.moveTo(leaf.joint.x,leaf.joint.y);bg.lineTo(leaf.x,leaf.y);bg.stroke();
     bg.save();bg.translate(leaf.x,leaf.y);bg.rotate(leaf.angle);bg.fillStyle=`rgba(71,83,55,${leaf.alpha})`;
     const l=leaf.length,v=leaf.width;bg.beginPath();bg.moveTo(0,0);bg.bezierCurveTo(l*.35,-v,l*.82,-v*.65,l,0);bg.bezierCurveTo(l*.7,v*.55,l*.16,v*.8,0,0);bg.fill();bg.restore();
    }
    bg.restore();
   }
  }
  function drawAir(t){
   air.setTransform(dpr,0,0,dpr,0,0);air.clearRect(0,0,w,h);
   for(let i=0;i<COUNT;i++){
    const d=dust(i,t,w,h);if(d.alpha<=0)continue;
    air.save();air.translate(d.x,d.y);air.rotate(d.angle);air.globalAlpha=d.alpha;air.fillStyle=d.light?'#fff8e7':'#857c5b';
    air.filter='none';air.beginPath();
    if(d.kind==='facet'){air.moveTo(-d.r*.8,0);air.lineTo(d.r*.65,-d.r*.5);air.lineTo(d.r*.4,d.r*.7);air.closePath();}else air.ellipse(0,0,d.r,d.r*(.65+d.depth*.32),0,0,TAU);
    air.fill();air.restore();
   }
  }
  function draw(t){drawRoom(t);if(reduced.matches){air.setTransform(dpr,0,0,dpr,0,0);air.clearRect(0,0,w,h);}else drawAir(t);}
  function paused(){return doc.hidden||reduced.matches||!!doc.querySelector('dialog[open]');}
  function tick(now){frame=0;if(!last)last=now;elapsed+=Math.min(.06,Math.max(0,(now-last)/1000));last=now;if(now-painted>=1000/18){drawAir(elapsed);painted=now;}if(!paused())frame=root.requestAnimationFrame(tick);}
  function resetPointer(){
   pointer=null;if(pointerFrame){root.cancelAnimationFrame(pointerFrame);pointerFrame=0;}
   opening?.classList.remove('is-near-paper');
   if(opening)for(const key of ['paper-rx','paper-ry','paper-x','paper-y','paper-near'])opening.style.removeProperty('--'+key);
   echoes.forEach(n=>n.classList.remove('room-near'));
  }
  function update(){
   doc.body.classList.toggle('ambient-paused',doc.hidden||!!doc.querySelector('dialog[open]'));
   if(frame){root.cancelAnimationFrame(frame);frame=0;}last=0;if(paused()){resetPointer();if(reduced.matches)draw(elapsed);}else frame=root.requestAnimationFrame(tick);
  }
  function near(node,p,padding){if(!node||node.hidden)return null;const r=node.getBoundingClientRect();if(!r.width||p.x<r.left-padding||p.x>r.right+padding||p.y<r.top-padding||p.y>r.bottom+padding)return null;return{x:Math.min(1,Math.max(0,(p.x-r.left)/r.width)),y:Math.min(1,Math.max(0,(p.y-r.top)/r.height))};}
  function respond(){
   pointerFrame=0;if(!pointer||paused())return;
   const p=near(opening,pointer,45);opening?.classList.toggle('is-near-paper',!!p);
   if(opening){opening.style.setProperty('--paper-rx',p?((.5-p.y)*3).toFixed(2)+'deg':'0deg');opening.style.setProperty('--paper-ry',p?((p.x-.5)*4).toFixed(2)+'deg':'0deg');opening.style.setProperty('--paper-x',p?(p.x*100).toFixed(1)+'%':'50%');opening.style.setProperty('--paper-y',p?(p.y*100).toFixed(1)+'%':'50%');opening.style.setProperty('--paper-near',p?'.8':'0');}
   echoes.forEach(n=>n.classList.toggle('room-near',!!near(n,pointer,15)));
  }
  doc.addEventListener('pointermove',e=>{if(paused()||!fine.matches||e.pointerType!=='mouse'||e.buttons){resetPointer();return;}pointer={x:e.clientX,y:e.clientY};if(!pointerFrame)pointerFrame=root.requestAnimationFrame(respond);},{passive:true});
  doc.addEventListener('pointerout',e=>{if(!e.relatedTarget)resetPointer();},{passive:true});doc.addEventListener('pointerdown',resetPointer,{passive:true});doc.getElementById('book-viewport')?.addEventListener('wheel',resetPointer,{passive:true});
  doc.addEventListener('visibilitychange',update);doc.querySelectorAll('dialog').forEach(n=>new root.MutationObserver(update).observe(n,{attributes:true,attributeFilter:['open']}));
  reduced.addEventListener('change',update);fine.addEventListener('change',resetPointer);root.addEventListener('resize',size);size();update();return{pause:update,resize:size};
 }
 return{dust,canopy,mount,count:COUNT};
});
