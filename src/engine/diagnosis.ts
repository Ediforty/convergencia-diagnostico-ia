/**
 * Alertas críticas, fortalezas, recomendaciones y casos de uso.
 * Todo resultado conserva las preguntas que lo originan para ser trazable.
 */
import { labelOf, OBJECTIVES, PERSONAL_DATA_CATEGORIES, PROCESSES } from '../model/catalogs';
import type {
  AlertRule,
  Answer,
  AssessmentModel,
  DimensionId,
  Effort,
  Horizon,
  OrgContext,
  Priority,
  RecommendationRule,
  ScaleValue,
  UseCase,
  UseCaseDependency,
} from '../model/types';
import { resolveAnswer, type DimensionResult, type ResolvedAnswer } from './scoring';

export function resolveById(model: AssessmentModel, answers: Record<string, Answer>, id: string): ResolvedAnswer {
  const question = model.questions.find((q) => q.id === id);
  if (!question) throw new Error(`Pregunta desconocida: ${id}`);
  return resolveAnswer(question, answers[id]);
}

/* ------------------------------------------------------------------ */
/* Alertas                                                              */
/* ------------------------------------------------------------------ */

export type AlertStatus = 'activa' | 'por-verificar';

export interface AlertResult {
  rule: AlertRule;
  status: AlertStatus;
  /** Valor observado si la pregunta está puntuada. */
  value?: ScaleValue;
  reason: string;
  contextNote?: string;
}

export function evaluateAlerts(
  model: AssessmentModel,
  answers: Record<string, Answer>,
  context: OrgContext,
): AlertResult[] {
  const handlesPersonal = context.sensitiveData.some((c) => PERSONAL_DATA_CATEGORIES.includes(c));
  const results: AlertResult[] = [];
  for (const rule of model.alerts) {
    const r = resolveById(model, answers, rule.questionId);
    const contextNote =
      rule.category === 'privacidad' && handlesPersonal
        ? 'El contexto declara tratamiento de datos personales o sensibles, lo que aumenta la exposición.'
        : undefined;
    if (r.state === 'puntuada' && (r.value as number) <= rule.threshold) {
      results.push({
        rule,
        status: 'activa',
        value: r.value,
        reason: `Respuesta ${r.value} en ${rule.questionId} (umbral de alerta: ≤ ${rule.threshold}).`,
        contextNote,
      });
    } else if (r.state === 'no-se' || r.state === 'pendiente') {
      results.push({
        rule,
        status: 'por-verificar',
        reason:
          r.state === 'no-se'
            ? `Se respondió «No sé» en ${rule.questionId}; se trata como riesgo hasta verificarlo.`
            : `${rule.questionId} está sin responder; se trata como riesgo hasta verificarlo.`,
        contextNote,
      });
    }
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* Fortalezas                                                           */
/* ------------------------------------------------------------------ */

export interface Strength {
  questionId: string;
  dimension: DimensionId;
  value: ScaleValue;
  weight: number;
}

/** Prácticas con valor ≥ 3, ordenadas por valor y peso. */
export function findStrengths(model: AssessmentModel, answers: Record<string, Answer>): Strength[] {
  const out: Strength[] = [];
  for (const q of model.questions) {
    const r = resolveAnswer(q, answers[q.id]);
    if (r.state === 'puntuada' && (r.value as number) >= 3) {
      out.push({ questionId: q.id, dimension: q.dimension, value: r.value as ScaleValue, weight: q.weight });
    }
  }
  return out.sort((a, b) => b.value - a.value || b.weight - a.weight || a.questionId.localeCompare(b.questionId));
}

/* ------------------------------------------------------------------ */
/* Recomendaciones                                                      */
/* ------------------------------------------------------------------ */

export type RecommendationType = 'brecha' | 'verificacion';

export interface RecommendationEvidence {
  questionId: string;
  state: ResolvedAnswer['state'];
  value?: ScaleValue;
  /** Esta pregunta activó la regla. */
  triggers: boolean;
}

export interface Recommendation {
  id: string;
  ruleId: string;
  type: RecommendationType;
  dimension: DimensionId;
  title: string;
  finding: string;
  evidence: RecommendationEvidence[];
  action: string;
  expectedResult: string;
  owner: string;
  effort: Effort;
  dependencies: { ruleId: string; title: string; open: boolean }[];
  indicator: string;
  horizon: Horizon;
  priority: Priority;
  priorityReason: string;
  alertIds: string[];
}

const PRIORITY_RANK: Record<Priority, number> = { critica: 0, alta: 1, media: 2, baja: 3 };

export function priorityRank(p: Priority): number {
  return PRIORITY_RANK[p];
}

export function evaluateRecommendations(
  model: AssessmentModel,
  answers: Record<string, Answer>,
  alerts: AlertResult[],
): Recommendation[] {
  const triggered = new Map<string, RecommendationType>();
  const evidenceByRule = new Map<string, RecommendationEvidence[]>();

  for (const rule of model.rules) {
    const evidence: RecommendationEvidence[] = rule.questionIds.map((id) => {
      const r = resolveById(model, answers, id);
      const triggers = r.state === 'puntuada' && (r.value as number) <= rule.threshold;
      return { questionId: id, state: r.state, value: r.value, triggers };
    });
    evidenceByRule.set(rule.id, evidence);
    if (evidence.some((e) => e.triggers)) triggered.set(rule.id, 'brecha');
    else if (evidence.some((e) => e.state === 'no-se')) triggered.set(rule.id, 'verificacion');
  }

  const recs: Recommendation[] = [];
  for (const rule of model.rules) {
    const type = triggered.get(rule.id);
    if (!type) continue;
    const evidence = evidenceByRule.get(rule.id) as RecommendationEvidence[];
    const linkedAlerts = alerts.filter((a) => rule.questionIds.includes(a.rule.questionId));
    const dependencies = rule.dependsOn.map((depId) => {
      const dep = model.rules.find((r) => r.id === depId) as RecommendationRule;
      return { ruleId: depId, title: dep.title, open: triggered.has(depId) };
    });
    recs.push(type === 'brecha' ? buildGap(rule, evidence, linkedAlerts, dependencies) : buildVerification(rule, evidence));
  }

  return recs.sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      a.horizon - b.horizon ||
      a.ruleId.localeCompare(b.ruleId),
  );
}

function buildGap(
  rule: RecommendationRule,
  evidence: RecommendationEvidence[],
  linkedAlerts: AlertResult[],
  dependencies: Recommendation['dependencies'],
): Recommendation {
  const triggers = evidence.filter((e) => e.triggers);
  const minValue = Math.min(...triggers.map((e) => e.value as number));
  const activeAlerts = linkedAlerts.filter((a) => a.status === 'activa');
  let priority: Priority;
  let reason: string;
  if (activeAlerts.length > 0) {
    priority = 'critica';
    reason = `Vinculada a alerta crítica (${activeAlerts.map((a) => a.rule.id).join(', ')}); bloquea despliegues de IA dependientes.`;
  } else if (rule.critical) {
    priority = 'alta';
    reason = `Fundamento crítico de seguridad, privacidad o supervisión con respuesta ${minValue} (umbral de la regla: ≤ ${rule.threshold}).`;
  } else if (minValue === 0) {
    priority = 'alta';
    reason = 'Al menos una práctica evaluada es inexistente (valor 0).';
  } else {
    priority = 'media';
    reason = `Práctica informal o aislada (valor mínimo ${minValue}).`;
  }
  return {
    id: rule.id,
    ruleId: rule.id,
    type: 'brecha',
    dimension: rule.dimension,
    title: rule.title,
    finding: rule.finding,
    evidence,
    action: rule.action,
    expectedResult: rule.expectedResult,
    owner: rule.owner,
    effort: rule.effort,
    dependencies,
    indicator: rule.indicator,
    horizon: rule.horizon,
    priority,
    priorityReason: reason,
    alertIds: linkedAlerts.map((a) => a.rule.id),
  };
}

function buildVerification(
  rule: RecommendationRule,
  evidence: RecommendationEvidence[],
): Recommendation {
  const unknown = evidence.filter((e) => e.state === 'no-se').map((e) => e.questionId);
  return {
    id: `VER-${rule.id}`,
    ruleId: rule.id,
    type: 'verificacion',
    dimension: rule.dimension,
    title: `Verificar: ${rule.title.charAt(0).toLowerCase()}${rule.title.slice(1)}`,
    finding: `Información pendiente de verificar: se respondió «No sé» en ${unknown.join(', ')}. No se registra una brecha observada.`,
    evidence: evidence.map((e) => ({ ...e, triggers: e.state === 'no-se' })),
    action: `Confirmar con ${rule.owner.toLowerCase()} el estado real de las prácticas evaluadas en ${unknown.join(', ')}, registrar la referencia de evidencia y actualizar el diagnóstico.`,
    expectedResult: 'Hallazgo confirmado o descartado con evidencia referenciada.',
    owner: rule.owner,
    effort: 'bajo',
    dependencies: [],
    indicator: 'Preguntas verificadas con evidencia referenciada.',
    horizon: 30,
    priority: rule.critical ? 'alta' : 'media',
    priorityReason: rule.critical
      ? 'La información faltante corresponde a un fundamento crítico; mientras no se verifique se trata como riesgo.'
      : 'La información faltante impide confirmar o descartar una brecha.',
    alertIds: [],
  };
}

/* ------------------------------------------------------------------ */
/* Casos de uso                                                         */
/* ------------------------------------------------------------------ */

export interface ScoreComponent {
  score: number;
  explanation: string[];
}

export interface DependencyCheck {
  dependency: UseCaseDependency;
  state: ResolvedAnswer['state'];
  value?: ScaleValue;
  met: boolean;
}

export type UseCaseStatus = 'bloqueado' | 'condicionado' | 'apto-piloto';

export interface UseCaseEvaluation {
  useCase: UseCase;
  relevant: boolean;
  relevanceReasons: string[];
  value: ScoreComponent;
  viability: ScoreComponent;
  urgency: ScoreComponent;
  priority: number;
  priorityFormula: string;
  dependencies: DependencyCheck[];
  status: UseCaseStatus;
  statusReason: string;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

export function evaluateUseCases(
  model: AssessmentModel,
  answers: Record<string, Answer>,
  context: OrgContext,
  dimensions: DimensionResult[],
): UseCaseEvaluation[] {
  const w = model.priorityWeights;
  const results = model.useCases.map((uc) => {
    const processMatch = uc.processes.filter((p) => context.processes.includes(p));
    const objectiveMatch = uc.objectives.filter((o) => context.objectives.includes(o));
    const relevanceReasons: string[] = [];
    if (processMatch.length) relevanceReasons.push(
        `Procesos a mejorar declarados: ${processMatch.map((p) => labelOf(PROCESSES, p)).join('; ')}.`,
      );
    if (objectiveMatch.length) relevanceReasons.push(
        `Objetivos estratégicos declarados: ${objectiveMatch.map((o) => labelOf(OBJECTIVES, o)).join('; ')}.`,
      );

    // Valor
    const valueExpl = [`Valor base orientativo ${uc.baseValue}: ${uc.baseValueRationale}`];
    let value = uc.baseValue;
    if (objectiveMatch.length) {
      value += 2;
      valueExpl.push('+2 porque el caso apoya un objetivo estratégico declarado.');
    }
    value = clamp(value, 1, 5);
    valueExpl.push(`Resultado acotado a la escala 1–5: ${value}.`);

    // Viabilidad
    const viabExpl: string[] = [];
    const dimScores = uc.viabilityDimensions
      .map((id) => dimensions.find((d) => d.dimension === id))
      .filter((d): d is DimensionResult => !!d && d.score !== null);
    let viability: number;
    if (dimScores.length === 0) {
      viability = 1;
      viabExpl.push(`Sin información en ${uc.viabilityDimensions.join(', ')}: se asigna el mínimo (1).`);
    } else {
      const avg = dimScores.reduce((s, d) => s + (d.score as number), 0) / dimScores.length;
      viability = 1 + (4 * avg) / 100;
      viabExpl.push(
        `Promedio de ${dimScores.map((d) => `${d.dimension} (${d.score!.toFixed(1)})`).join(', ')} = ${avg.toFixed(1)}; 1 + 4 × ${avg.toFixed(1)} / 100 = ${viability.toFixed(1)}.`,
      );
      const missing = uc.viabilityDimensions.filter((id) => !dimScores.some((d) => d.dimension === id));
      if (missing.length) viabExpl.push(`Sin información en ${missing.join(', ')}; no se incluyen en el promedio.`);
    }
    if (uc.effort !== 'bajo' && (context.budgetConstraint === 'alta' || context.capacityConstraint === 'alta')) {
      viability -= 1;
      viabExpl.push('−1 por restricción alta de presupuesto o capacidades y esfuerzo no bajo.');
    }
    viability = round1(clamp(viability, 1, 5));

    // Urgencia
    const urgExpl = ['Urgencia base 2.'];
    let urgency = 2;
    if (processMatch.length) {
      urgency += 2;
      urgExpl.push('+2 porque el proceso relacionado está declarado como proceso a mejorar.');
    }
    if (context.aiUseLevel === 'individual') {
      urgency += 1;
      urgExpl.push('+1 porque existe uso informal de IA que conviene encauzar con un caso gobernado.');
    }
    urgency = clamp(urgency, 1, 5);

    const priority = round2(w.value * value + w.viability * viability + w.urgency * urgency);

    // Dependencias
    const deps: DependencyCheck[] = uc.dependencies.map((dep) => {
      const r = resolveById(model, answers, dep.questionId);
      const met = r.state === 'excluida' || (r.state === 'puntuada' && (r.value as number) >= dep.min);
      return { dependency: dep, state: r.state, value: r.value, met };
    });
    const criticalUnmet = deps.filter((d) => !d.met && d.dependency.critical);
    const otherUnmet = deps.filter((d) => !d.met && !d.dependency.critical);
    let status: UseCaseStatus;
    let statusReason: string;
    if (criticalUnmet.length) {
      status = 'bloqueado';
      statusReason = `Despliegue bloqueado por dependencias críticas no cumplidas: ${criticalUnmet.map((d) => d.dependency.questionId).join(', ')}. Solo se recomienda preparar las condiciones.`;
    } else if (otherUnmet.length) {
      status = 'condicionado';
      statusReason = `Piloto condicionado a resolver: ${otherUnmet.map((d) => d.dependency.questionId).join(', ')}.`;
    } else {
      status = 'apto-piloto';
      statusReason = 'Cumple las dependencias; apto para un piloto controlado, no para despliegue directo.';
    }

    return {
      useCase: uc,
      relevant: processMatch.length > 0 || objectiveMatch.length > 0,
      relevanceReasons,
      value: { score: value, explanation: valueExpl },
      viability: { score: viability, explanation: viabExpl },
      urgency: { score: urgency, explanation: urgExpl },
      priority,
      priorityFormula: `${w.value} × ${value} + ${w.viability} × ${viability} + ${w.urgency} × ${urgency} = ${priority.toFixed(2)}`,
      dependencies: deps,
      status,
      statusReason,
    };
  });
  return results.sort(
    (a, b) => Number(b.relevant) - Number(a.relevant) || b.priority - a.priority || a.useCase.id.localeCompare(b.useCase.id),
  );
}
