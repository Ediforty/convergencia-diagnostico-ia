import type { AssessmentModel, Dimension } from './types';
import { D1_QUESTIONS, D2_QUESTIONS } from './questions/d1-d2';
import { D3_QUESTIONS, D4_QUESTIONS } from './questions/d3-d4';
import { D5_QUESTIONS, D6_QUESTIONS } from './questions/d5-d6';
import { D7_QUESTIONS, D8_QUESTIONS } from './questions/d7-d8';
import { ALERTS, RULES } from './rules';
import { USE_CASES } from './useCases';

export const DIMENSIONS: Dimension[] = [
  {
    id: 'D1',
    name: 'Estrategia y liderazgo',
    shortName: 'Estrategia',
    description: 'Objetivos, patrocinio directivo, inversión, responsables, prioridades, indicadores y seguimiento.',
  },
  {
    id: 'D2',
    name: 'Infraestructura y herramientas',
    shortName: 'Infraestructura',
    description: 'Equipos, conectividad, disponibilidad, mantenimiento, colaboración, nube y capacidad de crecimiento.',
  },
  {
    id: 'D3',
    name: 'Procesos y automatización',
    shortName: 'Procesos',
    description: 'Documentación, estandarización, tareas repetitivas, integración, trazabilidad, automatización y medición.',
  },
  {
    id: 'D4',
    name: 'Datos y analítica',
    shortName: 'Datos',
    description: 'Calidad, acceso, responsables, integración, indicadores, uso para decisiones y ciclo de vida de los datos.',
  },
  {
    id: 'D5',
    name: 'Personas y gestión del cambio',
    shortName: 'Personas',
    description: 'Competencias digitales, capacitación, capacidades de IA, participación, adopción y acompañamiento.',
  },
  {
    id: 'D6',
    name: 'Ciberseguridad y resiliencia',
    shortName: 'Ciberseguridad',
    description: 'Control de acceso, autenticación, actualizaciones, copias verificadas, incidentes y continuidad.',
  },
  {
    id: 'D7',
    name: 'Gobernanza y uso responsable de IA',
    shortName: 'Gobernanza IA',
    description: 'Políticas, responsables, privacidad, proveedores, supervisión humana, validación y riesgos.',
  },
  {
    id: 'D8',
    name: 'Adopción y valor de IA',
    shortName: 'Adopción IA',
    description: 'Casos de uso, experimentación, integración operativa, resultados, costos, calidad y escalamiento.',
  },
];

/**
 * Configuración versionada del modelo. Política de versiones:
 * - Cambio MAYOR: cambian preguntas, pesos, fórmulas o umbrales → las puntuaciones no son comparables.
 * - Cambio MENOR: cambian textos, ayudas, recomendaciones o casos de uso sin alterar el cálculo → comparables.
 */
export const MODEL: AssessmentModel = {
  id: 'convergencia-madurez-ia',
  name: 'Modelo ConvergencIA de Madurez Tecnológica e IA',
  version: '1.0.0',
  publishedAt: '2026-10-12',
  disclaimer:
    'Modelo propio de diagnóstico orientativo. No es una certificación ni una evaluación oficial de ningún estándar o norma. Los umbrales de clasificación son una convención del modelo, no el resultado de una validación científica.',
  scale: [
    { value: 0, label: 'Inexistente', description: 'La práctica no existe.' },
    { value: 1, label: 'Informal', description: 'Informal o aislada; depende de personas concretas.' },
    { value: 2, label: 'Definida', description: 'Definida y parcialmente implementada.' },
    { value: 3, label: 'Implementada', description: 'Implementada, con responsables y seguimiento.' },
    { value: 4, label: 'Optimizada', description: 'Medida y mejorada sistemáticamente.' },
  ],
  coverageThreshold: 70,
  dimensions: DIMENSIONS,
  questions: [
    ...D1_QUESTIONS,
    ...D2_QUESTIONS,
    ...D3_QUESTIONS,
    ...D4_QUESTIONS,
    ...D5_QUESTIONS,
    ...D6_QUESTIONS,
    ...D7_QUESTIONS,
    ...D8_QUESTIONS,
  ],
  rules: RULES,
  alerts: ALERTS,
  useCases: USE_CASES,
  levels: [
    { id: 'inicial', label: 'Inicial', min: 0, description: 'Prácticas inexistentes o aisladas.' },
    { id: 'en-desarrollo', label: 'En desarrollo', min: 20, description: 'Prácticas informales con avances puntuales.' },
    { id: 'definida', label: 'Definida', min: 40, description: 'Prácticas definidas, implementación parcial.' },
    { id: 'gestionada', label: 'Gestionada', min: 60, description: 'Prácticas implementadas con responsables y seguimiento.' },
    { id: 'optimizada', label: 'Optimizada', min: 80, description: 'Prácticas medidas y mejoradas sistemáticamente.' },
  ],
  indices: [
    {
      id: 'tecnologica',
      name: 'Madurez tecnológica',
      description: 'Promedio simple de D1 a D6: fundamentos de estrategia, infraestructura, procesos, datos, personas y seguridad.',
      dimensions: ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'],
      weights: { D1: 1, D2: 1, D3: 1, D4: 1, D5: 1, D6: 1 },
    },
    {
      id: 'preparacion-ia',
      name: 'Preparación para IA',
      description: 'Promedio simple de D1, D4, D5, D6 y D7: condiciones para adoptar IA de forma útil y segura.',
      dimensions: ['D1', 'D4', 'D5', 'D6', 'D7'],
      weights: { D1: 1, D4: 1, D5: 1, D6: 1, D7: 1 },
    },
    {
      id: 'adopcion-ia',
      name: 'Adopción y valor de IA',
      description: 'Resultado de D8: uso efectivo de la IA y valor demostrado.',
      dimensions: ['D8'],
      weights: { D8: 1 },
    },
  ],
  priorityWeights: { value: 0.4, viability: 0.35, urgency: 0.25 },
  changelog: [
    {
      version: '1.0.0',
      date: '2026-10-12',
      changes: [
        'Versión inicial: 8 dimensiones, 64 preguntas, 33 reglas de recomendación, 6 alertas críticas y 7 casos de uso.',
      ],
    },
  ],
};

export function getQuestion(id: string) {
  return MODEL.questions.find((q) => q.id === id);
}

export function getDimension(id: string) {
  return MODEL.dimensions.find((d) => d.id === id);
}
