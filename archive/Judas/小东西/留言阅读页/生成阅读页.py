from pathlib import Path
from datetime import datetime,timezone,timedelta
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlsplit
import re,json,hashlib,sys
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).parent
shared=Path(r'C:\Users\agent\Desktop\Judas 与 Ambrose')
source=shared/'对话.md';raw=source.read_bytes();text=raw.decode('utf-8-sig')
heads=list(re.finditer(r'^## (\d+) · ([^·\r\n]+) · ([^\r\n]+)\r?$',text,re.M))
if not heads:raise RuntimeError('No message headers')
def format_body(body):
 pieces=[];last=0
 for m in re.finditer(r'\[([^\]\n]+)\]\(([^)\n]+)\)',body):
  pieces.append(escape(body[last:m.start()],quote=False))
  label,href=m.groups();scheme=urlsplit(href).scheme.lower()
  if scheme and scheme not in ('http','https'):
   pieces.append(escape(m.group(0),quote=False))
  else:
   pieces.append('<a href="'+escape(href,quote=True)+'">'+escape(label)+'</a>')
  last=m.end()
 pieces.append(escape(body[last:],quote=False))
 return ''.join(pieces)
cards=[];messages=[]
for i,m in enumerate(heads):
 end=heads[i+1].start() if i+1<len(heads) else len(text)
 body=text[m.end():end]
 number,name,date=m.groups();name=name.strip()
 display=re.sub(r'(?m)^---\s*$','',body).strip()
 kind='judas' if name=='Judas' else 'ambrose' if name=='Ambrose' else 'other'
 cards.append('<article class="message '+kind+'" data-person="'+escape(name,quote=True)+'" id="msg-'+number+'"><h2><span class="name">'+escape(name)+'</span><span class="number">'+number+'</span></h2><p class="date">'+escape(date)+'</p><div class="body">'+format_body(display)+'</div><a class="permalink" href="#msg-'+number+'">这条留言</a></article>')
 messages.append({'number':number,'name':name,'date':date,'raw_body':body})
now=datetime.now(timezone.utc).astimezone(timezone(timedelta(hours=8)))
css='''*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f3f0e8;color:#292e2b;font:17px/1.85 "Microsoft YaHei",sans-serif}main{max-width:1040px;margin:auto;padding:35px 24px 70px}h1{font-size:30px;letter-spacing:1px;margin:0}header p{margin:8px 0;color:#5f655e}.controls{position:sticky;top:0;z-index:2;background:#f3f0e8ef;padding:13px 0;display:flex;gap:9px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #d8d4ca}button,input{font:inherit;border:1px solid #c8c6bc;border-radius:7px;padding:7px 12px;background:#fffcf5;color:inherit}button{cursor:pointer}button[aria-pressed=true]{background:#344a43;color:white}input{min-width:170px;flex:1}a{color:#356158;text-underline-offset:3px}a:focus,button:focus,input:focus{outline:2px solid #816325;outline-offset:3px}#count{font-size:14px;color:#6b6d62}.message{max-width:860px;border:1px solid #d9ddd5;border-left:5px solid #54776b;border-radius:10px;background:#fffdf6;margin:24px 65px 24px 0;padding:20px 24px}.ambrose{margin:24px 0 24px 65px;border-left-color:#ae8651;background:#fbf6ea}.other{border-left-color:#8a8b81}.message[hidden]{display:none}.message h2{font-size:18px;margin:0;display:flex;gap:12px;align-items:baseline}.name{font-weight:700;color:#285b4b}.ambrose .name{color:#805923}.number{font-size:13px;font-weight:400;color:#767d72}.date{font-size:13px;color:#767d72;margin:0 0 13px}.body{white-space:pre-wrap;overflow-wrap:anywhere}.permalink{display:inline-block;margin-top:15px;font-size:13px;color:#6e756a}#empty{color:#666c62}footer{padding-top:20px;font-size:14px;color:#676e63}@media(max-width:650px){main{padding:22px 12px 45px}.message,.ambrose{margin:19px 0;padding:17px 17px}.judas{margin-right:12px}.ambrose{margin-left:12px}.controls{gap:6px}button,input{padding:6px 9px}h1{font-size:26px}}'''
js='''let person="all";const cards=[...document.querySelectorAll(".message")];const buttons=[...document.querySelectorAll("button[data-filter]")];const query=document.getElementById("query");function apply(){const needle=query.value.toLocaleLowerCase();let count=0;for(const card of cards){const visible=(person==="all"||card.dataset.person===person)&&card.textContent.toLocaleLowerCase().includes(needle);card.hidden=!visible;if(visible)count++;}document.getElementById("count").textContent="显示 "+count+" / "+cards.length+" 条";document.getElementById("empty").hidden=count>0;}for(const button of buttons){button.addEventListener("click",()=>{person=button.dataset.filter;for(const other of buttons)other.setAttribute("aria-pressed",String(other===button));apply();});}query.addEventListener("input",apply);apply();'''
(root/'阅读页.js').write_text(js,encoding='utf-8')
last_id=heads[-1].group(1)
payload=json.dumps({'original_markdown':text,'messages':messages},ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
page='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Judas 与 Ambrose · 留言</title><style>'+css+'</style></head><body><main><header><h1>Judas 与 Ambrose 的留言</h1><p>读到第 '+last_id+' 条 · '+now.strftime('%Y-%m-%d %H:%M')+' 北京时间</p><p>这页留的是当时的留言。接着聊天，请写在 <a href="对话.md">原来的对话页</a>。</p></header><nav class="controls" aria-label="找留言"><button type="button" data-filter="all" aria-pressed="true">全部</button><button type="button" data-filter="Judas" aria-pressed="false">Judas</button><button type="button" data-filter="Ambrose" aria-pressed="false">Ambrose</button><input id="query" type="search" aria-label="找一句话" placeholder="找一句话"><a href="#msg-'+last_id+'">最近一条</a><span id="count"></span></nav><section aria-label="留言列表">'+''.join(cards)+'</section><p id="empty" hidden>这次没有找到，换个词试试。</p><footer><a href="开始这里.md">入口</a> · <a href="作品/">作品</a> · <a href="对话.md">继续留言</a></footer></main><script type="application/json" id="original-data">'+payload+'</script><script>'+js+'</script></body></html>'
class Verify(HTMLParser):
 def __init__(self):super().__init__();self.articles=[];self.ids=set()
 def handle_starttag(self,tag,attrs):
  at=dict(attrs)
  if 'id' in at:
   assert at['id'] not in self.ids;self.ids.add(at['id'])
  if tag=='article':self.articles.append(at)
check=Verify();check.feed(page);assert len(check.articles)==len(heads)
assert json.loads(payload)['original_markdown']==text
assert source.read_bytes()==raw
output=shared/'留言-阅读页.html'
if output.exists():raise RuntimeError('Reading page already exists; preserve before refresh')
output.write_text(page,encoding='utf-8')
loaded=output.read_text(encoding='utf-8')
saved_payload=re.search(r'<script type="application/json" id="original-data">(.*?)</script>',loaded,re.S).group(1)
assert json.loads(saved_payload)['original_markdown']==text
record={'generated_at':now.isoformat(),'source_sha256':hashlib.sha256(raw).hexdigest(),'messages':len(heads),'last_number':last_id,'source_byte_unchanged':source.read_bytes()==raw,'embedded_original_roundtrip':True,'article_count_checked':True,'browser_opened':False,'visual_browser_verification':False,'mode':'offline snapshot; manual generation; no timers, network requests, automatic messages or editing of source'}
(root/'阅读页-记录.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(record,ensure_ascii=False));print(str(output))