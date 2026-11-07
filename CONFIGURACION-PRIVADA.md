# Puesta en marcha privada · PBB TKE Maintenance

## Arquitectura
- PWA estática en GitHub Pages (interfaz; no almacena documentos privados).
- Supabase Auth (cuenta individual), Postgres con RLS y Storage privado.
- Los originales se guardan en el bucket privado `pbb-private-docs`.
- Los textos extraídos se guardan por fragmentos en `document_chunks` para permitir consultas documentales.
- Función Edge `claude-diagnose` llama a Claude desde servidor. La clave Anthropic nunca se introduce en la PWA.

## Activación (una sola vez)
1. Crea un proyecto en Supabase y conserva URL y clave pública (anon/publishable). No publiques claves secretas.
2. En SQL Editor ejecuta íntegramente `supabase/schema.sql`.
3. En Authentication configura el proveedor Email. Crea tu usuario y confirma el correo según la política elegida.
4. En Edge Functions despliega `supabase/functions/claude-diagnose/index.ts` con nombre `claude-diagnose`.
5. En secretos de Edge Functions configura `ANTHROPIC_API_KEY` con tu clave de Anthropic. No la escribas en GitHub, en el HTML ni en un mensaje.
6. En la PWA, sección Biblioteca privada, introduce Project URL y clave pública; inicia sesión con tu correo y contraseña.

## Alcance de esta versión
- PDF: extracción de texto en el navegador y almacenamiento del original + fragmentos de texto.
- TXT: indexación directa.
- PDF escaneado, fotos y planos rasterizados: requieren OCR; esta versión los guarda, pero no puede interpretar automáticamente su contenido. Anota hoja/revisión y añade transcripción cuando sea necesario.
- DOC/DOCX/XLS/XLSX: se guardan como originales; no se indexan automáticamente en esta primera versión.
- El análisis usa únicamente documentos seleccionados y fragmentos extraídos; siempre debe cotejarse el plano original.

## Seguridad y límites
El bucket es privado y las tablas aplican RLS por usuario. No uses una clave service-role en el navegador. La clave Anthropic debe permanecer como secreto de la función. La PWA está publicada en GitHub Pages: no subas aquí planos, manuales, credenciales ni exportaciones documentales. El acceso privado exige conexión a Internet. La copia de seguridad local existente no sustituye a la copia del repositorio documental.
