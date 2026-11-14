# PBB TKE Maintenance · V2.3.0 (producción)

PWA de apoyo al mantenimiento electromecánico de Passenger Boarding Bridges TKE en Madrid-Barajas T4/T4S.

## Alcance implementado en producción

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
- Los PDFs con texto se indexan. Para planos escaneados existe OCR puntual por página desde el visor RCS; falta validación real en Safari/iPhone y Supabase.
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


## Visor RCS y OCR puntual · V2.1–V2.2

La rama de desarrollo incorpora un visor de PDF privado con navegación a página, búsqueda literal en el índice de Supabase y OCR puntual. El acceso se muestra como Planos / Visor RCS y el visor aparece antes del formulario de subida. Los resultados muestran el número de página/hoja indexado y permiten abrir esa página en el visor. La selección de documentos conserva el filtrado por biblioteca/posición, incluida la exclusión mutua de la documentación A380.

**Limitaciones:** no hay búsqueda semántica, lectura automática de símbolos ni trazado automático de entradas/salidas PLC. La visualización y el OCR requieren validación real en Safari/iPhone; PDF.js y Tesseract.js se cargan desde CDN. Los documentos sin texto extraíble no producirán resultados de búsqueda. La apertura embebida depende del visor PDF de Safari/navegador y requiere prueba real en iPhone. La URL firmada es temporal.


### OCR de planos escaneados

En el visor RCS, selecciona un PDF, introduce la página física (numeración desde 1) y pulsa **OCR de página actual**. El navegador renderiza esa página y Tesseract.js intenta reconocer texto en español e inglés; el resultado se guarda en el índice privado del documento y pasa a ser localizable mediante la búsqueda literal. El proceso es puntual por página, no masivo. La numeración física del PDF puede no coincidir con el folio impreso en el esquema.

La documentación de referencia vigente es T87911031210ES_BARAJAS_T4T4S_Rev_J ESQUEMA.pdf (Rev. J, 28/05/2024, 96 páginas físicas), ya subida por el usuario a la biblioteca privada de la PWA. El documento anterior RCS PLANOS.pdf queda sustituido. Falta validar con sesión real que el visor abra el PDF y que OCR escriba el texto en document_chunks.


## OCR RCS V3 · análisis especializado de planos eléctricos

- Renderizado PDF de alta resolución y cuatro zonas solapadas.
- Cuatro pasadas por zona: contraste y umbral adaptativo, con segmentación Tesseract PSM 11 y PSM 6.
- Clasificación preliminar de referencias de equipos, bornes, conductores y cables; coordenadas normalizadas para localizar coincidencias.
- Análisis visual complementario Claude Vision mediante Edge Function privada `claude-plan-vision`. Verifica propiedad del documento, requiere sesión y usa `ANTHROPIC_API_KEY` solo en servidor.
- El análisis IA distingue lecturas claras/probables/ilegibles y advierte conexiones ambiguas. No sustituye la comprobación del plano original.

### Despliegue adicional requerido para Claude Vision

La función `supabase/functions/claude-plan-vision/index.ts` y su configuración ya están en el repositorio. Para habilitar el análisis visual en el proyecto Supabase, desde un entorno con Supabase CLI autenticado y el proyecto vinculado, ejecutar:

```bash
supabase functions deploy claude-plan-vision
```

Comprobar que el secreto `ANTHROPIC_API_KEY` está configurado en Supabase Edge Functions. Si la función aún no se ha desplegado, la PWA mostrará el OCR local y señalará que el análisis visual IA no está disponible; no lo presentará como completado.


## OCR RCS V3.1 · validación cruzada PDF + OCR + Claude

- Se conserva la capa de texto vectorial nativa cuando contiene suficiente texto técnico, sin utilizarla para omitir el OCR visual.
- Se ejecuta OCR visual de cuatro zonas y cuatro pasadas incluso cuando el PDF contiene texto vectorial.
- Las referencias candidatas se contrastan por separado contra tokens PDF y OCR; se guardan recuentos, confianza y coordenadas de cada evidencia.
- Claude Vision recibe el texto vectorial, el OCR y la evidencia de contraste junto con las imágenes del plano.
- El resultado se guarda como reconocimiento V4 con bloques diferenciados de referencias clasificadas, validación cruzada, posiciones y coordenadas normalizadas.
- La confirmación previa presenta un resumen legible sin volcar literalmente la sintaxis Markdown de Claude.
- Una coincidencia PDF/OCR refuerza la lectura de una etiqueta, pero **no demuestra una conexión eléctrica**. Las conexiones deben seguirse en el esquema y verificarse en campo con el procedimiento autorizado.


## Integración diagnóstico → orden de trabajo · V2.3.0

- Cada caso nuevo recibe un identificador estable.
- El informe del diagnóstico debe guardarse antes de generar una orden vinculada.
- La acción «Crear orden de trabajo desde este diagnóstico» prepara la OT con PBB, número de orden, alarma y comprobaciones iniciales.
- La OT conserva el identificador del diagnóstico, las fuentes documentales mostradas por el análisis Claude y el texto del análisis recibido.
- La ficha de OT muestra la trazabilidad documental y permite consultar el análisis técnico asociado.
- Estos campos forman parte del registro local y del payload que sincroniza cloud-sync.js con maintenance_records.

**Validación pendiente en dispositivo real:** probar el flujo completo en Safari/iPhone, confirmar persistencia tras recarga, sincronización en Supabase y recuperación en otro dispositivo. La sintaxis JavaScript de app.js se ha comprobado; esto no sustituye las pruebas de interfaz y de backend. Las fotografías de campo continúan en IndexedDB local y todavía no se sincronizan con Supabase.
