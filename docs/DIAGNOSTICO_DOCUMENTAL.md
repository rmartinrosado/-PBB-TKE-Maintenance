# TKE PBB Maintenance · Arquitectura documental y diagnóstico V1.12.0

## Alcance confirmado
- Biblioteca COMMON: posiciones PBB estándar.
- Biblioteca A380_SPECIAL: exclusivamente PBB-504, PBB-507 y PBB-508 (atraque A380 Emirates).
- PBB-503 pertenece a COMMON.
- Una posición estándar no puede consultar A380_SPECIAL.
- Una posición A380 consulta A380_SPECIAL y documentación específica de su posición; no COMMON.
- La documentación específica de una posición estándar se clasifica con el número exacto (por ejemplo, 570).

## Flujo de carga
1. Autenticar al usuario en Supabase.
2. Subir el original al bucket privado pbb-private-docs.
3. Guardar metadatos: título, tipo, revisión, ámbito, notas y propietario.
4. Extraer texto por página y conservar el índice vinculado al documento.
5. Marcar documentos escaneados/sin texto como pendientes de OCR; no fingir que están indexados.

## Flujo de diagnóstico
1. Identificar PBB, orden, alarma literal, función afectada y condiciones.
2. Resolver biblioteca aplicable según la posición.
3. Seleccionar exclusivamente documentos permitidos por el ámbito.
4. Recuperar fragmentos con referencia al documento, revisión y página.
5. Analizar arquitectura, alimentación, protecciones, sensores, actuadores, cableado, E/S PLC, comunicaciones y secuencia funcional solo cuando existan fuentes aplicables.
6. Devolver por separado: hechos documentados, hipótesis, comprobaciones para discriminar, medidas esperadas solo si constan en fuente, riesgos/consignación, resolución y prueba funcional.
7. Si falta plano, revisión, hoja, referencia o valor nominal, declararlo como no verificado y solicitarlo. No inventar bornes, direcciones, tensiones ni parámetros.
8. Nunca recomendar puentear, anular o inhibir seguridades. No ordenar maniobras que expongan personas o aeronave a riesgo.

## Evidencia y confianza
- CONFIRMADO: el plano/manual aplicable identifica inequívocamente componente, conexión o secuencia y la medición/prueba del caso lo corrobora.
- COMPATIBLE: la hipótesis encaja, pero falta una prueba discriminante.
- NO VERIFICADO: no hay fuente suficiente o el dato no aparece en documentación.
- CONTRADICCIÓN: las fuentes o mediciones no coinciden; detener conclusión y pedir revisión.

## Requisitos para siguientes iteraciones
- OCR de planos escaneados y extracción de imágenes/diagramas.
- Indexación multimodal de esquemas eléctricos y páginas gráficas.
- Búsqueda híbrida (texto + referencias + páginas + tipo de documento).
- Versionado y control de vigencia documental.
- Validación del ámbito en servidor Edge Function, no solo en la interfaz.
- Registro de trazabilidad de cada fragmento citado por Claude.
- Pruebas de regresión con casos sintéticos y revisión de técnico responsable.

## Estado y limitación de esta entrega
La V1.12.0 implementa clasificación de ámbito en la interfaz, filtrado de documentos antes de la consulta y esquema de metadatos/indexación. La validación del ámbito en el servidor y el análisis de planos escaneados todavía requieren implementación y pruebas. El filtrado de cliente no debe considerarse una barrera de seguridad frente a llamadas manipuladas.
