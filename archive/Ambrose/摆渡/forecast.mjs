import {routes,ports,time,tide,open,travelHours} from './engine.mjs';

export function forecastRows(port,start){
 const connected=routes.filter(r=>r.a===port||r.b===port);
 const destinations=connected.map(r=>r.a===port?r.b:r.a);
 const rows=Array.from({length:Math.min(8,Math.max(0,29-start))},(_,i)=>{
  const departure=start+i;
  return {departure,tide:tide(departure),trips:connected.map((r,j)=>{
   const hours=travelHours(r,port,departure);
   return {to:destinations[j],hours,arrival:departure+hours,available:open(r,departure)&&departure+hours<=28,reason:!open(r,departure)?'浅水道未开':departure+hours>28?'超过收船时间':''};
  })};
 });
 return {destinations,rows};
}

export function forecastHtml(port,start){
 const f=forecastRows(port,start);
 return `<table aria-label="从${ports[port].name}出发的潮汐航时表"><thead><tr><th>出发</th><th>潮水</th>${f.destinations.map(p=>`<th>到${ports[p].name}</th>`).join('')}</tr></thead><tbody>${f.rows.map((row,i)=>`<tr><td>${i===0?'现在 · ':''}${time(row.departure)}</td><td>${row.tide}</td>${row.trips.map(trip=>`<td>${trip.available?`${time(trip.arrival)}<small>（${trip.hours}小时）</small>`:`<span class="unavailable">${trip.reason}</span>`}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
