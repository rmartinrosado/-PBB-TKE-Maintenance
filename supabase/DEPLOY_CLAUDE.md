# Activar el análisis con Claude en Supabase

La aplicación web no puede desplegar por sí sola una Edge Function ni guardar una clave privada de Anthropic. Este paso se realiza una sola vez en el proyecto Supabase.

## 1. Añadir la clave privada de Anthropic

En Supabase abre **Project Settings → Edge Functions → Secrets** y crea:

- Nombre: `ANTHROPIC_API_KEY`
- Valor: tu clave privada de Anthropic (empieza normalmente por `sk-ant-`).

No introduzcas esta clave en la PWA, en GitHub, en el SQL Editor ni en el repositorio. No uses la clave pública anon de Supabase como clave de Anthropic.

## 2. Desplegar la función actualizada

Desde un ordenador con Node.js, abre una terminal en una carpeta de trabajo y ejecuta:

```bash
npx supabase login
npx supabase link --project-ref qwhzwzaaisqmlsttkgsp
npx supabase functions deploy claude-diagnose --project-ref qwhzwzaaisqmlsttkgsp
```

El código que se debe desplegar está en:
`supabase/functions/claude-diagnose/index.ts`

La configuración `supabase/config.toml` mantiene la verificación JWT activada. No la desactives.

## 3. Probar

1. Abre la PWA publicada y pulsa **Recargar y actualizar**.
2. En Documentación RCS, comprueba que sigues con sesión iniciada.
3. Selecciona el PDF que ya aparece en Documentos disponibles.
4. Introduce PBB, alarma y una consulta concreta.
5. Pulsa **Analizar con Claude**.

Si falla, la versión nueva muestra el mensaje devuelto por la función (por ejemplo, secreto ausente, función no desplegada, sesión caducada, documento sin texto indexado o error de Anthropic).

## Importante

- No es necesario volver a ejecutar `document_library.sql` si la biblioteca ya muestra documentos privados.
- Los PDF escaneados sin capa de texto necesitan OCR antes de poder consultarse con el índice actual.
- La barra de progreso de subida confirma la transferencia del archivo; no garantiza por sí sola que el texto se haya indexado.
