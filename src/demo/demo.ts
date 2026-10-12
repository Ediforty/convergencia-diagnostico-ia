/**
 * Organización FICTICIA de demostración. Sus respuestas son inventadas para mostrar
 * el funcionamiento de la herramienta y no representan resultados de ninguna organización real.
 */
import type { Answer, Assessment, AssessmentModel, EvidenceStatus, OrgContext, ScaleValue } from '../model/types';

export const DEMO_ORGANIZATION_ID = 'demo-organizacion-ficticia';

const DEMO_CONTEXT: OrgContext = {
  organizationName: 'Distribuidora Ejemplo S.A.S. (DEMO FICTICIA)',
  sector: 'comercio',
  country: 'País de ejemplo',
  sizeRange: '51-200',
  respondentRole: 'consultor',
  assessmentDate: '2026-03-16',
  modality: 'acompanada',
  objectives: ['eficiencia', 'experiencia-cliente', 'decisiones-datos'],
  otherObjective: '',
  processes: ['facturacion', 'atencion-cliente', 'reportes'],
  otherProcess: '',
  tools: ['hojas-calculo', 'correo-corporativo', 'erp', 'facturacion-electronica', 'mensajeria', 'ia-generativa'],
  otherTools: '',
  budgetConstraint: 'media',
  capacityConstraint: 'alta',
  timeConstraint: 'media',
  aiUseLevel: 'individual',
  sensitiveData: ['personales', 'financieros'],
};

/**
 * Codificación compacta por dimensión (8 caracteres, uno por pregunta):
 * dígito 0–4 = valor; «?» = No sé; «n» = No aplica (con justificación); «-» = sin responder.
 * Evidencia: «d» declarada, «r» referenciada, «v» verificada.
 */
interface DemoSpec {
  values: Record<string, string>;
  evidence: Record<string, string>;
}

const FIRST: DemoSpec = {
  values: {
    D1: '21101011',
    D2: '22121n12',
    D3: '11102001',
    D4: '11110201',
    D5: '01100110',
    D6: '11?20111',
    D7: '00000-00',
    D8: '10010000',
  },
  evidence: {
    D1: 'rddddddd',
    D2: 'rrdrdddd',
    D3: 'dddddddd',
    D4: 'dddddrdd',
    D5: 'dddddddd',
    D6: 'dddddddd',
    D7: 'dddddddd',
    D8: 'dddddddd',
  },
};

const SECOND: DemoSpec = {
  values: {
    D1: '32212222',
    D2: '22232n22',
    D3: '22213112',
    D4: '21221201',
    D5: '12211121',
    D6: '32221212',
    D7: '21212110',
    D8: '21020000',
  },
  evidence: {
    D1: 'vrrdrrdv',
    D2: 'rrdrdddr',
    D3: 'rrdddddd',
    D4: 'rddddrdd',
    D5: 'drddddrd',
    D6: 'vvdvrddd',
    D7: 'vdrdrddd',
    D8: 'dddddddd',
  },
};

const NA_JUSTIFICATION =
  'DEMO: el contrato con el principal cliente (ficticio) exige alojamiento local de la información; restricción documentada.';

function buildAnswers(model: AssessmentModel, spec: DemoSpec): Record<string, Answer> {
  const answers: Record<string, Answer> = {};
  for (const dim of model.dimensions) {
    const qs = model.questions.filter((q) => q.dimension === dim.id);
    const values = spec.values[dim.id];
    const ev = spec.evidence[dim.id];
    qs.forEach((q, i) => {
      const code = values[i];
      const evidenceStatus: EvidenceStatus = ev[i] === 'v' ? 'verificada' : ev[i] === 'r' ? 'referenciada' : 'declarada';
      if (code === '-') return;
      if (code === '?') answers[q.id] = { kind: 'no-se', evidenceStatus: 'declarada' };
      else if (code === 'n') answers[q.id] = { kind: 'no-aplica', naJustification: NA_JUSTIFICATION, evidenceStatus: 'referenciada' };
      else
        answers[q.id] = {
          kind: 'valor',
          value: Number(code) as ScaleValue,
          evidenceStatus,
          evidenceRef: evidenceStatus !== 'declarada' ? 'DEMO: documento ficticio de referencia' : undefined,
        };
    });
  }
  return answers;
}

/** Crea las dos evaluaciones de demostración (marzo y septiembre de 2026, ficticias). */
export function createDemoAssessments(model: AssessmentModel): Assessment[] {
  const base = {
    organizationId: DEMO_ORGANIZATION_ID,
    modelId: model.id,
    modelVersion: model.version,
    isDemo: true as const,
    roadmapAdjustments: {},
  };
  return [
    {
      ...base,
      id: 'demo-evaluacion-1',
      createdAt: '2026-03-16T10:00:00.000Z',
      updatedAt: '2026-03-16T12:00:00.000Z',
      status: 'finalizada',
      context: { ...DEMO_CONTEXT, assessmentDate: '2026-03-16' },
      answers: buildAnswers(model, FIRST),
    },
    {
      ...base,
      id: 'demo-evaluacion-2',
      createdAt: '2026-09-14T10:00:00.000Z',
      updatedAt: '2026-09-14T12:00:00.000Z',
      status: 'finalizada',
      context: { ...DEMO_CONTEXT, assessmentDate: '2026-09-14', aiUseLevel: 'pilotos' },
      answers: buildAnswers(model, SECOND),
      roadmapAdjustments: {
        'BASE-VALIDAR': { status: 'completada', updatedAt: '2026-09-20T10:00:00.000Z' },
        'BASE-RESPONSABLES': { status: 'en-curso', updatedAt: '2026-09-20T10:00:00.000Z' },
      },
    },
  ];
}
