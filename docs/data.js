const fold=v=>String(v??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const key=v=>{let x=fold(v).replace(/['.\s-]/g,'');return /^\d+$/.test(x)?x.replace(/^0+(?=\d)/,''):x};
const num=v=>Number(v)||0;
const sample=()=>Object.fromEntries(['boxes','orders','links','history','pending','aliases','config','manuals','kits'].map(k=>[k,structuredClone(BASE[k])]));
let db=sample(),revision=0;
const online=!!(CONEXAO.url&&CONEXAO.chave);
const localKey='buiatte.embalagens.v1';
const endpoint=CONEXAO.url.replace(/\/$/,'');
async function api(name,args){
 const headers={'Content-Type':'application/json',apikey:CONEXAO.chave};
 if(CONEXAO.chave.startsWith('eyJ'))headers.Authorization='Bearer '+CONEXAO.chave;
 const res=await fetch(endpoint+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(args)});
 if(!res.ok){const msg=await res.text();throw Error(msg.includes('CONFLITO')?'Outra estação salvou alterações. Atualize a página e repita.':'Falha no banco ('+res.status+'). Confira a conexão, a chave e o SQL de instalação.')}
 return res.json()
}
async function loadState(){let s=online?await api('emb_ler',{}):JSON.parse(localStorage.getItem(localKey)||'null');if(s){revision=s.rev;if(s.dados)db=s.dados}}
let saving=false;
async function change(fn){
 if(saving)throw Error('Aguarde a gravação em andamento.');
 saving=true;
 try{const next=structuredClone(db);fn(next);
 if(online)revision=await api('emb_salvar',{anterior:revision,novo:next});
 else{let last=JSON.parse(localStorage.getItem(localKey)||'null');if((last?.rev||0)!==revision)throw Error('Dados alterados em outra aba. Atualize a página.');localStorage.setItem(localKey,JSON.stringify({rev:revision+1,dados:next}));revision++}
 db=next}finally{saving=false}
}
function projection(b){
 const transit=db.orders.filter(o=>o[0]===b[0]&&String(o[4]).trim()&&['PENDENTE','PARCIAL','EM TRANSITO'].includes(fold(o[7]||'PENDENTE'))).reduce((s,o)=>s+Math.max(0,num(o[3])),0);
 const physical=num(b[7]),avg=num(b[9]),projected=physical+transit,min=Math.ceil(avg*(db.config[0]/7+db.config[1])),coverage=avg?+(physical/avg).toFixed(2):0;
 const status=projected<=0?'COMPRAR':transit>0&&physical<=min&&projected>min?'EM TRÂNSITO':!avg&&physical>0?'SEM CONSUMO':projected<=min?'COMPRAR':avg&&+(projected/avg).toFixed(2)<=db.config[2]?'ATENÇÃO':'NORMAL';
 return {physical,avg,min,coverage,transit,projected,status}
}
function references(v,historyFirst=false){
 const q=fold(v),d=q.replace(/\D/g,'');
 const matches=r=>{const raw=fold(r),n=raw.replace(/\D/g,'');return raw===q||(d&&n&&/^\d+$/.test(q)&&(d.length<=4?n.slice(-4).padStart(4,'0')===d.padStart(4,'0'):key(d)===key(n)))};
 const direct=db.boxes.find(b=>fold(b[0])===q);if(direct)return [direct];
 const historic=new Set(db.history.filter(r=>matches(r[2])).map(r=>r[1]));
 if(historyFirst&&historic.size)return db.boxes.filter(b=>historic.has(b[0]));
 const ids=new Set([...BASE.refs.map(r=>[r[0],r[2]]),...db.history.map(r=>[r[2],r[1]]),...db.boxes.map(b=>[b[1],b[0]])].filter(([r])=>matches(r)).map(r=>r[1]));
 return db.boxes.filter(b=>ids.has(b[0]))
}
function suggest(mat){
 const dims=mat.slice(3,6).map(Number).sort((a,b)=>a-b);
 if(fold(mat[7]).includes("NAO ENCONTRADO")||dims.some(x=>!(x>0))||dims.every(x=>x===1))return;
 return db.boxes.filter(b=>/caixa/i.test(b[2])&&!/kit|berço|calço|reforço|madeira/i.test(b[2])).map(b=>({b,d:b.slice(3,6).map(Number).sort((a,b)=>a-b)})).filter(o=>o.d.every((x,i)=>x>=dims[i])).sort((a,b)=>a.d.reduce((p,x)=>p*x,1)-b.d.reduce((p,x)=>p*x,1))[0]?.b
}
function findProduct(v){
 let lookup=db.aliases.find(a=>a[0]===String(v).trim())?.[1]??v;
 const find=rows=>rows.find(r=>fold(r[0])===fold(lookup))||rows.find(r=>key(r[0])===key(lookup));
 const mat=find(materials()),link=find(db.links),manual=find(db.manuals);
 const code=link?.[2]||manual?.[2];const box=code?db.boxes.find(b=>b[0]===code):mat?suggest(mat):null;
 return {sku:mat?.[0]??link?.[0]??manual?.[0],mat,link,manual,box,code:code||box?.[0],suggested:!code&&!!box,kit:manual&&db.kits.find(k=>key(k[0])===key(manual[5]))}
}
async function sheetRows(file){
 const zip=await JSZip.loadAsync(file);const xml=async p=>{const entry=zip.file(p);if(!entry)throw Error('Estrutura do Excel inválida.');return new DOMParser().parseFromString(await entry.async('string'),'application/xml')};
 const nodes=(el,name)=>Array.from(el.getElementsByTagNameNS('*',name));
 const book=await xml('xl/workbook.xml'),rels=nodes(await xml('xl/_rels/workbook.xml.rels'),'Relationship');
 const strings=zip.file('xl/sharedStrings.xml')?nodes(await xml('xl/sharedStrings.xml'),'si').map(n=>nodes(n,'t').map(t=>t.textContent).join('')):[];
 const priority=n=>({ESTOQUE:0,IMPORTAR:1}[fold(n.getAttribute('name'))]??2);
 for(const sh of nodes(book,'sheet').sort((a,b)=>priority(a)-priority(b))){
 const target=rels.find(r=>r.getAttribute('Id')===sh.getAttribute('r:id'))?.getAttribute('Target');if(!target)continue;
 const path=new URL(target,'https://xlsx.local/xl/').pathname.slice(1);
 const rows=nodes(await xml(path),'row').map(row=>{let values=[];for(const c of nodes(row,'c')){const letters=c.getAttribute('r').match(/^[A-Z]+/)[0];const col=[...letters].reduce((s,x)=>s*26+x.charCodeAt(0)-64,0)-1;const value=nodes(c,'v')[0]?.textContent??'';values[col]=c.getAttribute('t')==='s'?strings[+value]:c.getAttribute('t')==='inlineStr'?nodes(c,'t').map(t=>t.textContent).join(''):value}return values});
 const idx=rows.slice(0,10).findIndex(r=>r.some(x=>['CODIGO','CODIGO CONSCOD'].includes(fold(x)))&&r.some(x=>['QUANTIDADE','ESTOQUE ATUAL'].includes(fold(x))));
 if(idx>=0){let h=rows[idx];let code=h.findIndex(x=>['CODIGO','CODIGO CONSCOD'].includes(fold(x))),qty=h.findIndex(x=>['QUANTIDADE','ESTOQUE ATUAL'].includes(fold(x)));return {sheet:sh.getAttribute('name'),rows:rows.slice(idx+1).map(r=>[r[code],r[qty]])}}
 }throw Error('Nenhuma aba contém Código e Quantidade ou Estoque atual nas primeiras dez linhas.')
}
function countRows(rows){let qty=new Map(),pending=[];for(let [c,q] of rows){if(!String(c??'').trim())continue;let raw=String(q??'').trim(),n=Number(raw.includes(',')?raw.replaceAll('.','').replace(',','.'):raw),boxes=references(c);
 if(!raw||!Number.isFinite(n)||n<0||boxes.length!==1){pending.push([c,Number.isFinite(n)?n:0,!raw||!Number.isFinite(n)?'Quantidade inválida':n<0?'Quantidade negativa':'Código sem vínculo válido ou ambíguo']);continue}
 let id=boxes[0][0];qty.set(id,(qty.get(id)||0)+n)}return {qty,pending}}
function applyCount(s,date,name,{qty,pending}){
 s.history=s.history.filter(r=>!(r[0]===date&&qty.has(r[1])));
 for(const [id,n] of qty){const b=s.boxes.find(b=>b[0]===id);if(!s.history.some(r=>r[1]===id&&r[0]>date))b[7]=n;
 s.history.push([date,id,b[1],0,n,name,'Inventário confirmado'])}
 s.history.sort((a,b)=>a[0].localeCompare(b[0]));s.pending=s.pending.filter(r=>!(r[0]===date&&r[1]===name));s.pending.push(...pending.map(p=>[date,name,...p]))
}
