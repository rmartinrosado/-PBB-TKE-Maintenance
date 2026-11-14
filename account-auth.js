import { getSupabaseClient } from "./supabase-client.js?v=1.2.0";
(async()=>{
 "use strict";
 const $=s=>document.querySelector(s);
 const status=(message)=>{const n=$("#accountStatus");if(n)n.textContent=message;const p=$("#libStatus");if(p)p.textContent=message;};
 const setBusy=(busy)=>["#accountLogin","#accountCreate","#sbConnect","#sbRegister"].forEach(s=>{const b=$(s);if(b)b.disabled=busy});
 function readFields(){
  const url=($("#sbUrl")?.value||localStorage.getItem("pbb-sb-url")||"").trim().replace(/\/$/,"");
  const key=($("#sbKey")?.value||localStorage.getItem("pbb-sb-anon")||"").trim();
  if(!url||!key)throw Error("Falta la URL o la clave pública. Introdúcelas en Panel operativo y pulsa Guardar configuración.");
  let parsed;try{parsed=new URL(url)}catch{throw Error("La URL de Supabase no es válida.");}
  if(parsed.protocol!=="https:"||!parsed.hostname.endsWith(".supabase.co"))throw Error("La URL debe ser HTTPS y pertenecer a un proyecto Supabase.");
  return {url,key};
 }
 function saveConfig(){
  const {url,key}=readFields();
  localStorage.setItem("pbb-sb-url",url);localStorage.setItem("pbb-sb-anon",key);
  if($("#sbUrl"))$("#sbUrl").value=url;if($("#sbKey"))$("#sbKey").value=key;
  window.dispatchEvent(new CustomEvent("pbb-supabase-config-changed"));
  return getSupabaseClient(url,key);
 }
 function fillModal(){
  if($("#sbUrl")&&$("#accountEmailInput")&&!$("#accountEmailInput").value)$("#accountEmailInput").value=$("#sbEmail")?.value||"";
 }
 function syncEmail(){
  const email=$("#accountEmailInput")?.value.trim()||"";
  if($("#sbEmail"))$("#sbEmail").value=email;
  return email;
 }
 function showSession(session){
  const signed=!!session;
  $("#accountForm")?.classList.toggle("hidden",signed);
  $("#accountSigned")?.classList.toggle("hidden",!signed);
  $("#accountLoggedActions")?.classList.toggle("hidden",!signed);
  if($("#accountEmail"))$("#accountEmail").textContent=session?.user?.email||"";
  $("#accountDot")?.classList.toggle("is-active",signed);
  if(signed)status("Sesión activa: "+(session.user.email||"")+" · cuenta conectada.");
  window.dispatchEvent(new CustomEvent("pbb-auth-state-changed",{detail:{authenticated:signed,email:session?.user?.email||null}}));
 }
 async function login(source){
  setBusy(true);
  try{
   const c=saveConfig(),email=source==="modal"?syncEmail():($("#sbEmail")?.value.trim()||""),password=$(source==="modal"?"#accountPassword":"#sbPassword")?.value||"";
   if(!email||!password)throw Error("Introduce el correo y la contraseña.");
   status("Conectando con Supabase Auth…");
   const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;
   if(!data.session)throw Error("Supabase no ha devuelto una sesión. Comprueba la cuenta y la confirmación del correo.");
   if($("#sbEmail"))$("#sbEmail").value=email;
   if($("#accountPassword"))$("#accountPassword").value="";
   if($("#sbPassword"))$("#sbPassword").value="";
   showSession(data.session);status("Sesión iniciada correctamente. Biblioteca y sincronización activadas.");
  }catch(e){status("Error de acceso: "+(e.message||String(e)));}
  finally{setBusy(false)}
 }
 async function register(source){
  setBusy(true);
  try{
   const c=saveConfig(),email=source==="modal"?syncEmail():($("#sbEmail")?.value.trim()||""),password=$(source==="modal"?"#accountPassword":"#sbPassword")?.value||"";
   if(!email||!password)throw Error("Introduce el correo y una contraseña.");
   if(password.length<6)throw Error("La contraseña debe tener al menos 6 caracteres.");
   status("Creando cuenta en Supabase…");
   const {data,error}=await c.auth.signUp({email,password});if(error)throw error;
   if(data.session){showSession(data.session);status("Cuenta creada y sesión iniciada.");}
   else status("Solicitud de alta enviada. Supabase requiere confirmar el correo; revisa tu bandeja y después inicia sesión.");
  }catch(e){status("Error al crear la cuenta: "+(e.message||String(e)));}
  finally{setBusy(false)}
 }
 async function logout(){
  try{const c=getSupabaseClient();const {error}=await c.auth.signOut();if(error)throw error;showSession(null);status("Sesión cerrada.");}
  catch(e){status("No se pudo cerrar sesión: "+(e.message||String(e)))}
 }
 $("#sbSaveConfig")?.addEventListener("click",()=>{try{saveConfig();status("Configuración guardada en este dispositivo. Ahora puedes iniciar sesión.");}catch(e){status("No se guardó: "+e.message)}});
 $("#sbConnect")?.addEventListener("click",()=>login("panel"));
 $("#sbRegister")?.addEventListener("click",()=>register("panel"));
 $("#accountLogin")?.addEventListener("click",()=>login("modal"));
 $("#accountCreate")?.addEventListener("click",()=>register("modal"));
 $("#sbLogout")?.addEventListener("click",logout);
 $("#accountLogout")?.addEventListener("click",logout);
 $("#accountOpen")?.addEventListener("click",async()=>{fillModal();$("#accountDialog")?.classList.remove("hidden");try{const c=getSupabaseClient(),{data,error}=await c.auth.getSession();if(error)throw error;showSession(data.session)}catch(e){status(e.message||String(e))}});
 $("#accountClose")?.addEventListener("click",()=>$("#accountDialog")?.classList.add("hidden"));
 $("#accountDialog")?.addEventListener("click",e=>{if(e.target.id==="accountDialog")$("#accountDialog").classList.add("hidden")});
 $("#accountGoSync")?.addEventListener("click",()=>{ $("#accountDialog")?.classList.add("hidden");$("#dashboard")?.scrollIntoView({behavior:"smooth",block:"start"}); });
 ["#sbUrl","#sbKey"].forEach(sel=>$(sel)?.addEventListener("input",()=>{if($("#accountStatus"))$("#accountStatus").textContent="Cambios pendientes: pulsa Guardar configuración antes de iniciar sesión."}));
 try{if(localStorage.getItem("pbb-sb-url")&&localStorage.getItem("pbb-sb-anon")){const c=getSupabaseClient(),{data,error}=await c.auth.getSession();if(error)throw error;showSession(data.session)}}catch(e){status("Configuración pendiente o no válida: "+e.message)}
})();
