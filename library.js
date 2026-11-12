import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const $=s=>document.querySelector(s); let sb=null,session=null,docs=[];
const say=(s)=>{const n=$("#libStatus");if(n)n.textContent=s};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function config(){const url=$("#sbUrl").value.trim(),key=$("#sbKey").value.trim();if(!url||!key)throw Error("Introduce URL y clave pública de Supabase.");let parsed;try{parsed=new URL(url)}catch{throw Error("La URL de Supabase no es válida.")}if(parsed.protocol!=="https:"||!parsed.hostname.endsWith(".supabase.co"))throw Error("Usa la URL HTTPS del proyecto Supabase.");const cleanUrl=url.endsWith("/")?url.slice(0,-1):url;localStorage.setItem("pbb-sb-url",cleanUrl);localStorage.setItem("pbb-sb-anon",key);sb=createClient(cleanUrl,key);return sb}
$("#sbSaveConfig").onclick=()=>{try{config();say("Configuración guardada en este dispositivo. Ahora puedes iniciar sesión o crear tu usuario.")}catch(e){say(e.message)}};
async function ensure(){if(!sb)config();const {data}=await sb.auth.getSession();session=data.session;if(!session)throw Error("Inicia sesión para acceder a la biblioteca privada.");return session}
async function list(){await ensure();const {data,error}=await sb.from("documents").select("*").order("created_at",{ascending:false});if(error)throw error;docs=data||[];$("#docList").innerHTML=docs.length?docs.map(d=>`<label class="docrow"><input type="checkbox" class="docpick" value="${d.id}" checked><span><b>${esc(d.title)}</b><small>${esc(d.document_type)} · PBB: ${esc(d.pbb_scope)} · Rev: ${esc(d.revision||"No indicada")} · ${new Date(d.created_at).toLocaleDateString("es-ES")}</small></span><button type="button" data-open="${d.id}" class="mini secondary">Abrir</button><button type="button" data-del="${d.id}" class="mini danger">Eliminar</button></label>`).join(""):"<p class='sub'>Biblioteca vacía. Sube el primer plano o manual.</p>";document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>removeDoc(b.dataset.del));document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openDoc(b.dataset.open));say(`Sesión activa · ${docs.length} documentos privados`)}
async function extract(file){if(file.type==="text/plain")return [{page:"TXT",text:await file.text()}];if(file.type!=="application/pdf")return [];const pdfjs=await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs");pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";const pdf=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;const pages=[];for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),t=await p.getTextContent();const text=t.items.map(x=>x.str||"").join(" ").trim();if(text)pages.push({page:String(i),text})}return pages}
function uploadProgress(percent,phase,note){
 const panel=$("#docUploadProgress"),bar=$("#docUploadBar"),value=$("#docUploadPercent"),phaseEl=$("#docUploadPhase"),noteEl=$("#docUploadNote");
 if(!panel)return;
 panel.classList.add("visible");
 bar.style.width=Math.max(0,Math.min(100,percent))+"%";
 value.textContent=Math.round(percent)+"%";
 phaseEl.textContent=phase;
 noteEl.textContent=note||"";
}
async function upload(){
 const button=$("#docUpload");
 let uploadedPath=null,metadataSaved=false;
 try{
  await ensure();
  const file=$("#docFile").files[0];
  if(!file)throw Error("Selecciona un archivo PDF o TXT.");
  const ext=(file.name.split(".").pop()||"").toLowerCase();
  if(!["pdf","txt"].includes(ext))throw Error("Formato no admitido. Selecciona PDF o TXT.");
  if(file.size>50*1024*1024)throw Error("Límite por archivo: 50 MB.");
  const user=session.user.id,id=crypto.randomUUID(),safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_"),path=`${user}/${id}/${safeName}`;
  button.disabled=true;button.textContent="Subiendo…";
  uploadProgress(0,"Preparando archivo",`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`);
  const bucket=sb.storage.from("pbb-private-docs");
  const {data:uploadData,error:upErr}=await bucket.upload(path,file,{
   contentType:ext==="pdf"?"application/pdf":"text/plain",
   upsert:false,
   onUploadProgress:(event)=>{
    const percent=event.total?Math.min(99,(event.loaded/event.total)*100):0;
    uploadProgress(percent,"Subiendo PDF a Supabase",`${(event.loaded/1024/1024).toFixed(2)} de ${(event.total/1024/1024).toFixed(2)} MB transferidos`);
   }
  });
  if(upErr)throw upErr;
  uploadedPath=uploadData?.path||path;
  uploadProgress(100,"Archivo transferido","Guardando ficha del documento…");
  const meta={
   id,user_id:user,title:$("#docTitle").value.trim()||file.name,file_name:file.name,
   storage_path:uploadedPath,mime_type:ext==="pdf"?"application/pdf":"text/plain",
   file_size:file.size,pbb_scope:$("#docPbb").value.trim()||"GENERAL",
   document_type:$("#docType").value,revision:$("#docRevision").value.trim()||null,
   notes:$("#docNotes").value.trim()||null
  };
  const {error:dbErr}=await sb.from("documents").insert(meta);
  if(dbErr)throw dbErr;
  metadataSaved=true;
  uploadProgress(100,"Archivo guardado · Indexando","Extrayendo texto del PDF para que Claude pueda consultarlo…");
  let pages=[];
  try{
   pages=await extract(file);
   const chunks=[];let idx=0;
   for(const p of pages)for(let i=0;i<p.text.length;i+=6500)
    chunks.push({document_id:id,user_id:user,chunk_index:idx++,page_label:p.page,content:p.text.slice(i,i+6500)});
   if(chunks.length){
    const {error:chunkErr}=await sb.from("document_chunks").insert(chunks);
    if(chunkErr)throw chunkErr;
   }
   const charCount=pages.reduce((n,p)=>n+p.text.length,0);
   const {error:updateErr}=await sb.from("documents").update({extracted_chars:charCount}).eq("id",id);
   if(updateErr)throw updateErr;
   if(charCount===0){
    uploadProgress(100,"PDF guardado · Sin texto extraíble","El archivo está almacenado, pero parece escaneado o sin capa de texto. Necesita OCR antes de analizarlo con Claude.");
    say("PDF guardado en biblioteca, pero no contiene texto extraíble. Necesita OCR para Claude.");
   }else{
    uploadProgress(100,"Subida e indexación completadas",`${pages.length} páginas con texto · ${charCount.toLocaleString("es-ES")} caracteres indexados`);
    say("Documento privado guardado e indexado correctamente.");
   }
  }catch(indexError){
   uploadProgress(100,"Archivo guardado · Indexación fallida",indexError.message||String(indexError));
   say("El original está guardado, pero falló la extracción/indexación: "+(indexError.message||String(indexError)));
  }
  $("#docFile").value="";
  await list();
 }catch(e){
  const msg=e?.message||String(e);
  if(uploadedPath&&!metadataSaved){
   try{await sb.storage.from("pbb-private-docs").remove([uploadedPath])}catch{}
  }
  uploadProgress(0,"Error en la subida",msg);
  say("No se pudo incorporar el documento: "+msg);
 }finally{
  button.disabled=false;button.textContent="Guardar en biblioteca privada";
 }
}
async function openDoc(id){await ensure();const d=docs.find(x=>x.id===id);if(!d)return;const {data,error}=await sb.storage.from("pbb-private-docs").createSignedUrl(d.storage_path,60);if(error)throw error;const a=document.createElement("a");a.href=data.signedUrl;a.target="_blank";a.rel="noopener";a.click()}
async function removeDoc(id){if(!confirm("¿Eliminar el documento privado y su índice?"))return;await ensure();const d=docs.find(x=>x.id===id);if(!d)return;const {error}=await sb.from("documents").delete().eq("id",id);if(error)throw error;await sb.storage.from("pbb-private-docs").remove([d.storage_path]);await list()}
async function analyze(){
 const button=$("#claudeRun"),answer=$("#claudeAnswer"),sources=$("#claudeSources");
 try{
  await ensure();
  const ids=[...document.querySelectorAll(".docpick:checked")].map(x=>x.value);
  if(!ids.length)throw Error("Selecciona al menos un documento.");
  const question=$("#claudeQuestion").value.trim();
  if(!question)throw Error("Escribe qué necesitas comprobar.");
  button.disabled=true;button.textContent="Analizando…";
  answer.textContent="Enviando la consulta y los fragmentos indexados a Claude. Espera…";sources.innerHTML="";
  say("Consultando documentos seleccionados con Claude…");
  const {data,error}=await sb.functions.invoke("claude-diagnose",{body:{question,documentIds:ids,caseInfo:{pbb:$("#casePbb").value,order:$("#caseOrder").value,alarm:$("#caseAlarm").value,fieldObservations:$("#caseObs").value}}});
  if(error){
   let detail=error.message||"Error al llamar a la función.";
   try{if(error.context){const payload=await error.context.clone().json();if(payload.error)detail=payload.error}}catch{}
   throw Error(detail);
  }
  if(data?.error)throw Error(data.error);
  if(!data?.answer)throw Error("La función respondió, pero no devolvió un análisis.");
  answer.textContent=data.answer;
  sources.innerHTML=(data.sources||[]).map(s=>`<li>${esc(s.document)} · Rev. ${esc(s.revision)} · Hoja/página ${esc(s.page)}</li>`).join("");
  say("Análisis recibido. Verifica cada referencia contra el documento original.");
 }catch(e){
  const message=e?.message||String(e);
  answer.textContent="NO SE HA PODIDO REALIZAR EL ANÁLISIS\n\n"+message+"\n\nComprueba que la función claude-diagnose está desplegada en Supabase y que existe el secreto ANTHROPIC_API_KEY.";
  sources.innerHTML="";
  say("Error de análisis: "+message);
  answer.scrollIntoView({behavior:"smooth",block:"center"});
 }finally{button.disabled=false;button.textContent="Analizar con Claude"}
}
async function boot(){const url=localStorage.getItem("pbb-sb-url"),key=localStorage.getItem("pbb-sb-anon");if(url)$("#sbUrl").value=url;if(key)$("#sbKey").value=key;try{if(url&&key){config();const {data}=await sb.auth.getSession();session=data.session;if(session)await list().catch(e=>say("Sesión activa. La biblioteca documental aún no está configurada: "+e.message))}}catch(e){say(e.message)}}
$("#sbConnect").onclick=async()=>{try{config();const email=$("#sbEmail").value.trim(),password=$("#sbPassword").value;if(!email||!password)throw Error("Introduce correo y contraseña.");const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;session=data.session;await list().catch(e=>say("Sesión iniciada correctamente. La biblioteca documental aún no está configurada: "+e.message))}catch(e){say(e.message)}};
$("#sbRegister").onclick=async()=>{try{config();const {error}=await sb.auth.signUp({email:$("#sbEmail").value.trim(),password:$("#sbPassword").value});if(error)throw error;say("Registro enviado. Confirma el correo si Supabase lo solicita; después inicia sesión.")}catch(e){say(e.message)}};
$("#sbLogout").onclick=async()=>{if(sb)await sb.auth.signOut();session=null;docs=[];$("#docList").innerHTML="";say("Sesión cerrada.")};
$("#docUpload").onclick=()=>upload().catch(e=>say(e.message));$("#claudeRun").onclick=()=>analyze().catch(e=>say(e.message));boot();
