import { MODEL } from '../../model';
import { assessmentDate, compareAssessments } from '../../engine/compare';
import { evaluate } from '../../engine/evaluate';
import { formatScore } from '../../engine/scoring';
import { DimensionBars, RadarChart } from '../components/charts';
import { DemoBanner } from '../components/common';
import { DIM_STATUS_LABEL, formatDate, INDEX_STATUS_LABEL } from '../labels';
import { href, navigate } from '../router';
import { useAssessments } from '../store';

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span>No comparable</span>;
  const sign = value > 0 ? '▲ +' : value < 0 ? '▼ −' : '= ';
  return (
    <span>
      {sign}
      {formatScore(Math.abs(value))}
    </span>
  );
}

export function Compare({ a, b }: { a?: string; b?: string }) {
  const all = useAssessments();
  const first = all.find((x) => x.id === a);
  const second = all.find((x) => x.id === b);
  const orgAssessments = first ? all.filter((x) => x.organizationId === first.organizationId) : all;

  const selector = (
    <div className="card no-print">
      <div className="grid grid--2">
        {(['a', 'b'] as const).map((key) => (
          <div className="field" key={key}>
            <label htmlFor={`cmp-${key}`}>{key === 'a' ? 'Evaluación A' : 'Evaluación B'}</label>
            <select
              id={`cmp-${key}`}
              value={(key === 'a' ? a : b) ?? ''}
              onChange={(e) => {
                const q = new URLSearchParams({ a: a ?? '', b: b ?? '' });
                q.set(key, e.target.value);
                navigate(`/comparar?${q.toString()}`);
              }}
            >
              <option value="">— Seleccione —</option>
              {(key === 'a' ? all : orgAssessments).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.context.organizationName || 'Sin nombre'} — {formatDate(assessmentDate(x))} (v{x.modelVersion})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );

  if (!first || !second) {
    return (
      <>
        <h1>Comparación temporal</h1>
        <p>Seleccione dos evaluaciones de la misma organización.</p>
        {selector}
      </>
    );
  }

  const result = compareAssessments(MODEL, first, second);
  if (!result.compatible) {
    return (
      <>
        <h1>Comparación temporal</h1>
        {selector}
        <div className="notice notice--warn" role="alert">
          <p>
            <strong>No se puede comparar.</strong> {result.reason}
          </p>
        </div>
      </>
    );
  }
  const re = evaluate(MODEL, result.earlier);
  const rl = evaluate(MODEL, result.later);
  return (
    <>
      <h1>Comparación temporal</h1>
      <DemoBanner assessment={result.later} />
      {selector}
      <p>
        <strong>{result.later.context.organizationName}</strong>: {formatDate(assessmentDate(result.earlier))} →{' '}
        {formatDate(assessmentDate(result.later))}. Modelo v{result.earlier.modelVersion} → v{result.later.modelVersion}.
      </p>
      {result.notes.map((n, i) => (
        <div key={i} className="notice notice--info">
          <p>{n}</p>
        </div>
      ))}
      <section className="card">
        <h2>Resultados principales</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Resultado</th>
                <th scope="col" className="num">Anterior</th>
                <th scope="col" className="num">Actual</th>
                <th scope="col" className="num">Variación</th>
                <th scope="col">Estado (anterior → actual)</th>
              </tr>
            </thead>
            <tbody>
              {result.indices.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="num">{formatScore(r.before)}</td>
                  <td className="num">{formatScore(r.after)}</td>
                  <td className="num">
                    <Delta value={r.delta} />
                  </td>
                  <td>
                    {INDEX_STATUS_LABEL[r.beforeStatus]} → {INDEX_STATUS_LABEL[r.afterStatus]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid grid--2">
        <section className="card">
          <h2>Por dimensión</h2>
          <DimensionBars dimensions={rl.dimensions} previous={re.dimensions} />
        </section>
        <section className="card">
          <h2>Perfil comparado</h2>
          <RadarChart dimensions={rl.dimensions} previous={re.dimensions} />
        </section>
      </div>
      <section className="card">
        <h2>Tabla por dimensión</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Dimensión</th>
                <th scope="col" className="num">Anterior</th>
                <th scope="col" className="num">Actual</th>
                <th scope="col" className="num">Variación</th>
                <th scope="col">Estado (anterior → actual)</th>
              </tr>
            </thead>
            <tbody>
              {result.dimensions.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.id} {r.name}
                  </td>
                  <td className="num">{formatScore(r.before)}</td>
                  <td className="num">{formatScore(r.after)}</td>
                  <td className="num">
                    <Delta value={r.delta} />
                  </td>
                  <td className="small">
                    {DIM_STATUS_LABEL[r.beforeStatus]} → {DIM_STATUS_LABEL[r.afterStatus]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Las variaciones reflejan cambios en las respuestas registradas, no una medición independiente. Interprete con
          cautela los cambios entre resultados provisionales.
        </p>
        <div className="btn-row">
          <a className="btn btn--secondary" href={href(`/evaluacion/${result.later.id}/resultados`)}>
            Ver resultados actuales
          </a>
        </div>
      </section>
    </>
  );
}
