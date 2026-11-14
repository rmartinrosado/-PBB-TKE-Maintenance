# PBB TKE Maintenance · V2.0 (rama de desarrollo)

PWA de apoyo al mantenimiento electromecánico de Passenger Boarding Bridges TKE en Madrid-Barajas T4/T4S.

## Alcance implementado en esta rama

- Diagnóstico por caso independiente, con ocho etapas y separación entre observación, comprobación y conclusión.
- Guardado local de órdenes e informes en el almacenamiento existente, conservando compatibilidad con los datos anteriores.
- Actualización de `updatedAt` únicamente en los registros modificados para evitar que un cambio local marque todo el histórico como recién editado.
- Órdenes ampliadas: prioridad, responsable, fecha objetivo, trabajo realizado, materiales y tiempo empleado.
- Borrador de diagnóstico con recuperación de los campos y resultados de comprobación.
- Captura de fotografías de campo en IndexedDB, vinculadas a PBB y OT.
- Dictado de voz cuando el navegador ofrece SpeechRecognition; alternativa: dictado del teclado del dispositivo.
- Navegación inferior adaptada al uso móvil y accesos a Inicio, Órdenes, Diagnóstico, Planos e Histórico.
- Indicador de conexión y caché PWA con versión renovada.
- Sincronización Supabase con detección de conflictos de sello temporal idéntico y aislamiento de los registros conflictivos. Los conflictos se pueden descargar para revisión; no se elige automáticamente una versión en ese caso.
- Biblioteca privada Supabase, filtrado documental por posición y análisis Claude mediante Edge Function, conservados.

## Almacenamiento y límites actuales

- Órdenes e informes siguen utilizando la clave local existente `pbb-tke-v6` para no romper datos ya guardados. La migración completa de órdenes e informes a IndexedDB queda pendiente de una fase posterior.
- Las fotografías se guardan en IndexedDB del dispositivo y **todavía no se sincronizan con Supabase ni forman parte de la exportación JSON**. Descárgalas o conserva el dispositivo original hasta que se incorpore un paquete de respaldo de evidencias.
- La sincronización no propaga eliminaciones locales como tombstones. No borres datos locales esperando que esa eliminación se replique en la nube.
- Los conflictos detectados se aíslan y descargan; todavía no existe una pantalla para resolverlos y confirmar qué versión conservar.
- Los PDFs con texto se indexan. Los planos escaneados necesitan OCR; no se ha incorporado OCR en esta versión.
- Claude no debe considerarse una fuente de verdad. Cada conexión, borne, referencia y valor debe cotejarse con el plano/revisión aplicable y la instalación real.
- La PWA no consulta CGA ni el estado operativo en tiempo real.

## Seguridad

- No anular, puentear ni inhibir enclavamientos o protecciones.
- No realizar pruebas de movimiento con personas en zonas de barrido o atrapamiento.
- Las pruebas eléctricas se realizarán solo con procedimiento autorizado, puntos de medida documentados, consignación y verificación de ausencia de tensión cuando corresponda.
- Las claves secretas de Anthropic o Supabase service role nunca deben incluirse en el frontend. La clave pública Supabase no sustituye las políticas RLS.

## Configuración

1. Publicar los archivos estáticos mediante GitHub Pages.
2. Configurar URL y clave pública (publishable/anon) del proyecto Supabase en el panel operativo.
3. Iniciar sesión con la cuenta existente.
4. Comprobar que la tabla `maintenance_records`, el bucket privado y las políticas RLS están configurados.
5. Para Claude, comprobar el despliegue de la Edge Function `claude-diagnose` y el secreto `ANTHROPIC_API_KEY` en Supabase.

## Desarrollo y validación

Esta rama es una propuesta de desarrollo separada de `main`. Antes de publicarla, probar en iPhone:
- Recuperación de órdenes e informes existentes.
- Creación/cierre de órdenes y persistencia de sus nuevos campos.
- Borrador de diagnóstico y restauración de pasos.
- Captura y visualización de fotografías con y sin conexión.
- Inicio de sesión, sincronización, conflicto simulado y descarga del JSON de conflictos.
- Actualización del service worker y funcionamiento offline.

No fusionar en producción hasta superar estas pruebas.


## Visor RCS · entrega inicial V2.1

La rama de desarrollo incorpora un visor de PDF privado con navegación a página y búsqueda literal en el índice de texto de Supabase. Los resultados muestran el número de página/hoja indexado y permiten abrir esa página en el visor. La selección de documentos conserva el filtrado por biblioteca/posición, incluida la exclusión mutua de la documentación A380.

**Limitaciones:** no hay OCR para planos escaneados, búsqueda semántica, lectura automática de símbolos ni trazado automático de entradas/salidas PLC. Los documentos sin texto extraíble no producirán resultados de búsqueda. La apertura embebida depende del visor PDF de Safari/navegador y requiere prueba real en iPhone. La URL firmada es temporal.


### OCR de planos escaneados

En el visor RCS, selecciona un PDF, introduce la página física (numeración desde 1) y pulsa **OCR de página actual**. El navegador renderiza esa página y Tesseract.js intenta reconocer texto en español e inglés; el resultado se guarda en el índice privado del documento y pasa a ser localizable mediante la búsqueda literal. El proceso es puntual por página, no masivo. La numeración física del PDF puede no coincidir con el folio impreso en el esquema.

La prueba de lectura documental de esta versión se ha realizado sobre el PDF RCS PLANOS.pdf disponible en la Biblioteca de ChatGPT: se pudo extraer texto de la hoja P-A5 (página física 85; folio impreso 86). No se ha podido probar la carga embebida desde Supabase porque ese archivo no está incorporado en la biblioteca privada de la aplicación.
