import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
let client=null,signature="";
export function getSupabaseClient(urlOverride="",keyOverride=""){
 const url=(urlOverride||localStorage.getItem("pbb-sb-url")||"").trim().replace(/\/$/,"");
 const key=(keyOverride||localStorage.getItem("pbb-sb-anon")||"").trim();
 if(!url||!key)throw new Error("Falta URL o clave pública de Supabase. Guarda la configuración en el Panel operativo.");
 let parsed;try{parsed=new URL(url)}catch{throw new Error("La URL de Supabase no es válida.");}
 if(parsed.protocol!=="https:"||!parsed.hostname.endsWith(".supabase.co"))throw new Error("La URL debe ser HTTPS y pertenecer a un proyecto Supabase.");
 const next=url+"|"+key;
 if(!client||signature!==next){client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});signature=next;}
 return client;
}
window.PBB_GET_SUPABASE_CLIENT=getSupabaseClient;
