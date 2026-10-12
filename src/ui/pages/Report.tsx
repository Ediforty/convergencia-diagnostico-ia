import { MODEL } from '../../model';
import {
  AI_USE_LEVELS,
  CONSTRAINT_LEVELS,
  labelOf,
  OBJECTIVES,
  PROCESSES,
  ROLES,
  SECTORS,
  SENSITIVE_DATA,
  SIZE_RANGES,
  TOOLS,
} from '../../model/catalogs';
import type { Assessment } from '../../model/types';
import { assessmentDate } from '../../engine/compare';
import type { DiagnosisResult } from '../../engine/evaluate';
import { formatScore } from '../../engine/scoring';
import { DimensionTable } from '../components/charts';
import { AssessmentTabs } from '../components/common';
import { AlertList, RecommendationCard, UseCaseCard } from '../components/results';
import { ACTION_STATUS_LABEL, formatDate, INDEX_STATUS_LABEL, PRIORITY_LABEL } from '../labels';
import { exportToFile } from './History';

function list(ids: string[], options: { id: string; label: string }[], other?: string) {
  const items = ids.map((id) => labelOf(options, id));
  if (other?.trim()) items.push(other.trim());
  return items.length ? items.join('; ') : 'No indicado';
}

function executiveSummary(d: DiagnosisResult): string[] {
  const lines: string[] = [];
  for (const i of d.indices) {
    if (i.value === null) lines.push(`${i.name}: no calculable por falta de información en ${i.missingDimensions.join(', ')}.`);
    else
      lines.push(
        `${i.name}: ${formatScore(i.value)} (${i.level?.label})${i.status === 'provisional' ? `, provisional por cobertura baja en ${i.provisionalDimensions.join(', ')}` : ''}.`,
      );
  }
  const scored = d.dimensions.filter((x) => x.score !== null);
  if (scored.length >= 2) {
    const max = scored.reduce((a, b) => ((b.score as number) > (a.score as number) ? b : a));
    const min = scored.reduce((a, b) => ((b.score as number) < (a.score as number) ? b : a));
    const name = (id: string) => MODEL.dimensions.find((x) => x.id === id)!.name;
    lines.push(
      `Dimensión más desarrollada: ${max.dimension} ${name(max.dimension)} (${formatScore(max.score)}). Menos desarrollada: ${min.dimension} ${name(min.dimension)} (${formatScore(min.score)}); diferencia de ${formatScore((max.score as number) - (min.score as number))} puntos.`,
    );
  }
  const active = d.alerts.filter((a) => a.status === 'activa').length;
  const verify = d.alerts.filter((a) => a.status === 'por-verificar').length;
  lines.push(
    active || verify
      ? `Alertas críticas: ${active} con brecha observada y ${verify} pendientes de verificar; limitan el despliegue de casos de IA hasta resolverse.`
      : 'No se registran alertas críticas de seguridad, privacidad o supervisión humana.',
  );
  const relevant = d.useCases.filter((u) => u.relevant);
  const pilotable = relevant.filter((u) => u.status !== 'bloqueado');
  lines.push(
    relevant.length === 0
      ? 'Ningún caso de uso del catálogo se justifica con el contexto declarado.'
      : `${relevant.length} casos de uso se justifican por el contexto; ${pilotable.length} pueden pilotearse (con o sin condiciones) y ${relevant.length - pilotable.length} están bloqueados por dependencias críticas.`,
  );
  lines.push(
    `Se generaron ${d.recommendations.filter((r) => r.type === 'brecha').length} recomendaciones por brecha observada y ${d.recommendations.filter((r) => r.type === 'verificacion').length} de verificación de información.`,
  );
  return lines;
}

export function Report({ assessment, diagnosis }: { assessment: Assessment; diagnosis: DiagnosisResult }) {
  const d = diagnosis;
  const ctx = assessment.context;
  const relevantUseCases = d.useCases.filter((u) => u.relevant);
  return (
    <>
      <div className="no-print">
        <h1>Informe</h1>
        <AssessmentTabs assessment={assessment} current="informe" />
        <div className="notice notice--info">
          <p>
            Para obtener un PDF use <strong>Imprimir</strong> y elija «Guardar como PDF» como destino en el cuadro de
            impresión del navegador. La versión impresa oculta la navegación. Para compartir los datos editables, exporte
            el JSON.
          </p>
        </div>
        <div className="btn-row" style={{ marginBottom: 16 }}>
          <button type="button" className="btn btn--teal" onClick={() => window.print()}>
            Imprimir / Guardar como PDF
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => exportToFile(assessment)}>
            Exportar JSON
          </button>
        </div>
      </div>

      <article className="report" aria-label="Informe de diagnóstico">
        <header>
          <p style={{ margin: 0, fontWeight: 800, color: '#0b2a5b' }}>
            Converg<span style={{ color: '#0a8f8b' }}>IA</span>
          </p>
          <h2 style={{ marginTop: 4, fontSize: "1.6rem", border: 0 }}>Informe de diagnóstico de madurez tecnológica e IA</h2>
          <p className="muted">
            {ctx.organizationName || 'Organización sin nombre'} · {formatDate(assessmentDate(assessment))} · Modelo v
            {assessment.modelVersion} · {assessment.status === 'finalizada' ? 'Evaluación finalizada' : 'Borrador'}
          </p>
          {assessment.isDemo && (
            <p style={{ border: '2px solid #b7791f', padding: 8, fontWeight: 700 }}>
              DEMOSTRACIÓN — ORGANIZACIÓN FICTICIA. Los datos de este informe son inventados y no representan resultados
              reales.
            </p>
          )}
        </header>

        <section>
          <h2>1. Contexto</h2>
          <table>
            <tbody>
              <tr><th scope="row">Sector</th><td>{ctx.sector ? labelOf(SECTORS, ctx.sector) : 'No indicado'}</td></tr>
              <tr><th scope="row">País</th><td>{ctx.country || 'No indicado'}</td></tr>
              <tr><th scope="row">Tamaño</th><td>{ctx.sizeRange ? labelOf(SIZE_RANGES, ctx.sizeRange) : 'No indicado'}</td></tr>
              <tr><th scope="row">Rol de quien responde</th><td>{ctx.respondentRole ? labelOf(ROLES, ctx.respondentRole) : 'No indicado'}</td></tr>
              <tr><th scope="row">Modalidad</th><td>{ctx.modality === 'acompanada' ? 'Acompañada por consultor' : 'Autodiagnóstico'}</td></tr>
              <tr><th scope="row">Objetivos</th><td>{list(ctx.objectives, OBJECTIVES, ctx.otherObjective)}</td></tr>
              <tr><th scope="row">Procesos a mejorar</th><td>{list(ctx.processes, PROCESSES, ctx.otherProcess)}</td></tr>
              <tr><th scope="row">Herramientas</th><td>{list(ctx.tools, TOOLS, ctx.otherTools)}</td></tr>
              <tr>
                <th scope="row">Restricciones</th>
                <td>
                  Presupuesto: {labelOf(CONSTRAINT_LEVELS, ctx.budgetConstraint).toLowerCase()}; capacidades:{' '}
                  {labelOf(CONSTRAINT_LEVELS, ctx.capacityConstraint).toLowerCase()}; tiempo:{' '}
                  {labelOf(CONSTRAINT_LEVELS, ctx.timeConstraint).toLowerCase()}.
                </td>
              </tr>
              <tr><th scope="row">Uso actual de IA</th><td>{labelOf(AI_USE_LEVELS, ctx.aiUseLevel)}</td></tr>
              <tr><th scope="row">Información sensible</th><td>{list(ctx.sensitiveData, SENSITIVE_DATA)}</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>2. Resumen ejecutivo</h2>
          <ul>
            {executiveSummary(d).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2>3. Resultados y cobertura</h2>
          <table>
            <thead>
              <tr>
                <th scope="col">Resultado</th>
                <th scope="col" className="num">Valor</th>
                <th scope="col">Nivel</th>
                <th scope="col">Estado</th>
                <th scope="col">Dimensiones</th>
              </tr>
            </thead>
            <tbody>
              {d.indices.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td className="num">{i.value === null ? 'N/C' : formatScore(i.value)}</td>
                  <td>{i.level?.label ?? '—'}</td>
                  <td>{INDEX_STATUS_LABEL[i.status]}</td>
                  <td>{i.components.map((c) => c.dimension).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">Los tres resultados se presentan por separado; no existe un índice global.</p>
          <DimensionTable dimensions={d.dimensions} />
          <p className="small">
            Respuestas: {d.overall.answered} con valor, {d.overall.unknown} «No sé», {d.overall.excluded} exclusiones
            justificadas y {d.overall.pending} sin responder, de {d.overall.total}. Evidencia de respuestas puntuadas:{' '}
            {d.overall.evidence.declarada} declaradas, {d.overall.evidence.referenciada} referenciadas y{' '}
            {d.overall.evidence.verificada} verificadas por consultor.
          </p>
        </section>

        <section>
          <h2>4. Fortalezas y brechas</h2>
          <h3>Fortalezas (prácticas con nivel 3 o 4)</h3>
          {d.strengths.length === 0 ? (
            <p>No se registran prácticas con nivel 3 o 4.</p>
          ) : (
            <ul className="small">
              {d.strengths.slice(0, 12).map((s) => (
                <li key={s.questionId}>
                  {s.questionId} (nivel {s.value}): {MODEL.questions.find((q) => q.id === s.questionId)!.options[s.value]}
                </li>
              ))}
            </ul>
          )}
          <h3>Brechas observadas</h3>
          {d.recommendations.filter((r) => r.type === 'brecha').length === 0 ? (
            <p>No hay brechas observadas.</p>
          ) : (
            <ul className="small">
              {d.recommendations
                .filter((r) => r.type === 'brecha')
                .map((r) => (
                  <li key={r.id}>
                    <strong>{r.finding}</strong> ({r.evidence.filter((e) => e.triggers).map((e) => `${e.questionId}=${e.value}`).join(', ')})
                  </li>
                ))}
            </ul>
          )}
          <h3>Información pendiente de verificar</h3>
          <p className="small">
            {d.recommendations.filter((r) => r.type === 'verificacion').map((r) => r.finding).join(' ') || 'Ninguna.'}
          </p>
        </section>

        <section>
          <h2>5. Alertas críticas</h2>
          <AlertList alerts={d.alerts} interactive={false} />
        </section>

        <section>
          <h2>6. Recomendaciones</h2>
          {d.recommendations.length === 0 && <p>No se generaron recomendaciones.</p>}
          {d.recommendations.map((r) => (
            <RecommendationCard key={r.id} rec={r} interactive={false} />
          ))}
          <h3>Casos de uso</h3>
          {relevantUseCases.length === 0 ? (
            <p>Ningún caso de uso se justifica con el contexto declarado.</p>
          ) : (
            relevantUseCases.map((u) => <UseCaseCard key={u.useCase.id} uc={u} interactive={false} />)
          )}
        </section>

        <section>
          <h2>7. Hoja de ruta 30/60/90 días</h2>
          {[30, 60, 90].map((stage) => (
            <div key={stage}>
              <h3>{stage} días</h3>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Acción</th>
                    <th scope="col">Entregable</th>
                    <th scope="col">Responsable</th>
                    <th scope="col">Dependencia</th>
                    <th scope="col">Indicador</th>
                    <th scope="col">Prioridad / estado</th>
                  </tr>
                </thead>
                <tbody>
                  {d.effectiveRoadmap
                    .filter((a) => a.stage === stage)
                    .map((a) => (
                      <tr key={a.id} className="small">
                        <td>
                          <strong>{a.title}</strong>
                          {a.action && <div>{a.action}</div>}
                        </td>
                        <td>{a.deliverable}</td>
                        <td>{a.owner}</td>
                        <td>{a.dependency}</td>
                        <td>{a.indicator}</td>
                        <td>
                          {PRIORITY_LABEL[a.priority]} / {ACTION_STATUS_LABEL[a.status]}
                          {a.adjusted && (
                            <div className="muted">
                              Ajustada (original: {a.original.stage} días, {PRIORITY_LABEL[a.original.priority].toLowerCase()})
                              {a.note ? `. Nota: ${a.note}` : ''}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>

        <section>
          <h2>8. Metodología, versión y limitaciones</h2>
          <p className="small">
            {MODEL.name}, versión {assessment.modelVersion} (vigente {MODEL.version}). Ocho dimensiones con ocho preguntas
            cada una, escala 0–4 con anclajes conductuales. Puntuación por dimensión = 100 × Σ(peso × valor) / (4 × Σ peso
            de preguntas puntuadas). Cobertura = peso puntuado / peso aplicable. «No sé» y preguntas pendientes reducen la
            cobertura, no la puntuación; las exclusiones justificadas no entran en ningún denominador. Una dimensión con
            cobertura inferior al {MODEL.coverageThreshold} % es provisional. Madurez tecnológica = promedio de D1–D6;
            preparación para IA = promedio de D1, D4, D5, D6 y D7; adopción y valor de IA = D8; pesos iguales entre
            dimensiones. Prioridad de casos de uso = 0,4 × valor + 0,35 × viabilidad + 0,25 × urgencia (orientativa).
          </p>
          <ul className="small">
            <li>{MODEL.disclaimer}</li>
            <li>Los resultados se basan en respuestas declaradas; solo las marcadas como «verificadas» fueron revisadas por un consultor.</li>
            <li>No se estiman ahorros, retornos financieros ni comparaciones sectoriales.</li>
            <li>Las alertas críticas no modifican la puntuación; limitan las recomendaciones de despliegue.</li>
            <li>El diagnóstico se generó localmente, sin servicios de IA externos.</li>
          </ul>
          <p className="small muted">Informe generado el {formatDate(new Date().toISOString())}.</p>
        </section>
      </article>
    </>
  );
}
