import type { DimensionId, NaCondition, Question } from '../types';

interface QuestionInput {
  id: string;
  text: string;
  help: string;
  options: [string, string, string, string, string];
  evidence: string;
  rules: string[];
  weight?: number;
  na?: NaCondition;
}

/** Construye una pregunta derivando la dimensión de su identificador («D4.02» → D4). */
export function q(input: QuestionInput): Question {
  const dimension = input.id.split('.')[0] as DimensionId;
  return {
    id: input.id,
    dimension,
    text: input.text,
    help: input.help,
    options: input.options,
    weight: input.weight ?? 1,
    naCondition: input.na,
    evidence: input.evidence,
    ruleIds: input.rules,
  };
}
