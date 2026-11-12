import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
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
  const ids=Array.isArray(body.documentIds)?[...new Set(body.documentIds.filter((x:any)=>typeof x==="string").slice(0,30))]:[];
  if(!question)return json({error:"Escribe la consulta técnica."},400);
  if(!ids.length)return json({error:"Selecciona al menos un documento."},400);
  const {data:owned,error:ownedErr}=await sb.from("documents").select("id").eq("user_id",user.id).in("id",ids);
  if(ownedErr)throw new Error("No se pudieron validar los documentos seleccionados: "+ownedErr.message);
  const ownedIds=(owned||[]).map((x:any)=>x.id);
  if(!ownedIds.length)return json({error:"Los documentos seleccionados no pertenecen a esta cuenta o ya no están disponibles."},403);
  const {data:chunks,error:chunkErr}=await sb.from("document_chunks").select("content,page_label,document_id,documents!inner(title,file_name,revision,pbb_scope,document_type)").eq("user_id",user.id).in("document_id",ownedIds).order("chunk_index",{ascending:true}).limit(80);
  if(chunkErr)throw new Error("No se pudieron leer los fragmentos indexados: "+chunkErr.message);
  if(!chunks?.length)return json({error:"Los documentos están en la biblioteca, pero no tienen texto indexado. Si son PDF escaneados necesitan OCR; si contienen texto, vuelve a incorporarlos para indexarlos."},422);
  const sourceText=chunks.map((c:any)=>({document:c.documents.title||c.documents.file_name,revision:c.documents.revision||"No indicada",scope:c.documents.pbb_scope,page:c.page_label||"No identificada",text:c.content}));
  const system=`Eres asistente técnico de mantenimiento de pasarelas TKE PBB/RCS. Responde en español de España. Usa exclusivamente los extractos suministrados para afirmar conexiones, bornes, conductores, canales PLC, referencias de módulos, tensiones y secuencias específicas. No inventes. Si falta una hoja, revisión, continuidad de referencia o valor nominal, dilo explícitamente. Separa DATOS CONFIRMADOS EN FUENTE, HIPÓTESIS, DATOS NO VERIFICADOS y PRIMERA ACTUACIÓN EN CAMPO. Nunca recomiendes puentear, anular o inhibir seguridades; respeta consignación y procedimiento TKE. Los históricos no prueban la causa actual. Cita afirmaciones con [documento, revisión, página/hoja].`;
  const prompt=`CASO ACTUAL:\n${JSON.stringify(caseInfo)}\n\nPREGUNTA:\n${question}\n\nEXTRACTOS DOCUMENTALES AUTORIZADOS:\n${JSON.stringify(sourceText)}`;
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:Deno.env.get("CLAUDE_MODEL")||"claude-sonnet-4-6",max_tokens:3500,system,messages:[{role:"user",content:prompt}]})});
  const raw=await r.text();let result:any={};try{result=JSON.parse(raw)}catch{}
  if(!r.ok)return json({error:"Anthropic API HTTP "+r.status+": "+(result.error?.message||raw.slice(0,900)||"Respuesta vacía")},502);
  const answer=(result.content||[]).filter((x:any)=>x.type==="text").map((x:any)=>x.text).join("\n");
  if(!answer)return json({error:"Claude respondió sin contenido de texto. Revisa el modelo y la respuesta de Anthropic."},502);
  return json({answer,sources:sourceText.map((s:any)=>({document:s.document,revision:s.revision,page:s.page}))});
 }catch(e){return json({error:e instanceof Error?e.message:"Error interno no identificado"},500)}
});