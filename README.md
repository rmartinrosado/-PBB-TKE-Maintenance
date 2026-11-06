# PBB TKE Maintenance v7

## Cambios principales
- Mantiene el diagnóstico de cada incidencia como un caso independiente, sin inferir causas a partir de averías históricas.
- Flujo de diagnóstico en 8 etapas: síntoma, esquema, seguridad/inspección, alimentación, señal de campo, cableado, PLC/lógica y prueba funcional.
- Registro local de órdenes e informes, búsqueda y exportación/importación JSON.
- Service worker v7 con estrategia network-first: intenta obtener la versión publicada y conserva una copia en caché para trabajar sin conexión.
- Al activar la nueva versión, elimina las cachés anteriores con prefijo `pbb-tke-`.

## Límites explícitos
- La app no interpreta automáticamente los PDF ni extrae conexiones de los planos. El técnico debe cotejar el esquema completo y la revisión aplicable e introducir las referencias comprobadas.
- No contiene sincronización entre dispositivos ni base de datos remota.
- Los documentos seleccionados solo se enumeran durante la sesión.
- No inventa bornes, valores de tensión ni umbrales. Las mediciones energizadas y las pruebas funcionales deben seguir el procedimiento TKE autorizado.

## Publicación en GitHub Pages
El workflow de GitHub Actions publica automáticamente el contenido de la rama `main` en GitHub Pages cuando se actualiza el repositorio. Comprueba el resultado en la pestaña **Actions** y la URL en **Settings → Pages**.

En iPhone, abre la URL publicada en Safari y recarga. Si la PWA conserva una versión anterior, ciérrala completamente y vuelve a abrirla con conexión. La nueva estrategia de caché intenta actualizar los recursos desde la red y utiliza la copia local solo si no hay conexión.
