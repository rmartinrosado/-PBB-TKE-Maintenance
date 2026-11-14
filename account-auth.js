import { getSupabaseClient } from "./supabase-client.js?v=1.2.0";
(async()=>{
 "use strict";
 const $=s=>document.querySelector(s);
 let startupGate=false,authenticated=false;
 const status=(message)=>{const n=$("#accountStatus");if(n)n.textContent=message;const p=$("#libStatus");if(p)p.textContent=message;};
 const busy=(v)=>["#accountLogin","#accountCreate","#accountSaveConfig"].forEach(s=>{const b=$(s);if(b)b.disabled=v});
 function readConfig(){
  const url=($("#accountSbUrl")?.value||localStorage.getItem("pbb-sb-url")||"").trim().replace(/\/$/,"");
  const key=($("#accountSbKey")?.value||localStorage.getItem("pbb-sb-anon")||"").trim();
  if(!url||!key)throw Error("Introduce la URL y la clave pública de Supabase en «Configuración técnica».");
  let u;try{u=new URL(url)}catch{throw Error("La URL de Supabase no es válida.");}
  if(u.protocol!=="https:"||!u.hostname.endsWith(".supabase.co"))throw Error("La URL debe ser HTTPS y pertenecer a un proyecto Supabase.");
  return {url,key};
 }
 function saveConfig(){
  const {url,key}=readConfig();
  localStorage.setItem("pbb-sb-url",url);localStorage.setItem("pbb-sb-anon",key);
  if($("#sbUrl"))$("#sbUrl").value=url;if($("#sbKey"))$("#sbKey").value=key;
  if($("#accountSbUrl"))$("#accountSbUrl").value=url;if($("#accountSbKey"))$("#accountSbKey").value=key;
  window.dispatchEvent(new CustomEvent("pbb-supabase-config-changed"));
  return getSupabaseClient(url,key);
 }
 function showSession(session){
  authenticated=!!session;
  $("#accountForm")?.classList.toggle("hidden",authenticated);
  $("#accountSigned")?.classList.toggle("hidden",!authenticated);
  $("#accountLoggedActions")?.classList.toggle("hidden",!authenticated);
  $("#accountClose")?.classList.toggle("hidden",startupGate&&!authenticated);
  if($("#accountEmail"))$("#accountEmail").textContent=session?.user?.email||"";
  $("#accountDot")?.classList.toggle("is-active",authenticated);
  window.dispatchEvent(new CustomEvent("pbb-auth-state-changed",{detail:{authenticated,email:session?.user?.email||null}}));
 }
 function closeGate(){
  if(!authenticated){status("Debes iniciar sesión para acceder a la aplicación.");return;}
  startupGate=false;$("#accountDialog")?.classList.remove("startup-gate","visible");$("#accountDialog")?.classList.add("hidden");
  document.body.classList.remove("auth-locked");
  window.dispatchEvent(new CustomEvent("pbb-auth-state-changed",{detail:{authenticated:true,email:$("#accountEmail")?.textContent||null,source:"gate-unlocked"}}));\n  status("Sesión activa: aplicación desbloqueada.");
 }
 async function login(){
  busy(true);
  try{
   const c=saveConfig(),email=$("#accountEmailInput")?.value.trim()||"",password=$("#accountPassword")?.value||"";
   if(!email||!password)throw Error("Introduce el correo y la contraseña.");
   status("Verificando credenciales…");
   const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;
   if(!data.session)throw Error("Supabase no ha devuelto una sesión. Comprueba la cuenta y la confirmación del correo.");
   $("#accountPassword").value="";showSession(data.session);status("Acceso correcto. Pulsa «Entrar en la aplicación».");
   $("#accountGoSync")?.focus();
  }catch(e){status("No se pudo iniciar sesión: "+(e.message||String(e)));}
  finally{busy(false)}
 }
 async function register(){
  busy(true);
  try{
   const c=saveConfig(),email=$("#accountEmailInput")?.value.trim()||"",password=$("#accountPassword")?.value||"";
   if(!email||!password)throw Error("Introduce el correo y una contraseña.");
   if(password.length<6)throw Error("La contraseña debe tener al menos 6 caracteres.");
   status("Creando cuenta…");
   const {data,error}=await c.auth.signUp({email,password});if(error)throw error;
   if(data.session){showSession(data.session);status("Cuenta creada. Pulsa «Entrar en la aplicación».");}
   else status("Alta enviada. Confirma el correo recibido y después inicia sesión aquí.");
  }catch(e){status("No se pudo crear la cuenta: "+(e.message||String(e)));}
  finally{busy(false)}
 }
 async function logout(){
  try{const c=getSupabaseClient(),{error}=await c.auth.signOut();if(error)throw error;showSession(null);$("#accountPassword").value="";status("Sesión cerrada. Inicia sesión para continuar.");if(startupGate)$("#accountDialog")?.classList.add("visible");}
  catch(e){status("No se pudo cerrar sesión: "+(e.message||String(e)))}
 }
 function openGate(){
  startupGate=true;document.body.classList.add("auth-locked");
  $("#accountDialog")?.classList.remove("hidden");$("#accountDialog")?.classList.add("startup-gate","visible");
  $("#accountTitle").textContent="Iniciar sesión · TKE";
 }
 async function start(){
  if($("#accountSbUrl")&&localStorage.getItem("pbb-sb-url"))$("#accountSbUrl").value=localStorage.getItem("pbb-sb-url");
  if($("#accountSbKey")&&localStorage.getItem("pbb-sb-anon"))$("#accountSbKey").value=localStorage.getItem("pbb-sb-anon");
  openGate();
  try{
   const c=getSupabaseClient(),{data,error}=await c.auth.getSession();if(error)throw error;
   showSession(data.session);
   if(data.session)status("Ya existe una sesión activa. Pulsa «Entrar en la aplicación».");
   else status("Introduce tu correo y contraseña para acceder.");
  }catch(e){showSession(null);status("Configuración pendiente: "+(e.message||String(e))+" Abre «Configuración técnica de Supabase» si necesitas corregirla.");}
 }
 $("#accountSaveConfig")?.addEventListener("click",()=>{try{saveConfig();status("Configuración guardada en este dispositivo. Ya puedes iniciar sesión.");}catch(e){status(e.message||String(e));}});
 $("#accountLogin")?.addEventListener("click",login);
 $("#accountCreate")?.addEventListener("click",register);
 $("#accountLogout")?.addEventListener("click",logout);
 $("#accountGoSync")?.addEventListener("click",closeGate);
 $("#accountClose")?.addEventListener("click",()=>{if(startupGate){closeGate();return}$("#accountDialog")?.classList.add("hidden")});
 $("#accountOpen")?.addEventListener("click",async()=>{if(startupGate)return;$("#accountDialog")?.classList.remove("hidden");try{const {data,error}=await getSupabaseClient().auth.getSession();if(error)throw error;showSession(data.session)}catch(e){status(e.message||String(e))}});
 $("#accountDialog")?.addEventListener("click",e=>{if(e.target.id==="accountDialog"&&!startupGate)$("#accountDialog").classList.add("hidden")});
 const waitForSplash=()=>{if(window.PBB_SPLASH_DONE||!$("#splash-screen"))start();else window.addEventListener("pbb-splash-finished",start,{once:true});};
 waitForSplash();
})();
