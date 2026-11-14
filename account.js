const $=s=>document.querySelector(s);
let knownSession=null;
const say=s=>{const n=$("#accountStatus");if(n)n.textContent=s};
function getClient(){
 const shared=window.PBB_GET_SUPABASE_CLIENT;
 if(typeof shared!=="function")throw Error("El módulo de biblioteca aún no ha inicializado la conexión compartida. Recarga la aplicación.");
 return shared();
}
function render(session){
 knownSession=session||null;
 window.dispatchEvent(new CustomEvent("pbb-auth-state-changed",{detail:{authenticated:!!session,email:session?.user?.email||null}}));
 $("#accountForm").classList.toggle("hidden",!!session);
 $("#accountSigned").classList.toggle("hidden",!session);
 $("#accountLoggedActions").classList.toggle("hidden",!session);
 $("#accountEmail").textContent=session?.user?.email||"";
 $("#accountOpen").classList.toggle("is-signed",!!session);
 if(session)say("Sesión iniciada. Tu espacio personal está autenticado en este dispositivo.");
}
async function refresh(){
 try{const c=getClient(),{data,error}=await c.auth.getSession();if(error)throw error;render(data.session)}
 catch(e){render(null);say(e.message)}
}
function close(){ $("#accountDialog").classList.add("hidden"); }
window.addEventListener("pbb-auth-state-changed",()=>refresh());
$("#accountOpen").addEventListener("click",()=>{$("#accountDialog").classList.remove("hidden");refresh()});
$("#accountClose").addEventListener("click",close);
$("#accountDialog").addEventListener("click",e=>{if(e.target.id==="accountDialog")close()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
$("#accountLogin").addEventListener("click",async()=>{
 const b=$("#accountLogin");b.disabled=true;
 try{const c=getClient(),email=$("#accountEmailInput").value.trim(),password=$("#accountPassword").value;if(!email||!password)throw Error("Introduce correo y contraseña.");const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;render(data.session);say("Sesión iniciada correctamente. Ya puedes sincronizar tus órdenes e informes.")}
 catch(e){say(e.message||String(e))}
 finally{b.disabled=false}
});
$("#accountCreate").addEventListener("click",async()=>{
 const b=$("#accountCreate");b.disabled=true;
 try{const c=getClient(),email=$("#accountEmailInput").value.trim(),password=$("#accountPassword").value;if(!email||!password)throw Error("Introduce correo y contraseña.");if(password.length<6)throw Error("La contraseña debe tener al menos 6 caracteres.");const {data,error}=await c.auth.signUp({email,password});if(error)throw error;if(data.session){render(data.session);say("Cuenta creada y sesión iniciada.")}else say("Registro enviado. Revisa tu correo para confirmar la cuenta y después inicia sesión.")}
 catch(e){say(e.message||String(e))}
 finally{b.disabled=false}
});
$("#accountLogout").addEventListener("click",async()=>{
 try{const c=getClient(),{error}=await c.auth.signOut();if(error)throw error;render(null);say("Sesión cerrada en este dispositivo.")}
 catch(e){say(e.message||String(e))}
});
$("#accountGoSync").addEventListener("click",()=>{close();document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("hidden",p.id!=="dashboard"));$("#dashboard").scrollIntoView({behavior:"smooth",block:"start"});$("#cloudSyncNow")?.scrollIntoView({behavior:"smooth",block:"center"})});
// No escuchar aquí pbb-auth-state-changed: render() emite ese evento y provocaría un bucle recursivo.
refresh();
