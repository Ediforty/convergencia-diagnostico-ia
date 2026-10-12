import { getQuestion, MODEL } from '../../model';
import type { Assessment } from '../../model/types';
import type { AlertResult, Recommendation, UseCaseEvaluation } from '../../engine/diagnosis';
import type { DimensionResult } from '../../engine/scoring';
import {
  ALERT_STATUS_LABEL,
  ANSWER_STATE_LABEL,
  EFFORT_LABEL,
  EVIDENCE_LABEL,
  PRIORITY_ICON,
  PRIORITY_LABEL,
  UC_STATUS_LABEL,
} from '../labels';
import { href } from '../router';

const CATEGORY_LABEL = { seguridad: 'Seguridad', privacidad: 'Privacidad', supervision: 'Supervisión humana' };

function QLink({ assessment, id, interactive }: { assessment?: Assessment; id: string; interactive: boolean }) {
  if (!interactive || !assessment) return <span className="question__id">{id}</span>;
  const dim = id.split('.')[0];
  return (
    <a className="question__id" href={href(`/evaluacion/${assessment.id}/cuestionario/${dim}?p=${id}`)} title={getQuestion(id)?.text}>
      {id}
    </a>
  );
}

export function AlertList({ alerts, assessment, interactive = true }: { alerts: AlertResult[]; assessment?: Assessment; interactive?: boolean }) {
  if (alerts.length === 0) {
    return <p>No se detectan carencias críticas en seguridad, privacidad ni supervisión humana con las respuestas registradas.</p>;
  }
  return (
    <ul className="list-plain">
      {alerts.map((a) => (
        <li key={a.rule.id}>
          <div className="btn-row">
            <span className={`badge ${a.status === 'activa' ? 'badge--crit' : 'badge--warn'}`}>
              <span aria-hidden="true">{a.status === 'activa' ? '⛔' : '?'}</span> {ALERT_STATUS_LABEL[a.status]}
            </span>
            <span className="badge">{CATEGORY_LABEL[a.rule.category]}</span>
            <strong>{a.rule.title}</strong>
          </div>
          <p className="small" style={{ margin: '6px 0 2px' }}>
            {a.rule.risk} <span className="muted">Origen: </span>
            <QLink assessment={assessment} id={a.rule.questionId} interactive={interactive} />. {a.reason}
          </p>
          <p className="small" style={{ margin: 0 }}>
            <strong>Limita el despliegue:</strong> {a.rule.deploymentLimitation}
          </p>
          {a.contextNote && <p className="small muted" style={{ margin: 0 }}>{a.contextNote}</p>}
        </li>
      ))}
    </ul>
  );
}

export function RecommendationCard({
  rec,
  assessment,
  interactive = true,
  collapsible = false,
}: {
  rec: Recommendation;
  assessment?: Assessment;
  interactive?: boolean;
  /** En pantalla, las recomendaciones no críticas se muestran plegadas. */
  collapsible?: boolean;
}) {
  const body = <RecommendationBody rec={rec} assessment={assessment} interactive={interactive} />;
  if (collapsible) {
    return (
      <details className={`card card--flat rec rec--${rec.priority}`} open={rec.priority === 'critica'}>
        <summary>
          <RecommendationHead rec={rec} />
          <span style={{ display: 'block', marginTop: 6 }}>{rec.title}</span>
        </summary>
        {body}
      </details>
    );
  }
  return (
    <article className={`card card--flat rec rec--${rec.priority}`}>
      <RecommendationHead rec={rec} />
      <h3 style={{ marginTop: 8 }}>{rec.title}</h3>
      {body}
    </article>
  );
}

function RecommendationHead({ rec }: { rec: Recommendation }) {
  return (
      <div className="btn-row">
        <span className={`badge ${rec.priority === 'critica' ? 'badge--crit' : rec.priority === 'alta' ? 'badge--warn' : ''}`}>
          <span aria-hidden="true">{PRIORITY_ICON[rec.priority]}</span> Prioridad {PRIORITY_LABEL[rec.priority]}
        </span>
        <span className={`badge ${rec.type === 'brecha' ? 'badge--info' : 'badge--warn'}`}>
          {rec.type === 'brecha' ? 'Brecha observada' : 'Información pendiente de verificar'}
        </span>
        <span className="badge">{rec.horizon} días</span>
        <span className="question__id">{rec.id}</span>
      </div>
  );
}

function RecommendationBody({ rec, assessment, interactive }: { rec: Recommendation; assessment?: Assessment; interactive: boolean }) {
  return (
      <dl>
        <dt>Hallazgo</dt>
        <dd>{rec.finding}</dd>
        <dt>Preguntas que lo sustentan</dt>
        <dd>
          {rec.evidence.map((e, i) => (
            <span key={e.questionId}>
              {i > 0 && ' · '}
              <QLink assessment={assessment} id={e.questionId} interactive={interactive} />{' '}
              {e.state === 'puntuada' ? `= ${e.value}` : `(${ANSWER_STATE_LABEL[e.state]})`}
              {e.triggers && <strong> ← activa</strong>}
            </span>
          ))}
        </dd>
        <dt>Acción</dt>
        <dd>{rec.action}</dd>
        <dt>Resultado esperado</dt>
        <dd>{rec.expectedResult}</dd>
        <dt>Responsable sugerido</dt>
        <dd>{rec.owner}</dd>
        <dt>Esfuerzo estimado</dt>
        <dd>{EFFORT_LABEL[rec.effort]} (orientativo)</dd>
        <dt>Dependencias</dt>
        <dd>
          {rec.dependencies.length === 0
            ? 'Ninguna.'
            : rec.dependencies.map((d) => `${d.ruleId} ${d.title} (${d.open ? 'pendiente' : 'sin brecha observada'})`).join('; ')}
        </dd>
        <dt>Indicador de éxito</dt>
        <dd>{rec.indicator}</dd>
        <dt>Plazo</dt>
        <dd>{rec.horizon} días</dd>
        <dt>Razón de la prioridad</dt>
        <dd>{rec.priorityReason}</dd>
      </dl>
  );
}

export function UseCaseCard({ uc, assessment, interactive = true }: { uc: UseCaseEvaluation; assessment?: Assessment; interactive?: boolean }) {
  const statusCls = uc.status === 'bloqueado' ? 'badge--crit' : uc.status === 'condicionado' ? 'badge--warn' : 'badge--ok';
  const statusIcon = uc.status === 'bloqueado' ? '⛔' : uc.status === 'condicionado' ? '◐' : '✓';
  return (
    <article className="card card--flat">
      <div className="btn-row" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>{uc.useCase.name}</h3>
        <span className={`badge ${statusCls}`}>
          <span aria-hidden="true">{statusIcon}</span> {UC_STATUS_LABEL[uc.status]}
        </span>
      </div>
      <p className="small" style={{ marginTop: 6 }}>
        {uc.useCase.description} <span className="muted">Ejemplos: {uc.useCase.examples}</span>
      </p>
      <p className="small">
        <strong>Por qué se recomienda:</strong> {uc.relevanceReasons.join(' ')}
      </p>
      <p className="small">
        <strong>Prioridad orientativa: {uc.priority.toFixed(2).replace('.', ',')}</strong> / 5{' '}
        <span className="muted">({uc.priorityFormula.replace(/\./g, ',')})</span>
      </p>
      <details>
        <summary>Cómo se asignaron valor, viabilidad y urgencia</summary>
        <ul className="small">
          <li>
            <strong>Valor {uc.value.score}:</strong> {uc.value.explanation.join(' ')}
          </li>
          <li>
            <strong>Viabilidad {String(uc.viability.score).replace('.', ',')}:</strong> {uc.viability.explanation.join(' ')}
          </li>
          <li>
            <strong>Urgencia {uc.urgency.score}:</strong> {uc.urgency.explanation.join(' ')}
          </li>
        </ul>
        <p className="small muted">Estimaciones orientativas. No representan ahorros ni retornos financieros.</p>
      </details>
      <details open={uc.status === 'bloqueado'}>
        <summary>Dependencias ({uc.dependencies.filter((d) => !d.met).length} sin cumplir)</summary>
        <ul className="small">
          {uc.dependencies.map((d) => (
            <li key={d.dependency.questionId}>
              <span aria-hidden="true">{d.met ? '✓' : d.dependency.critical ? '⛔' : '◐'}</span>{' '}
              <QLink assessment={assessment} id={d.dependency.questionId} interactive={interactive} /> ≥ {d.dependency.min}
              {d.dependency.critical ? ' (crítica)' : ''}: {d.met ? 'cumplida' : 'no cumplida'}
              {d.state === 'puntuada' ? ` (valor ${d.value})` : d.state !== 'excluida' ? ` (${ANSWER_STATE_LABEL[d.state]})` : ''}.{' '}
              <span className="muted">{d.dependency.reason}</span>
            </li>
          ))}
        </ul>
      </details>
      <p className="small" style={{ margin: '6px 0 0' }}>
        <strong>Estado:</strong> {uc.statusReason}
      </p>
      <p className="small muted" style={{ margin: 0 }}>
        Indicador del piloto: {uc.useCase.pilotIndicator}
      </p>
    </article>
  );
}

/** Respuestas que originan la puntuación de una dimensión. */
export function DimensionDetail({ result, assessment }: { result: DimensionResult; assessment: Assessment }) {
  const dim = MODEL.dimensions.find((d) => d.id === result.dimension)!;
  return (
    <div>
      <p className="small">
        Puntuación = 100 × Σ(peso × valor) / (4 × Σ peso puntuado) = 100 × {fmt(sumPoints(result))} / (4 ×{' '}
        {fmt(result.scoredWeight)}){result.score !== null ? ` = ${fmt(result.score, 1)}` : ' → sin respuestas puntuables'}. Cobertura ={' '}
        {fmt(result.scoredWeight)} / {fmt(result.applicableWeight)} ={' '}
        {result.coverage === null ? '—' : `${fmt(result.coverage, 1)} %`}.
      </p>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">Respuestas de {dim.name}</caption>
          <thead>
            <tr>
              <th scope="col">Pregunta</th>
              <th scope="col">Respuesta</th>
              <th scope="col" className="num">
                Peso
              </th>
              <th scope="col" className="num">
                Puntos
              </th>
              <th scope="col">Evidencia</th>
            </tr>
          </thead>
          <tbody>
            {result.questions.map((t) => {
              const q = getQuestion(t.questionId)!;
              const a = assessment.answers[t.questionId];
              return (
                <tr key={t.questionId}>
                  <td>
                    <QLink assessment={assessment} id={t.questionId} interactive /> {q.text}
                  </td>
                  <td>
                    {t.state === 'puntuada' ? (
                      <>
                        <strong>{t.value}</strong> — {q.options[t.value as number]}
                      </>
                    ) : (
                      <em>{ANSWER_STATE_LABEL[t.state]}</em>
                    )}
                    {t.issue && <div className="small" style={{ color: 'var(--crit-fg)' }}>{t.issue}</div>}
                    {a?.kind === 'no-aplica' && a.naJustification && <div className="small muted">Justificación: {a.naJustification}</div>}
                    {a?.comment && <div className="small muted">Comentario: {a.comment}</div>}
                  </td>
                  <td className="num">{fmt(t.weight)}</td>
                  <td className="num">{t.state === 'puntuada' ? `${fmt(t.weightedPoints)} / ${fmt(t.weight * 4)}` : '—'}</td>
                  <td className="small">
                    {t.state === 'puntuada' ? EVIDENCE_LABEL[t.evidenceStatus ?? 'declarada'] : '—'}
                    {a?.evidenceRef && <div className="muted">{a.evidenceRef}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function sumPoints(r: DimensionResult) {
  return r.questions.reduce((s, q) => s + q.weightedPoints, 0);
}

function fmt(v: number, digits?: number) {
  const s = digits === undefined ? String(Math.round(v * 100) / 100) : v.toFixed(digits);
  return s.replace('.', ',');
}
