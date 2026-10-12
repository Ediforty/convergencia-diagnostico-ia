/**
 * Tipos del modelo de evaluación y de las evaluaciones.
 * Este módulo no depende de la interfaz: lo usan el motor, el almacenamiento y la UI.
 */

export type DimensionId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8';

/** Escala de respuesta 0–4. */
export type ScaleValue = 0 | 1 | 2 | 3 | 4;

/** Estado de la evidencia asociada a una respuesta. */
export type EvidenceStatus = 'declarada' | 'referenciada' | 'verificada';

export type Horizon = 30 | 60 | 90;
export type Effort = 'bajo' | 'medio' | 'alto';

export interface Dimension {
  id: DimensionId;
  name: string;
  shortName: string;
  description: string;
}

/** Condición de exclusión justificada que habilita la opción «No aplica». */
export interface NaCondition {
  id: string;
  description: string;
}

export interface Question {
  /** Identificador estable, p. ej. «D6.02». No cambia entre versiones menores. */
  id: string;
  dimension: DimensionId;
  text: string;
  help: string;
  /** Anclajes conductuales para los valores 0, 1, 2, 3 y 4. */
  options: [string, string, string, string, string];
  weight: number;
  naCondition?: NaCondition;
  evidence: string;
  /** Reglas de recomendación que evalúan esta pregunta. */
  ruleIds: string[];
}

export interface RecommendationRule {
  id: string;
  dimension: DimensionId;
  questionIds: string[];
  /** Se activa si alguna pregunta vinculada tiene un valor ≤ threshold. */
  threshold: ScaleValue;
  /** Regla asociada a fundamentos críticos (seguridad, privacidad, supervisión humana). */
  critical: boolean;
  title: string;
  finding: string;
  action: string;
  expectedResult: string;
  owner: string;
  effort: Effort;
  /** Otras reglas cuyo cumplimiento conviene antes de ejecutar esta acción. */
  dependsOn: string[];
  indicator: string;
  horizon: Horizon;
}

export type AlertCategory = 'seguridad' | 'privacidad' | 'supervision';

export interface AlertRule {
  id: string;
  category: AlertCategory;
  questionId: string;
  /** Se activa si el valor respondido es ≤ threshold. */
  threshold: ScaleValue;
  title: string;
  risk: string;
  deploymentLimitation: string;
}

export interface UseCaseDependency {
  questionId: string;
  min: ScaleValue;
  critical: boolean;
  reason: string;
}

export interface UseCase {
  id: string;
  name: string;
  description: string;
  examples: string;
  /** Procesos del contexto que justifican el caso. */
  processes: string[];
  /** Objetivos estratégicos del contexto que justifican el caso. */
  objectives: string[];
  /** Valor base orientativo (1–5) antes de ajustar por contexto. */
  baseValue: number;
  baseValueRationale: string;
  /** Dimensiones cuya puntuación aproxima la viabilidad. */
  viabilityDimensions: DimensionId[];
  effort: Effort;
  handlesPersonalData: boolean;
  dependencies: UseCaseDependency[];
  pilotIndicator: string;
}

export interface MaturityLevel {
  id: string;
  label: string;
  /** Límite inferior inclusivo. */
  min: number;
  description: string;
}

export interface IndexDefinition {
  id: 'tecnologica' | 'preparacion-ia' | 'adopcion-ia';
  name: string;
  description: string;
  dimensions: DimensionId[];
  /** Pesos por dimensión; en la versión 1 son iguales. */
  weights: Partial<Record<DimensionId, number>>;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export interface AssessmentModel {
  id: string;
  name: string;
  version: string;
  publishedAt: string;
  disclaimer: string;
  scale: { value: ScaleValue; label: string; description: string }[];
  coverageThreshold: number;
  dimensions: Dimension[];
  questions: Question[];
  rules: RecommendationRule[];
  alerts: AlertRule[];
  useCases: UseCase[];
  levels: MaturityLevel[];
  indices: IndexDefinition[];
  priorityWeights: { value: number; viability: number; urgency: number };
  changelog: ChangelogEntry[];
}

/* ------------------------------------------------------------------ */
/* Evaluaciones                                                         */
/* ------------------------------------------------------------------ */

export type AnswerKind = 'valor' | 'no-se' | 'no-aplica';

export interface Answer {
  kind: AnswerKind;
  value?: ScaleValue;
  /** Obligatoria cuando kind = «no-aplica». */
  naJustification?: string;
  comment?: string;
  evidenceStatus: EvidenceStatus;
  /** Referencia a la evidencia (nombre de documento, ubicación, observación). Sin archivos. */
  evidenceRef?: string;
}

export type BudgetConstraint = 'baja' | 'media' | 'alta';

export interface OrgContext {
  organizationName: string;
  sector: string;
  country: string;
  sizeRange: string;
  respondentRole: string;
  assessmentDate: string;
  modality: 'autodiagnostico' | 'acompanada';
  objectives: string[];
  otherObjective: string;
  processes: string[];
  otherProcess: string;
  tools: string[];
  otherTools: string;
  budgetConstraint: BudgetConstraint;
  capacityConstraint: BudgetConstraint;
  timeConstraint: BudgetConstraint;
  aiUseLevel: 'ninguno' | 'individual' | 'pilotos' | 'operacion';
  sensitiveData: string[];
}

export type ActionStatus = 'pendiente' | 'en-curso' | 'completada';
export type Priority = 'critica' | 'alta' | 'media' | 'baja';

/** Ajuste del consultor sobre una acción de la hoja de ruta. No modifica la recomendación original. */
export interface RoadmapAdjustment {
  status?: ActionStatus;
  priority?: Priority;
  stage?: Horizon;
  owner?: string;
  note?: string;
  updatedAt: string;
}

export interface Assessment {
  id: string;
  organizationId: string;
  modelId: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
  status: 'borrador' | 'finalizada';
  isDemo?: boolean;
  context: OrgContext;
  answers: Record<string, Answer>;
  roadmapAdjustments: Record<string, RoadmapAdjustment>;
}
