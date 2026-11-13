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
  const auth=req.headers.get("Authorization");
  if(!auth)return json({error:"Autenticación requerida. Inicia sesión en la aplicación."},401);
  const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),key=Deno.env.get("ANTHROPIC_API_KEY");
  if(!url||!anon)return json({error:"Faltan SUPABASE_URL o SUPABASE_ANON_KEY en el entorno de la función."},500);
  if(!key)return json({error:"Falta el secreto ANTHROPIC_API_KEY en Supabase → Edge Functions → Secrets."},500);
  const sb=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userErr}=await sb.auth.getUser();
  if(userErr||!user)return json({error:"La sesión de Supabase no es válida o ha caducado. Cierra sesión y vuelve a entrar."},401);
  const body=await req.json(),question=String(body.question||"").trim().slice(0,8000),caseInfo=body.caseInfo&&typeof body.caseInfo==="object"?body.caseInfo:{};
  const pbb=normPbb(caseInfo.pbb);if(!/^\\d{3}$/.test(pbb))return json({error:"La posición PBB es obligatoria y debe tener tres cifras."},400);
  const expectedLibrary=A380.has(pbb)?"A380_SPECIAL":"COMMON";
  if(caseInfo.documentLibrary&&caseInfo.documentLibrary!==expectedLibrary)return json({error:"La biblioteca declarada no corresponde a PBB-"+pbb+". Se esperaba "+expectedLibrary+"."},400);
  const ids=Array.isArray(body.documentIds)?[...new Set(body.documentIds.filter((x:any)=>typeof x==="string").slice(0,30))]:[];
  if(!question)return json({error:"Escribe la consulta técnica."},400);
  if(!ids.length)return json({error:"Selecciona al menos un documento."},400);
  const {data:owned,error:ownedErr}=await sb.from("documents").select("id,title,file_name,revision,pbb_scope,document_type").eq("user_id",user.id).in("id",ids);
  if(ownedErr)throw new Error("No se pudieron validar los documentos seleccionados: "+ownedErr.message);
  const ownedDocs=owned||[];if(!ownedDocs.length)return json({error:"Los documentos seleccionados no pertenecen a esta cuenta o ya no están disponibles."},403);
  const invalid=ownedDocs.filter((d:any)=>!allowedScope(d.pbb_scope,pbb));
  if(invalid.length)return json({error:"Bloqueado: hay documentos incompatibles con PBB-"+pbb+": "+invalid.map((d:any)=>d.title||d.file_name||d.id).join(", ")},403);
  const ownedIds=ownedDocs.map((x:any)=>x.id);
  if(!ownedIds.length)return json({error:"Los documentos seleccionados no pertenecen a esta cuenta o ya no están disponibles."},403);
  const {data:chunks,error:chunkErr}=await sb.from("document_chunks").select("content,page_label,document_id,documents!inner(title,file_name,revision,pbb_scope,document_type)").eq("user_id",user.id).in("document_id",ownedIds).order("chunk_index",{ascending:true}).limit(80);
  if(chunkErr)throw new Error("No se pudieron leer los fragmentos indexados: "+chunkErr.message);
  if(!chunks?.length)return json({error:"Los documentos están en la biblioteca, pero no tienen texto indexado. Si son PDF escaneados necesitan OCR; si contienen texto, vuelve a incorporarlos para indexarlos."},422);
  const sourceText=chunks.map((c:any)=>({document:c.documents.title||c.documents.file_name,revision:c.documents.revision||"No indicada",scope:c.documents.pbb_scope,page:c.page_label||"No identificada",text:c.content}));
  const system=`Eres un asistente técnico de mantenimiento de pasarelas TKE PBB/RCS. Responde en español. Usa exclusivamente los extractos autorizados para afirmar referencias, bornes, conductores, canales PLC, tensiones, tolerancias y secuencias. No inventes ni completes por analogía. Cita cada afirmación técnica concreta con [documento, revisión, página/hoja]; si no consta, indica NO LOCALIZADO. Distingue HECHO DOCUMENTADO, HIPÓTESIS, PRUEBA DISCRIMINANTE y RESULTADO MEDIDO. No declares una causa confirmada sin medición concluyente. Nunca recomiendes puentear, anular o inhibir seguridades, finales de carrera, enclavamientos o protecciones. Indica consignación y riesgos antes de pruebas eléctricas, y separa pruebas con tensión y sin tensión. No inventes valores esperados. Si las fuentes se contradicen o no bastan, detén la conclusión y solicita la documentación o medición que falta.`;
  const prompt=`BIBLIOTECA APLICABLE: ${expectedLibrary}\nPOSICIÓN: PBB-${pbb}\nCASO ACTUAL:\n${JSON.stringify(caseInfo)}\n\nPREGUNTA:\n${question}\n\nEXTRACTOS DOCUMENTALES AUTORIZADOS:\n${JSON.stringify(sourceText)}\n\nEstructura obligatoria: 1) alcance y documentos; 2) datos confirmados con citas; 3) secuencia funcional trazable solo hasta donde permitan las fuentes; 4) hipótesis ordenadas y evidencia faltante; 5) primera actuación en campo con pasos seguros; 6) tabla de pruebas, punto exacto solo si está documentado, condición segura, valor esperado documentado o indicar no especificado e interpretación; 7) resolución condicionada a resultados; 8) datos pendientes y nivel de certeza. No inventes referencias ni valores.`;
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:Deno.env.get("CLAUDE_MODEL")||"claude-sonnet-4-6",max_tokens:3500,system,messages:[{role:"user",content:prompt}]})});
  const raw=await r.text();let result:any={};try{result=JSON.parse(raw)}catch{}
  if(!r.ok)return json({error:"Anthropic API HTTP "+r.status+": "+(result.error?.message||raw.slice(0,900)||"Respuesta vacía")},502);
  const answer=(result.content||[]).filter((x:any)=>x.type==="text").map((x:any)=>x.text).join("\n");
  if(!answer)return json({error:"Claude respondió sin contenido de texto. Revisa el modelo y la respuesta de Anthropic."},502);
  return json({answer,library:expectedLibrary,pbb,sources:sourceText.map((s:any)=>({document:s.document,revision:s.revision,page:s.page,chunk:s.chunk}))});
 }catch(e){return json({error:e instanceof Error?e.message:"Error interno no identificado"},500)}
});