# Hoja de ruta PBB TKE Maintenance V2

| Fase | Alcance | Estado |
|---|---|---|
| 1. Fiabilidad | Timestamps por registro, recuperación de borradores, aislamiento de conflictos de sincronización, revisión de caché | En curso |
| 2. Interfaz de campo | Navegación inferior, accesos rápidos, conectividad, herramientas de fotografía y dictado | Primera entrega implementada; falta prueba en iPhone |
| 3. Gestión de mantenimiento | Prioridad, responsable, fecha objetivo, trabajo realizado, materiales y tiempos en órdenes | Primera ampliación implementada; faltan filtros, edición completa, firmas y PDF |
| 4. Documentación RCS | Visor PDF privado con salto a página y búsqueda literal en texto indexado | Primera entrega implementada; OCR, búsqueda semántica y extracción de conexiones PLC pendientes |
| 5. Asistente técnico | Borrador recuperable, evidencias fotográficas y notas de voz | Parcial; falta vincular evidencias al informe, backup y sincronización |
| 6. Analítica | KPIs de resolución, recurrencia, disponibilidad y preventivo | Pendiente |

## Reglas de entrega

- Mantener la rama de desarrollo separada de producción.
- Proteger los datos existentes y no cambiar el esquema remoto sin migración SQL revisada.
- No sincronizar ni borrar evidencias hasta disponer de una política de conflicto y respaldo.
- No presentar como confirmado ningún dato técnico sin referencia documental aplicable.
- No fusionar hasta probar el flujo en iPhone y la sincronización con la cuenta existente.


## Fase 4 · primera entrega técnica

- Visor PDF integrado en la biblioteca privada; genera una URL firmada temporal y carga la página solicitada mediante el visor PDF del navegador.
- Búsqueda literal AND de referencias/texto dentro de los fragmentos indexados de un documento. Cada resultado muestra la página/hoja almacenada y permite abrirla en el visor.
- El selector respeta el filtrado documental por posición, incluida la separación de las bibliotecas A380.
- Límites: no se incorporó OCR, no se hace búsqueda semántica ni reconocimiento de símbolos, y no se deducen conexiones de E/S PLC. La búsqueda solo encuentra texto extraído durante la subida. La visualización PDF depende del soporte del navegador; debe probarse en Safari iPhone.
