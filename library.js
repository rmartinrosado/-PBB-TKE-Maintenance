import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const $=s=>document.querySelector(s);
let sb=null,session=null,docs=[],clientConfig="";
const say=s=>{const n=$("#libStatus");if(n)n.textContent=s};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function config(){
 const fieldUrl=$("#sbUrl")?.value.trim()||"",fieldKey=$("#sbKey")?.value.trim()||"";
 const url=fieldUrl||localStorage.getItem("pbb-sb-url")||"";
 const key=fieldKey||localStorage.getItem("pbb-sb-anon")||"";
 if(!url||!key)throw Error("Falta la configuración de Supabase. Abre Panel operativo → Configuración de sincronización privada, introduce URL y clave pública y pulsa Guardar configuración.");
 let parsed;try{parsed=new URL(url)}catch{throw Error("La URL de Supabase no es válida.")};
 if(parsed.protocol!=="https:"||!parsed.hostname.endsWith(".supabase.co"))throw Error("Usa la URL HTTPS del proyecto Supabase.");
 const cleanUrl=url.replace(/\/$/,"");
 localStorage.setItem("pbb-sb-url",cleanUrl);localStorage.setItem("pbb-sb-anon",key);
 if(!sb||clientConfig!==cleanUrl+"|"+key){sb=createClient(cleanUrl,key);clientConfig=cleanUrl+"|"+key;session=null;}
 if($("#sbUrl"))$("#sbUrl").value=cleanUrl;if($("#sbKey"))$("#sbKey").value=key;
 return sb;
}
$("#sbSaveConfig").onclick=()=>{try{config();say("Configuración guardada en este dispositivo. Inicia sesión para usar la biblioteca.")}catch(e){say(e.message)}};
async function ensure(){
 const c=config(),{data,error}=await c.auth.getSession();if(error)throw error;session=data.session;
 if(!session)throw Error("Configuración encontrada, pero no hay sesión activa. Inicia sesión en Panel operativo → Configuración de sincronización privada.");
 return session;
}
async function list(){
 await ensure();
 const {data,error}=await sb.from("documents").select("*").order("created_at",{ascending:false});if(error)throw error;
 docs=data||[];
 $("#docList").innerHTML=docs.length?docs.map(d=>`<label class="docrow"><input type="checkbox" class="docpick" value="${esc(d.id)}" checked><span><b>${esc(d.title)}</b><small>${esc(d.document_type)} · PBB: ${esc(d.pbb_scope)} · Rev: ${esc(d.revision||"No indicada")} · ${new Date(d.created_at).toLocaleDateString("es-ES")}</small></span><button type="button" data-open="${esc(d.id)}" class="mini secondary">Abrir</button><button type="button" data-del="${esc(d.id)}" class="mini danger">Eliminar</button></label>`).join(""):"<p class='sub'>Biblioteca vacía. Sube el primer plano o manual.</p>";
 document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>removeDoc(b.dataset.del).catch(e=>say(e.message)));
 document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openDoc(b.dataset.open).catch(e=>say(e.message)));
 say(`Sesión activa · ${docs.length} documentos privados`);
}
async function extract(file){
 if(file.type==="text/plain")return [{page:"TXT",text:await file.text()}];
 if(file.type!=="application/pdf")return [];
 const pdfjs=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");
 pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
 const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise,pages=[];
 for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),t=await p.getTextContent(),text=t.items.map(x=>x.str||"").join(" ").trim();if(text)pages.push({page:String(i),text})}
 return pages;
}
function uploadProgress(percent,phase,note){
 const panel=$("#docUploadProgress"),bar=$("#docUploadBar"),value=$("#docUploadPercent"),phaseEl=$("#docUploadPhase"),noteEl=$("#docUploadNote");
 if(!panel)return;panel.classList.add("visible");bar.style.width=Math.max(0,Math.min(100,percent))+"%";value.textContent=Math.round(percent)+"%";phaseEl.textContent=phase;noteEl.textContent=note||"";
}
function uploadWithProgress(file,path,token,key,url){
 return new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest(),bucket="pbb-private-docs";
  const encodedPath=path.split("/").map(encodeURIComponent).join("/");
  xhr.open("POST",url.replace(/\/$/,"")+"/storage/v1/object/"+bucket+"/"+encodedPath,true);
  xhr.setRequestHeader("apikey",key);xhr.setRequestHeader("Authorization","Bearer "+token);
  xhr.setRequestHeader("Content-Type",file.type|| (file.name.toLowerCase().endsWith(".pdf")?"application/pdf":"text/plain"));
  xhr.setRequestHeader("x-upsert","false");
  xhr.upload.addEventListener("progress",e=>{
   if(e.lengthComputable){const pct=Math.min(99,e.loaded/e.total*100);uploadProgress(pct,"Subiendo archivo a Supabase",`${(e.loaded/1048576).toFixed(2)} de ${(e.total/1048576).toFixed(2)} MB transferidos`)}
   else uploadProgress(50,"Subiendo archivo a Supabase","Transferencia en curso…");
  });
  xhr.addEventListener("load",()=>{
   if(xhr.status>=200&&xhr.status<300){let body={};try{body=JSON.parse(xhr.responseText||"{}")}catch{}resolve(body)}
   else{let msg=xhr.responseText||("HTTP "+xhr.status);try{const j=JSON.parse(msg);msg=j.message||j.error||j.statusCode||msg}catch{}reject(new Error("Supabase Storage: "+msg))}
  });
  xhr.addEventListener("error",()=>reject(new Error("Error de red durante la transferencia a Supabase.")));
  xhr.addEventListener("abort",()=>reject(new Error("La subida se ha cancelado.")));
  xhr.send(file);
 });
}
async function upload(){
 const button=$("#docUpload");let uploadedPath=null,metadataSaved=false;
 try{
  const user=await ensure(),file=$("#docFile").files[0];
  if(!file)throw Error("Selecciona un archivo PDF o TXT.");
  const ext=(file.name.split(".").pop()||"").toLowerCase();
  if(!["pdf","txt"].includes(ext))throw Error("Formato no admitido. Selecciona PDF o TXT.");
  if(file.size>50*1024*1024)throw Error("Límite por archivo: 50 MB.");
  const url=localStorage.getItem("pbb-sb-url"),key=localStorage.getItem("pbb-sb-anon"),id=crypto.randomUUID();
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_"),path=`${user.user.id}/${id}/${safeName}`;
  button.disabled=true;button.textContent="Subiendo…";
  uploadProgress(0,"Preparando archivo",`${file.name} · ${(file.size/1048576).toFixed(2)} MB`);
  await uploadWithProgress(file,path,user.access_token,key,url);uploadedPath=path;
  uploadProgress(100,"Archivo transferido","Guardando ficha del documento…");
  const meta={id,user_id:user.user.id,title:$("#docTitle").value.trim()||file.name,file_name:file.name,storage_path:path,mime_type:ext==="pdf"?"application/pdf":"text/plain",file_size:file.size,pbb_scope:$("#docPbb").value.trim()||"GENERAL",document_type:$("#docType").value,revision:$("#docRevision").value.trim()||null,notes:$("#docNotes").value.trim()||null};
  const {error:dbErr}=await sb.from("documents").insert(meta);if(dbErr)throw dbErr;metadataSaved=true;
  uploadProgress(100,"Archivo guardado · Indexando","Extrayendo texto para que Claude pueda consultarlo…");
  try{
   const pages=await extract(file),chunks=[];let idx=0;
   for(const p of pages)for(let i=0;i<p.text.length;i+=6500)chunks.push({document_id:id,user_id:user.user.id,chunk_index:idx++,page_label:p.page,content:p.text.slice(i,i+6500)});
   if(chunks.length){const {error}=await sb.from("document_chunks").insert(chunks);if(error)throw error}
   const charCount=pages.reduce((n,p)=>n+p.text.length,0),{error:updateError}=await sb.from("documents").update({extracted_chars:charCount}).eq("id",id);if(updateError)throw updateError;
   if(!charCount){uploadProgress(100,"PDF guardado · Sin texto extraíble","El archivo está almacenado, pero parece escaneado. Necesita OCR para analizarlo con Claude.");say("PDF guardado, pero no contiene texto extraíble. Necesita OCR.")}
   else{uploadProgress(100,"Subida e indexación completadas",`${pages.length} páginas · ${charCount.toLocaleString("es-ES")} caracteres indexados`);say("Documento privado guardado e indexado correctamente.")}
  }catch(indexError){uploadProgress(100,"Archivo guardado · Indexación fallida",indexError.message||String(indexError));say("El original está guardado, pero falló la indexación: "+(indexError.message||String(indexError)))}
  $("#docFile").value="";await list();
 }catch(e){
  const msg=e?.message||String(e);
  if(uploadedPath&&!metadataSaved){try{await sb.storage.from("pbb-private-docs").remove([uploadedPath])}catch{}}
  uploadProgress(0,"No se pudo iniciar/completar la subida",msg);say(msg);
 }finally{button.disabled=false;button.textContent="Guardar en biblioteca privada"}
}
async function openDoc(id){await ensure();const d=docs.find(x=>x.id===id);if(!d)return;const {data,error}=await sb.storage.from("pbb-private-docs").createSignedUrl(d.storage_path,60);if(error)throw error;const a=document.createElement("a");a.href=data.signedUrl;a.target="_blank";a.rel="noopener";a.click()}
async function removeDoc(id){if(!confirm("¿Eliminar el documento privado y su índice?"))return;await ensure();const d=docs.find(x=>x.id===id);if(!d)return;const {error}=await sb.from("documents").delete().eq("id",id);if(error)throw error;const {error:storageError}=await sb.storage.from("pbb-private-docs").remove([d.storage_path]);if(storageError)throw storageError;await list()}
async function analyze(){
 const button=$("#claudeRun"),answer=$("#claudeAnswer"),sources=$("#claudeSources");
 try{
  await ensure();const ids=[...document.querySelectorAll(".docpick:checked")].map(x=>x.value);
  if(!ids.length)throw Error("Selecciona al menos un documento.");const question=$("#claudeQuestion").value.trim();if(!question)throw Error("Escribe qué necesitas comprobar.");
  button.disabled=true;button.textContent="Analizando…";answer.textContent="Enviando la consulta y los fragmentos indexados a Claude. Espera…";sources.innerHTML="";say("Consultando documentos seleccionados con Claude…");
  const {data,error}=await sb.functions.invoke("claude-diagnose",{body:{question,documentIds:ids,caseInfo:{pbb:$("#casePbb").value,order:$("#caseOrder").value,alarm:$("#caseAlarm").value,fieldObservations:$("#caseObs").value}}});
  if(error){let detail=error.message||"Error al llamar a la función.";try{const response=error.context;if(response&&typeof response.clone==="function"){const raw=await response.clone().text();let payload={};try{payload=JSON.parse(raw)}catch{}detail=payload.error||payload.message||raw.slice(0,1200)||detail;if(response.status===404)detail="La función claude-diagnose no está desplegada en este proyecto Supabase (HTTP 404).";if(response.status===401)detail="Sesión Supabase no válida o caducada. Cierra sesión y vuelve a iniciarla.";}}catch{}throw Error(detail)}
  if(data?.error)throw Error(data.error);if(!data?.answer)throw Error("La función se ejecutó, pero Claude no devolvió texto. Revisa los registros de Edge Functions.");
  answer.textContent=data.answer;sources.innerHTML=(data.sources||[]).map(s=>`<li>${esc(s.document)} · Rev. ${esc(s.revision)} · Hoja/página ${esc(s.page)}</li>`).join("");say("Análisis recibido. Verifica cada referencia contra el documento original.");
 }catch(e){const message=e?.message||String(e);answer.textContent="NO SE HA PODIDO REALIZAR EL ANÁLISIS\n\n"+message+"\n\nSi falta ANTHROPIC_API_KEY, configura ese secreto en Supabase. Si aparece 404, despliega claude-diagnose. Consulta los registros de Edge Functions para errores internos.";sources.innerHTML="";say("Error de análisis: "+message);answer.scrollIntoView({behavior:"smooth",block:"center"})}
 finally{button.disabled=false;button.textContent="Analizar con Claude"}
}
async function boot(){
 const url=localStorage.getItem("pbb-sb-url"),key=localStorage.getItem("pbb-sb-anon");
 if(url&&$("#sbUrl"))$("#sbUrl").value=url;if(key&&$("#sbKey"))$("#sbKey").value=key;
 try{if(url&&key){config();const {data,error}=await sb.auth.getSession();if(error)throw error;session=data.session;if(session)await list()}}
 catch(e){say("Biblioteca: "+(e.message||String(e)))}
}
$("#sbConnect").onclick=async()=>{try{const c=config(),email=$("#sbEmail").value.trim(),password=$("#sbPassword").value;if(!email||!password)throw Error("Introduce correo y contraseña.");const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;session=data.session;await list().catch(e=>say("Sesión iniciada; biblioteca: "+e.message))}catch(e){say(e.message)}};
$("#sbRegister").onclick=async()=>{try{const c=config(),{error}=await c.auth.signUp({email:$("#sbEmail").value.trim(),password:$("#sbPassword").value});if(error)throw error;say("Registro enviado. Confirma el correo si Supabase lo solicita; después inicia sesión.")}catch(e){say(e.message)}};
$("#sbLogout").onclick=async()=>{try{if(sb)await sb.auth.signOut();session=null;docs=[];$("#docList").innerHTML="";say("Sesión cerrada.")}catch(e){say(e.message)}};
$("#docUpload").onclick=()=>upload().catch(e=>say(e.message));$("#claudeRun").onclick=()=>analyze().catch(e=>say(e.message));
boot();
