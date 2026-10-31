# PBB TKE Maintenance v6

## Cambios principales
- Cada diagnóstico se inicia con PBB, orden, alarma/síntoma, condiciones y documentación aplicable.
- No hay un caso de avería precargado ni se usan históricos como base automática de diagnóstico.
- Flujo de diagnóstico genérico en 8 etapas: síntoma, esquema, seguridad/inspección, alimentación, señal de campo, cableado, PLC/lógica y prueba funcional.
- En cada etapa se registran resultados, lecturas y evidencias. La conclusión diferencia hipótesis pendiente y causa demostrada.
- Registro local de órdenes e informes, búsqueda y exportación/importación JSON.
- Caché PWA v6 renovada para evitar servir deliberadamente la caché anterior.

## Límites explícitos
- La app NO interpreta automáticamente los PDF ni extrae conexiones de los planos. El técnico debe cotejar el esquema completo y la revisión aplicable e introducir las referencias comprobadas.
- No contiene sincronización entre dispositivos ni base de datos remota.
- Los documentos seleccionados solo se enumeran durante la sesión.
- No inventa bornes, valores de tensión ni umbrales. Las mediciones energizadas y las pruebas funcionales deben seguir el procedimiento TKE autorizado.

## Publicación en GitHub Pages
Sube el contenido de esta carpeta a la raíz del repositorio, reemplazando los archivos anteriores. Comprueba que el despliegue termine correctamente. En iPhone, abre la URL publicada en Safari y recarga. Si persiste la versión antigua, cierra la PWA, abre la URL en Safari y, si es necesario, elimina la app de inicio y vuelve a añadirla después de verificar la versión web.
