# Puesta en marcha privada · PBB TKE Maintenance

## Arquitectura
- PWA estática en GitHub Pages: interfaz, no almacena los documentos privados.
- Supabase Auth: sesión personal persistente compartida por la cuenta, biblioteca y sincronización.
- PostgreSQL: tablas `documents` y `document_chunks`, protegidas por RLS por usuario.
- Supabase Storage: bucket privado `pbb-private-docs`; cada objeto se guarda bajo la carpeta del UUID del usuario.
- Edge Functions: `claude-diagnose` para consultas documentales y `claude-plan-vision` para análisis visual de planos.
- Anthropic API: la clave se conserva exclusivamente como secreto de las Edge Functions.

## Configuración inicial o reparación
1. En Supabase, abre el proyecto `qwhzwzaaisqmlsttkgsp`.
2. En SQL Editor ejecuta íntegramente `supabase/schema.sql`. Es idempotente y configura tablas, índices, permisos, RLS y bucket privado. `supabase/document_library.sql` contiene la misma configuración de biblioteca documental por compatibilidad; no es necesario ejecutar ambos.
3. En Authentication → Users comprueba que existe la cuenta `rmartinrosado@gmail.com` y que está confirmada.
4. En Project Settings → API copia la Project URL y la clave pública anon/publishable. No uses service_role en la PWA.
5. En Edge Functions → Secrets comprueba que existe `ANTHROPIC_API_KEY`. Opcionalmente configura `CLAUDE_MODEL`.
6. Comprueba que están desplegadas las funciones `claude-diagnose` y `claude-plan-vision`. Los workflows de GitHub intentan desplegarlas automáticamente; un workflow correcto confirma el despliegue del código, no la presencia de secretos ni la operatividad de las llamadas.
7. En la PWA, abre la configuración técnica de Supabase, guarda Project URL y clave pública e inicia sesión.

## Flujo documental
1. La sesión se obtiene de Supabase Auth.
2. El original PDF/TXT (máximo 50 MB) se sube al bucket privado.
3. Se inserta la ficha en `documents` con propietario, ámbito PBB, tipo, revisión y notas.
4. El texto PDF/TXT se extrae en el navegador y se guarda en fragmentos de `document_chunks` por página.
5. Los PDF sin texto extraíble se conservan como originales y requieren ejecutar OCR por página desde el visor RCS.
6. La consulta Claude valida usuario, PBB y ámbito documental en el servidor antes de recuperar fragmentos.
7. El análisis visual valida también usuario y PBB; envía cuatro zonas de la página seleccionada a Claude Vision.

## Ámbitos documentales
- `COMMON`: documentación común de PBB estándar.
- `A380_SPECIAL`: exclusiva para PBB-504, PBB-507 y PBB-508.
- Número de tres cifras: documentación específica de esa posición.
- `GENERAL`: compatibilidad histórica interpretada como común.

## Límites y verificación
- La interfaz por sí sola no garantiza el aislamiento: lo aplican RLS, Storage policies y validaciones de Edge Functions.
- El porcentaje de la barra representa la transferencia del original; la indexación se informa como fase separada.
- OCR y análisis visual requieren conexión a Internet y dependencias externas.
- La publicación en GitHub Pages no ejecuta SQL ni crea secretos en Supabase.
- Antes de declarar la biblioteca operativa deben probarse con una cuenta real: login, listado, subida, descarga/visor, indexación, búsqueda, OCR, Claude, borrado y aislamiento entre usuarios.
- No se deben compartir documentos técnicos, claves privadas ni contraseñas en GitHub.
