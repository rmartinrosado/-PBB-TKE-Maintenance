# Configuración de Gemini IA en PBB TKE Maintenance

La PWA ahora permite elegir Gemini o Claude desde el selector de motor de análisis.

## 1. API key de Google
1. Genera una clave en Google AI Studio.
2. En Supabase, abre el proyecto PBB TKE Maintenance.
3. Ve a **Edge Functions → Secrets**.
4. Añade el secreto **GEMINI_API_KEY** con la clave de Google.

No introduzcas la clave en el frontend ni la publiques en GitHub.

## 2. Despliegue
El workflow `.github/workflows/deploy-gemini.yml` despliega la función `gemini-diagnose` cuando se modifica su código en `main`, o manualmente desde GitHub Actions.

Requiere el secreto de GitHub Actions `SUPABASE_ACCESS_TOKEN`, que ya se usa para los despliegues de funciones existentes.

## 3. Modelo
La función usa por defecto `gemini-2.5-flash`. Se puede cambiar mediante el secreto/variable de entorno `GEMINI_MODEL` en Supabase Edge Functions.

## 4. Seguridad y documentos
La función valida la sesión Supabase, propiedad de los documentos, biblioteca aplicable a PBB, y recupera únicamente los fragmentos de documentos autorizados. La clave de Gemini permanece en el servidor.

## 5. Prueba
1. Abre Documentos.
2. Selecciona Gemini IA.
3. Selecciona documentos aplicables a la PBB.
4. Completa la posición, alarma, observaciones y consulta.
5. Pulsa **Analizar con IA**.

Si Gemini no responde, revisa los logs de la Edge Function `gemini-diagnose`.
