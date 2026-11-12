# Despliegue automático de Claude en Supabase

He añadido el workflow de GitHub Actions:
`.github/workflows/deploy-claude.yml`

## 1. Configurar los secretos de GitHub (una sola vez)

Abre el repositorio → **Settings → Secrets and variables → Actions → New repository secret** y crea:

- **SUPABASE_ACCESS_TOKEN**: token personal de acceso de Supabase. Se crea en Supabase, en Account → Access Tokens.
- **SUPABASE_PROJECT_REF**: identificador del proyecto Supabase (solo la referencia, no la URL completa).

No publiques estos valores ni los pegues en archivos, commits, issues o chats.

## 2. Configurar la clave privada de Anthropic en Supabase

En el proyecto correcto, abre **Project Settings → Edge Functions → Secrets** y añade:

- **ANTHROPIC_API_KEY**: tu clave privada de Anthropic.

Este secreto es independiente de los dos secretos de GitHub. El workflow no puede crearlo ni leerlo.

## 3. Ejecutar el despliegue

Después de guardar los dos secretos de GitHub:
1. Abre **Actions** en el repositorio.
2. Selecciona **Deploy Claude Edge Function**.
3. Pulsa **Run workflow**.

También se desplegará automáticamente cuando se modifique la función en la rama `main`.

## 4. Verificar

La ejecución debe terminar en verde en GitHub Actions. Después, prueba **Analizar con Claude** desde la PWA con sesión activa y un documento con texto indexado seleccionado.

Si falta `ANTHROPIC_API_KEY` en Supabase, la función podrá desplegarse, pero el análisis devolverá un error indicando que falta ese secreto.
