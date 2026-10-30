# PBB TKE Maintenance — PWA v1.0

Versión inicial sin datos precargados.

## Contenido
- `index.html`: interfaz de la aplicación.
- `styles.css`: diseño adaptable a móvil y escritorio.
- `app.js`: órdenes de trabajo, histórico, exportación/importación JSON y almacenamiento local.
- `manifest.webmanifest`: configuración instalable de la PWA.
- `service-worker.js`: caché para uso sin conexión tras la primera carga correcta.
- `icon.svg`: icono de la aplicación.

## Publicación
1. Sube todos estos archivos a la raíz de un repositorio de GitHub.
2. En GitHub, abre **Settings → Pages**.
3. Selecciona **Deploy from a branch**, rama `main` y carpeta `/(root)`, y guarda.
4. Espera a que GitHub Pages publique la web mediante HTTPS.
5. En el iPhone, abre la URL publicada en Safari, pulsa Compartir y selecciona **Añadir a pantalla de inicio**.

## Límites de esta versión
- Sin averías, órdenes ni documentación precargadas.
- Los datos se guardan solo en el almacenamiento local del navegador/dispositivo.
- No hay sincronización entre dispositivos ni base de datos remota.
- La selección de documentos solo muestra los nombres durante la sesión; no los archiva.
- La PWA necesita una primera carga con conexión para instalarse y cachear sus archivos.

La aplicación no sustituye los planos RCS vigentes ni los procedimientos de seguridad TKE.
