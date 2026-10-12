# Metodología — Modelo ConvergencIA de Madurez Tecnológica e IA (v1.0.0)

> **Naturaleza del modelo.** Es un modelo propio de diagnóstico orientativo. **No es una certificación ni una evaluación oficial** de ningún estándar o norma. Los umbrales de clasificación y las ponderaciones son **convenciones explícitas del modelo**, no resultados de una validación psicométrica o científica.

La configuración completa y versionada está en `src/model/` y puede descargarse en JSON desde la página **Metodología** de la aplicación. El banco completo de preguntas, reglas, alertas y casos de uso está en [`BANCO_DE_PREGUNTAS.md`](./BANCO_DE_PREGUNTAS.md), generado desde esa misma configuración.

## 1. Estructura

| Dimensión | Alcance |
|---|---|
| D1 Estrategia y liderazgo | Objetivos, patrocinio, inversión, responsables, prioridades, indicadores, seguimiento, postura sobre IA |
| D2 Infraestructura y herramientas | Equipos, conectividad, disponibilidad, mantenimiento, colaboración, nube, crecimiento, inventario de software |
| D3 Procesos y automatización | Documentación, estandarización, tareas repetitivas, integración, trazabilidad, automatización, medición, control de cambios |
| D4 Datos y analítica | Calidad, acceso, responsables, fuente oficial, indicadores, decisiones, ciclo de vida, datos para IA |
| D5 Personas y gestión del cambio | Diagnóstico de competencias, capacitación, alfabetización en IA, capacidades de IA, participación, adopción, acompañamiento, comunicación |
| D6 Ciberseguridad y resiliencia | Control de acceso, verificación en dos pasos, actualizaciones, copias, restauración verificada, incidentes, continuidad, concientización |
| D7 Gobernanza y uso responsable de IA | Política, responsables, privacidad, proveedores, supervisión humana, pruebas previas, riesgos, transparencia |
| D8 Adopción y valor de IA | Casos de uso, pilotos, integración operativa, resultados frente a línea base, costos, calidad, escalamiento, lecciones aprendidas |

Cada dimensión tiene 8 preguntas (64 en total). Cada pregunta tiene identificador estable (`Dn.0m`), una sola idea principal, explicación, cinco anclajes conductuales específicos (0–4), peso, condición de aplicabilidad (si existe), evidencia sugerida y reglas de recomendación asociadas.

**Pesos.** 1 por defecto; 1,5 en diez prácticas consideradas fundacionales por el modelo (D1.01, D1.02, D3.01, D4.01, D6.01, D6.02, D6.05, D7.03, D7.05, D8.04). Es una decisión de diseño explícita, revisable en versiones mayores.

## 2. Respuestas

| Valor | Significado general |
|---|---|
| 0 | Inexistente |
| 1 | Informal o aislado |
| 2 | Definido y parcialmente implementado |
| 3 | Implementado, con responsables y seguimiento |
| 4 | Medido y mejorado sistemáticamente |

- **«No sé»**: respuesta válida, sin puntuación. Reduce la cobertura y genera una recomendación de *información pendiente de verificar*.
- **«No aplica»**: solo disponible en preguntas con una condición de exclusión documentada (v1: D2.06 nube, D3.04 integración, D7.08 transparencia hacia personas) y **solo cuenta si se escribe una justificación**. La falta de adopción de IA **no** vuelve inaplicables las preguntas de estrategia o preparación.
- **Evidencia**: declarada, referenciada (se registra la referencia del documento) o verificada por consultor. La evidencia **no** modifica la puntuación; se reporta por separado.

## 3. Cálculo (funciones puras en `src/engine/scoring.ts`)

Para cada dimensión *d*:

```
Puntuación(d) = 100 × Σ(peso_i × valor_i) / (4 × Σ peso_i)       sobre preguntas puntuadas
Cobertura(d)  = Σ peso puntuado / Σ peso aplicable × 100
```

- Peso aplicable = todas las preguntas excepto las exclusiones justificadas (incluye pendientes y «No sé»).
- «No sé», pendientes y exclusiones **no** entran en el denominador de la puntuación.
- Cobertura < 70 % → puntuación **provisional**. Sin respuestas puntuables → **«Sin información suficiente»**.
- Se usa una tolerancia de 1×10⁻⁹ al comparar con umbrales para evitar errores de coma flotante (por ejemplo, 69,99999999999999 % cuando la cobertura exacta es 70 %).

**Resultados compuestos** (pesos iguales entre dimensiones; no existe índice global):

| Resultado | Dimensiones |
|---|---|
| Madurez tecnológica | Promedio de D1–D6 |
| Preparación para IA | Promedio de D1, D4, D5, D6, D7 |
| Adopción y valor de IA | D8 |

Un resultado es **provisional** si alguna dimensión necesaria es provisional, y **no se calcula** si alguna dimensión necesaria no tiene información.

**Clasificación** (sobre el valor sin redondear; se muestra con un decimal):

| Rango | Nivel |
|---|---|
| 0 a < 20 | Inicial |
| 20 a < 40 | En desarrollo |
| 40 a < 60 | Definida |
| 60 a < 80 | Gestionada |
| 80 a 100 | Optimizada |

Consecuencia documentada: 79,96 se muestra «80,0» pero se clasifica *Gestionada*.

## 4. Alertas críticas

Seis alertas independientes (seguridad: D6.01, D6.02, D6.05; privacidad: D7.03; supervisión humana: D7.05, D7.06). Se activan con valor ≤ 1 («brecha observada») o con «No sé»/sin responder («pendiente de verificar»). **No modifican la puntuación**: limitan qué casos de uso pueden recomendarse para despliegue y elevan a prioridad crítica las recomendaciones asociadas.

## 5. Recomendaciones

33 reglas trazables (`src/model/rules.ts`). Cada regla agrupa 1–3 preguntas de una dimensión y se activa si **alguna** tiene valor ≤ umbral (1 en general; 2 en las cuatro reglas críticas de seguridad, privacidad y supervisión).

- **Brecha observada**: hay al menos una pregunta vinculada con valor ≤ umbral.
- **Información pendiente de verificar**: no hay brecha observada, pero alguna pregunta vinculada tiene «No sé».
- Las preguntas sin responder no generan recomendaciones (se reflejan en la cobertura).

Cada recomendación indica hallazgo, preguntas que lo sustentan (y cuál la activa), acción, resultado esperado, responsable sugerido, esfuerzo orientativo, dependencias (otras reglas), indicador de éxito, plazo y razón de su prioridad:

| Prioridad | Regla |
|---|---|
| Crítica | Vinculada a una alerta activa |
| Alta | Regla crítica con brecha, o alguna práctica en 0, o verificación pendiente sobre un fundamento crítico |
| Media | Resto |

## 6. Casos de uso

Catálogo de 7 casos (extracción de facturas, gestión documental, asistente de conocimiento interno, apoyo comercial, automatización administrativa, atención al cliente, análisis asistido de reportes). Solo se recomiendan si el contexto los justifica (proceso a mejorar u objetivo estratégico declarado).

```
Prioridad = 0,4 × valor + 0,35 × viabilidad + 0,25 × urgencia     (escala 1–5, orientativa)
```

| Componente | Asignación (visible en la interfaz para cada caso) |
|---|---|
| Valor | Valor base documentado del caso (2–3) + 2 si apoya un objetivo declarado; máximo 5 |
| Viabilidad | 1 + 4 × promedio de las dimensiones requeridas / 100; −1 si hay restricción alta de presupuesto o capacidades y el esfuerzo no es bajo; mínimo 1 |
| Urgencia | 2 + 2 si el proceso está declarado a mejorar + 1 si existe uso informal de IA que conviene encauzar; máximo 5 |

Cada caso declara dependencias (pregunta y nivel mínimo). Una **dependencia crítica** no cumplida (o en «No sé») **bloquea la recomendación de despliegue** aunque la prioridad sea alta; una no crítica deja el caso como *piloto condicionado*. Ningún caso se declara apto para despliegue directo: como máximo, *apto para piloto controlado*. No se estiman ahorros, retornos ni comparaciones sectoriales.

## 7. Hoja de ruta 30/60/90

- **30 días**: validar brechas, asignar responsables, recomendaciones de plazo 30 (incluye fundamentos críticos y verificaciones).
- **60 días**: recomendaciones de plazo 60; piloto controlado de hasta dos casos no bloqueados (o resolución de dependencias críticas del caso prioritario si todos están bloqueados); formación del equipo del piloto.
- **90 días**: recomendaciones de plazo 90; decisión documentada sobre el piloto (ampliar, corregir o detener); repetir el diagnóstico.

Cada acción tiene entregable, responsable sugerido, dependencia e indicador. El consultor puede ajustar prioridad, etapa y responsable, registrar estado (pendiente, en curso, completada) y notas; los ajustes se guardan aparte y la recomendación original se conserva y se muestra.

## 8. Versionado y comparabilidad

- Versión semántica `MAYOR.MENOR.PARCHE`.
- **Mayor**: cambian preguntas, pesos, fórmulas o umbrales → las evaluaciones no son comparables ni importables sin conversión.
- **Menor/parche**: cambian textos, ayudas, recomendaciones o casos de uso sin alterar el cálculo → comparables.
- La comparación temporal exige misma organización, mismo modelo y misma versión mayor.

## 9. Limitaciones

1. El modelo no ha sido validado empíricamente (fiabilidad, validez de constructo o predictiva). Los umbrales y pesos son convenciones.
2. Las respuestas son autodeclaradas salvo las marcadas como verificadas; el estado de evidencia no pondera la puntuación.
3. Promediar dimensiones asume compensación entre ellas; por eso se reportan por separado y con alertas independientes.
4. Las estimaciones de valor, viabilidad y urgencia son heurísticas orientativas.
5. El catálogo de casos de uso es acotado y genérico; no cubre necesidades específicas de cada sector.
6. No hay comparaciones sectoriales porque no existen datos de referencia validados.
7. Una integración futura con modelos generativos podrá ayudar a redactar el informe, pero **nunca** deberá modificar puntuaciones ni crear hallazgos que no provengan de las reglas.
