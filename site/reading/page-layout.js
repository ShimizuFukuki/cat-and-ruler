(function(root){'use strict';
 const Type=typeof module!=='undefined'&&module.exports?require('./book-type'):root.BookType;
 // Keep offsets into the original records. Reflow never rewrites the diary.
 function paginate(records,o){
  const pages=[];let page,used=0,lastDay=null;
  const leading=o.fontSize*o.lineHeight,bodyHeight=o.height-132;
  const measure=o.measure||((s)=>Array.from(s).reduce((n,c)=>n+(/[\x00-\x7f]/.test(c)?.53:1)*o.fontSize,0)),charWidths=new Map();
  const widthOf=ch=>{if(!charWidths.has(ch))charWidths.set(ch,measure(ch));return charWidths.get(ch);};
  function fresh(day,heading){page={day,heading,items:[]};pages.push(page);used=heading?58:0;}
  function lines(text,start){let end=start,width=0,lastBreak=-1;const max=o.width-(start===0?o.fontSize*2:0);
   if(o.context)return Type.line(text,start,o.width,o.fontSize,o.context).end;
   while(end<text.length){const ch=text[end];if(ch==='\n'){end++;break;}const cw=widthOf(ch);if(width+cw>max&&end>start){
     if(/[，。！？；：、）》」』】,.!?;:]/.test(ch)){end++;}else if(lastBreak>start&&end-lastBreak<12)end=lastBreak;break;
    }width+=cw;end++;if(/\s/.test(ch))lastBreak=end;}
   return Math.max(end,start+1);
  }
  for(const r of records){const dateLine=!!r.text&&/^\d{4}年\d{1,2}月\d{1,2}日$/.test(r.text.replace(/[\s\uFEFF]/g,''));if(!page)fresh(r.day,dateLine?'':r.heading||r.day);else if(r.day!==lastDay){if(used>bodyHeight*.62)fresh(r.day,dateLine?'':r.heading||r.day);else if(!dateLine){page.items.push({kind:'heading',text:r.heading||r.day,day:r.day,height:58});used+=58;}}
   if(r.label&&r.day===lastDay){if(used+58>bodyHeight)fresh(r.day,r.label);else{page.items.push({kind:'heading',text:r.label,height:58});used+=58;}}
   lastDay=r.day;
   if(r.kind==='image'){const height=Math.min(230,o.height*.30);if(used+height+18>bodyHeight)fresh(r.day,'');page.items.push({...r,height});used+=height+18;continue;}
   if(dateLine){if(used+58>bodyHeight)fresh(r.day,'');page.items.push({kind:'text',recordId:r.id,day:r.day,start:0,end:r.text.length,text:r.text,continued:false,dateLine:true,notes:r.notes||[],lines:1,height:58});used+=58;continue;}
   let pos=0;while(pos<r.text.length){if(used+leading>bodyHeight)fresh(r.day,'');const start=pos,room=Math.max(1,Math.floor((bodyHeight-used)/leading));let n=0;const lineBreaks=[];
    while(pos<r.text.length&&n<room){pos=lines(r.text,pos);lineBreaks.push(pos-start);n++;}
    page.items.push({kind:'text',recordId:r.id,day:r.day,start,end:pos,text:r.text.slice(start,pos),continued:start>0,reference:!!r.reference,notes:(r.notes||[]).filter(note=>note.offset>=start&&note.offset<pos),lines:n,lineBreaks,height:n*leading});used+=n*leading;
    if(pos<r.text.length)fresh(r.day,'');else used+=leading*.45;
   }
  }
  if(!pages.length)fresh('','');return pages;
 }
 const api={paginate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ReadingLayout=api;
})(typeof window!=='undefined'?window:globalThis);
