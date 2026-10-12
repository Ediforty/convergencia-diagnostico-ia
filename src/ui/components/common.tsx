import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Assessment, MaturityLevel } from '../../model/types';
import type { DimensionStatus, IndexStatus } from '../../engine/scoring';
import { formatScore } from '../../engine/scoring';
import { DIM_STATUS_LABEL, INDEX_STATUS_LABEL } from '../labels';
import { href } from '../router';

export function DemoBanner({ assessment }: { assessment?: Assessment }) {
  if (!assessment?.isDemo) return null;
  return (
    <div className="notice notice--demo" role="note">
      <p>
        <strong>DEMOSTRACIÓN — organización ficticia.</strong> Las respuestas y resultados de esta evaluación son
        inventados para mostrar el funcionamiento de la herramienta. No corresponden a ninguna organización real ni
        deben citarse como datos.
      </p>
    </div>
  );
}

export function StatusBadge({ status }: { status: DimensionStatus | IndexStatus }) {
  const label = (DIM_STATUS_LABEL as Record<string, string>)[status] ?? (INDEX_STATUS_LABEL as Record<string, string>)[status];
  const cls =
    status === 'completa' || status === 'completo'
      ? 'badge--ok'
      : status === 'provisional'
        ? 'badge--warn'
        : 'badge--crit';
  const icon = status === 'completa' || status === 'completo' ? '✓' : status === 'provisional' ? '◐' : '∅';
  return (
    <span className={`badge ${cls}`}>
      <span aria-hidden="true">{icon}</span> {label}
    </span>
  );
}

export function LevelBadge({ level }: { level: MaturityLevel | null }) {
  if (!level) return <span className="badge">Sin nivel</span>;
  return <span className="badge badge--info">Nivel: {level.label}</span>;
}

export function Score({ value, status }: { value: number | null; status: DimensionStatus | IndexStatus }) {
  if (value === null) return <span>{status === 'no-calculable' ? 'No calculable' : 'Sin información suficiente'}</span>;
  return (
    <span>
      {formatScore(value)}
      {status === 'provisional' && <span title="Puntuación provisional"> (provisional)</span>}
    </span>
  );
}

export function AssessmentTabs({ assessment, current }: { assessment: Assessment; current: string }) {
  const base = `/evaluacion/${assessment.id}`;
  const tabs = [
    ['contexto', 'Contexto'],
    ['cuestionario', 'Cuestionario'],
    ['resultados', 'Resultados'],
    ['hoja-de-ruta', 'Hoja de ruta'],
    ['informe', 'Informe'],
  ];
  return (
    <nav className="tabs no-print" aria-label="Secciones de la evaluación">
      {tabs.map(([key, label]) => (
        <a key={key} href={href(`${base}/${key}`)} aria-current={current === key ? 'page' : undefined}>
          {label}
        </a>
      ))}
    </nav>
  );
}

export function NotFound({ what = 'La evaluación' }: { what?: string }) {
  return (
    <div className="card">
      <h1>No encontrado</h1>
      <p>{what} no existe en este navegador. Puede haber sido eliminada o estar guardada en otro dispositivo.</p>
      <a className="btn" href={href('/evaluaciones')}>
        Ir al historial
      </a>
    </div>
  );
}

interface ConfirmProps {
  label: ReactNode;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}

/** Botón que pide confirmación en un diálogo modal accesible antes de ejecutar una acción irreversible. */
export function ConfirmButton({ label, title, message, confirmLabel, onConfirm, className = 'btn btn--secondary' }: ConfirmProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <dialog ref={ref} onClose={() => setOpen(false)} aria-labelledby={`dlg-${title}`}>
        <h2 id={`dlg-${title}`}>{title}</h2>
        <div>{message}</div>
        <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--secondary" autoFocus onClick={() => setOpen(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}

export function downloadText(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'evaluacion'
  );
}
