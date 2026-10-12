import { MODEL } from '../../model';
import { downloadText } from '../components/common';
import { EFFORT_LABEL } from '../labels';

export function Methodology() {
  return (
    <>
      <h1>Metodología y modelo de evaluación</h1>
      <div className="notice notice--info">
        <p>
          <strong>
            {MODEL.name}, versión {MODEL.version}
          </strong>{' '}
          (publicada el {MODEL.publishedAt}). {MODEL.disclaimer}
        </p>
      </div>
      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => downloadText(`modelo-convergencia-v${MODEL.version}.json`, JSON.stringify(MODEL, null, 2))}
        >
          Descargar configuración del modelo (JSON)
        </button>
      </div>

      <section className="card">
        <h2>Cálculo</h2>
        <ul>
          <li>
            <strong>Puntuación de dimensión</strong> = 100 × Σ(peso × respuesta) / [4 × Σ pesos de preguntas respondidas y
            aplicables].
          </li>
          <li>
            <strong>Cobertura</strong> = peso respondido / peso aplicable total × 100. El peso aplicable incluye preguntas
            pendientes y «No sé»; excluye las exclusiones justificadas («No aplica»).
          </li>
          <li>
            Cobertura &lt; {MODEL.coverageThreshold} % → puntuación <strong>provisional</strong>. Sin respuestas puntuables →
            «Sin información suficiente».
          </li>
          {MODEL.indices.map((i) => (
            <li key={i.id}>
              <strong>{i.name}</strong>: {i.description} Pesos:{' '}
              {Object.entries(i.weights)
                .map(([d, w]) => `${d}=${w}`)
                .join(', ')}
              .
            </li>
          ))}
          <li>
            Un índice es provisional si alguna dimensión necesaria tiene cobertura menor al {MODEL.coverageThreshold} %; no
            se calcula si alguna dimensión necesaria no tiene información. No existe un índice global.
          </li>
          <li>
            Niveles (sobre el valor sin redondear):{' '}
            {MODEL.levels.map((l, i) => `${l.label} ${i < MODEL.levels.length - 1 ? `${l.min} a <${MODEL.levels[i + 1].min}` : `${l.min} a 100`}`).join(' · ')}.
            Se muestra un decimal. Los umbrales son una convención del modelo, no un resultado de validación científica.
          </li>
          <li>
            Prioridad de casos de uso = {MODEL.priorityWeights.value} × valor + {MODEL.priorityWeights.viability} ×
            viabilidad + {MODEL.priorityWeights.urgency} × urgencia (escala 1–5, orientativa). Una dependencia crítica
            bloquea la recomendación de despliegue.
          </li>
        </ul>
        <h3>Escala de respuesta</h3>
        <ul>
          {MODEL.scale.map((s) => (
            <li key={s.value}>
              <strong>{s.value}</strong> — {s.label}: {s.description}
            </li>
          ))}
          <li>
            <strong>No sé</strong>: válida, sin puntuación; reduce la cobertura y genera una recomendación de verificación.
          </li>
          <li>
            <strong>No aplica</strong>: solo en preguntas con condición de exclusión, y con justificación escrita.
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Alertas críticas</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Alerta</th>
                <th scope="col">Categoría</th>
                <th scope="col">Condición</th>
                <th scope="col">Limitación de despliegue</th>
              </tr>
            </thead>
            <tbody>
              {MODEL.alerts.map((a) => (
                <tr key={a.id}>
                  <td>{a.title}</td>
                  <td>{a.category}</td>
                  <td>
                    {a.questionId} ≤ {a.threshold}, «No sé» o sin responder (por verificar)
                  </td>
                  <td className="small">{a.deploymentLimitation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Banco de preguntas ({MODEL.questions.length})</h2>
        {MODEL.dimensions.map((d) => (
          <details key={d.id}>
            <summary>
              {d.id}. {d.name}
            </summary>
            <p className="small muted">{d.description}</p>
            {MODEL.questions
              .filter((q) => q.dimension === d.id)
              .map((q) => (
                <div key={q.id} className="question">
                  <div className="question__head">
                    <span className="question__id">{q.id}</span>
                    <strong>{q.text}</strong>
                    <span className="badge">Peso {String(q.weight).replace('.', ',')}</span>
                  </div>
                  <p className="small muted" style={{ margin: '4px 0' }}>
                    {q.help}
                  </p>
                  <ol start={0} className="small">
                    {q.options.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ol>
                  <p className="small" style={{ margin: 0 }}>
                    Evidencia sugerida: {q.evidence} · Reglas: {q.ruleIds.join(', ')}
                    {q.naCondition ? ` · «No aplica» si: ${q.naCondition.description}` : ''}
                  </p>
                </div>
              ))}
          </details>
        ))}
      </section>

      <section className="card">
        <h2>Reglas de recomendación ({MODEL.rules.length})</h2>
        <div className="table-wrap">
          <table className="small">
            <thead>
              <tr>
                <th scope="col">Regla</th>
                <th scope="col">Preguntas</th>
                <th scope="col">Se activa si</th>
                <th scope="col">Acción</th>
                <th scope="col">Plazo / esfuerzo</th>
              </tr>
            </thead>
            <tbody>
              {MODEL.rules.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.id}</strong> {r.title}
                    {r.critical ? ' (crítica)' : ''}
                  </td>
                  <td>{r.questionIds.join(', ')}</td>
                  <td>alguna ≤ {r.threshold}</td>
                  <td>{r.action}</td>
                  <td>
                    {r.horizon} días / {EFFORT_LABEL[r.effort]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Historial de versiones</h2>
        <p className="small">
          Cambio mayor: cambian preguntas, pesos, fórmulas o umbrales; las evaluaciones dejan de ser comparables. Cambio
          menor: textos, ayudas o recomendaciones sin alterar el cálculo; siguen siendo comparables.
        </p>
        <ul>
          {MODEL.changelog.map((c) => (
            <li key={c.version}>
              <strong>{c.version}</strong> ({c.date}): {c.changes.join(' ')}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
