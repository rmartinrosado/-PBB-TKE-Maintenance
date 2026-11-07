import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods":"POST, OPTIONS" };
Deno.serve(async (req) => {
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 try {
  const auth=req.headers.get("Authorization");
  if(!auth) return new Response(JSON.stringify({error:"Autenticación requerida"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, key=Deno.env.get("ANTHROPIC_API_KEY");
  if(!key) throw new Error("Falta configurar ANTHROPIC_API_KEY en los secretos de Supabase.");
  const sb=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userErr}=await sb.auth.getUser();
  if(userErr||!user) return new Response(JSON.stringify({error:"Sesión no válida"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  const body=await req.json(); const question=String(body.question||"").slice(0,8000);
  const caseInfo=body.caseInfo||{}; const ids=Array.isArray(body.documentIds)?body.documentIds.slice(0,30):[];
  if(!question) throw new Error("Escribe la consulta técnica.");
  let query=sb.from("document_chunks").select("content,page_label,document_id,documents!inner(title,file_name,revision,pbb_scope,document_type)").in("document_id",ids).limit(80);
  const {data:chunks,error}=await query;
  if(error) throw error;
  const sourceText=(chunks||[]).map((c:any)=>({document:c.documents.title||c.documents.file_name,revision:c.documents.revision||"No indicada",scope:c.documents.pbb_scope,page:c.page_label||"No identificada",text:c.content}));
  const system=`Eres asistente técnico de mantenimiento de pasarelas TKE PBB/RCS. Responde en español de España. BASE DOCUMENTAL: usa exclusivamente los extractos suministrados para afirmar conexiones, bornes, conductores, canales PLC, referencias de módulos, tensiones y secuencias específicas. No inventes. Si falta una hoja, revisión, continuidad de referencia o valor nominal, dilo explícitamente y solicita cotejo documental. Separa: DATOS CONFIRMADOS EN FUENTE, HIPÓTESIS, DATOS NO VERIFICADOS y PRIMERA ACTUACIÓN EN CAMPO. Nunca recomiendes puentear, anular o inhibir seguridades; cualquier prueba debe respetar consignación y procedimiento TKE. Los históricos de averías no prueban la causa del caso actual. Cita cada afirmación técnica con [documento, revisión, página/hoja]. Si no hay extractos, indica que no hay documentación seleccionada y no fabriques un diagnóstico.`;
  const prompt=`CASO ACTUAL:\n${JSON.stringify(caseInfo)}\n\nPREGUNTA:\n${question}\n\nEXTRACTOS DOCUMENTALES AUTORIZADOS:\n${JSON.stringify(sourceText)}`;
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:3500,system,messages:[{role:"user",content:prompt}]})});
  const result=await r.json(); if(!r.ok) throw new Error(result.error?.message||"Error de Claude");
  const answer=(result.content||[]).filter((x:any)=>x.type==="text").map((x:any)=>x.text).join("\n");
  return new Response(JSON.stringify({answer,sources:sourceText.map((s:any)=>({document:s.document,revision:s.revision,page:s.page}))}),{headers:{...cors,"Content-Type":"application/json"}});
 } catch(e) { return new Response(JSON.stringify({error:e.message||"Error interno"}),{status:400,headers:{...cors,"Content-Type":"application/json"}}); }
});