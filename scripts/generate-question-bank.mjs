// Genera docs/BANCO_DE_PREGUNTAS.md a partir de la configuración del modelo (fuente única de verdad).
// Uso: npm run docs:banco
import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { MODEL } = await server.ssrLoadModule('/src/model/index.ts');
  const out = [];
  out.push(`# Banco de preguntas — ${MODEL.name} v${MODEL.version}`, '');
  out.push('> Documento generado automáticamente desde `src/model`. No editar a mano: ejecute `npm run docs:banco`.', '');
  out.push(MODEL.disclaimer, '');
  out.push('Escala: ' + MODEL.scale.map((s) => `**${s.value}** ${s.label.toLowerCase()}`).join(' · ') + '. Además: «No sé» (sin puntuación) y «No aplica» (solo con condición de exclusión y justificación).', '');
  for (const d of MODEL.dimensions) {
    out.push(`## ${d.id}. ${d.name}`, '', d.description, '');
    for (const q of MODEL.questions.filter((x) => x.dimension === d.id)) {
      out.push(`### ${q.id} — ${q.text}`, '');
      out.push(`- **Explicación:** ${q.help}`);
      out.push(`- **Peso:** ${String(q.weight).replace('.', ',')}`);
      out.push(`- **Aplicabilidad:** ${q.naCondition ? `admite «No aplica» solo si: ${q.naCondition.description}` : 'siempre aplicable'}`);
      out.push(`- **Evidencia sugerida:** ${q.evidence}`);
      out.push(`- **Reglas de recomendación:** ${q.ruleIds.join(', ')}`);
      out.push('', '| Valor | Anclaje conductual |', '|---|---|');
      q.options.forEach((o, i) => out.push(`| ${i} | ${o} |`));
      out.push('');
    }
  }
  out.push('## Reglas de recomendación', '', '| Regla | Preguntas | Se activa si | Crítica | Plazo | Acción |', '|---|---|---|---|---|---|');
  for (const r of MODEL.rules) {
    out.push(`| ${r.id} ${r.title} | ${r.questionIds.join(', ')} | alguna ≤ ${r.threshold} | ${r.critical ? 'sí' : 'no'} | ${r.horizon} días | ${r.action} |`);
  }
  out.push('', '## Alertas críticas', '', '| Alerta | Categoría | Condición | Limitación de despliegue |', '|---|---|---|---|');
  for (const a of MODEL.alerts) {
    out.push(`| ${a.id} ${a.title} | ${a.category} | ${a.questionId} ≤ ${a.threshold} (o «No sé»/sin responder: por verificar) | ${a.deploymentLimitation} |`);
  }
  out.push('', '## Casos de uso', '');
  for (const u of MODEL.useCases) {
    out.push(`### ${u.id} — ${u.name}`, '', u.description, '');
    out.push(`- Procesos que lo justifican: ${u.processes.join(', ')}; objetivos: ${u.objectives.join(', ')}.`);
    out.push(`- Valor base orientativo: ${u.baseValue} (${u.baseValueRationale})`);
    out.push(`- Viabilidad a partir de: ${u.viabilityDimensions.join(', ')}; esfuerzo ${u.effort}.`);
    out.push(`- Dependencias: ${u.dependencies.map((d) => `${d.questionId} ≥ ${d.min}${d.critical ? ' (crítica)' : ''}`).join('; ')}.`);
    out.push(`- Indicador del piloto: ${u.pilotIndicator}`, '');
  }
  writeFileSync('docs/BANCO_DE_PREGUNTAS.md', out.join('\n'));
  console.log(`docs/BANCO_DE_PREGUNTAS.md generado (${MODEL.questions.length} preguntas).`);
} finally {
  await server.close();
}
