import type { Assessment, AssessmentModel } from '../model/types';
import {
  evaluateAlerts,
  evaluateRecommendations,
  evaluateUseCases,
  findStrengths,
  type AlertResult,
  type Recommendation,
  type Strength,
  type UseCaseEvaluation,
} from './diagnosis';
import { applyAdjustments, buildRoadmap, type EffectiveAction, type RoadmapAction } from './roadmap';
import { resolveAnswer, scoreDimension, scoreIndex, type DimensionResult, type IndexResult } from './scoring';

export interface DiagnosisResult {
  modelVersion: string;
  dimensions: DimensionResult[];
  indices: IndexResult[];
  alerts: AlertResult[];
  strengths: Strength[];
  recommendations: Recommendation[];
  useCases: UseCaseEvaluation[];
  roadmap: RoadmapAction[];
  effectiveRoadmap: EffectiveAction[];
  overall: {
    answered: number;
    total: number;
    unknown: number;
    excluded: number;
    pending: number;
    evidence: { declarada: number; referenciada: number; verificada: number };
  };
  issues: { questionId: string; issue: string }[];
}

/** Calcula el diagnóstico completo. Función pura: mismo insumo, mismo resultado. */
export function evaluate(model: AssessmentModel, assessment: Assessment): DiagnosisResult {
  const { answers, context } = assessment;
  const dimensions = model.dimensions.map((d) => scoreDimension(model, d.id, answers));
  const indices = model.indices.map((def) => scoreIndex(model, def, dimensions));
  const alerts = evaluateAlerts(model, answers, context);
  const recommendations = evaluateRecommendations(model, answers, alerts);
  const useCases = evaluateUseCases(model, answers, context, dimensions);
  const roadmap = buildRoadmap(recommendations, useCases);
  const effectiveRoadmap = applyAdjustments(roadmap, assessment.roadmapAdjustments ?? {});

  const overall = {
    answered: 0,
    total: model.questions.length,
    unknown: 0,
    excluded: 0,
    pending: 0,
    evidence: { declarada: 0, referenciada: 0, verificada: 0 },
  };
  for (const d of dimensions) {
    overall.answered += d.counts.scored;
    overall.unknown += d.counts.unknown;
    overall.excluded += d.counts.excluded;
    overall.pending += d.counts.pending;
    overall.evidence.declarada += d.evidence.declarada;
    overall.evidence.referenciada += d.evidence.referenciada;
    overall.evidence.verificada += d.evidence.verificada;
  }
  const issues = model.questions
    .map((q) => ({ questionId: q.id, issue: resolveAnswer(q, answers[q.id]).issue }))
    .filter((x): x is { questionId: string; issue: string } => !!x.issue);

  return {
    modelVersion: model.version,
    dimensions,
    indices,
    alerts,
    strengths: findStrengths(model, answers),
    recommendations,
    useCases,
    roadmap,
    effectiveRoadmap,
    overall,
    issues,
  };
}
