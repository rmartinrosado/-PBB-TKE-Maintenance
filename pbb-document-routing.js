/* TKE PBB Maintenance · enrutamiento documental V1.12.0
 * Bibliotecas: COMMON para posiciones estándar; A380_SPECIAL solo 504/507/508.
 * La selección de documentos se vuelve a validar en library.js antes de invocar Claude.
 */
(()=>{"use strict";
 const special=new Set(["504","507","508"]);
 const norm=v=>String(v||"").trim().replace(/^PBB[- ]?/i,"");
 const pbb=document.querySelector("#casePbb");
 const scope=document.querySelector("#docPbb");
 if(scope){
  scope.addEventListener("change",()=>{
   const v=scope.value;
   const note=document.querySelector("#docScopeNote");
   if(note)note.textContent=v==="A380_SPECIAL"?"Documento reservado a PBB-504, PBB-507 y PBB-508 (atraque A380 Emirates).":"Documento para la biblioteca común de posiciones estándar o la posición indicada.";
  });
 }
 if(pbb){
  const update=()=>{
   const n=norm(pbb.value),specialPbb=special.has(n);
   let note=document.querySelector("#pbbLibraryNotice");
   if(!note){note=document.createElement("p");note.id="pbbLibraryNotice";note.className="warning";pbb.closest("label")?.insertAdjacentElement("afterend",note);}
   if(!/^\\d{3}$/.test(n)){note.textContent="Introduce una posición PBB de tres cifras. La biblioteca todavía no se ha seleccionado.";return;}
   note.textContent=specialPbb
    ?"BIBLIOTECA ESPECIAL A380 · PBB-"+n+". Solo se consultarán documentos A380 y documentación específica de esa posición. La biblioteca común queda excluida."
    :"BIBLIOTECA COMÚN · PBB-"+n+". Se consultarán documentos comunes y, si existen, documentos específicos de esa posición. Los documentos A380 quedan excluidos.";
  };
  pbb.addEventListener("input",update);pbb.addEventListener("change",update);update();
 }
 const uploadScope=document.querySelector("#docPbb");
 if(uploadScope&&!document.querySelector("#docScopeNote")){
  const note=document.createElement("small");note.id="docScopeNote";note.className="sub";
  note.textContent="Elige COMMON para planos y procedimientos generales; A380_SPECIAL exclusivamente para documentación de PBB-504/507/508.";
  uploadScope.insertAdjacentElement("afterend",note);
 }
})();