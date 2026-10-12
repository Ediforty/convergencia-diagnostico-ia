# ConvergencIA | Diagnóstico de Madurez Tecnológica e IA

Aplicación web local para evaluar organizaciones, explicar su nivel de madurez y generar una hoja de ruta priorizada para adoptar tecnología e inteligencia artificial de forma útil, segura y sostenible.

> Modelo propio y orientativo (v1.0.0). **No es una certificación** ni una evaluación oficial de ningún estándar. Ver [`docs/METODOLOGIA.md`](docs/METODOLOGIA.md).

## Qué incluye

- Bienvenida, registro de contexto organizacional (sin datos personales obligatorios) y cuestionario de **64 preguntas en 8 dimensiones**, con «No sé», «No aplica» justificado, comentario y estado de evidencia (declarada, referenciada o verificada por consultor).
- Guardado automático de borradores y recuperación al volver a abrir la evaluación.
- **Motor de puntuación determinista** separado de la interfaz (`src/engine`), con cobertura, umbral del 70 %, tres resultados separados (madurez tecnológica, preparación para IA, adopción y valor de IA) y alertas críticas independientes.
- Tablero con indicadores, barras por dimensión, radar con alternativa tabular, cobertura y evidencia, fortalezas, brechas, alertas, casos de uso y acceso a las respuestas que originan cada resultado.
- Recomendaciones trazables y casos de uso priorizados (`0,4 × valor + 0,35 × viabilidad + 0,25 × urgencia`) con bloqueo por dependencias críticas.
- Hoja de ruta 30/60/90 días editable (estado, prioridad, etapa, responsable, notas) que conserva la recomendación original.
- Informe imprimible / guardable como PDF, exportación e importación JSON validadas, historial y comparación temporal entre versiones compatibles.
- Configuración versionada del modelo y organización **ficticia** de demostración, identificada como tal.

## Requisitos

- Node.js 22.12 o superior (requisito de Vitest 5; verificado con Node 22.22.0 y npm 10.9.4).
- Un navegador moderno (Chrome, Edge, Firefox o Safari recientes).

## Instalación y ejecución

```bash
npm install          # instala dependencias
npm run dev          # servidor de desarrollo en http://localhost:5173
```

Versión de producción local:

```bash
npm run build        # verificación de tipos + compilación en dist/
npm run preview      # sirve dist/ en http://localhost:4173
```

`dist/` es un sitio estático (rutas con `#`, sin servidor especial). No se publica ni se contrata ningún servicio.

## Comprobaciones

```bash
npm run typecheck    # TypeScript estricto
npm test             # pruebas del modelo y del motor (Vitest)
npm run docs:banco   # regenera docs/BANCO_DE_PREGUNTAS.md desde el modelo
```

## Uso rápido

1. **Iniciar una evaluación** → completar el contexto → responder las 8 dimensiones (el avance se guarda solo).
2. **Finalizar y ver resultados** → revisar alertas, puntuaciones (pulse una dimensión para ver sus respuestas), casos de uso y recomendaciones.
3. **Hoja de ruta** → ajustar prioridades y registrar avance.
4. **Informe** → «Imprimir / Guardar como PDF» y elegir «Guardar como PDF» en el cuadro de impresión del navegador.
5. **Mis evaluaciones** → exportar/importar JSON, nueva evaluación de la misma organización, comparar en el tiempo.

Para ver la herramienta con datos, use **Ver demostración (organización ficticia)**: carga dos evaluaciones inventadas (marzo y septiembre de 2026) de «Distribuidora Ejemplo S.A.S. (DEMO FICTICIA)».

## Estructura

```
src/
  model/      Configuración versionada: dimensiones, 64 preguntas, reglas, alertas, casos de uso, catálogos
  engine/     Funciones puras: puntuación, diagnóstico, hoja de ruta, comparación, importación/exportación
  storage/    Repositorio en localStorage
  demo/       Organización ficticia de demostración
  ui/         Interfaz React (páginas, componentes, estilos, enrutador por hash)
tests/        Pruebas Vitest del modelo y del motor
docs/         Metodología y banco de preguntas
scripts/      Generador del banco de preguntas
```

## Privacidad y persistencia

- Las respuestas **no se envían a ningún servicio externo**; el diagnóstico se calcula en el navegador, sin API de IA.
- Los datos se guardan en `localStorage` de este navegador. **No es cifrado, no es un respaldo y no aísla a los usuarios** del mismo dispositivo/navegador. La página **Datos y privacidad** explica estos límites y permite borrar todo (con confirmación); cada evaluación puede eliminarse por separado.
- La aplicación no registra el contenido de las evaluaciones en la consola.
- No hay autenticación ni colaboración multiusuario en esta versión, y la interfaz no lo simula.

## Integración futura con IA generativa (no incluida)

Si se añade un modelo generativo para **redactar** el informe, debe recibir como entrada el resultado del motor (`evaluate()`) y limitarse a reformular. No debe modificar puntuaciones, niveles, alertas ni crear hallazgos. Las credenciales deberían gestionarse en un servidor propio, nunca en el navegador.

## Limitaciones y próximos pasos

**Limitaciones de esta versión**

- Modelo sin validación empírica: umbrales, pesos y heurísticas de priorización son convenciones explícitas.
- Persistencia solo local; sin cuentas, roles, cifrado ni respaldo automático.
- El PDF se obtiene con la impresión del navegador (no hay generador PDF propio); la paginación depende del navegador.
- Las evidencias se registran como referencias de texto; no se adjuntan archivos.
- El contexto (sector, tamaño) adapta qué casos de uso se recomiendan, pero no hay ejemplos específicos por sector.
- Pruebas automatizadas cubren el modelo y el motor; la interfaz se verificó con un recorrido automatizado de navegador ejecutado durante el desarrollo, que no forma parte del repositorio.

**Próximos pasos sugeridos**

1. Piloto con 5–10 organizaciones y revisión de redacción de preguntas con usuarios no técnicos.
2. Análisis de fiabilidad (consistencia interna por dimensión) antes de cualquier cambio mayor de pesos o umbrales.
3. Backend opcional con autenticación, roles (consultor/organización), cifrado y respaldo.
4. Adjuntos de evidencia con control de acceso.
5. Pruebas de interfaz versionadas (Playwright) y auditoría de accesibilidad con lectores de pantalla.
6. Catálogo de casos de uso ampliado por sector, con dependencias revisadas por especialistas.
