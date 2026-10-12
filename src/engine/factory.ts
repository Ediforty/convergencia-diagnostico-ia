import type { Assessment, AssessmentModel, OrgContext } from '../model/types';

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // Alternativa para contextos sin randomUUID (por ejemplo, archivos abiertos sin servidor).
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function emptyContext(): OrgContext {
  return {
    organizationName: '',
    sector: '',
    country: '',
    sizeRange: '',
    respondentRole: '',
    assessmentDate: todayIso(),
    modality: 'autodiagnostico',
    objectives: [],
    otherObjective: '',
    processes: [],
    otherProcess: '',
    tools: [],
    otherTools: '',
    budgetConstraint: 'media',
    capacityConstraint: 'media',
    timeConstraint: 'media',
    aiUseLevel: 'ninguno',
    sensitiveData: [],
  };
}

export function createAssessment(model: AssessmentModel, organizationId?: string, context?: OrgContext): Assessment {
  const now = new Date().toISOString();
  return {
    id: newId(),
    organizationId: organizationId ?? newId(),
    modelId: model.id,
    modelVersion: model.version,
    createdAt: now,
    updatedAt: now,
    status: 'borrador',
    context: context ? { ...context, assessmentDate: todayIso() } : emptyContext(),
    answers: {},
    roadmapAdjustments: {},
  };
}

/** Nueva evaluación de la misma organización: conserva el contexto, no las respuestas. */
export function createFollowUp(model: AssessmentModel, previous: Assessment): Assessment {
  const next = createAssessment(model, previous.organizationId, previous.context);
  if (previous.isDemo) next.isDemo = true;
  return next;
}
