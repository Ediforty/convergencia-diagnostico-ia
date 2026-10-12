import { useState } from 'react';
import { MODEL } from '../../model';
import type { DimensionId } from '../../model/types';
import { formatScore, type DimensionResult } from '../../engine/scoring';
import { DIM_STATUS_LABEL, pct } from '../labels';

const dimName = (id: DimensionId) => MODEL.dimensions.find((d) => d.id === id)!;

/**
 * Barras horizontales por dimensión. La puntuación se muestra siempre en texto;
 * el estado provisional se indica con rayado y con texto (no solo con color).
 */
export function DimensionBars({
  dimensions,
  previous,
  onSelect,
}: {
  dimensions: DimensionResult[];
  previous?: DimensionResult[];
  onSelect?: (id: DimensionId) => void;
}) {
  return (
    <div>
      {previous && (
        <div className="legend" aria-hidden="true" style={{ marginBottom: 8 }}>
          <span>
            <span className="legend__swatch" style={{ background: 'var(--series-previous)' }} />
            Evaluación anterior
          </span>
          <span>
            <span className="legend__swatch" style={{ background: 'var(--series-current)' }} />
            Evaluación actual
          </span>
        </div>
      )}
      <ul className="bars list-plain" aria-label="Puntuación por dimensión (0 a 100)">
        {dimensions.map((d) => {
          const prev = previous?.find((p) => p.dimension === d.dimension);
          const dim = dimName(d.dimension);
          const label = `${dim.id} ${dim.name}`;
          const valueText =
            d.score === null
              ? 'Sin información suficiente'
              : `${formatScore(d.score)} — ${d.level?.label}${d.status === 'provisional' ? ' (provisional)' : ''}`;
          return (
            <li key={d.dimension} className="bar-row" style={{ padding: '4px 0', border: 0 }}>
              <div>
                {onSelect ? (
                  <button type="button" className="btn btn--ghost" onClick={() => onSelect(d.dimension)} title="Ver respuestas que originan el resultado">
                    {label}
                  </button>
                ) : (
                  <span>{label}</span>
                )}
              </div>
              <div
                className="bar-track"
                role="img"
                aria-label={`${label}: ${valueText}${prev ? `; anterior ${prev.score === null ? 'sin información' : formatScore(prev.score)}` : ''}`}
                title={`${label}: ${valueText} · cobertura ${pct(d.coverage)}`}
              >
                <div className="bar-track__ticks" />
                {prev && (
                  <div className="bar-fill bar-fill--previous" style={{ width: `${prev.score ?? 0}%` }} />
                )}
                <div
                  className={`bar-fill ${d.status === 'provisional' ? 'bar-fill--provisional' : ''} ${prev ? 'bar-fill--current-half' : ''}`}
                  style={{ width: `${d.score ?? 0}%` }}
                />
              </div>
              <div className="bar-meta">
                <strong>{d.score === null ? '—' : formatScore(d.score)}</strong>{' '}
                <span className="muted">{d.score === null ? DIM_STATUS_LABEL[d.status] : d.level?.label}</span>
                {d.status === 'provisional' && <span className="muted"> · provisional</span>}
                <div className="muted small">Cobertura {pct(d.coverage)}</div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="muted small" style={{ marginTop: 8 }}>
        Escala 0–100. Las líneas verticales marcan los umbrales de nivel (20, 40, 60, 80). Rayado = puntuación
        provisional por cobertura inferior al 70 %.
      </p>
    </div>
  );
}

/** Radar complementario. Siempre acompañado de una tabla equivalente. */
export function RadarChart({ dimensions, previous }: { dimensions: DimensionResult[]; previous?: DimensionResult[] }) {
  const [hover, setHover] = useState<DimensionId | null>(null);
  const size = 340;
  const c = size / 2;
  const r = 118;
  const n = dimensions.length;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const point = (i: number, v: number) => [c + Math.cos(angle(i)) * (r * v) / 100, c + Math.sin(angle(i)) * (r * v) / 100];
  const poly = (ds: DimensionResult[]) => ds.map((d, i) => point(i, d.score ?? 0).join(',')).join(' ');
  const hovered = dimensions.find((d) => d.dimension === hover);
  return (
    <figure style={{ margin: 0 }}>
      <svg
        className="radar"
        viewBox={`0 0 ${size} ${size}`}
        width="100%"
        style={{ maxWidth: 380, display: 'block', margin: '0 auto' }}
        role="img"
        aria-label="Radar de puntuaciones por dimensión. La tabla siguiente contiene los mismos datos."
      >
        {[20, 40, 60, 80, 100].map((g) => (
          <polygon
            key={g}
            points={dimensions.map((_, i) => point(i, g).join(',')).join(' ')}
            fill="none"
            stroke="var(--grid)"
            strokeWidth={1}
          />
        ))}
        {dimensions.map((d, i) => {
          const [x, y] = point(i, 100);
          const [lx, ly] = point(i, 122);
          return (
            <g key={d.dimension}>
              <line x1={c} y1={c} x2={x} y2={y} stroke="var(--grid)" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle">
                {d.dimension}
              </text>
            </g>
          );
        })}
        {previous && (
          <polygon points={poly(previous)} fill="var(--series-previous)" fillOpacity={0.12} stroke="var(--series-previous)" strokeWidth={2} strokeDasharray="5 3" />
        )}
        <polygon points={poly(dimensions)} fill="var(--series-current)" fillOpacity={0.18} stroke="var(--series-current)" strokeWidth={2} />
        {dimensions.map((d, i) => {
          const [x, y] = point(i, d.score ?? 0);
          return (
            <g key={d.dimension} onMouseEnter={() => setHover(d.dimension)} onMouseLeave={() => setHover(null)}>
              <circle cx={x} cy={y} r={12} fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={d.status === 'provisional' ? 5 : 4.5}
                fill={d.status === 'provisional' ? 'var(--surface)' : 'var(--series-current)'}
                stroke="var(--series-current)"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
      <figcaption className="muted small" style={{ textAlign: 'center', minHeight: '1.5em' }} aria-live="polite">
        {hovered
          ? `${hovered.dimension} ${dimName(hovered.dimension).name}: ${hovered.score === null ? 'sin información' : formatScore(hovered.score)}`
          : previous
            ? 'Línea continua: actual · línea discontinua: anterior. Punto hueco = provisional.'
            : 'Punto hueco = puntuación provisional.'}
      </figcaption>
    </figure>
  );
}

export function DimensionTable({ dimensions }: { dimensions: DimensionResult[] }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">Puntuación, nivel, cobertura y evidencia por dimensión</caption>
        <thead>
          <tr>
            <th scope="col">Dimensión</th>
            <th scope="col" className="num">
              Puntuación
            </th>
            <th scope="col">Nivel</th>
            <th scope="col" className="num">
              Cobertura
            </th>
            <th scope="col">Estado</th>
            <th scope="col">Evidencia (decl. / ref. / verif.)</th>
          </tr>
        </thead>
        <tbody>
          {dimensions.map((d) => (
            <tr key={d.dimension}>
              <th scope="row" style={{ background: 'transparent', fontWeight: 600 }}>
                {d.dimension} {dimName(d.dimension).name}
              </th>
              <td className="num">{formatScore(d.score)}</td>
              <td>{d.level?.label ?? '—'}</td>
              <td className="num">{pct(d.coverage)}</td>
              <td>{DIM_STATUS_LABEL[d.status]}</td>
              <td>
                {d.evidence.declarada} / {d.evidence.referenciada} / {d.evidence.verificada}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
