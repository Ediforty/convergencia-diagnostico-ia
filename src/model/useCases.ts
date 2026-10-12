import type { UseCase, UseCaseDependency } from './types';

/** Dependencias comunes a todo caso de IA con efecto sobre personas o decisiones. */
const GOVERNANCE_DEPS: UseCaseDependency[] = [
  {
    questionId: 'D7.05',
    min: 2,
    critical: true,
    reason: 'Debe existir al menos una regla de revisión humana de los resultados.',
  },
  {
    questionId: 'D7.01',
    min: 2,
    critical: false,
    reason: 'Conviene una política escrita de uso de IA antes del piloto.',
  },
  {
    questionId: 'D5.03',
    min: 2,
    critical: false,
    reason: 'Las personas participantes deben conocer los límites de la IA.',
  },
];

const PRIVACY_DEP: UseCaseDependency = {
  questionId: 'D7.03',
  min: 2,
  critical: true,
  reason: 'El caso procesa datos personales o confidenciales: se requiere una regla escrita sobre qué datos ingresar.',
};

const ACCESS_DEPS: UseCaseDependency[] = [
  {
    questionId: 'D6.01',
    min: 2,
    critical: true,
    reason: 'El caso accede a sistemas o repositorios internos: se requieren permisos por rol.',
  },
  {
    questionId: 'D6.02',
    min: 2,
    critical: true,
    reason: 'El caso accede a sistemas o repositorios internos: se requiere verificación en dos pasos al menos en los sistemas críticos.',
  },
];

/**
 * Catálogo de casos de uso. Los valores base son orientativos y se explican;
 * no representan estimaciones de ahorro ni de retorno financiero.
 */
export const USE_CASES: UseCase[] = [
  {
    id: 'UC-FACTURAS',
    name: 'Extracción de datos de facturas',
    description:
      'Leer facturas de proveedores (PDF o imagen) y proponer los campos para su registro contable, con validación humana.',
    examples: 'Proveedor, NIT o identificación fiscal, fecha, valores e impuestos para precargar el sistema contable.',
    processes: ['facturacion', 'compras'],
    objectives: ['eficiencia', 'control-costos'],
    baseValue: 3,
    baseValueRationale: 'Tarea de alto volumen y reglas claras; el beneficio depende del volumen real de facturas.',
    viabilityDimensions: ['D3', 'D4'],
    effort: 'medio',
    handlesPersonalData: true,
    dependencies: [
      ...GOVERNANCE_DEPS,
      PRIVACY_DEP,
      { questionId: 'D3.01', min: 2, critical: false, reason: 'El proceso de registro de facturas debe estar documentado.' },
      { questionId: 'D4.01', min: 2, critical: false, reason: 'Se requieren reglas mínimas de calidad en datos de proveedores.' },
      {
        questionId: 'D6.05',
        min: 2,
        critical: true,
        reason: 'El caso precarga datos en el sistema contable: debe haberse comprobado al menos una restauración desde copias.',
      },
    ],
    pilotIndicator: 'Tiempo por factura y porcentaje de campos corregidos por la persona revisora, frente a la línea base.',
  },
  {
    id: 'UC-DOCUMENTAL',
    name: 'Gestión documental asistida',
    description: 'Clasificar, etiquetar y buscar documentos internos con apoyo de IA.',
    examples: 'Clasificar contratos por tipo y vencimiento; encontrar documentos por contenido y no solo por nombre.',
    processes: ['documentacion'],
    objectives: ['eficiencia', 'conocimiento', 'cumplimiento'],
    baseValue: 3,
    baseValueRationale: 'Reduce tiempos de búsqueda; su valor crece con el volumen documental.',
    viabilityDimensions: ['D2', 'D4'],
    effort: 'medio',
    handlesPersonalData: true,
    dependencies: [
      ...GOVERNANCE_DEPS,
      PRIVACY_DEP,
      ...ACCESS_DEPS,
      { questionId: 'D4.07', min: 2, critical: false, reason: 'Conviene definir reglas de conservación antes de indexar documentos.' },
    ],
    pilotIndicator: 'Tiempo promedio para encontrar un documento y porcentaje de clasificaciones correctas en una muestra.',
  },
  {
    id: 'UC-ASISTENTE',
    name: 'Asistente de conocimiento interno',
    description:
      'Responder preguntas del personal con base en manuales, políticas y procedimientos aprobados, citando la fuente.',
    examples: 'Consultas sobre procedimientos, políticas de talento humano o instructivos técnicos.',
    processes: ['talento-humano', 'documentacion', 'produccion'],
    objectives: ['conocimiento', 'eficiencia'],
    baseValue: 2,
    baseValueRationale: 'Útil si existe documentación vigente; sin ella el asistente no tiene fuente confiable.',
    viabilityDimensions: ['D3', 'D4', 'D5'],
    effort: 'medio',
    handlesPersonalData: false,
    dependencies: [
      ...GOVERNANCE_DEPS,
      ...ACCESS_DEPS,
      { questionId: 'D3.01', min: 3, critical: true, reason: 'El asistente necesita documentación vigente y con responsable como fuente.' },
    ],
    pilotIndicator: 'Porcentaje de respuestas correctas y con fuente en una muestra revisada por expertos.',
  },
  {
    id: 'UC-COMERCIAL',
    name: 'Apoyo a la gestión comercial',
    description: 'Preparar borradores de propuestas, resúmenes de clientes y seguimientos comerciales para revisión del vendedor.',
    examples: 'Borrador de propuesta a partir de una plantilla; resumen de interacciones antes de una reunión.',
    processes: ['ventas'],
    objectives: ['crecimiento-ventas', 'experiencia-cliente'],
    baseValue: 3,
    baseValueRationale: 'Libera tiempo comercial; el efecto en ventas debe medirse en el piloto, no suponerse.',
    viabilityDimensions: ['D4', 'D5'],
    effort: 'bajo',
    handlesPersonalData: true,
    dependencies: [
      ...GOVERNANCE_DEPS,
      PRIVACY_DEP,
      { questionId: 'D4.01', min: 2, critical: false, reason: 'Los datos de clientes deben tener calidad mínima.' },
    ],
    pilotIndicator: 'Tiempo de preparación de propuestas y tasa de borradores usados sin reescritura mayor.',
  },
  {
    id: 'UC-ADMINISTRATIVO',
    name: 'Automatización administrativa con IA',
    description: 'Redactar respuestas a correos frecuentes, resumir reuniones y preparar reportes rutinarios para revisión.',
    examples: 'Respuestas modelo a solicitudes frecuentes; actas preliminares de reuniones; reportes semanales.',
    processes: ['administracion', 'reportes'],
    objectives: ['eficiencia'],
    baseValue: 2,
    baseValueRationale: 'Beneficio distribuido en muchas tareas pequeñas; fácil de pilotear.',
    viabilityDimensions: ['D3', 'D5'],
    effort: 'bajo',
    handlesPersonalData: true,
    dependencies: [
      ...GOVERNANCE_DEPS,
      PRIVACY_DEP,
      { questionId: 'D3.03', min: 2, critical: false, reason: 'Conviene listar las tareas repetitivas antes de elegir cuáles apoyar.' },
    ],
    pilotIndicator: 'Horas semanales dedicadas a las tareas seleccionadas frente a la línea base.',
  },
  {
    id: 'UC-ATENCION',
    name: 'Respuestas sugeridas en atención al cliente',
    description: 'Proponer respuestas a consultas frecuentes que un agente revisa antes de enviar.',
    examples: 'Estado de pedidos, preguntas frecuentes, instrucciones de uso.',
    processes: ['atencion-cliente'],
    objectives: ['experiencia-cliente', 'eficiencia'],
    baseValue: 3,
    baseValueRationale: 'Efecto directo en tiempos de respuesta; requiere control estricto porque llega a clientes.',
    viabilityDimensions: ['D3', 'D4', 'D7'],
    effort: 'medio',
    handlesPersonalData: true,
    dependencies: [
      ...GOVERNANCE_DEPS,
      PRIVACY_DEP,
      { questionId: 'D7.06', min: 2, critical: true, reason: 'Las respuestas llegan a clientes: se requieren pruebas con criterios definidos.' },
      { questionId: 'D3.01', min: 2, critical: false, reason: 'El proceso de atención debe estar documentado.' },
    ],
    pilotIndicator: 'Tiempo de primera respuesta y porcentaje de respuestas sugeridas aprobadas sin cambios sustanciales.',
  },
  {
    id: 'UC-ANALITICA',
    name: 'Análisis asistido de reportes e indicadores',
    description: 'Resumir y explicar variaciones en reportes existentes para apoyar las reuniones de decisión.',
    examples: 'Explicación preliminar de variaciones de ventas por producto; resumen de indicadores del mes.',
    processes: ['reportes', 'inventario'],
    objectives: ['decisiones-datos'],
    baseValue: 2,
    baseValueRationale: 'Depende de que existan indicadores confiables; la IA no corrige datos de mala calidad.',
    viabilityDimensions: ['D4'],
    effort: 'medio',
    handlesPersonalData: false,
    dependencies: [
      ...GOVERNANCE_DEPS,
      { questionId: 'D4.01', min: 3, critical: true, reason: 'Sin datos confiables, el análisis produciría conclusiones erróneas.' },
      { questionId: 'D4.05', min: 2, critical: false, reason: 'Se requieren reportes periódicos como insumo.' },
    ],
    pilotIndicator: 'Porcentaje de explicaciones validadas como correctas por el responsable del indicador.',
  },
];
