import { useEffect, useState } from 'react';
import { MODEL } from '../../model';
import { labelOf, SECTORS, SIZE_RANGES } from '../../model/catalogs';
import type { Assessment, DimensionId } from '../../model/types';
import { assessmentDate, compareAssessments } from '../../engine/compare';
import { evaluate, type DiagnosisResult } from '../../engine/evaluate';
import { formatScore } from '../../engine/scoring';
import { DimensionBars, DimensionTable, RadarChart } from '../components/charts';
import { AssessmentTabs, DemoBanner, LevelBadge, Score, StatusBadge } from '../components/common';
import { AlertList, DimensionDetail, RecommendationCard, UseCaseCard } from '../components/results';
import { formatDate, pct } from '../labels';
import { href } from '../router';
import { useAssessments } from '../store';

/** Evaluación anterior compatible de la misma organización, si existe. */
export function usePrevious(assessment: Assessment): Assessment | undefined {
  const all = useAssessments();
  return all
    .filter((a) => a.organizationId === assessment.organizationId && a.id !== assessment.id)
    .filter((a) => assessmentDate(a) <= assessmentDate(assessment))
    .filter((a) => compareAssessments(MODEL, a, assessment).compatible)
    .sort((x, y) => assessmentDate(y).localeCompare(assessmentDate(x)))[0];
}

const KPI_CLASS = ['kpi', 'kpi kpi--violet', 'kpi kpi--deep'];

export function Results({ assessment, diagnosis }: { assessment: Assessment; diagnosis: DiagnosisResult }) {
  const [selected, setSelected] = useState<DimensionId | null>(null);
  const previous = usePrevious(assessment);
  const prevDiagnosis = previous ? evaluate(MODEL, previous) : undefined;
  const d = diagnosis;
  const gaps = d.recommendations.filter((r) => r.type === 'brecha');
  const pendingVerification = d.recommendations.filter((r) => r.type === 'verificacion');
  const relevantUseCases = d.useCases.filter((u) => u.relevant);
  const ctx = assessment.context;
  const selectedResult = d.dimensions.find((x) => x.dimension === selected);

  useEffect(() => {
    if (!selected) return;
    const el = document.getElementById('detalle');
    el?.scrollIntoView({ block: 'start' });
    el?.querySelector<HTMLElement>('h2')?.focus();
  }, [selected]);

  return (
    <>
      <h1>Resultados del diagnóstico</h1>
      <AssessmentTabs assessment={assessment} current="resultados" />
      <DemoBanner assessment={assessment} />
      <p className="muted">
        <strong>{ctx.organizationName || 'Organización sin nombre'}</strong>
        {ctx.sector && ` · ${labelOf(SECTORS, ctx.sector)}`}
        {ctx.sizeRange && ` · ${labelOf(SIZE_RANGES, ctx.sizeRange)}`} · Fecha {formatDate(assessmentDate(assessment))} ·{' '}
        {assessment.status === 'finalizada' ? 'Finalizada' : 'Borrador'} · Modelo v{assessment.modelVersion}
      </p>
      {d.overall.pending > 0 && (
        <div className="notice notice--warn" role="note">
          <p>
            Hay <strong>{d.overall.pending}</strong> preguntas sin responder.{' '}
            <a href={href(`/evaluacion/${assessment.id}/cuestionario/D1`)}>Continuar el cuestionario</a>. Los resultados
            con cobertura inferior al 70 % se muestran como provisionales.
          </p>
        </div>
      )}
      {d.issues.length > 0 && (
        <div className="notice notice--warn" role="note">
          <p>Respuestas que no se pudieron usar:</p>
          <ul>
            {d.issues.map((i) => (
              <li key={i.questionId}>
                {i.questionId}: {i.issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section aria-labelledby="kpis">
        <h2 id="kpis" className="sr-only">
          Indicadores principales
        </h2>
        <div className="grid grid--3">
          {d.indices.map((i, n) => {
            const def = MODEL.indices.find((x) => x.id === i.id)!;
            const prev = prevDiagnosis?.indices.find((x) => x.id === i.id);
            const delta = prev && prev.value !== null && i.value !== null ? i.value - prev.value : null;
            return (
              <div key={i.id} className={`card ${KPI_CLASS[n]}`}>
                <div className="kpi__label">{i.name}</div>
                <div className="kpi__value">
                  <Score value={i.value} status={i.status} />
                </div>
                <div className="btn-row" style={{ margin: '6px 0' }}>
                  <LevelBadge level={i.level} />
                  <StatusBadge status={i.status} />
                </div>
                {delta !== null && (
                  <p className="small" style={{ margin: 0 }}>
                    {delta >= 0 ? '▲' : '▼'} {formatScore(Math.abs(delta))} puntos frente al {formatDate(assessmentDate(previous!))}
                  </p>
                )}
                <p className="small muted" style={{ margin: '6px 0 0' }}>
                  {def.description}
                </p>
                {i.missingDimensions.length > 0 && (
                  <p className="small">No se calcula: falta información en {i.missingDimensions.join(', ')}.</p>
                )}
                {i.provisionalDimensions.length > 0 && (
                  <p className="small">Provisional por cobertura baja en {i.provisionalDimensions.join(', ')}.</p>
                )}
                <p className="small" style={{ margin: 0 }}>
                  Componentes:{' '}
                  {i.components.map((c, k) => (
                    <span key={c.dimension}>
                      {k > 0 && ', '}
                      <button type="button" className="btn btn--ghost small" style={{ padding: 0 }} onClick={() => setSelected(c.dimension)}>
                        {c.dimension} ({formatScore(c.score)})
                      </button>
                    </span>
                  ))}
                </p>
              </div>
            );
          })}
        </div>
        <p className="muted small">
          Los tres resultados se presentan por separado y no se combinan en un índice único. Clasificación: Inicial
          (&lt;20), En desarrollo (20–&lt;40), Definida (40–&lt;60), Gestionada (60–&lt;80), Optimizada (≥80), aplicada
          sobre el valor sin redondear. Los umbrales son una convención del modelo.
        </p>
      </section>

      <section className="card" aria-labelledby="alerts">
        <h2 id="alerts">Alertas críticas</h2>
        <p className="small muted">
          Las alertas no modifican la puntuación: limitan qué casos de uso pueden recomendarse para despliegue.
        </p>
        <AlertList alerts={d.alerts} assessment={assessment} />
      </section>

      <div className="grid grid--2">
        <section className="card" aria-labelledby="bars">
          <h2 id="bars">Puntuación por dimensión</h2>
          <p className="small muted">Seleccione una dimensión para ver las respuestas que originan su resultado.</p>
          <DimensionBars dimensions={d.dimensions} previous={prevDiagnosis?.dimensions} onSelect={setSelected} />
        </section>
        <section className="card" aria-labelledby="radar">
          <h2 id="radar">Perfil de madurez</h2>
          <RadarChart dimensions={d.dimensions} previous={prevDiagnosis?.dimensions} />
          <details>
            <summary>Ver como tabla</summary>
            <DimensionTable dimensions={d.dimensions} />
          </details>
        </section>
      </div>

      {selectedResult && (
        <section className="card" aria-labelledby="detail" id="detalle">
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <h2 id="detail" style={{ margin: 0 }} tabIndex={-1}>
              Origen del resultado: {selectedResult.dimension} {MODEL.dimensions.find((x) => x.id === selectedResult.dimension)?.name}
            </h2>
            <button type="button" className="btn btn--secondary" onClick={() => setSelected(null)}>
              Cerrar detalle
            </button>
          </div>
          <div className="btn-row" style={{ margin: '8px 0' }}>
            <StatusBadge status={selectedResult.status} />
            <LevelBadge level={selectedResult.level} />
          </div>
          <DimensionDetail result={selectedResult} assessment={assessment} />
        </section>
      )}

      <section className="card" aria-labelledby="coverage">
        <h2 id="coverage">Cobertura y evidencia</h2>
        <p className="small muted">
          La cobertura mide cuánta información puntuable hay; la evidencia indica cuánto de lo declarado está respaldado.
          Son independientes de la puntuación y no representan una confianza estadística.
        </p>
        <div className="grid grid--3">
          <div>
            <p style={{ margin: 0 }}>
              <strong>{d.overall.answered}</strong> respondidas con valor · <strong>{d.overall.unknown}</strong> «No sé» ·{' '}
              <strong>{d.overall.excluded}</strong> exclusiones justificadas · <strong>{d.overall.pending}</strong> sin
              responder (de {d.overall.total}).
            </p>
          </div>
          <div>
            <p style={{ margin: 0 }}>
              Evidencia de respuestas puntuadas: <strong>{d.overall.evidence.declarada}</strong> declaradas ·{' '}
              <strong>{d.overall.evidence.referenciada}</strong> referenciadas · <strong>{d.overall.evidence.verificada}</strong>{' '}
              verificadas por consultor.
            </p>
          </div>
          <div>
            <p style={{ margin: 0 }}>
              Dimensiones provisionales: {d.dimensions.filter((x) => x.status === 'provisional').map((x) => x.dimension).join(', ') || 'ninguna'}.
              Sin información: {d.dimensions.filter((x) => x.status === 'sin-informacion').map((x) => x.dimension).join(', ') || 'ninguna'}.
            </p>
          </div>
        </div>
        <details style={{ marginTop: 8 }}>
          <summary>Detalle por dimensión</summary>
          <DimensionTable dimensions={d.dimensions} />
          <p className="small muted">Cobertura: {d.dimensions.map((x) => `${x.dimension} ${pct(x.coverage)}`).join(' · ')}</p>
        </details>
      </section>

      <div className="grid grid--2">
        <section className="card" aria-labelledby="strengths">
          <h2 id="strengths">Fortalezas</h2>
          {d.strengths.length === 0 ? (
            <p>No hay prácticas con nivel 3 o 4 registradas.</p>
          ) : (
            <ul className="list-plain">
              {d.strengths.slice(0, 8).map((s) => {
                const q = MODEL.questions.find((x) => x.id === s.questionId)!;
                return (
                  <li key={s.questionId} className="small">
                    <a className="question__id" href={href(`/evaluacion/${assessment.id}/cuestionario/${s.dimension}?p=${s.questionId}`)}>
                      {s.questionId}
                    </a>{' '}
                    <strong>Nivel {s.value}:</strong> {q.options[s.value]}
                  </li>
                );
              })}
            </ul>
          )}
          {d.strengths.length > 8 && <p className="small muted">Y {d.strengths.length - 8} prácticas más con nivel 3 o 4.</p>}
        </section>
        <section className="card" aria-labelledby="gaps">
          <h2 id="gaps">Brechas prioritarias</h2>
          {gaps.length === 0 ? (
            <p>No hay brechas observadas según las reglas del modelo.</p>
          ) : (
            <ol className="small">
              {gaps.slice(0, 6).map((r) => (
                <li key={r.id} style={{ marginBottom: 6 }}>
                  <strong>{r.title}</strong> — prioridad {r.priority === 'critica' ? 'crítica' : r.priority}, {r.horizon} días.{' '}
                  <span className="muted">Origen: {r.evidence.filter((e) => e.triggers).map((e) => `${e.questionId}=${e.value}`).join(', ')}</span>
                </li>
              ))}
            </ol>
          )}
          {pendingVerification.length > 0 && (
            <p className="small">
              Además, <strong>{pendingVerification.length}</strong> temas tienen información pendiente de verificar («No
              sé»); se listan en las recomendaciones y no se presentan como brechas.
            </p>
          )}
        </section>
      </div>

      <section className="card" aria-labelledby="usecases">
        <h2 id="usecases">Casos de uso recomendados</h2>
        <p className="small muted">
          Prioridad = 0,4 × valor + 0,35 × viabilidad + 0,25 × urgencia (escala 1–5, orientativa). Una dependencia
          crítica bloquea la recomendación de despliegue aunque la prioridad sea alta.
        </p>
        {relevantUseCases.length === 0 ? (
          <p>
            Ningún caso de uso del catálogo se justifica con el contexto registrado. Indique objetivos y procesos a
            mejorar en el <a href={href(`/evaluacion/${assessment.id}/contexto`)}>contexto</a>.
          </p>
        ) : (
          <div className="grid grid--2">
            {relevantUseCases.map((u) => (
              <UseCaseCard key={u.useCase.id} uc={u} assessment={assessment} />
            ))}
          </div>
        )}
        {d.useCases.length > relevantUseCases.length && (
          <p className="small muted">
            No justificados por el contexto actual:{' '}
            {d.useCases
              .filter((u) => !u.relevant)
              .map((u) => u.useCase.name)
              .join('; ')}
            .
          </p>
        )}
      </section>

      <section aria-labelledby="recs">
        <div className="btn-row" style={{ justifyContent: 'space-between' }}>
          <h2 id="recs">Recomendaciones ({d.recommendations.length})</h2>
          <a className="btn" href={href(`/evaluacion/${assessment.id}/hoja-de-ruta`)}>
            Ver hoja de ruta 30/60/90
          </a>
        </div>
        <p className="small muted">Las recomendaciones críticas se muestran abiertas; despliegue las demás para ver el detalle completo.</p>
        {d.recommendations.length === 0 && <p>No se generaron recomendaciones con las respuestas actuales.</p>}
        {d.recommendations.map((r) => (
          <RecommendationCard key={r.id} rec={r} assessment={assessment} collapsible />
        ))}
      </section>

      {previous && (
        <section className="card" aria-labelledby="compare">
          <h2 id="compare">Comparación temporal</h2>
          <p>
            Existe una evaluación anterior compatible ({formatDate(assessmentDate(previous))}). Las barras y el radar
            muestran ambas.{' '}
            <a href={href(`/comparar?a=${previous.id}&b=${assessment.id}`)}>Ver comparación detallada</a>.
          </p>
        </section>
      )}
    </>
  );
}
