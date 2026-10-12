/**
 * Exportación e importación de evaluaciones en JSON, con validación de estructura y versión.
 */
import type {
  ActionStatus,
  Answer,
  Assessment,
  AssessmentModel,
  EvidenceStatus,
  OrgContext,
  Priority,
  RoadmapAdjustment,
} from '../model/types';
import { isScaleValue, parseVersion, versionsCompatible } from './scoring';

export const EXPORT_FORMAT = 'convergencia-evaluacion';
export const EXPORT_FORMAT_VERSION = 1;
const MAX_TEXT = 4000;
const MAX_FILE_CHARS = 2_000_000;

export interface ExportEnvelope {
  format: typeof EXPORT_FORMAT;
  formatVersion: number;
  exportedAt: string;
  modelId: string;
  modelVersion: string;
  assessment: Assessment;
}

export function exportAssessment(assessment: Assessment, now = new Date()): string {
  const envelope: ExportEnvelope = {
    format: EXPORT_FORMAT,
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    modelId: assessment.modelId,
    modelVersion: assessment.modelVersion,
    assessment,
  };
  return JSON.stringify(envelope, null, 2);
}

export type ImportResult =
  | { ok: true; assessment: Assessment; warnings: string[] }
  | { ok: false; errors: string[] };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length <= MAX_TEXT;
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);
const EVIDENCE: EvidenceStatus[] = ['declarada', 'referenciada', 'verificada'];
const ACTION_STATUS: ActionStatus[] = ['pendiente', 'en-curso', 'completada'];
const PRIORITIES: Priority[] = ['critica', 'alta', 'media', 'baja'];
const LEVELS = ['baja', 'media', 'alta'];
const AI_LEVELS = ['ninguno', 'individual', 'pilotos', 'operacion'];

function validateContext(v: unknown, errors: string[]): OrgContext | null {
  if (!isObj(v)) {
    errors.push('Falta el contexto organizacional.');
    return null;
  }
  const strFields = [
    'organizationName',
    'sector',
    'country',
    'sizeRange',
    'respondentRole',
    'assessmentDate',
    'otherObjective',
    'otherProcess',
    'otherTools',
  ];
  for (const f of strFields) if (!isStr(v[f])) errors.push(`Contexto: el campo «${f}» debe ser texto.`);
  for (const f of ['objectives', 'processes', 'tools', 'sensitiveData']) {
    if (!isStrArray(v[f])) errors.push(`Contexto: el campo «${f}» debe ser una lista de textos.`);
  }
  if (v.modality !== 'autodiagnostico' && v.modality !== 'acompanada') errors.push('Contexto: modalidad no válida.');
  for (const f of ['budgetConstraint', 'capacityConstraint', 'timeConstraint']) {
    if (!LEVELS.includes(v[f] as string)) errors.push(`Contexto: el campo «${f}» no es válido.`);
  }
  if (!AI_LEVELS.includes(v.aiUseLevel as string)) errors.push('Contexto: nivel de uso de IA no válido.');
  // Se copian solo los campos conocidos para descartar cualquier dato adicional.
  return {
    organizationName: v.organizationName,
    sector: v.sector,
    country: v.country,
    sizeRange: v.sizeRange,
    respondentRole: v.respondentRole,
    assessmentDate: v.assessmentDate,
    modality: v.modality,
    objectives: v.objectives,
    otherObjective: v.otherObjective,
    processes: v.processes,
    otherProcess: v.otherProcess,
    tools: v.tools,
    otherTools: v.otherTools,
    budgetConstraint: v.budgetConstraint,
    capacityConstraint: v.capacityConstraint,
    timeConstraint: v.timeConstraint,
    aiUseLevel: v.aiUseLevel,
    sensitiveData: v.sensitiveData,
  } as OrgContext;
}

function validateAnswers(model: AssessmentModel, v: unknown, errors: string[], warnings: string[]) {
  if (!isObj(v)) {
    errors.push('Las respuestas deben ser un objeto indexado por identificador de pregunta.');
    return {};
  }
  const out: Record<string, Answer> = {};
  for (const [id, raw] of Object.entries(v)) {
    const question = model.questions.find((q) => q.id === id);
    if (!question) {
      errors.push(`Respuesta para una pregunta inexistente en el modelo: «${id}».`);
      continue;
    }
    if (!isObj(raw)) {
      errors.push(`${id}: la respuesta no tiene un formato válido.`);
      continue;
    }
    if (raw.kind !== 'valor' && raw.kind !== 'no-se' && raw.kind !== 'no-aplica') {
      errors.push(`${id}: tipo de respuesta no válido.`);
      continue;
    }
    if (raw.kind === 'valor' && !isScaleValue(raw.value)) {
      errors.push(`${id}: el valor debe ser un entero entre 0 y 4.`);
      continue;
    }
    if (!EVIDENCE.includes(raw.evidenceStatus as EvidenceStatus)) {
      errors.push(`${id}: estado de evidencia no válido.`);
      continue;
    }
    for (const f of ['naJustification', 'comment', 'evidenceRef']) {
      if (raw[f] !== undefined && !isStr(raw[f])) errors.push(`${id}: el campo «${f}» debe ser texto (máx. ${MAX_TEXT} caracteres).`);
    }
    if (raw.kind === 'no-aplica' && !question.naCondition) {
      warnings.push(`${id}: «No aplica» no está permitido en esta pregunta; se tratará como pendiente.`);
    }
    out[id] = {
      kind: raw.kind,
      value: raw.kind === 'valor' ? (raw.value as Answer['value']) : undefined,
      naJustification: raw.naJustification as string | undefined,
      comment: raw.comment as string | undefined,
      evidenceStatus: raw.evidenceStatus as EvidenceStatus,
      evidenceRef: raw.evidenceRef as string | undefined,
    };
  }
  return out;
}

function validateAdjustments(v: unknown, errors: string[]): Record<string, RoadmapAdjustment> {
  if (v === undefined) return {};
  if (!isObj(v)) {
    errors.push('Los ajustes de la hoja de ruta no tienen un formato válido.');
    return {};
  }
  const out: Record<string, RoadmapAdjustment> = {};
  for (const [id, raw] of Object.entries(v)) {
    if (!isObj(raw)) {
      errors.push(`Ajuste «${id}» no válido.`);
      continue;
    }
    if (raw.status !== undefined && !ACTION_STATUS.includes(raw.status as ActionStatus)) errors.push(`Ajuste «${id}»: estado no válido.`);
    if (raw.priority !== undefined && !PRIORITIES.includes(raw.priority as Priority)) errors.push(`Ajuste «${id}»: prioridad no válida.`);
    if (raw.stage !== undefined && ![30, 60, 90].includes(raw.stage as number)) errors.push(`Ajuste «${id}»: etapa no válida.`);
    if (raw.owner !== undefined && !isStr(raw.owner)) errors.push(`Ajuste «${id}»: responsable no válido.`);
    if (raw.note !== undefined && !isStr(raw.note)) errors.push(`Ajuste «${id}»: nota no válida.`);
    out[id] = {
      status: raw.status as ActionStatus | undefined,
      priority: raw.priority as Priority | undefined,
      stage: raw.stage as RoadmapAdjustment['stage'],
      owner: raw.owner as string | undefined,
      note: raw.note as string | undefined,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString(),
    };
  }
  return out;
}

/** Valida e interpreta un archivo exportado. No modifica el almacenamiento. */
export function parseImport(text: string, model: AssessmentModel): ImportResult {
  if (text.length > MAX_FILE_CHARS) return { ok: false, errors: ['El archivo es demasiado grande para ser una evaluación.'] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['El archivo no contiene JSON válido.'] };
  }
  if (!isObj(data)) return { ok: false, errors: ['El contenido no es un objeto JSON.'] };
  if (data.format !== EXPORT_FORMAT) return { ok: false, errors: ['El archivo no es una evaluación exportada desde ConvergencIA.'] };
  if (data.formatVersion !== EXPORT_FORMAT_VERSION) {
    return { ok: false, errors: [`Versión de formato no soportada: ${String(data.formatVersion)}.`] };
  }
  const errors: string[] = [];
  const warnings: string[] = [];
  const a = data.assessment;
  if (!isObj(a)) return { ok: false, errors: ['Falta la evaluación dentro del archivo.'] };

  if (a.modelId !== model.id) return { ok: false, errors: [`El archivo usa otro modelo de evaluación («${String(a.modelId)}»).`] };
  if (typeof a.modelVersion !== 'string' || !parseVersion(a.modelVersion)) {
    return { ok: false, errors: ['La versión del modelo no es válida.'] };
  }
  if (!versionsCompatible(a.modelVersion, model.version)) {
    return {
      ok: false,
      errors: [
        `La evaluación usa la versión ${a.modelVersion} del modelo, incompatible con la versión vigente ${model.version}. No se puede importar sin una conversión metodológica.`,
      ],
    };
  }
  if (a.modelVersion !== model.version) {
    warnings.push(`La evaluación usa la versión ${a.modelVersion}; se calculará con la versión compatible ${model.version}.`);
  }
  for (const f of ['id', 'organizationId', 'createdAt', 'updatedAt']) {
    if (typeof a[f] !== 'string' || (a[f] as string).length === 0 || (a[f] as string).length > 200) {
      errors.push(`El campo «${f}» falta o no es válido.`);
    }
  }
  if (a.status !== 'borrador' && a.status !== 'finalizada') errors.push('Estado de la evaluación no válido.');
  const context = validateContext(a.context, errors);
  const answers = validateAnswers(model, a.answers, errors, warnings);
  const roadmapAdjustments = validateAdjustments(a.roadmapAdjustments, errors);
  if (errors.length || !context) return { ok: false, errors };

  return {
    ok: true,
    warnings,
    assessment: {
      id: a.id as string,
      organizationId: a.organizationId as string,
      modelId: a.modelId as string,
      modelVersion: a.modelVersion as string,
      createdAt: a.createdAt as string,
      updatedAt: a.updatedAt as string,
      status: a.status as Assessment['status'],
      isDemo: a.isDemo === true ? true : undefined,
      context,
      answers,
      roadmapAdjustments,
    },
  };
}
