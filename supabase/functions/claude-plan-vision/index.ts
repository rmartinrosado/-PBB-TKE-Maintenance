import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const A380=new Set(["504","507","508"]);
const normPbb=(v:unknown)=>String(v??"").trim().toUpperCase().replace(/^PBB[- ]?/,"");
function allowedScope(value:unknown,pbb:string){const scope=String(value??"GENERAL").trim().toUpperCase();if(A380.has(pbb))return scope==="A380_SPECIAL"||scope===pbb;if(scope==="A380_SPECIAL")return false;if(scope==="COMMON"||scope==="GENERAL"||scope==="")return true;return scope===pbb;}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Método no permitido. Usa POST."},405);
 try{
  const auth=req.headers.get("Authorization");if(!auth)return json({error:"Autenticación requerida."},401);
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),key=Deno.env.get("ANTHROPIC_API_KEY");
  if(!url||!anon)return json({error:"Faltan SUPABASE_URL o SUPABASE_ANON_KEY en la Edge Function."},500);
  if(!key)return json({error:"Falta ANTHROPIC_API_KEY en Supabase → Edge Functions → Secrets."},500);
  const sb=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userErr}=await sb.auth.getUser();if(userErr||!user)return json({error:"Sesión Supabase no válida o caducada."},401);
  const body=await req.json(),documentId=String(body.documentId||""),pageNumber=Math.max(1,Number(body.pageNumber)||1);
  if(!documentId)return json({error:"Falta documentId."},400);
  const {data:doc,error:docErr}=await sb.from("documents").select("id,title,file_name,revision,pbb_scope").eq("id",documentId).eq("user_id",user.id).maybeSingle();
  if(docErr)throw docErr;if(!doc)return json({error:"Documento no encontrado o no pertenece a esta cuenta."},403);
  const pbb=normPbb(body.pbb||"");if(!/^\d{3}$/.test(pbb))return json({error:"La posición PBB es obligatoria y debe tener tres cifras."},400);if(!allowedScope(doc.pbb_scope,pbb))return json({error:"El documento no pertenece a la biblioteca aplicable a PBB-"+pbb+"."},403);
  const images=Array.isArray(body.images)?body.images.slice(0,4):[];
  if(images.length!==4)return json({error:"Se requieren las cuatro zonas del plano."},400);
  let totalBytes=0;
  const imageBlocks=images.map((item:any,index:number)=>{
   const mediaType=String(item.mediaType||"");
   if(mediaType!=="image/jpeg"&&mediaType!=="image/png")throw new Error("Formato de imagen no permitido en zona "+(index+1)+".");
   const data=String(item.data||"");
   if(!/^[A-Za-z0-9+/=]+$/.test(data))throw new Error("Imagen base64 no válida en zona "+(index+1)+".");
   const bytes=Math.floor(data.length*3/4);totalBytes+=bytes;
   if(bytes>4_000_000)throw new Error("Una zona supera 4 MB.");
   return {type:"image",source:{type:"base64",media_type:mediaType,data}};
  });
  if(totalBytes>12_000_000)return json({error:"El conjunto de imágenes supera 12 MB."},413);
  const ocrText=String(body.ocrText||"").slice(0,9000);
  const refs=Array.isArray(body.references)?body.references.slice(0,100).map((x:any)=>String(x).slice(0,40)): [];
  const nativeText=String(body.nativeText||"").slice(0,6000);
  const evidence=Array.isArray(body.referenceEvidence)?body.referenceEvidence.slice(0,100): [];
  const prompt="Analiza visualmente un plano eléctrico RCS de una pasarela TKE. Documento: "+(doc.title||doc.file_name||documentId)+"; revisión: "+(doc.revision||"no indicada")+"; página física PDF: "+pageNumber+".\n"+
"Las cuatro imágenes adjuntas son zonas solapadas del mismo plano en este orden: superior izquierda, superior derecha, inferior izquierda, inferior derecha. El OCR local es una ayuda imperfecta, no una fuente de verdad.\n"+
"OCR candidato:\n"+ocrText+"\n\nTEXTO VECTORIAL NATIVO PDF (si existe):\n"+nativeText+"\n\nEVIDENCIA DE CONTRASTE POR REFERENCIA (conteos PDF/OCR; no implica conexión eléctrica):\n"+JSON.stringify(evidence).slice(0,7000)+"\n\nReferencias candidatas: "+(refs.join(", ")||"ninguna")+".\n\n"+
"TAREA:\n1. Lee solo las etiquetas que sean realmente legibles en las imágenes. Distingue lectura segura, probable e ilegible; no completes caracteres por contexto.\n2. Clasifica referencias visibles: equipos/módulos (P-A5, P-A3, E-A10, etc.), bornes/conectores (DINxx, EX-xx, PX-xx, CONxx), conductores (números de hilo) y cables.\n3. Describe símbolos eléctricos visibles y su función solo si el símbolo es inequívoco.\n4. Sigue conexiones únicamente cuando la línea sea visualmente continua y legible. Si hay cruces, saltos o solapes ambiguos, indícalo; no supongas unión eléctrica.\n5. Para cada referencia legible, indica zona y posición aproximada dentro de esa zona.\n6. Contrasta el OCR con la imagen: corrige candidatos solo cuando la forma gráfica lo justifique y señala los descartados.\n7. No inventes bornes, asignaciones PLC, tensiones, estados, secuencias ni relaciones eléctricas. No deduzcas que dos líneas conectadas gráficamente son el mismo potencial si el plano no lo demuestra.\n\nFORMATO:\n- Calidad visual y limitaciones.\n- Tabla de referencias: lectura | clase | confianza alta/media/baja | zona | evidencia visible.\n- Símbolos identificados.\n- Conexiones trazables y puntos ambiguos.\n- Errores del OCR y candidatos descartados.\n- Elementos que requieren ampliación o consulta del plano original.\nCierra con: Este análisis visual es una ayuda de localización; toda conexión y referencia debe verificarse en el plano original antes de intervenir.";
  const content=[...imageBlocks,{type:"text",text:prompt}];
  const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:Deno.env.get("CLAUDE_MODEL")||"claude-sonnet-4-6",max_tokens:2800,system:"Eres un lector técnico de planos eléctricos. Prima la evidencia visual y la incertidumbre explícita. Nunca inventes datos técnicos.",messages:[{role:"user",content}]})});
  const raw=await response.text();let result:any={};try{result=JSON.parse(raw)}catch{}
  if(!response.ok)return json({error:"Anthropic API HTTP "+response.status+": "+(result.error?.message||raw.slice(0,900)||"Respuesta vacía")},502);
  const answer=(result.content||[]).filter((x:any)=>x.type==="text").map((x:any)=>x.text).join("\n");
  if(!answer)return json({error:"Claude Vision no devolvió contenido de texto."},502);
  return json({answer,document:doc.title||doc.file_name,page:pageNumber,model:result.model||"Claude Vision"});
 }catch(e){return json({error:e instanceof Error?e.message:"Error interno no identificado"},500)}
});