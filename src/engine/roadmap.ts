/**
 * Hoja de ruta 30/60/90 días derivada de recomendaciones y casos de uso.
 * La versión original es determinista; los ajustes del consultor se guardan aparte.
 */
import type { ActionStatus, Horizon, Priority, RoadmapAdjustment } from '../model/types';
import { priorityRank, type Recommendation, type UseCaseEvaluation } from './diagnosis';

export interface RoadmapAction {
  id: string;
  stage: Horizon;
  title: string;
  deliverable: string;
  owner: string;
  dependency: string;
  indicator: string;
  priority: Priority;
  origin: { type: 'base' | 'recomendacion' | 'caso-uso'; refId?: string };
  rationale: string;
}

export interface EffectiveAction extends RoadmapAction {
  original: RoadmapAction;
  status: ActionStatus;
  note?: string;
  adjusted: boolean;
  adjustedFields: ('stage' | 'priority' | 'owner')[];
}

const MAX_PILOTS = 2;

export function buildRoadmap(recommendations: Recommendation[], useCases: UseCaseEvaluation[]): RoadmapAction[] {
  const actions: RoadmapAction[] = [
    {
      id: 'BASE-VALIDAR',
      stage: 30,
      title: 'Validar las brechas del diagnóstico con los responsables de cada dimensión',
      deliverable: 'Acta de validación con hallazgos confirmados, corregidos o descartados.',
      owner: 'Patrocinador directivo con el consultor o responsable del diagnóstico',
      dependency: 'Ninguna.',
      indicator: 'Porcentaje de hallazgos validados.',
      priority: 'alta',
      origin: { type: 'base' },
      rationale: 'Toda acción posterior depende de que las brechas estén confirmadas.',
    },
    {
      id: 'BASE-RESPONSABLES',
      stage: 30,
      title: 'Asignar responsables nominales y fechas a las acciones de la hoja de ruta',
      deliverable: 'Hoja de ruta con responsables y fechas acordadas.',
      owner: 'Gerencia general',
      dependency: 'Validación de brechas.',
      indicator: 'Porcentaje de acciones con responsable y fecha.',
      priority: 'alta',
      origin: { type: 'base' },
      rationale: 'Sin responsables, las acciones no se ejecutan.',
    },
  ];

  for (const rec of recommendations) {
    const openDeps = rec.dependencies.filter((d) => d.open);
    actions.push({
      id: `REC-${rec.id}`,
      stage: rec.horizon,
      title: rec.title,
      deliverable: rec.type === 'verificacion' ? rec.expectedResult : `${rec.expectedResult} (acción: ${rec.action})`,
      owner: rec.owner,
      dependency: openDeps.length ? openDeps.map((d) => `${d.ruleId} — ${d.title}`).join('; ') : 'Ninguna pendiente.',
      indicator: rec.indicator,
      priority: rec.priority,
      origin: { type: 'recomendacion', refId: rec.id },
      rationale: rec.priorityReason,
    });
  }

  const relevant = useCases.filter((u) => u.relevant);
  const pilotable = relevant.filter((u) => u.status !== 'bloqueado').slice(0, MAX_PILOTS);
  for (const uc of pilotable) {
    const unmet = uc.dependencies.filter((d) => !d.met);
    actions.push({
      id: `UC-${uc.useCase.id}-PILOTO`,
      stage: 60,
      title: `Ejecutar piloto controlado: ${uc.useCase.name}`,
      deliverable: 'Ficha de piloto (alcance, datos permitidos, revisor humano, línea base, criterios de éxito) e informe de resultados.',
      owner: 'Líder del proceso relacionado',
      dependency: unmet.length
        ? `Resolver antes: ${unmet.map((d) => d.dependency.questionId).join(', ')}.`
        : 'Dependencias del caso cumplidas.',
      indicator: uc.useCase.pilotIndicator,
      priority: uc.status === 'apto-piloto' ? 'alta' : 'media',
      origin: { type: 'caso-uso', refId: uc.useCase.id },
      rationale: `Prioridad orientativa ${uc.priority.toFixed(2)} (${uc.priorityFormula}). ${uc.statusReason}`,
    });
  }
  if (pilotable.length === 0) {
    const blocked = relevant.find((u) => u.status === 'bloqueado');
    if (blocked) {
      const crit = blocked.dependencies.filter((d) => !d.met && d.dependency.critical);
      actions.push({
        id: `UC-${blocked.useCase.id}-PREPARAR`,
        stage: 60,
        title: `Resolver las dependencias críticas del caso «${blocked.useCase.name}» antes de pilotear`,
        deliverable: 'Dependencias críticas resueltas y verificadas.',
        owner: 'Responsable de tecnología con responsable de IA',
        dependency: crit.map((d) => `${d.dependency.questionId}: ${d.dependency.reason}`).join(' '),
        indicator: 'Dependencias críticas cumplidas frente a las identificadas.',
        priority: 'alta',
        origin: { type: 'caso-uso', refId: blocked.useCase.id },
        rationale: 'Es el caso de mayor prioridad, pero una dependencia crítica impide recomendar su despliegue.',
      });
    }
  }
  if (pilotable.length > 0) {
    actions.push({
      id: 'BASE-FORMACION-PILOTO',
      stage: 60,
      title: 'Formar al equipo que participa en el piloto',
      deliverable: 'Sesión práctica sobre el uso del caso, sus límites y el procedimiento de revisión humana.',
      owner: 'Talento humano con el líder del piloto',
      dependency: 'Piloto definido.',
      indicator: 'Porcentaje de participantes formados antes de iniciar.',
      priority: 'alta',
      origin: { type: 'base' },
      rationale: 'El resultado del piloto depende de que las personas sepan usar y verificar la herramienta.',
    });
    actions.push({
      id: 'BASE-DECISION-PILOTO',
      stage: 90,
      title: 'Evaluar los resultados del piloto y decidir: ampliar, corregir o detener',
      deliverable: 'Acta de decisión con resultados frente a la línea base, costos registrados y lecciones aprendidas.',
      owner: 'Patrocinador directivo',
      dependency: 'Informe de resultados del piloto.',
      indicator: 'Decisión documentada en la fecha prevista.',
      priority: 'alta',
      origin: { type: 'base' },
      rationale: 'Un piloto sin decisión explícita tiende a prolongarse sin evidencia de valor.',
    });
  }
  actions.push({
    id: 'BASE-REDIAGNOSTICO',
    stage: 90,
    title: 'Repetir el diagnóstico con la misma versión del modelo y comparar resultados',
    deliverable: 'Nueva evaluación y comparación temporal.',
    owner: 'Responsable de transformación digital',
    dependency: 'Acciones de 30 y 60 días ejecutadas o reprogramadas.',
    indicator: 'Variación por dimensión frente a la evaluación anterior.',
    priority: 'media',
    origin: { type: 'base' },
    rationale: 'Permite verificar el avance con el mismo instrumento.',
  });

  return actions.sort(
    (a, b) => a.stage - b.stage || priorityRank(a.priority) - priorityRank(b.priority) || a.id.localeCompare(b.id),
  );
}

/** Combina la hoja de ruta original con los ajustes del consultor sin perder la versión original. */
export function applyAdjustments(
  actions: RoadmapAction[],
  adjustments: Record<string, RoadmapAdjustment>,
): EffectiveAction[] {
  return actions.map((original) => {
    const adj = adjustments[original.id];
    const adjustedFields: EffectiveAction['adjustedFields'] = [];
    if (adj?.stage && adj.stage !== original.stage) adjustedFields.push('stage');
    if (adj?.priority && adj.priority !== original.priority) adjustedFields.push('priority');
    if (adj?.owner && adj.owner.trim() && adj.owner !== original.owner) adjustedFields.push('owner');
    return {
      ...original,
      stage: adjustedFields.includes('stage') ? (adj!.stage as Horizon) : original.stage,
      priority: adjustedFields.includes('priority') ? (adj!.priority as Priority) : original.priority,
      owner: adjustedFields.includes('owner') ? (adj!.owner as string) : original.owner,
      original,
      status: adj?.status ?? 'pendiente',
      note: adj?.note,
      adjusted: adjustedFields.length > 0 || !!adj?.note,
      adjustedFields,
    };
  });
}
