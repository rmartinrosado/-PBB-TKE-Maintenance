# Hoja de ruta PBB TKE Maintenance V2

| Fase | Alcance | Estado |
|---|---|---|
| 1. Fiabilidad | Timestamps por registro, recuperación de borradores, aislamiento de conflictos de sincronización, revisión de caché | En curso |
| 2. Interfaz de campo | Navegación inferior, accesos rápidos, conectividad, herramientas de fotografía y dictado | Primera entrega implementada; falta prueba en iPhone |
| 3. Gestión de mantenimiento | Prioridad, responsable, fecha objetivo, trabajo realizado, materiales y tiempos en órdenes | Primera ampliación implementada; faltan filtros, edición completa, firmas y PDF |
| 4. Documentación RCS | Visor PDF privado, salto a página, búsqueda literal y OCR puntual | Implementado en rama de desarrollo; falta prueba real en iPhone/Supabase |
| 5. Asistente técnico | Borrador recuperable, evidencias fotográficas y notas de voz | Parcial; falta vincular evidencias al informe, backup y sincronización |
| 6. Analítica | KPIs de resolución, recurrencia, disponibilidad y preventivo | Pendiente |

## Reglas de entrega

- Mantener la rama de desarrollo separada de producción.
- Proteger los datos existentes y no cambiar el esquema remoto sin migración SQL revisada.
- No sincronizar ni borrar evidencias hasta disponer de una política de conflicto y respaldo.
- No presentar como confirmado ningún dato técnico sin referencia documental aplicable.
- No fusionar hasta probar el flujo en iPhone y la sincronización con la cuenta existente.


## Fase 4 · primera entrega técnica

- Visor PDF integrado en la biblioteca privada; genera una URL firmada temporal y carga la página solicitada. El acceso Planos / Visor RCS aparece en el menú y el visor se sitúa antes del formulario de subida.
- Búsqueda literal AND de referencias/texto dentro de los fragmentos indexados de un documento. Cada resultado muestra la página/hoja almacenada y permite abrirla en el visor.
- El selector respeta el filtrado documental por posición, incluida la separación de las bibliotecas A380.
- Límites: no hay búsqueda semántica ni reconocimiento de símbolos; no se deducen conexiones de E/S PLC. El OCR puntual requiere validación en Safari/iPhone y Supabase. La búsqueda solo encuentra texto extraído durante la subida. La visualización PDF depende del soporte del navegador; debe probarse en Safari iPhone.


### OCR puntual (V2.2)

- Añadida acción para ejecutar OCR solo sobre la página PDF seleccionada, con Tesseract.js en español e inglés.
- El texto reconocido se guarda como fragmento adicional en `document_chunks`, asociado al número de página física del PDF, y queda disponible para la búsqueda literal y el análisis documental.
- El OCR no se ejecuta automáticamente sobre las 95 páginas: evita consumir memoria/tiempo en móvil y permite seleccionar la hoja escaneada que interesa.
- La documentación de referencia vigente es T87911031210ES_BARAJAS_T4T4S_Rev_J ESQUEMA.pdf (Rev. J, 28/05/2024, 96 páginas físicas), ya subida a la biblioteca privada de la PWA. El documento anterior RCS PLANOS.pdf queda sustituido. Falta validar con sesión real la apertura del PDF y la escritura OCR en document_chunks.
