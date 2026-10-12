import { useEffect, useState } from 'react';
import { MODEL } from '../../model';
import type { Answer, Assessment, DimensionId, EvidenceStatus, Question, ScaleValue } from '../../model/types';
import { resolveAnswer } from '../../engine/scoring';
import { AssessmentTabs, DemoBanner } from '../components/common';
import { EVIDENCE_LABEL } from '../labels';
import { href, navigate } from '../router';
import { saveAssessment } from '../store';

function dimensionProgress(assessment: Assessment, dim: DimensionId) {
  const qs = MODEL.questions.filter((q) => q.dimension === dim);
  const done = qs.filter((q) => resolveAnswer(q, assessment.answers[q.id]).state !== 'pendiente').length;
  return { done, total: qs.length };
}

function QuestionCard({
  question,
  answer,
  onChange,
  highlight,
}: {
  question: Question;
  answer: Answer | undefined;
  onChange: (a: Answer | undefined) => void;
  highlight: boolean;
}) {
  const name = `q-${question.id}`;
  const evidenceStatus = answer?.evidenceStatus ?? 'declarada';
  const choice = answer ? (answer.kind === 'valor' ? String(answer.value) : answer.kind) : '';
  const resolved = resolveAnswer(question, answer);

  const setChoice = (v: string) => {
    const common = { comment: answer?.comment, evidenceStatus, evidenceRef: answer?.evidenceRef };
    if (v === 'no-se') onChange({ ...common, kind: 'no-se' });
    else if (v === 'no-aplica') onChange({ ...common, kind: 'no-aplica', naJustification: answer?.naJustification ?? '' });
    else onChange({ ...common, kind: 'valor', value: Number(v) as ScaleValue });
  };
  const patch = (p: Partial<Answer>) => onChange({ kind: 'no-se', evidenceStatus, ...answer, ...p } as Answer);

  return (
    <article
      className="question"
      id={`pregunta-${question.id}`}
      aria-labelledby={`${name}-title`}
      style={highlight ? { outline: '3px solid var(--brand-violet)' } : undefined}
    >
      <div className="question__head">
        <span className="question__id">{question.id}</span>
        <h3 id={`${name}-title`} style={{ margin: 0 }}>
          {question.text}
        </h3>
        {question.weight !== 1 && <span className="badge">Peso {String(question.weight).replace('.', ',')}</span>}
      </div>
      <p className="muted small" style={{ marginTop: 6 }}>
        {question.help}
      </p>
      <fieldset>
        <legend className="sr-only">Respuesta a {question.id}</legend>
        {question.options.map((text, value) => (
          <label key={value} className="option">
            <input type="radio" name={name} value={value} checked={choice === String(value)} onChange={() => setChoice(String(value))} />
            <span className="option__value" aria-hidden="true">
              {value}
            </span>
            <span>
              <span className="sr-only">Nivel {value}: </span>
              {text}
            </span>
          </label>
        ))}
        <label className="option option--special">
          <input type="radio" name={name} value="no-se" checked={choice === 'no-se'} onChange={() => setChoice('no-se')} />
          <span className="option__value" aria-hidden="true">
            ?
          </span>
          <span>
            <strong>No sé.</strong> Respuesta válida: no suma puntos y reduce la cobertura; se marcará como información
            por verificar.
          </span>
        </label>
        {question.naCondition && (
          <label className="option option--special">
            <input type="radio" name={name} value="no-aplica" checked={choice === 'no-aplica'} onChange={() => setChoice('no-aplica')} />
            <span className="option__value" aria-hidden="true">
              —
            </span>
            <span>
              <strong>No aplica.</strong> Solo si: {question.naCondition.description}
            </span>
          </label>
        )}
      </fieldset>
      {answer?.kind === 'no-aplica' && (
        <div className="field" style={{ marginTop: 8 }}>
          <label htmlFor={`${name}-na`}>Justificación de la exclusión (obligatoria)</label>
          <textarea
            id={`${name}-na`}
            value={answer.naJustification ?? ''}
            maxLength={1000}
            aria-invalid={resolved.state === 'pendiente'}
            onChange={(e) => patch({ naJustification: e.target.value })}
          />
          {resolved.state === 'pendiente' && (
            <span className="hint" style={{ color: 'var(--crit-fg)' }}>
              Sin justificación, la pregunta se considera pendiente.
            </span>
          )}
        </div>
      )}
      <details style={{ marginTop: 8 }}>
        <summary>
          Evidencia y comentario{' '}
          <span className="muted small">
            ({EVIDENCE_LABEL[evidenceStatus]}
            {answer?.comment ? ', con comentario' : ''})
          </span>
        </summary>
        <p className="muted small">Evidencia sugerida: {question.evidence}</p>
        <div className="question__extra">
          <div className="field">
            <label htmlFor={`${name}-ev`}>Estado de la evidencia</label>
            <select
              id={`${name}-ev`}
              value={evidenceStatus}
              disabled={!answer}
              onChange={(e) => patch({ evidenceStatus: e.target.value as EvidenceStatus })}
            >
              {(Object.keys(EVIDENCE_LABEL) as EvidenceStatus[]).map((k) => (
                <option key={k} value={k}>
                  {EVIDENCE_LABEL[k]}
                </option>
              ))}
            </select>
            <span className="hint">«Verificada» solo si un consultor revisó la evidencia.</span>
          </div>
          <div className="field">
            <label htmlFor={`${name}-ref`}>Referencia de evidencia</label>
            <input
              id={`${name}-ref`}
              type="text"
              maxLength={300}
              disabled={!answer}
              placeholder="Nombre o ubicación del documento"
              value={answer?.evidenceRef ?? ''}
              onChange={(e) => patch({ evidenceRef: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={`${name}-c`}>Comentario (opcional)</label>
            <textarea
              id={`${name}-c`}
              maxLength={1000}
              disabled={!answer}
              value={answer?.comment ?? ''}
              onChange={(e) => patch({ comment: e.target.value })}
            />
          </div>
        </div>
        {!answer && <p className="muted small">Seleccione primero una respuesta para registrar evidencia o comentarios.</p>}
      </details>
      {answer && (
        <button type="button" className="btn btn--ghost small" onClick={() => onChange(undefined)}>
          Borrar respuesta
        </button>
      )}
    </article>
  );
}

export function Questionnaire({ assessment, dim, focus }: { assessment: Assessment; dim: DimensionId; focus?: string }) {
  const [error, setError] = useState<string | null>(null);
  const dimension = MODEL.dimensions.find((d) => d.id === dim)!;
  const questions = MODEL.questions.filter((q) => q.dimension === dim);
  const idx = MODEL.dimensions.findIndex((d) => d.id === dim);
  const prev = MODEL.dimensions[idx - 1];
  const next = MODEL.dimensions[idx + 1];
  const total = MODEL.questions.filter((q) => resolveAnswer(q, assessment.answers[q.id]).state !== 'pendiente').length;

  useEffect(() => {
    if (focus) document.getElementById(`pregunta-${focus}`)?.scrollIntoView({ block: 'start' });
  }, [focus]);

  const setAnswer = (id: string, a: Answer | undefined) => {
    const answers = { ...assessment.answers };
    if (a) answers[id] = a;
    else delete answers[id];
    const r = saveAssessment({ ...assessment, answers });
    setError(r.ok ? null : r.message);
  };

  return (
    <>
      <h1>Cuestionario</h1>
      <AssessmentTabs assessment={assessment} current="cuestionario" />
      <DemoBanner assessment={assessment} />
      <div className="layout-questionnaire">
        <nav className="dim-nav card card--flat" aria-label="Dimensiones del cuestionario">
          <p className="small" style={{ marginBottom: 6 }}>
            Avance total: <strong>{total}</strong> de {MODEL.questions.length}
          </p>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={MODEL.questions.length} aria-valuenow={total} aria-label="Avance total">
            <span style={{ width: `${(100 * total) / MODEL.questions.length}%` }} />
          </div>
          <ol style={{ marginTop: 10 }}>
            {MODEL.dimensions.map((d) => {
              const p = dimensionProgress(assessment, d.id);
              return (
                <li key={d.id}>
                  <a href={href(`/evaluacion/${assessment.id}/cuestionario/${d.id}`)} aria-current={d.id === dim ? 'page' : undefined}>
                    <span>
                      {d.id} {d.shortName}
                    </span>
                    <span className="small" aria-label={`${p.done} de ${p.total} respondidas`}>
                      {p.done === p.total ? '✓' : `${p.done}/${p.total}`}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
        <section aria-labelledby="dim-title">
          <h2 id="dim-title">
            {dimension.id}. {dimension.name}
          </h2>
          <p className="muted">{dimension.description}</p>
          <p className="small muted">
            Escala: 0 inexistente · 1 informal o aislado · 2 definido y parcialmente implementado · 3 implementado con
            responsables y seguimiento · 4 medido y mejorado sistemáticamente. Elija la opción que describe lo que
            ocurre en la práctica, no lo que se planea.
          </p>
          {error && (
            <div className="notice notice--crit" role="alert">
              {error}
            </div>
          )}
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              answer={assessment.answers[q.id]}
              highlight={focus === q.id}
              onChange={(a) => setAnswer(q.id, a)}
            />
          ))}
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            {prev ? (
              <a className="btn btn--secondary" href={href(`/evaluacion/${assessment.id}/cuestionario/${prev.id}`)}>
                ← {prev.id} {prev.shortName}
              </a>
            ) : (
              <a className="btn btn--secondary" href={href(`/evaluacion/${assessment.id}/contexto`)}>
                ← Contexto
              </a>
            )}
            <span className="save-status" role="status">
              Borrador guardado automáticamente.
            </span>
            {next ? (
              <a className="btn" href={href(`/evaluacion/${assessment.id}/cuestionario/${next.id}`)}>
                {next.id} {next.shortName} →
              </a>
            ) : (
              <button
                type="button"
                className="btn btn--teal"
                onClick={() => {
                  saveAssessment({ ...assessment, status: 'finalizada' });
                  navigate(`/evaluacion/${assessment.id}/resultados`);
                }}
              >
                Finalizar y ver resultados
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
