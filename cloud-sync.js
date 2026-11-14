import { getSupabaseClient } from "./supabase-client.js?v=1.0.0";
const $=s=>document.querySelector(s),KEY="pbb-tke-v6",CONFLICTS="pbb-sync-conflicts-v1";
let busy=false;
const canonical=value=>{if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).filter(k=>k!=="updatedAt").sort().map(k=>[k,canonical(value[k])]));return value};
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function status(message,state="pending"){const n=$("#cloudSyncStatus");if(!n)return;n.textContent=message;n.classList.remove("is-pending","is-connected","is-error","is-dirty");n.classList.add("is-"+state);n.dataset.state=state}
function getClient(){return getSupabaseClient()}
async function signed(){const c=getClient(),{data,error}=await c.auth.getSession();if(error)throw error;if(!data.session)throw Error("No hay sesión activa. Inicia sesión en Mi cuenta TKE.");return {c,user:data.session.user}}
function readLocal(){const d=JSON.parse(localStorage.getItem(KEY)||'{"orders":[],"history":[]}');for(const g of ["orders","history"]){if(!Array.isArray(d[g]))d[g]=[];d[g].forEach(r=>{if(!r.id)r.id=crypto.randomUUID();if(!r.updatedAt)r.updatedAt=r.savedAt||r.createdAt||new Date().toISOString()})}return d}
function readConflicts(){try{return JSON.parse(localStorage.getItem(CONFLICTS)||"[]")}catch{return []}}
function writeConflicts(items){localStorage.setItem(CONFLICTS,JSON.stringify(items));renderConflictControl(items)}
function renderConflictControl(items=readConflicts()){let b=$("#cloudConflictExport");if(!items.length){b?.remove();return}if(!b){b=document.createElement("button");b.id="cloudConflictExport";b.type="button";b.className="secondary mini";b.textContent="Descargar conflictos para revisión";$("#cloudSyncStatus")?.insertAdjacentElement("afterend",b)}b.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(items,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="PBB_TKE_conflictos_sincronizacion.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}}
async function sync(){if(busy)return;busy=true;const b=$("#cloudSyncNow");if(b)b.disabled=true;try{
 const {c,user}=await signed(),local=readLocal();
 const {data:remote,error:readError}=await c.from("maintenance_records").select("id,record_type,payload,updated_at").eq("user_id",user.id);if(readError)throw readError;
 const maps={order:new Map(local.orders.map(x=>[x.id,x])),diagnostic:new Map(local.history.map(x=>[x.id,x]))},conflicts=readConflicts(),conflictKeys=new Set();
 for(const row of remote||[]){const group=maps[row.record_type];if(!group||!row.payload)continue;const existing=group.get(row.id),localTime=Date.parse(existing?.updatedAt||existing?.savedAt||existing?.createdAt||0)||0,cloudTime=Date.parse(row.updated_at||0)||0;
  if(!existing){group.set(row.id,{...row.payload,id:row.id,updatedAt:row.updated_at});continue}
  if(cloudTime>localTime){group.set(row.id,{...row.payload,id:row.id,updatedAt:row.updated_at});continue}
  if(localTime>cloudTime||same(existing,row.payload))continue;
  const key=row.record_type+":"+row.id;conflictKeys.add(key);
  if(!conflicts.some(x=>x.key===key&&x.remoteUpdatedAt===row.updated_at))conflicts.push({key,recordType:row.record_type,id:row.id,detectedAt:new Date().toISOString(),localUpdatedAt:existing.updatedAt||null,remoteUpdatedAt:row.updated_at,local:existing,remote:row.payload,note:"Mismo sello temporal con contenido distinto. No se ha sobrescrito automáticamente."});
 }
 const merged={orders:[...maps.order.values()],history:[...maps.diagnostic.values()]},rows=[];
 for(const [type,items] of [["order",merged.orders],["diagnostic",merged.history]])for(const item of items){if(conflictKeys.has(type+":"+item.id))continue;rows.push({id:item.id,user_id:user.id,record_type:type,payload:item,updated_at:item.updatedAt||new Date().toISOString()})}
 if(rows.length){const {error}=await c.from("maintenance_records").upsert(rows,{onConflict:"user_id,id"});if(error)throw error}
 localStorage.setItem(KEY,JSON.stringify(merged));writeConflicts(conflicts);window.dispatchEvent(new CustomEvent("pbb-cloud-data-merged"));
 const conflictNote=conflictKeys.size?" · "+conflictKeys.size+" conflicto(s) aislado(s), sin sobrescritura automática":"";
 status("Sincronización completada · "+merged.orders.length+" órdenes · "+merged.history.length+" diagnósticos"+conflictNote,"connected");
 }catch(e){status("Error de sincronización: "+(e.message||String(e)),"error")}finally{busy=false;if(b)b.disabled=false}}
async function refresh(){try{const {c,user}=await signed();const {count,error}=await c.from("maintenance_records").select("*",{count:"exact",head:true}).eq("user_id",user.id);if(error)throw error;const conflicts=readConflicts();renderConflictControl(conflicts);status("Conectado a Supabase · "+(count??0)+" registros privados en la nube"+(conflicts.length?" · "+conflicts.length+" conflictos pendientes de revisión":""),"connected")}catch(e){const message=e.message||String(e);const state=/Configura primero|No hay sesión activa/i.test(message)?"pending":"error";status(message,state)}}
$("#cloudSyncNow")?.addEventListener("click",sync);$("#cloudRefresh")?.addEventListener("click",refresh);window.addEventListener("pbb-auth-state-changed",()=>refresh());
window.addEventListener("pbb-local-data-changed",()=>status("Hay cambios locales pendientes de sincronizar.","dirty"));
status("Comprobando configuración, sesión y tabla privada…","pending");renderConflictControl();refresh();
