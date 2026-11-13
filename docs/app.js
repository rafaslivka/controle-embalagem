'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2});
const today=()=>new Date().toLocaleDateString('sv-SE');
const dt=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('/'):s;
const metric=(label,value)=>'<div class="metric"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>';
const stats=items=>'<div class="metrics">'+items.map(([l,v])=>metric(l,typeof v==='number'?fmt(v):v)).join('')+'</div>';
const table=(heads,rows)=>'<div class="tablewrap"><table><thead><tr>'+heads.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const heading=(title,sub='')=>'<h1>'+title+'</h1>'+(sub?'<p>'+sub+'</p>':'');
const tabs=['Consulta SKU','Dashboard','Painel semanal','Inventário','Compra futura','Cadastros'];
let voiceOn=false;
let active='',lookupMode='sku',last='',galleryToken=0,notifyTimer;
const notify=t=>{clearTimeout(notifyTimer);$('notice').textContent=t;notifyTimer=setTimeout(()=>$('notice').textContent='',6500)};
function handle(el,event,fn){el.addEventListener(event,async e=>{e.preventDefault();try{await fn(e)}catch(err){notify(err.message)}})}
function openDialog(html){$('dialogBody').innerHTML=html;if(!$('modal').open)$('modal').showModal()}
function navigate(name){active=name;galleryToken++;document.querySelector('nav').innerHTML=tabs.map(t=>'<button class="'+(t===name?'active':'')+'">'+t+'</button>').join('');document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>navigate(b.textContent));[consult,dashboard,panel,inventory,orders,catalog][tabs.indexOf(name)]()}
function consult(){
 $('main').innerHTML=heading('Consulta SKU','Consulte a embalagem e as instruções de montagem no posto de trabalho.')+'<section class="scan"><form id="scanForm" class="row"><label>Consultar por<select id="kind"><option value="sku">Produto · SKU, série ou EAN</option><option value="ref">Caixa · referência ou CONSCOD</option></select></label><label style="flex:3">Código<input id="scan" autocomplete="off" placeholder="Bipe ou digite o código" autofocus></label><button>Consultar</button></form><label class="voice"><input type="checkbox" id="voice"> Ler indicação em voz alta</label></section><div id="result" aria-live="polite"></div>';
 $('voice').checked=voiceOn;$('voice').disabled=!('speechSynthesis' in window);$('voice').onchange=()=>voiceOn=$('voice').checked;
 $('kind').value=lookupMode;$('kind').onchange=()=>{lookupMode=$('kind').value;last='';consult()};handle($('scanForm'),'submit',()=>{last=$('scan').value.trim();showResult();if(voiceOn){speechSynthesis.cancel();const result=$('result').querySelector('h2');if(result){const speech=new SpeechSynthesisUtterance([$('result').querySelector('.pill')?.textContent,result.textContent].filter(Boolean).join('. '));speech.lang='pt-BR';speechSynthesis.speak(speech)}}$('scan').select()});$('scan').value=last;showResult();$('scan').focus();$('scan').select()
}
function showResult(){
 galleryToken++;const res=$('result');if(!last){res.innerHTML='<div class="empty">Aguardando leitura do '+(lookupMode==='sku'?'produto':'código da caixa')+'.</div>';return}
 if(lookupMode==='ref'){const matches=references(last,true);if(matches.length!==1){res.innerHTML='<section><h2>'+(!matches.length?'Referência não localizada':'Referência compartilhada por mais de uma caixa')+'</h2>'+matches.map((b,i)=>'<p><button class="secondary" data-idx="'+i+'">'+esc(b[0]+' · '+b[2])+'</button></p>').join('')+'</section>';res.querySelectorAll('button').forEach(b=>b.onclick=()=>renderBox({code:matches[b.dataset.idx][0],box:matches[b.dataset.idx]}));return}renderBox({code:matches[0][0],box:matches[0]});return}
 const saved=(db.serialBoxes||[]).find(row=>row[0]===last);
 if(saved){renderBox({serial:last,code:saved[1],box:db.boxes.find(b=>b[0]===saved[1])});return}
 const p=findProduct(last);if(!p.sku){associateScan(last);return}renderBox(p)
}
function associateScan(scanned){
 const result=$('result');
 result.innerHTML='<section><h2>Série ou etiqueta sem vínculo</h2><p>Código lido: '+esc(scanned)+'</p><form id="associateScan"><label>SKU do material no Sênior<input required autocomplete="off" id="materialCode"></label><button>Associar ao material</button></form></section>';
 result.insertAdjacentHTML('beforeend','<div class="cols"></div>');
 offerBox({serial:scanned});
 handle($('associateScan'),'submit',async()=>{
   const entered=$('materialCode').value.trim();
   const material=findProduct(entered);
   if(!material.sku || key(material.sku)!==key(entered))throw Error('Informe um SKU cadastrado na base.');
   await change(state=>{
     if(state.aliases.some(row=>row[0]===scanned))throw Error('Etiqueta já associada. Atualize a consulta.');
     state.aliases.push([scanned,String(material.sku)]);
   });
   if(last===scanned&&active===tabs[0])showResult();
   notify('Etiqueta associada ao SKU '+material.sku+'.');
 });
}
function offerBox(product){
 const target=$('result').querySelector('.cols');
 const panel=document.createElement('section');
 const codes=[...new Set([...db.boxes.map(b=>b[0]),...db.links.map(r=>r[2]),...(db.serialBoxes||[]).map(r=>r[1])].filter(Boolean))];
 const choices=codes.map(code=>{
   const box=db.boxes.find(b=>b[0]===code);
   return option(code,box?.[2]?code+' · '+box[2]:code);
 }).join('');
 const scope=product.serial?'esta série':'este SKU';
 panel.innerHTML='<h2>Adicionar manual da caixa</h2><form id="bindBox"><label>Caixa cadastrada<select id="boxChoice"><option value="">Escolha ou digite abaixo</option>'+choices+'</select></label><label>Ou digite o nome ou código da caixa<input maxlength="100" id="boxTyped" placeholder="Ex.: Caixa reforçada 40 × 30"></label><button>Salvar caixa para '+scope+'</button></form>';
 target.append(panel);
 const typed=$('boxTyped'),choice=$('boxChoice');
 typed.oninput=()=>{if(typed.value.trim())choice.value=''};
 choice.onchange=()=>{if(choice.value)typed.value=''};
 handle($('bindBox'),'submit',async()=>{
   const input=(typed.value.trim()||choice.value).replace(/\s+/g,' ');
   if(!input)throw Error('Digite a caixa utilizada ou escolha uma da lista.');
   const code=codes.find(existing=>fold(existing)===fold(input))||input;
   await change(state=>{
     if(product.serial){
       const rows=state.serialBoxes??=[];
       const previous=rows.find(r=>r[0]===product.serial);
       if(previous)previous[1]=code;else rows.push([product.serial,code]);
     }else{
       const sku=String(product.sku);
       const index=state.links.findIndex(row=>key(row[0])===key(sku));
       const row=[sku,product.mat?.[1]||'',code,'Validado na Consulta SKU','CONFIRMADO'];
       if(index<0)state.links.push(row);else state.links[index]=row;
     }
   });
   if(panel.isConnected)showResult();
   notify('Caixa salva. Agora você pode enviar o manual.');
 });
}
function renderBox(p){
 const {box,manual,mat,kit,code}=p;
 const title=p.suggested?'Sugestão por dimensão':(p.sku||p.serial)?'Embalagem indicada':'Embalagem consultada';
 const fields=manual?[['Caixa ITL',manual[1]],['Reforço',manual[3]],['Calço',manual[4]],['Kit',manual[5]],['Movimentação',manual[6]],['Fonte',manual[7]]]:[];
 $('result').innerHTML='<div class="cols"><section><span class="pill '+(p.suggested?'warn':'')+'">'+esc(title)+'</span><h2 style="margin-top:12px">'+esc(code||'Sem caixa definida')+'</h2><p>'+esc(box?.[2]||manual?.[1]||(code?'Caixa cadastrada na consulta.':'Cadastre um vínculo validado para este produto.'))+'</p>'+(p.serial?'<p>Série '+esc(p.serial)+'</p>':'')+(p.sku?'<p><b>SKU '+esc(p.sku)+'</b> · '+esc(mat?.[1]||p.link?.[1]||'')+'</p>':'')+(p.suggested?'<p class="empty">Valide o encaixe, a proteção e a orientação antes de usar. A sugestão considera somente dimensões.</p>':'')+(p.link?'<p>'+esc([p.link[3],p.link[4]].filter(Boolean).join(' · '))+'</p>':'')+(box?'<p>Referência '+esc(box[1])+' · '+esc(box.slice(3,6).join(' × '))+' mm</p>'+boxStats(box):'')+(manual?'<h3>Instrução do compressor</h3><dl>'+fields.map(([k,v])=>'<dt>'+k+'</dt><dd>'+esc(v)+'</dd>').join('')+'</dl>'+(kit?'<h3>Composição do kit</h3><p>'+esc(kit.slice(1).filter(Boolean).join(' · '))+'</p>':'<p class="empty">Composição do kit pendente de validação no manual.</p>'):'')+'</section>'+(code&&!p.suggested?'<section><h2>Fotos e manual de montagem</h2><p>Arquivos da embalagem '+esc(code)+'.</p><div class="gallery" id="gallery"></div><form id="upload"><label>Adicionar foto ou manual<input required id="attachment" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"></label><p class="muted">JPG, PNG, WebP ou PDF · até 3 MB por arquivo</p><button>Enviar arquivo</button></form></section>':'')+'</div>';
 if(p.sku&&(!code||p.suggested)){offerBox(p);return}
 if(code){loadGallery(code).catch(e=>notify(e.message));handle($('upload'),'submit',async e=>{const btn=e.target.querySelector('button');btn.disabled=true;try{await attach(code,$('attachment').files[0]);if(btn.isConnected){$('attachment').value='';await loadGallery(code)}notify('Arquivo salvo.')}finally{btn.disabled=false}})}
}
function boxStats(b){const p=projection(b);return stats([['Saldo físico',p.physical],['Em trânsito',p.transit],['Projetado',p.projected],['Média semanal',p.avg],['Mínimo',p.min],['Cobertura (sem.)',p.coverage]])+'<span class="pill">'+esc(p.status)+'</span>'}
let idbPromise;function idb(){return idbPromise??=new Promise((resolve,reject)=>{const r=indexedDB.open('embalagens-anexos-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'id'}).createIndex('codigo','codigo');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function localFiles(code){const d=await idb();return new Promise((ok,no)=>{let r=d.transaction('files').objectStore('files').index('codigo').getAll(code);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function attach(code,f){
 if(!f||!['image/jpeg','image/png','image/webp','application/pdf'].includes(f.type)||!f.size||f.size>3145728)throw Error('Selecione uma imagem ou PDF de até 3 MB.');
 const uid=crypto.randomUUID();if(online){const url=await new Promise((ok,no)=>{let r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(f)});await api('emb_anexar',{uid,codigo:code,titulo:f.name.slice(0,200),mime:f.type,conteudo:url.split(',')[1]})}
 else{const d=await idb();await new Promise((ok,no)=>{const t=d.transaction('files','readwrite');t.objectStore('files').put({codigo:code,id:uid,nome:f.name,tipo:f.type,file:f});t.oncomplete=ok;t.onabort=()=>no(t.error)})}
}
let objectUrls=[];async function loadGallery(code){
 const token=++galleryToken;objectUrls.forEach(u=>URL.revokeObjectURL(u));objectUrls=[];const dest=$('gallery');dest.textContent='Carregando arquivos…';const files=online?await api('emb_listar',{codigo:code}):await localFiles(code);if(token!==galleryToken)return;
 dest.innerHTML=files.length?'':'<p class="empty">Nenhuma foto ou manual cadastrado para esta caixa.</p>';
 for(const f of files){let blob=f.file;if(!blob){const raw=await api('emb_arquivo',{uid:f.id});blob=new Blob([Uint8Array.from(atob(raw),v=>v.charCodeAt(0))],{type:f.tipo})}if(token!==galleryToken)return;const url=URL.createObjectURL(blob);objectUrls.push(url);const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=f.nome;if(f.tipo.startsWith('image/')){const img=document.createElement('img');img.alt=f.nome;img.src=url;a.prepend(img)}dest.append(a,document.createElement('hr'))}
}
const boxHeaders=['CONSCOD','Referência','Descrição','Dim. 1','Dim. 2','Dim. 3','Entrada inicial','Físico','Consumo acum.','Média/sem.','Mínimo','Cobertura','Status','Em trânsito','Projetado'];
const boxRow=b=>{const p=projection(b);return [...b.slice(0,8),Math.max(0,num(b[6])-p.physical),p.avg,p.min,p.coverage,p.status,p.transit,p.projected]};
function panel(){const rows=db.boxes.map(boxRow);$('main').innerHTML=heading('Painel semanal')+stats([['Caixas',rows.length],['Saldo físico',rows.reduce((s,r)=>s+num(r[7]),0)],['Comprar',rows.filter(r=>r[12]==='COMPRAR').length],['Atenção',rows.filter(r=>r[12]==='ATENÇÃO').length],['Prazo de entrega',db.config[0]+' dias']])+'<section><label>Filtrar caixa ou status<input id="filter"></label><div id="grid"></div></section>';const draw=()=>$('grid').innerHTML=table(boxHeaders,rows.filter(r=>fold(r.join(' ')).includes(fold($('filter').value))));$('filter').oninput=draw;draw()}
function dashboard(){
 const dates=db.history.map(r=>r[0]).sort();$('main').innerHTML=heading('Dashboard','Consumo e entradas apurados pela variação entre inventários.')+'<section><div class="fields"><label>Período<select id="period">'+['Todo o histórico','Hoje','Semana atual','Mês atual','Personalizado'].map(t=>'<option>'+t+'</option>').join('')+'</select></label><label>De<input type="date" id="from"></label><label>Até<input type="date" id="to"></label></div><div id="ind"></div></section><div class="cols"><article><h2>Maior consumo</h2><div id="cons"></div></article><article><h2>Maiores entradas</h2><div id="ent"></div></article></div><section><h2>Últimos inventários</h2><div id="recent"></div></section>';
 function draw(){let a=$('from').value,z=$('to').value;if(!a||!z||a>z){$('ind').textContent='Confira o período informado.';$('cons').textContent=$('ent').textContent=$('recent').textContent='';return}
 let prev=new Map(),rows=new Map(),days=new Map();for(const [date,id,ref,,raw] of [...db.history].sort((a,b)=>a[0].localeCompare(b[0]))){const n=num(raw),delta=prev.has(id)?n-prev.get(id):0;prev.set(id,n);if(date<a||date>z)continue;const r=rows.get(id)||[id,ref,0,0];r[2]+=Math.max(-delta,0);r[3]+=Math.max(delta,0);rows.set(id,r);let d=days.get(date)||[date,0,0];d[1]++;d[2]+=n;days.set(date,d)}
 let all=[...rows.values()],ps=db.boxes.map(projection),cov=ps.filter(x=>x.coverage>0);
 $('ind').innerHTML=stats([['Consumo',all.reduce((s,r)=>s+r[2],0)],['Entradas',all.reduce((s,r)=>s+r[3],0)],['Inventários',days.size],['Comprar agora',ps.filter(p=>p.status==='COMPRAR').length],['Atenção agora',ps.filter(p=>p.status==='ATENÇÃO').length],['Saldo zero agora',ps.filter(p=>!p.physical).length],['Cobertura média atual (sem.)',cov.length?cov.reduce((s,p)=>s+p.coverage,0)/cov.length:0]]);
 for(const [i,id] of [[2,'cons'],[3,'ent']]){let top=all.filter(r=>r[i]>0).sort((a,b)=>b[i]-a[i]).slice(0,10);$(id).innerHTML=top.map(r=>'<p>'+esc(r[0]+' · '+r[1])+' <b>'+fmt(r[i])+'</b><span class="bar" style="display:block;width:'+100*r[i]/top[0][i]+'%"></span></p>').join('')||'Sem movimentação no período.'}
 $('recent').innerHTML=table(['Data','Registros','Saldo contado'],[...days.values()].reverse().slice(0,10).map(([d,...v])=>[dt(d),...v]))}
 function period(){let now=new Date(),p=$('period').selectedIndex;if(p===4){draw();return}let d=new Date(now);if(p===2)d.setDate(d.getDate()-(d.getDay()+6)%7);if(p===3)d.setDate(1);$('from').value=p?d.toLocaleDateString('sv-SE'):dates[0]||today();$('to').value=p?today():dates.at(-1)||today();draw()}$('period').onchange=period;$('from').onchange=$('to').onchange=()=>{$('period').selectedIndex=4;draw()};period()
}
function inventory(){
 $('main').innerHTML=heading('Inventário semanal')+'<section><h2>Importar contagem</h2><form id="importForm"><div class="fields"><label>Data real da contagem<input required id="date" type="date" max="'+today()+'" value="'+today()+'"></label><label>Planilha de inventário<input required type="file" id="xlsx" accept=".xlsx,.xlsm"></label></div><button>Conferir importação</button></form></section><section><h2>Histórico semanal</h2>'+table(['Data','CONSCOD','Referência','Fardos','Caixas','Arquivo','Observação'],[...db.history].sort((a,b)=>b[0].localeCompare(a[0])).map(([d,...v])=>[dt(d),...v]))+'</section><section><h2>Pendências do inventário</h2>'+table(['Data','Arquivo','Código original','Quantidade','Motivo'],[...db.pending].reverse().map(([d,...v])=>[dt(d),...v]))+'</section>';
 handle($('importForm'),'submit',async()=>{const f=$('xlsx').files[0],date=$('date').value;if(!date||date>today())throw Error('Confira a data da contagem.');const {sheet,rows}=await sheetRows(f);const report=countRows(rows);openDialog('<h2>Conferência do inventário</h2><p>'+esc(f.name+' · '+sheet+' · '+dt(date))+'</p>'+stats([['Caixas reconhecidas',report.qty.size],['Linhas pendentes',report.pending.length]])+'<p>O saldo contado substitui a contagem da mesma data. Caixas ausentes mantêm o saldo. Uma contagem retroativa preserva o saldo da contagem mais recente.</p>'+table(['CONSCOD','Quantidade'],[...report.qty])+(report.pending.length?table(['Código pendente','Quantidade','Motivo'],report.pending):'')+'<button id="confirmImport" '+(report.qty.size?'':'disabled')+'>Confirmar inventário</button>');handle($('confirmImport'),'click',async()=>{await change(s=>applyCount(s,date,f.name,report));$('modal').close();inventory();notify('Inventário registrado.')})})
}
const orderLabels=['CONSCOD','Referência','Descrição','Quantidade','NF','Data emissão','Origem','Status','Observação'];
function orders(){ $('main').innerHTML=heading('Compra futura')+'<section><button id="newOrder">Adicionar compra</button><p>Compras com NF e status pendente, parcial ou em trânsito entram na projeção.</p><div id="olist"></div></section>';
 $('olist').innerHTML=table(['Editar',...orderLabels,'Físico','Em trânsito','Projetado'],db.orders.map((r,i)=>{let b=db.boxes.find(b=>b[0]===r[0]),p=b&&projection(b);return [i+1,...r,...(p&&r[4]?[p.physical,p.transit,p.projected]:['','',''])]}));$('olist').querySelectorAll('tbody tr').forEach((tr,i)=>{tr.cells[0].innerHTML='<button class="link">Editar</button>';tr.cells[0].firstChild.onclick=()=>orderEdit(i)});$('newOrder').onclick=()=>orderEdit(-1)}
const option=(v,t=v)=>'<option value="'+esc(v)+'">'+esc(t)+'</option>';
function orderEdit(i){const r=db.orders[i]||['','','','','','','','PENDENTE',''];openDialog('<h2>'+ (i<0?'Nova compra':'Editar compra')+'</h2><form id="editOrder"><div class="fields"><label>Caixa<select id="oc">'+db.boxes.map(b=>option(b[0],b[0]+' · '+b[2])).join('')+'</select></label>'+[3,4,5,6,8].map(k=>'<label>'+orderLabels[k]+'<input id="o'+k+'" '+(k===3?'type="number" min="1" step="1" required':k===5?'type="date"':'')+' value="'+esc(r[k])+'"></label>').join('')+'<label>Status<select id="os">'+['','PENDENTE','PARCIAL','EM TRÂNSITO','RECEBIDO','CANCELADO'].map(v=>option(v,v||'Sem status')).join('')+'</select></label></div><button>Salvar compra</button></form>');
 $('oc').value=r[0]||db.boxes[0][0];$('os').value=r[7];handle($('editOrder'),'submit',async()=>{const b=db.boxes.find(b=>b[0]===$('oc').value);const data=[...b.slice(0,3),+$('o3').value,$('o4').value.trim(),$('o5').value,$('o6').value,$('os').value||($('o4').value.trim()?'PENDENTE':''),$('o8').value];await change(s=>{s.orders[i<0?s.orders.length:i]=data});$('modal').close();orders();notify('Compra salva.')})}
const definitions={
 materials:['Materiais',['SKU','Descrição','Peso kg','Altura mm','Largura mm','Comprimento mm','Cubagem m³','Status dimensões']],
 links:['SKU × caixa',['SKU','Descrição da peça','Código caixa','Origem / justificativa','Validação']],
 aliases:['Códigos de barras',['EAN / código da etiqueta','SKU do produto']],
 boxes:['Caixas',boxHeaders],
 refs:['Referências',['Referência','4 finais','CONSCOD']],
 manuals:['Manual de compressores',['SKU','Caixa ITL','Código da caixa','Reforço','Calço','Kit','Movimentação','Fonte']],
 kits:['Manual de kits',['Kit','Pezinhos','Gaxeta','Ferros','Capacete','Porca','Parafuso','Pino plástico','Tubinho plástico','Arruela metal','Arruela borracha','Protetor térmico']]
};
let category='materials';
function catalog(){ $('main').innerHTML=heading('Cadastros')+'<section><div class="fields"><label>Base<select id="cat">'+Object.entries(definitions).map(([k,[t]])=>option(k,t)).join('')+'</select></label><label>Pesquisar<input id="cq" placeholder="Código ou descrição"></label></div><button id="add">Adicionar registro</button> <button id="settings" class="secondary">Parâmetros de estoque</button><p id="count" class="muted"></p><div id="catrows"></div><button id="more" class="secondary">Mostrar mais</button></section>';
 $('cat').value=category;$('cat').onchange=()=>{category=$('cat').value;catalog()};let limit=100;
 function draw(){const [name,cols]=definitions[category],source=category==='materials'?materials():category==='refs'?BASE.refs:db[category];let hits=source.map((r,i)=>[r,i]).filter(([r])=>fold(r.join(' ')).includes(fold($('cq').value)));const editable=category!=='refs';$('add').hidden=!editable;const page=hits.slice(0,limit);$('count').textContent=page.length+' de '+hits.length+' registros';$('more').hidden=limit>=hits.length;$('catrows').innerHTML=table(editable?['Ação',...cols]:cols,page.map(([r])=>{const v=category==='boxes'?boxRow(r):r;return editable?['',...v]:v}));if(editable)$('catrows').querySelectorAll('tbody tr').forEach((tr,j)=>{tr.cells[0].innerHTML='<button class="link">Editar</button>';tr.cells[0].firstChild.onclick=()=>editRecord(page[j][0])})}
 $('cq').oninput=()=>{limit=100;draw()};$('more').onclick=()=>{limit+=100;draw()};$('add').onclick=()=>editRecord(null);$('settings').onclick=()=>{openDialog('<h2>Parâmetros de estoque</h2><form id="params"><div class="fields">'+['Prazo de entrega (dias)','Margem de segurança (semanas)','Cobertura crítica (semanas)'].map((l,i)=>'<label>'+l+'<input id="p'+i+'" type="number" required min="0" step="any" value="'+db.config[i]+'"></label>').join('')+'</div><button>Salvar parâmetros</button></form>');handle($('params'),'submit',async()=>{await change(s=>s.config=[0,1,2].map(i=>+$('p'+i).value));$('modal').close();notify('Parâmetros salvos.')})};draw()
}
function materials(){const overrides=new Map((db.materialEdits||[]).map(r=>[String(r[0]),r]));return [...BASE.materials.map(r=>{const k=String(r[0]),v=overrides.get(k)||r;overrides.delete(k);return v}),...overrides.values()]}
function editRecord(r){const k=category,[title,labels]=definitions[k];const indexes=k==='boxes'?[0,1,2,3,4,5,6,7,9]:labels.map((_,i)=>i);
 openDialog('<h2>'+esc(title)+'</h2><form id="record"><div class="fields">'+indexes.map(i=>{let numeric=(k==='boxes'&&i>=3)||(k==='materials'&&i>=2&&i<=6);return '<label>'+esc(labels[i])+'<input id="v'+i+'" '+(numeric?'type="number" min="0" step="any" ':'')+((i===0||k==='aliases'||k==='links'&&i===2)?'required ':'')+(r&&i===0?'readonly ':'')+'value="'+esc(r?.[i]??'')+'"></label>'}).join('')+'</div><button>Salvar registro</button></form>');
 handle($('record'),'submit',async()=>{let data=r?[...r]:Array(labels.length).fill('');for(let i of indexes){const el=$('v'+i);data[i]=el.type==='number'?num(el.value):el.value.trim()}const src=k==='materials'?materials():db[k];
 if(!data[0]||(!r&&src.some(v=>key(v[0])===key(data[0]))))throw Error('Código vazio ou já cadastrado.');
 if(k==='aliases'&&!findProduct(data[1]).sku)throw Error('Cadastre o SKU do produto antes de associar a etiqueta.');
 if(k==='links'||k==='manuals'){const match=[...db.boxes.map(b=>b[0]),...db.manuals.map(m=>m[2])].find(v=>fold(v)===fold(data[2]));if(!match)throw Error('Informe um código de caixa cadastrado.');data[2]=match}
 if(k==='boxes'&&!/^CONSCOD\d+$/i.test(data[0]))throw Error('Use o código CONSCOD seguido de números.');
 if(k==='boxes')data[0]=fold(data[0]);if(k==='aliases'&&src.some(v=>v!==r&&v[0]===data[0]))throw Error('Etiqueta já associada.');
 await change(s=>{const rows=k==='materials'?(s.materialEdits??=[]):s[k];let i=rows.findIndex(a=>String(a[0])===String(data[0]));rows[i<0?rows.length:i]=data});$('modal').close();catalog();notify('Registro salvo.')})
}
(async()=>{try{if(Boolean(CONEXAO.url)!==Boolean(CONEXAO.chave))throw Error('Preencha a URL e a chave em config.js.');await loadState();$('mode').textContent=online?'Banco compartilhado':'Prévia local · neste navegador';navigate(tabs[0])}catch(e){$('main').innerHTML='<section><h1>Conexão indisponível</h1><p>'+esc(e.message)+'</p><button onclick="location.reload()">Tentar novamente</button></section>'}})();
