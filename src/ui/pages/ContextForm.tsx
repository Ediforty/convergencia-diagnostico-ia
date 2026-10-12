import { useState } from 'react';
import {
  AI_USE_LEVELS,
  CONSTRAINT_LEVELS,
  OBJECTIVES,
  PROCESSES,
  ROLES,
  SECTORS,
  SENSITIVE_DATA,
  SIZE_RANGES,
  TOOLS,
  type Option,
} from '../../model/catalogs';
import type { Assessment, OrgContext } from '../../model/types';
import { AssessmentTabs, DemoBanner } from '../components/common';
import { navigate } from '../router';
import { saveAssessment } from '../store';

function Select({
  id,
  label,
  value,
  options,
  onChange,
  hint,
  allowEmpty = true,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  hint?: string;
  allowEmpty?: boolean;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined}>
        {allowEmpty && <option value="">— Seleccione —</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Checks({
  legend,
  options,
  values,
  onChange,
  hint,
}: {
  legend: string;
  options: Option[];
  values: string[];
  onChange: (v: string[]) => void;
  hint?: string;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {hint && <p className="hint muted small">{hint}</p>}
      <div className="check-grid">
        {options.map((o) => (
          <label key={o.id} className="check">
            <input
              type="checkbox"
              checked={values.includes(o.id)}
              onChange={(e) => onChange(e.target.checked ? [...values, o.id] : values.filter((v) => v !== o.id))}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ContextForm({ assessment }: { assessment: Assessment }) {
  const [error, setError] = useState<string | null>(null);
  const ctx = assessment.context;
  const update = (patch: Partial<OrgContext>) => {
    const r = saveAssessment({ ...assessment, context: { ...ctx, ...patch } });
    setError(r.ok ? null : r.message);
  };
  const nameMissing = ctx.organizationName.trim().length === 0;

  return (
    <>
      <h1>Contexto organizacional</h1>
      <AssessmentTabs assessment={assessment} current="contexto" />
      <DemoBanner assessment={assessment} />
      <div className="notice notice--info" role="note">
        <p>
          Solo se solicita información necesaria para adaptar ejemplos y recomendaciones. No escriba contraseñas,
          secretos empresariales ni datos personales. El contexto <strong>no cambia</strong> el sistema de puntuación.
        </p>
      </div>
      {error && (
        <div className="notice notice--crit" role="alert">
          {error}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate(`/evaluacion/${assessment.id}/cuestionario/D1`);
        }}
      >
        <div className="card">
          <h2>Organización</h2>
          <div className="grid grid--2">
            <div className="field">
              <label htmlFor="org-name">Nombre de la organización o alias</label>
              <span className="hint" id="org-name-hint">
                Puede usar un alias si prefiere no identificarla.
              </span>
              <input
                id="org-name"
                type="text"
                value={ctx.organizationName}
                maxLength={120}
                aria-describedby="org-name-hint"
                onChange={(e) => update({ organizationName: e.target.value })}
              />
            </div>
            <Select id="sector" label="Sector" value={ctx.sector} options={SECTORS} onChange={(v) => update({ sector: v })} />
            <div className="field">
              <label htmlFor="country">País</label>
              <input id="country" type="text" value={ctx.country} maxLength={60} onChange={(e) => update({ country: e.target.value })} />
            </div>
            <Select
              id="size"
              label="Tamaño (número de personas)"
              value={ctx.sizeRange}
              options={SIZE_RANGES}
              onChange={(v) => update({ sizeRange: v })}
            />
            <Select
              id="role"
              label="Rol de quien responde"
              hint="Solo el rol; no se pide nombre."
              value={ctx.respondentRole}
              options={ROLES}
              onChange={(v) => update({ respondentRole: v })}
            />
            <div className="field">
              <label htmlFor="date">Fecha de la evaluación</label>
              <input id="date" type="date" value={ctx.assessmentDate} onChange={(e) => update({ assessmentDate: e.target.value })} />
            </div>
            <Select
              id="modality"
              label="Modalidad"
              value={ctx.modality}
              allowEmpty={false}
              options={[
                { id: 'autodiagnostico', label: 'Autodiagnóstico' },
                { id: 'acompanada', label: 'Evaluación acompañada por consultor' },
              ]}
              onChange={(v) => update({ modality: v as OrgContext['modality'] })}
            />
            <Select
              id="ai-level"
              label="Nivel actual de uso de IA"
              value={ctx.aiUseLevel}
              allowEmpty={false}
              options={AI_USE_LEVELS}
              onChange={(v) => update({ aiUseLevel: v as OrgContext['aiUseLevel'] })}
            />
          </div>
        </div>

        <div className="card">
          <h2>Objetivos y procesos</h2>
          <Checks
            legend="Objetivos estratégicos"
            hint="Se usan para estimar el valor orientativo de los casos de uso."
            options={OBJECTIVES}
            values={ctx.objectives}
            onChange={(v) => update({ objectives: v })}
          />
          <div className="field">
            <label htmlFor="other-obj">Otro objetivo (opcional)</label>
            <input id="other-obj" type="text" maxLength={200} value={ctx.otherObjective} onChange={(e) => update({ otherObjective: e.target.value })} />
          </div>
          <Checks
            legend="Procesos que desea mejorar"
            hint="Se usan para decidir qué casos de uso se justifican y su urgencia."
            options={PROCESSES}
            values={ctx.processes}
            onChange={(v) => update({ processes: v })}
          />
          <div className="field">
            <label htmlFor="other-proc">Otro proceso (opcional)</label>
            <input id="other-proc" type="text" maxLength={200} value={ctx.otherProcess} onChange={(e) => update({ otherProcess: e.target.value })} />
          </div>
          <Checks legend="Herramientas principales utilizadas" options={TOOLS} values={ctx.tools} onChange={(v) => update({ tools: v })} />
          <div className="field">
            <label htmlFor="other-tools">Otras herramientas (opcional)</label>
            <input id="other-tools" type="text" maxLength={200} value={ctx.otherTools} onChange={(e) => update({ otherTools: e.target.value })} />
          </div>
        </div>

        <div className="card">
          <h2>Restricciones e información sensible</h2>
          <div className="grid grid--3">
            <Select
              id="budget"
              label="Presupuesto"
              allowEmpty={false}
              value={ctx.budgetConstraint}
              options={CONSTRAINT_LEVELS}
              onChange={(v) => update({ budgetConstraint: v as OrgContext['budgetConstraint'] })}
            />
            <Select
              id="capacity"
              label="Capacidades del equipo"
              allowEmpty={false}
              value={ctx.capacityConstraint}
              options={CONSTRAINT_LEVELS}
              onChange={(v) => update({ capacityConstraint: v as OrgContext['capacityConstraint'] })}
            />
            <Select
              id="time"
              label="Tiempo disponible"
              allowEmpty={false}
              value={ctx.timeConstraint}
              options={CONSTRAINT_LEVELS}
              onChange={(v) => update({ timeConstraint: v as OrgContext['timeConstraint'] })}
            />
          </div>
          <Checks
            legend="¿Qué categorías de información sensible trata la organización?"
            hint="Solo categorías generales. No incluya ejemplos reales."
            options={SENSITIVE_DATA}
            values={ctx.sensitiveData}
            onChange={(v) => update({ sensitiveData: v })}
          />
        </div>

        <div className="btn-row">
          <button type="submit" className="btn btn--teal">
            Continuar al cuestionario
          </button>
          <span className="save-status" role="status">
            Cambios guardados automáticamente como borrador.
          </span>
          {nameMissing && <span className="muted small">Consejo: indique un nombre o alias para reconocer la evaluación.</span>}
        </div>
      </form>
    </>
  );
}
