import type { Assessment, AssessmentModel, DimensionId } from '../model/types';
import { evaluate } from './evaluate';
import { versionsCompatible, type DimensionStatus, type IndexStatus } from './scoring';

export interface ComparisonRow<TId extends string, TStatus extends string> {
  id: TId;
  name: string;
  before: number | null;
  after: number | null;
  beforeStatus: TStatus;
  afterStatus: TStatus;
  /** Diferencia after − before; null si alguno no tiene valor. */
  delta: number | null;
}

export type ComparisonResult =
  | { compatible: false; reason: string }
  | {
      compatible: true;
      earlier: Assessment;
      later: Assessment;
      dimensions: ComparisonRow<DimensionId, DimensionStatus>[];
      indices: ComparisonRow<string, IndexStatus>[];
      notes: string[];
    };

/** Fecha efectiva de una evaluación para ordenar en el tiempo. */
export function assessmentDate(a: Assessment): string {
  return a.context.assessmentDate || a.createdAt.slice(0, 10);
}

/**
 * Compara dos evaluaciones de la misma organización.
 * Solo compara si ambas usan el mismo modelo y la misma versión mayor que el modelo vigente.
 */
export function compareAssessments(model: AssessmentModel, a: Assessment, b: Assessment): ComparisonResult {
  if (a.id === b.id) return { compatible: false, reason: 'Se seleccionó la misma evaluación dos veces.' };
  if (a.organizationId !== b.organizationId) {
    return { compatible: false, reason: 'Las evaluaciones pertenecen a organizaciones distintas.' };
  }
  if (a.modelId !== model.id || b.modelId !== model.id) {
    return { compatible: false, reason: 'Al menos una evaluación usa un modelo de evaluación distinto.' };
  }
  if (!versionsCompatible(a.modelVersion, b.modelVersion)) {
    return {
      compatible: false,
      reason: `Versiones metodológicas incompatibles (${a.modelVersion} y ${b.modelVersion}): cambió la versión mayor, por lo que preguntas, pesos o fórmulas pueden diferir.`,
    };
  }
  if (!versionsCompatible(a.modelVersion, model.version)) {
    return {
      compatible: false,
      reason: `Las evaluaciones usan la versión ${a.modelVersion}, incompatible con el modelo vigente ${model.version}.`,
    };
  }
  const [earlier, later] = assessmentDate(a) <= assessmentDate(b) ? [a, b] : [b, a];
  const re = evaluate(model, earlier);
  const rl = evaluate(model, later);
  const delta = (x: number | null, y: number | null) => (x === null || y === null ? null : y - x);

  const dimensions = model.dimensions.map((d) => {
    const x = re.dimensions.find((r) => r.dimension === d.id)!;
    const y = rl.dimensions.find((r) => r.dimension === d.id)!;
    return {
      id: d.id,
      name: d.name,
      before: x.score,
      after: y.score,
      beforeStatus: x.status,
      afterStatus: y.status,
      delta: delta(x.score, y.score),
    };
  });
  const indices = re.indices.map((x) => {
    const y = rl.indices.find((r) => r.id === x.id)!;
    return {
      id: x.id,
      name: x.name,
      before: x.value,
      after: y.value,
      beforeStatus: x.status,
      afterStatus: y.status,
      delta: delta(x.value, y.value),
    };
  });
  const notes: string[] = [];
  if (earlier.modelVersion !== later.modelVersion) {
    notes.push(
      `Versiones distintas pero compatibles (${earlier.modelVersion} → ${later.modelVersion}): solo cambiaron textos o recomendaciones, no el cálculo.`,
    );
  }
  if ([...dimensions, ...indices].some((r) => r.beforeStatus !== r.afterStatus)) {
    notes.push('Algunos resultados cambiaron de estado (completo, provisional o sin información); interprete esas diferencias con cautela.');
  }
  return { compatible: true, earlier, later, dimensions, indices, notes };
}
