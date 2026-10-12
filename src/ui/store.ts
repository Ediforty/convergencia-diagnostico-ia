import { useMemo, useSyncExternalStore } from 'react';
import { MODEL } from '../model';
import type { Assessment } from '../model/types';
import { evaluate, type DiagnosisResult } from '../engine/evaluate';
import { repository } from '../storage/repository';

export function useAssessments(): Assessment[] {
  return useSyncExternalStore(
    (cb) => repository.subscribe(cb),
    () => repository.list(),
    () => [],
  );
}

export function useAssessment(id: string | undefined): Assessment | undefined {
  const list = useAssessments();
  return id ? list.find((a) => a.id === id) : undefined;
}

export function useDiagnosis(assessment: Assessment | undefined): DiagnosisResult | undefined {
  return useMemo(() => (assessment ? evaluate(MODEL, assessment) : undefined), [assessment]);
}

export type SaveResult = { ok: true } | { ok: false; message: string };

/** Guarda una evaluación actualizando su marca de tiempo. Devuelve error legible si el almacenamiento falla. */
export function saveAssessment(next: Assessment): SaveResult {
  try {
    repository.save({ ...next, updatedAt: new Date().toISOString() });
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: 'No se pudo guardar en el almacenamiento local del navegador (puede estar lleno o bloqueado). Exporte la evaluación en JSON para no perder datos.',
    };
  }
}
