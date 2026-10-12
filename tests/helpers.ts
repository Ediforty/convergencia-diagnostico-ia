import { createAssessment } from '../src/engine/factory';
import { MODEL } from '../src/model';
import type { Answer, Assessment, AssessmentModel, DimensionId, ScaleValue } from '../src/model/types';

export const val = (value: ScaleValue, evidenceStatus: Answer['evidenceStatus'] = 'declarada'): Answer => ({
  kind: 'valor',
  value,
  evidenceStatus,
});
export const unknown = (): Answer => ({ kind: 'no-se', evidenceStatus: 'declarada' });
export const na = (naJustification = 'Restricción documentada'): Answer => ({
  kind: 'no-aplica',
  naJustification,
  evidenceStatus: 'declarada',
});

export function idsOf(dimension: DimensionId, model: AssessmentModel = MODEL): string[] {
  return model.questions.filter((q) => q.dimension === dimension).map((q) => q.id);
}

/** Responde todas las preguntas con el mismo valor. */
export function allAnswers(value: ScaleValue, model: AssessmentModel = MODEL): Record<string, Answer> {
  return Object.fromEntries(model.questions.map((q) => [q.id, val(value)]));
}

export function assessmentWith(answers: Record<string, Answer>, patch: Partial<Assessment> = {}): Assessment {
  const a = createAssessment(MODEL);
  return { ...a, answers, ...patch };
}

/** Modelo de prueba con pesos unitarios para controlar exactamente la aritmética. */
export function unitWeightModel(): AssessmentModel {
  return { ...MODEL, questions: MODEL.questions.map((q) => ({ ...q, weight: 1 })) };
}
