# Hoja de ruta PBB TKE Maintenance V2

| Fase | Alcance | Estado |
|---|---|---|
| 1. Fiabilidad | Timestamps por registro, recuperación de borradores, aislamiento de conflictos de sincronización, revisión de caché | En curso |
| 2. Interfaz de campo | Navegación inferior, accesos rápidos, conectividad, herramientas de fotografía y dictado | Primera entrega implementada; falta prueba en iPhone |
| 3. Gestión de mantenimiento | Prioridad, responsable, fecha objetivo, trabajo realizado, materiales y tiempos en órdenes | Primera ampliación implementada; faltan filtros, edición completa, firmas y PDF |
| 4. Documentación RCS | Visor y búsqueda por referencia/hoja, OCR de planos, recuperación semántica y citas verificables | Pendiente |
| 5. Asistente técnico | Borrador recuperable, evidencias fotográficas y notas de voz | Parcial; falta vincular evidencias al informe, backup y sincronización |
| 6. Analítica | KPIs de resolución, recurrencia, disponibilidad y preventivo | Pendiente |

## Reglas de entrega

- Mantener la rama de desarrollo separada de producción.
- Proteger los datos existentes y no cambiar el esquema remoto sin migración SQL revisada.
- No sincronizar ni borrar evidencias hasta disponer de una política de conflicto y respaldo.
- No presentar como confirmado ningún dato técnico sin referencia documental aplicable.
- No fusionar hasta probar el flujo en iPhone y la sincronización con la cuenta existente.
