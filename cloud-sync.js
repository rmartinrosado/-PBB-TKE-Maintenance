import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const $=s=>document.querySelector(s), KEY="pbb-tke-v6";
let client=null,busy=false;
function status(s,state="pending"){const n=$("#cloudSyncStatus");if(!n)return;n.textContent=s;n.classList.remove("is-pending","is-connected","is-error","is-dirty");n.classList.add("is-"+state);n.dataset.state=state}
function getClient(){const url=localStorage.getItem("pbb-sb-url"),key=localStorage.getItem("pbb-sb-anon");if(!url||!key)throw Error("Configura primero URL y clave pública en Documentación RCS.");if(!client)client=createClient(url,key);return client}
async function signed(){const c=getClient(),{data,error}=await c.auth.getSession();if(error)throw error;if(!data.session)throw Error("No hay sesión activa. Inicia sesión en Documentación RCS.");return {c,user:data.session.user}}
function readLocal(){const d=JSON.parse(localStorage.getItem(KEY)||'{"orders":[],"history":[]}');for(const g of ["orders","history"]){if(!Array.isArray(d[g]))d[g]=[];d[g].forEach(r=>{if(!r.id)r.id=crypto.randomUUID();if(!r.updatedAt)r.updatedAt=r.savedAt||r.createdAt||new Date().toISOString()})}return d}
async function sync(){if(busy)return;busy=true;const b=$("#cloudSyncNow");if(b)b.disabled=true;try{
 const {c,user}=await signed(),local=readLocal();
 const {data:remote,error:readError}=await c.from("maintenance_records").select("id,record_type,payload,updated_at").eq("user_id",user.id);if(readError)throw readError;
 const maps={order:new Map(local.orders.map(x=>[x.id,x])),diagnostic:new Map(local.history.map(x=>[x.id,x]))};
 for(const row of remote||[]){const group=maps[row.record_type];if(!group||!row.payload)continue;const existing=group.get(row.id);const localTime=Date.parse(existing?.updatedAt||existing?.savedAt||existing?.createdAt||0)||0;const cloudTime=Date.parse(row.updated_at||0)||0;if(!existing||cloudTime>localTime)group.set(row.id,{...row.payload,id:row.id,updatedAt:row.updated_at})}
 const merged={orders:[...maps.order.values()],history:[...maps.diagnostic.values()]},rows=[];
 for(const [type,items] of [["order",merged.orders],["diagnostic",merged.history]])for(const item of items)rows.push({id:item.id,user_id:user.id,record_type:type,payload:item,updated_at:item.updatedAt||new Date().toISOString()});
 if(rows.length){const {error}=await c.from("maintenance_records").upsert(rows,{onConflict:"user_id,id"});if(error)throw error}
 localStorage.setItem(KEY,JSON.stringify(merged));window.dispatchEvent(new CustomEvent("pbb-cloud-data-merged"));
 status("Sincronización completada · "+merged.orders.length+" órdenes · "+merged.history.length+" diagnósticos · cuenta "+(user.email||"autenticada"),"connected");
 }catch(e){status("Error de sincronización: "+(e.message||String(e)),"error")}finally{busy=false;if(b)b.disabled=false}}
async function refresh(){try{const {c,user}=await signed();const {count,error}=await c.from("maintenance_records").select("*",{count:"exact",head:true}).eq("user_id",user.id);if(error)throw error;status("Conectado a Supabase · "+(count??0)+" registros privados en la nube. La sincronización está disponible.","connected")}catch(e){const message=e.message||String(e);const state=/Configura primero|No hay sesión activa/i.test(message)?"pending":"error";status(message,state)}}
$("#cloudSyncNow")?.addEventListener("click",sync);$("#cloudRefresh")?.addEventListener("click",refresh);
window.addEventListener("pbb-local-data-changed",()=>status("Hay cambios locales pendientes de sincronizar.","dirty"));
status("Comprobando configuración, sesión y tabla privada…","pending");
refresh();
