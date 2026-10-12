/**
 * Motor de puntuación determinista. Funciones puras, sin dependencias de la interfaz.
 *
 * Puntuación de dimensión = 100 × Σ(peso × valor) / (4 × Σ peso de preguntas puntuadas)
 * Cobertura de dimensión  = Σ peso puntuado / Σ peso aplicable × 100
 *   - «No sé» y pendientes están en el denominador de cobertura, no en el de puntuación.
 *   - Las exclusiones justificadas («No aplica») no están en ningún denominador.
 */
import type {
  Answer,
  AssessmentModel,
  DimensionId,
  EvidenceStatus,
  IndexDefinition,
  MaturityLevel,
  Question,
  ScaleValue,
} from '../model/types';

/** Tolerancia para errores de coma flotante al comparar con umbrales. */
export const EPSILON = 1e-9;

export type ResolvedState = 'puntuada' | 'no-se' | 'excluida' | 'pendiente';

export interface ResolvedAnswer {
  questionId: string;
  state: ResolvedState;
  value?: ScaleValue;
  evidenceStatus?: EvidenceStatus;
  /** Motivo por el que una respuesta registrada no se pudo usar. */
  issue?: string;
}

export function isScaleValue(v: unknown): v is ScaleValue {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 4;
}

/** Interpreta una respuesta registrada según las reglas del modelo. */
export function resolveAnswer(question: Question, answer: Answer | undefined): ResolvedAnswer {
  const base = { questionId: question.id, evidenceStatus: answer?.evidenceStatus };
  if (!answer) return { ...base, state: 'pendiente' };
  switch (answer.kind) {
    case 'valor':
      if (isScaleValue(answer.value)) return { ...base, state: 'puntuada', value: answer.value };
      return { ...base, state: 'pendiente', issue: 'Valor fuera de la escala 0–4.' };
    case 'no-se':
      return { ...base, state: 'no-se' };
    case 'no-aplica':
      if (!question.naCondition) {
        return { ...base, state: 'pendiente', issue: 'Esta pregunta no admite «No aplica».' };
      }
      if (!answer.naJustification || answer.naJustification.trim().length === 0) {
        return { ...base, state: 'pendiente', issue: '«No aplica» requiere una justificación.' };
      }
      return { ...base, state: 'excluida' };
    default:
      return { ...base, state: 'pendiente', issue: 'Tipo de respuesta no reconocido.' };
  }
}

export type DimensionStatus = 'completa' | 'provisional' | 'sin-informacion';

export interface QuestionTrace extends ResolvedAnswer {
  weight: number;
  /** Aporte al numerador: peso × valor (solo preguntas puntuadas). */
  weightedPoints: number;
}

export interface DimensionResult {
  dimension: DimensionId;
  score: number | null;
  coverage: number | null;
  status: DimensionStatus;
  level: MaturityLevel | null;
  scoredWeight: number;
  applicableWeight: number;
  counts: { total: number; scored: number; unknown: number; pending: number; excluded: number };
  evidence: Record<EvidenceStatus, number>;
  questions: QuestionTrace[];
}

export function classify(value: number, levels: MaturityLevel[]): MaturityLevel {
  const sorted = [...levels].sort((a, b) => b.min - a.min);
  for (const level of sorted) {
    if (value + EPSILON >= level.min) return level;
  }
  return sorted[sorted.length - 1];
}

export function scoreDimension(
  model: AssessmentModel,
  dimension: DimensionId,
  answers: Record<string, Answer>,
): DimensionResult {
  const questions = model.questions.filter((q) => q.dimension === dimension);
  let points = 0;
  let scoredWeight = 0;
  let applicableWeight = 0;
  const counts = { total: questions.length, scored: 0, unknown: 0, pending: 0, excluded: 0 };
  const evidence: Record<EvidenceStatus, number> = { declarada: 0, referenciada: 0, verificada: 0 };
  const traces: QuestionTrace[] = [];

  for (const question of questions) {
    const resolved = resolveAnswer(question, answers[question.id]);
    let weightedPoints = 0;
    switch (resolved.state) {
      case 'puntuada':
        weightedPoints = question.weight * (resolved.value as number);
        points += weightedPoints;
        scoredWeight += question.weight;
        applicableWeight += question.weight;
        counts.scored += 1;
        evidence[resolved.evidenceStatus ?? 'declarada'] += 1;
        break;
      case 'no-se':
        applicableWeight += question.weight;
        counts.unknown += 1;
        break;
      case 'pendiente':
        applicableWeight += question.weight;
        counts.pending += 1;
        break;
      case 'excluida':
        counts.excluded += 1;
        break;
    }
    traces.push({ ...resolved, weight: question.weight, weightedPoints });
  }

  const score = scoredWeight > 0 ? (100 * points) / (4 * scoredWeight) : null;
  const coverage = applicableWeight > 0 ? (100 * scoredWeight) / applicableWeight : null;
  let status: DimensionStatus;
  if (score === null) status = 'sin-informacion';
  else if ((coverage ?? 0) + EPSILON < model.coverageThreshold) status = 'provisional';
  else status = 'completa';

  return {
    dimension,
    score,
    coverage,
    status,
    level: score === null ? null : classify(score, model.levels),
    scoredWeight,
    applicableWeight,
    counts,
    evidence,
    questions: traces,
  };
}

export type IndexStatus = 'completo' | 'provisional' | 'no-calculable';

export interface IndexResult {
  id: IndexDefinition['id'];
  name: string;
  value: number | null;
  status: IndexStatus;
  level: MaturityLevel | null;
  /** Dimensiones sin información suficiente que impiden el cálculo. */
  missingDimensions: DimensionId[];
  /** Dimensiones con cobertura inferior al umbral. */
  provisionalDimensions: DimensionId[];
  components: { dimension: DimensionId; score: number | null; weight: number }[];
}

export function scoreIndex(
  model: AssessmentModel,
  definition: IndexDefinition,
  dimensionResults: DimensionResult[],
): IndexResult {
  const missing: DimensionId[] = [];
  const provisional: DimensionId[] = [];
  const components = definition.dimensions.map((id) => {
    const result = dimensionResults.find((r) => r.dimension === id);
    const weight = definition.weights[id] ?? 1;
    if (!result || result.status === 'sin-informacion') missing.push(id);
    else if (result.status === 'provisional') provisional.push(id);
    return { dimension: id, score: result?.score ?? null, weight };
  });

  if (missing.length > 0) {
    return {
      id: definition.id,
      name: definition.name,
      value: null,
      status: 'no-calculable',
      level: null,
      missingDimensions: missing,
      provisionalDimensions: provisional,
      components,
    };
  }
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const value = components.reduce((s, c) => s + (c.score as number) * c.weight, 0) / totalWeight;
  return {
    id: definition.id,
    name: definition.name,
    value,
    status: provisional.length > 0 ? 'provisional' : 'completo',
    level: classify(value, model.levels),
    missingDimensions: [],
    provisionalDimensions: provisional,
    components,
  };
}

/** Formatea una puntuación con un decimal y coma decimal. */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(1).replace('.', ',');
}

/** Interpreta la versión «MAYOR.MENOR.PARCHE». */
export function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/** Dos versiones son comparables si comparten versión mayor. */
export function versionsCompatible(a: string, b: string): boolean {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  return !!va && !!vb && va.major === vb.major;
}
