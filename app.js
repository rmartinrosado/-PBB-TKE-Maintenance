(() => {
  const KEY = 'pbb-tke-maintenance-v1';
  let data = { orders: [], history: [] };
  const $ = (s) => document.querySelector(s);
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function load(){ try { const saved=JSON.parse(localStorage.getItem(KEY)||'null'); if(saved && Array.isArray(saved.orders) && Array.isArray(saved.history)) data=saved; } catch(e){} }
  function save(){ localStorage.setItem(KEY, JSON.stringify(data)); render(); }
  function toast(msg){const t=$('#toast');t.textContent=msg;t.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.style.display='none',2600)}
  function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===id));window.scrollTo({top:0,behavior:'smooth'})}
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  function render(){
    $('#statOpen').textContent=data.orders.filter(o=>o.status!=='Cerrada').length;
    $('#statClosed').textContent=data.orders.filter(o=>o.status==='Cerrada').length;
    $('#statHistory').textContent=data.history.length;
    $('#ordersList').innerHTML=data.orders.length?data.orders.map((o,i)=>`<article class="record"><div class="record-top"><div><h3>PBB ${esc(o.pbb)} · Orden ${esc(o.number)}</h3><span class="badge">${esc(o.status)}</span></div><span class="muted">${esc(o.type)}</span></div><p><b>Avería:</b> ${esc(o.fault||'Sin descripción')}</p>${o.checks?`<p><b>Comprobaciones:</b> ${esc(o.checks)}</p>`:''}<div class="record-actions"><button class="secondary" data-close="${i}">${o.status==='Cerrada'?'Reabrir':'Cerrar orden'}</button><button class="danger-button" data-delete-order="${i}">Eliminar</button></div></article>`).join(''):'<div class="empty-state">No hay órdenes de trabajo. Pulsa «Nueva orden» para crear la primera.</div>';
    $('#historyList').innerHTML=data.history.length?data.history.map((h,i)=>`<article class="record"><div class="record-top"><div><h3>PBB ${esc(h.pbb)}</h3><span class="muted">${esc(h.date||'Fecha no indicada')}</span></div></div><p><b>Síntoma:</b> ${esc(h.fault)}</p><p><b>Diagnóstico / solución:</b> ${esc(h.solution||'Pendiente de documentar')}</p><div class="record-actions"><button class="danger-button" data-delete-history="${i}">Eliminar registro</button></div></article>`).join(''):'<div class="empty-state">El histórico está vacío. No se han precargado averías ni soluciones.</div>';
    document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{const o=data.orders[+b.dataset.close];o.status=o.status==='Cerrada'?'Abierta':'Cerrada';save();toast('Estado actualizado')});
    document.querySelectorAll('[data-delete-order]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar esta orden?')){data.orders.splice(+b.dataset.deleteOrder,1);save();toast('Orden eliminada')}});
    document.querySelectorAll('[data-delete-history]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este registro del histórico?')){data.history.splice(+b.dataset.deleteHistory,1);save();toast('Registro eliminado')}});
  }
  $('#newOrderBtn').onclick=()=>{$('#orderForm').classList.remove('hidden');$('#orderForm').scrollIntoView({behavior:'smooth',block:'start'})};
  $('#cancelOrderBtn').onclick=()=>{$('#orderForm').reset();$('#orderForm').classList.add('hidden')};
  $('#orderForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);data.orders.unshift({number:f.get('number').trim(),pbb:f.get('pbb').trim(),type:f.get('type'),fault:f.get('fault').trim(),checks:f.get('checks').trim(),status:f.get('status'),created:new Date().toISOString()});save();e.target.reset();e.target.classList.add('hidden');toast('Orden guardada en este dispositivo')};
  $('#newHistoryBtn').onclick=()=>{$('#historyForm').classList.remove('hidden');$('#historyForm').scrollIntoView({behavior:'smooth',block:'start'})};
  $('#cancelHistoryBtn').onclick=()=>{$('#historyForm').reset();$('#historyForm').classList.add('hidden')};
  $('#historyForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);data.history.unshift({pbb:f.get('pbb').trim(),date:f.get('date'),fault:f.get('fault').trim(),solution:f.get('solution').trim(),created:new Date().toISOString()});save();e.target.reset();e.target.classList.add('hidden');toast('Registro guardado en este dispositivo')};
  $('#exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({format:'PBB-TKE-Maintenance-backup-v1',exportedAt:new Date().toISOString(),...data},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='PBB_TKE_Maintenance_backup.json';a.click();URL.revokeObjectURL(url);toast('Copia preparada')};
  $('#importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(!Array.isArray(obj.orders)||!Array.isArray(obj.history))throw new Error('Formato');if(!confirm('Se reemplazarán los datos locales actuales. ¿Continuar?'))return;data={orders:obj.orders,history:obj.history};save();toast('Copia importada')}catch(err){alert('No se ha podido importar. Selecciona una copia JSON válida de esta aplicación.')}finally{e.target.value=''}};
  $('#clearBtn').onclick=()=>{if(confirm('¿Borrar todas las órdenes y registros de este navegador? Esta acción no se puede deshacer.')){data={orders:[],history:[]};save();toast('Datos locales borrados')}};
  $('#docFiles').onchange=e=>{const list=$('#docList');list.innerHTML='';[...e.target.files].forEach(f=>{const li=document.createElement('li');li.textContent=`${f.name} · ${Math.round(f.size/1024)} KB`;list.appendChild(li)});if(!e.target.files.length)list.innerHTML='';};
  load();render();
  $('#offlineStatus').textContent = ('serviceWorker' in navigator) ? 'Este navegador admite el modo de aplicación; la disponibilidad sin conexión se activa al publicar por HTTPS.' : 'Este navegador no admite service workers.';
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
})();
