import type { ActionStatus, Effort, EvidenceStatus, Priority } from '../model/types';
import type { AlertStatus, UseCaseStatus } from '../engine/diagnosis';
import type { DimensionStatus, IndexStatus } from '../engine/scoring';

export const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  declarada: 'Declarada',
  referenciada: 'Referenciada',
  verificada: 'Verificada por consultor',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const PRIORITY_ICON: Record<Priority, string> = {
  critica: '⛔',
  alta: '▲',
  media: '●',
  baja: '○',
};

export const EFFORT_LABEL: Record<Effort, string> = { bajo: 'Bajo', medio: 'Medio', alto: 'Alto' };

export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = {
  pendiente: 'Pendiente',
  'en-curso': 'En curso',
  completada: 'Completada',
};

export const DIM_STATUS_LABEL: Record<DimensionStatus, string> = {
  completa: 'Cobertura suficiente',
  provisional: 'Provisional (cobertura < 70 %)',
  'sin-informacion': 'Sin información suficiente',
};

export const INDEX_STATUS_LABEL: Record<IndexStatus, string> = {
  completo: 'Cobertura suficiente',
  provisional: 'Provisional',
  'no-calculable': 'No calculable',
};

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  activa: 'Brecha observada',
  'por-verificar': 'Pendiente de verificar',
};

export const UC_STATUS_LABEL: Record<UseCaseStatus, string> = {
  bloqueado: 'Despliegue bloqueado',
  condicionado: 'Piloto condicionado',
  'apto-piloto': 'Apto para piloto',
};

export const ANSWER_STATE_LABEL: Record<string, string> = {
  puntuada: 'Respondida',
  'no-se': 'No sé',
  excluida: 'No aplica (justificada)',
  pendiente: 'Sin responder',
};

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function pct(v: number | null): string {
  return v === null ? '—' : `${Math.round(v)} %`;
}
