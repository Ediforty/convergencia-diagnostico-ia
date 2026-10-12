import { useState } from 'react';
import type { ActionStatus, Assessment, Horizon, Priority, RoadmapAdjustment } from '../../model/types';
import type { DiagnosisResult } from '../../engine/evaluate';
import type { EffectiveAction } from '../../engine/roadmap';
import { AssessmentTabs, DemoBanner } from '../components/common';
import { ACTION_STATUS_LABEL, PRIORITY_ICON, PRIORITY_LABEL } from '../labels';
import { saveAssessment } from '../store';

const STAGES: { stage: Horizon; title: string; purpose: string }[] = [
  { stage: 30, title: '30 días', purpose: 'Validar brechas, asignar responsables y resolver fundamentos críticos.' },
  { stage: 60, title: '60 días', purpose: 'Ejecutar pilotos controlados y formar al equipo.' },
  { stage: 90, title: '90 días', purpose: 'Evaluar resultados y decidir si ampliar, corregir o detener.' },
];

const STATUS_ICON: Record<ActionStatus, string> = { pendiente: '○', 'en-curso': '◐', completada: '✓' };

export function ActionSummary({ action }: { action: EffectiveAction }) {
  const rows: [string, string | undefined][] = [
    ['Acción', action.action],
    ['Entregable', action.deliverable],
    ['Responsable', action.owner],
    ['Dependencia', action.dependency],
    ['Indicador', action.indicator],
  ];
  return (
    <dl className="small" style={{ margin: '6px 0' }}>
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} style={{ marginBottom: 4 }}>
            <dt style={{ fontWeight: 700, color: 'var(--text-2)' }}>{k}</dt>
            <dd style={{ margin: 0 }}>{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function ActionCard({ action, onAdjust }: { action: EffectiveAction; onAdjust: (adj: RoadmapAdjustment | null) => void }) {
  const [editing, setEditing] = useState(false);
  const id = `act-${action.id}`;
  const current: RoadmapAdjustment = {
    status: action.status,
    priority: action.priority,
    stage: action.stage,
    owner: action.adjustedFields.includes('owner') ? action.owner : '',
    note: action.note ?? '',
    updatedAt: new Date().toISOString(),
  };
  const set = (patch: Partial<RoadmapAdjustment>) => onAdjust({ ...current, ...patch, updatedAt: new Date().toISOString() });
  return (
    <article className={`card card--flat rec rec--${action.priority}`} aria-labelledby={`${id}-t`}>
      <div className="btn-row">
        <span className={`badge ${action.priority === 'critica' ? 'badge--crit' : action.priority === 'alta' ? 'badge--warn' : ''}`}>
          <span aria-hidden="true">{PRIORITY_ICON[action.priority]}</span> {PRIORITY_LABEL[action.priority]}
        </span>
        <span className={`badge ${action.status === 'completada' ? 'badge--ok' : action.status === 'en-curso' ? 'badge--info' : ''}`}>
          <span aria-hidden="true">{STATUS_ICON[action.status]}</span> {ACTION_STATUS_LABEL[action.status]}
        </span>
        {action.adjusted && <span className="badge badge--warn">Ajustada por consultor</span>}
      </div>
      <h4 id={`${id}-t`} style={{ margin: '8px 0 0' }}>
        {action.title}
      </h4>
      <ActionSummary action={action} />
      {action.adjusted && (
        <p className="small muted" style={{ margin: 0 }}>
          Recomendación original: {action.original.stage} días, prioridad {PRIORITY_LABEL[action.original.priority].toLowerCase()},
          responsable «{action.original.owner}».
          {action.note && (
            <>
              {' '}
              Nota del consultor: {action.note}
            </>
          )}
        </p>
      )}
      <details className="small">
        <summary>Por qué está aquí</summary>
        <p>{action.rationale}</p>
      </details>
      <div className="btn-row" style={{ marginTop: 6 }}>
        <label className="sr-only" htmlFor={`${id}-status`}>
          Estado de la acción
        </label>
        <select
          id={`${id}-status`}
          value={action.status}
          style={{ width: 'auto' }}
          onChange={(e) => set({ status: e.target.value as ActionStatus })}
        >
          {(Object.keys(ACTION_STATUS_LABEL) as ActionStatus[]).map((s) => (
            <option key={s} value={s}>
              {ACTION_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn--ghost" aria-expanded={editing} onClick={() => setEditing(!editing)}>
          {editing ? 'Cerrar ajustes' : 'Ajustar prioridad o plazo'}
        </button>
        {action.adjusted && (
          <button type="button" className="btn btn--ghost" onClick={() => onAdjust(action.status === 'pendiente' ? null : { status: action.status, updatedAt: new Date().toISOString() })}>
            Restaurar recomendación original
          </button>
        )}
      </div>
      {editing && (
        <div className="question__extra">
          <div className="field">
            <label htmlFor={`${id}-prio`}>Prioridad</label>
            <select id={`${id}-prio`} value={action.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
              {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${id}-stage`}>Etapa</label>
            <select id={`${id}-stage`} value={action.stage} onChange={(e) => set({ stage: Number(e.target.value) as Horizon })}>
              {STAGES.map((s) => (
                <option key={s.stage} value={s.stage}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`${id}-owner`}>Responsable ajustado</label>
            <input id={`${id}-owner`} type="text" maxLength={120} value={current.owner} placeholder={action.original.owner} onChange={(e) => set({ owner: e.target.value })} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor={`${id}-note`}>Nota del consultor</label>
            <textarea id={`${id}-note`} maxLength={1000} value={current.note} onChange={(e) => set({ note: e.target.value })} />
          </div>
        </div>
      )}
    </article>
  );
}

export function Roadmap({ assessment, diagnosis }: { assessment: Assessment; diagnosis: DiagnosisResult }) {
  const [error, setError] = useState<string | null>(null);
  const actions = diagnosis.effectiveRoadmap;
  const done = actions.filter((a) => a.status === 'completada').length;

  const adjust = (id: string, adj: RoadmapAdjustment | null) => {
    const next = { ...assessment.roadmapAdjustments };
    if (adj) next[id] = { ...adj, owner: adj.owner?.trim() ? adj.owner : undefined, note: adj.note?.trim() ? adj.note : undefined };
    else delete next[id];
    const r = saveAssessment({ ...assessment, roadmapAdjustments: next });
    setError(r.ok ? null : r.message);
  };

  return (
    <>
      <h1>Hoja de ruta 30/60/90 días</h1>
      <AssessmentTabs assessment={assessment} current="hoja-de-ruta" />
      <DemoBanner assessment={assessment} />
      <p className="muted">
        Generada a partir de las recomendaciones y los casos de uso. Puede ajustar prioridad, etapa y responsable y
        registrar el avance; la recomendación original se conserva y se muestra junto a cada ajuste. Avance:{' '}
        <strong>
          {done} de {actions.length}
        </strong>{' '}
        acciones completadas.
      </p>
      {error && (
        <div className="notice notice--crit" role="alert">
          {error}
        </div>
      )}
      <div className="grid grid--3" style={{ alignItems: 'start' }}>
        {STAGES.map((s) => {
          const items = actions.filter((a) => a.stage === s.stage);
          return (
            <section key={s.stage} className={`card stage stage--${s.stage}`} aria-labelledby={`stage-${s.stage}`}>
              <h2 id={`stage-${s.stage}`}>{s.title}</h2>
              <p className="small muted">{s.purpose}</p>
              {items.length === 0 && <p className="small">Sin acciones en esta etapa.</p>}
              {items.map((a) => (
                <ActionCard key={a.id} action={a} onAdjust={(adj) => adjust(a.id, adj)} />
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
