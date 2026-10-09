export const ports={A:{name:'老码头',x:105,y:330,description:'早餐摊收了伞，货箱还在木栈桥上。'},B:{name:'芦苇湾',x:190,y:125,description:'木屋前有人修网。水鸟在芦苇间落下。'},C:{name:'沙洲',x:365,y:295,description:'浅水道露不露底，要看潮水的意思。'},D:{name:'灯塔岛',x:490,y:100,description:'塔上的灯还没亮，看守人正等零件。'},E:{name:'东港',x:605,y:355,description:'港口比别处热闹，回程也有人托东西。'}};
export const routes=[{a:'A',b:'B',hours:2},{a:'A',b:'C',hours:3},{a:'B',b:'C',hours:2},{a:'B',b:'D',hours:4},{a:'C',b:'D',hours:2,shallow:true},{a:'C',b:'E',hours:4},{a:'D',b:'E',hours:2}];
export const jobs=[{id:'j1',name:'一篮早面包',from:'A',to:'B',size:1,due:6},{id:'j2',name:'灯塔的齿轮箱',from:'A',to:'D',size:2,due:14},{id:'j3',name:'给东港的信',from:'A',to:'E',size:1,due:18},{id:'j4',name:'修好的渔网',from:'B',to:'C',size:1,due:10},{id:'j5',name:'两罐蜂蜜',from:'B',to:'E',size:1,due:20},{id:'j6',name:'借来的小提琴',from:'C',to:'A',size:1,due:18},{id:'j7',name:'一袋旧书',from:'D',to:'B',size:1,due:22},{id:'j8',name:'给老码头的药箱',from:'E',to:'A',size:1,due:26}];
export const tide=t=>['低潮','涨潮','高潮','落潮'][Math.floor((t%8)/2)];
export const time=t=>`${t+6>=24?'次日 ':''}${String((t+6)%24).padStart(2,'0')}:00`;
export const open=(r,t)=>!r.shallow||(t%8>=2&&t%8<6);
export const used=s=>s.cargo.reduce((sum,id)=>sum+jobs.find(j=>j.id===id).size,0);
export const ended=s=>s.t>=28||s.done.length===jobs.length;
export function fresh(){return {version:1,t:0,port:'A',cargo:[],waiting:Object.fromEntries(Object.keys(ports).map(p=>[p,jobs.filter(j=>j.from===p).map(j=>j.id)])),done:[],log:['06:00 · 在老码头解开缆绳。先挑一批货吧。']};}
export function act(state,kind,target){
 const s=structuredClone(state);const note=m=>s.log.push(`${time(s.t)} · ${m}`);
 if(ended(s))return {state,error:'今天已经收船了。可以重新开航，再试一条路线。'};
 if(kind==='load'){
  const j=jobs.find(j=>j.id===target);if(!j||!s.waiting[s.port].includes(target))return {state,error:'这件货不在当前码头。'};
  if(used(s)+j.size>3)return {state,error:'船舱装不下了。可以先卸下一件，或带这批货出发。'};
  s.waiting[s.port]=s.waiting[s.port].filter(id=>id!==target);s.cargo.push(target);note(`装上${j.name}。`);
 }else if(kind==='unload'){
  if(!s.cargo.includes(target))return {state,error:'这件货不在船上。'};
  s.cargo=s.cargo.filter(id=>id!==target);s.waiting[s.port].push(target);note(`把${jobs.find(j=>j.id===target).name}留在${ports[s.port].name}，以后可以取回。`);
 }else if(kind==='sail'){
  const r=routes.find(r=>(r.a===s.port&&r.b===target)||(r.b===s.port&&r.a===target));
  if(!r)return {state,error:'这两个码头之间没有直达航道。'};
  if(!open(r,s.t))return {state,error:'浅水道还不能走。等一等，或从芦苇湾绕行。'};
  if(s.t+r.hours>28)return {state,error:'这一程会超过收船时间。可以等到收船，或走一条短些的航线。'};
  s.t+=r.hours;s.port=target;note(`经过${r.hours}小时，靠上${ports[target].name}。`);
  for(const id of [...s.cargo]){const j=jobs.find(j=>j.id===id);if(j.to===target){s.cargo=s.cargo.filter(x=>x!==id);s.done.push({id,at:s.t,onTime:s.t<=j.due});note(`${j.name}送到了${s.t<=j.due?'，没有迟到':'，晚了'+(s.t-j.due)+'小时'}。`);}}
 }else if(kind==='wait'){s.t++;note(`留在${ports[s.port].name}等了一小时，${tide(s.t)}。`);}
 else return {state,error:'没有执行这个操作。'};
 return {state:s,error:null};
}
