import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model';
import { parseVersion } from '../src/engine/scoring';

describe('integridad del modelo de evaluación', () => {
  it('tiene 8 dimensiones y 64 preguntas, 8 por dimensión', () => {
    expect(MODEL.dimensions).toHaveLength(8);
    expect(MODEL.questions).toHaveLength(64);
    for (const d of MODEL.dimensions) {
      expect(MODEL.questions.filter((q) => q.dimension === d.id)).toHaveLength(8);
    }
  });

  it('usa identificadores de pregunta únicos y estables con el formato Dn.nn', () => {
    const ids = MODEL.questions.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of MODEL.questions) {
      expect(q.id).toMatch(/^D[1-8]\.0[1-8]$/);
      expect(q.id.startsWith(q.dimension)).toBe(true);
    }
  });

  it('define cinco anclajes distintos y no vacíos por pregunta', () => {
    for (const q of MODEL.questions) {
      expect(q.options).toHaveLength(5);
      expect(new Set(q.options).size).toBe(5);
      for (const o of q.options) expect(o.trim().length).toBeGreaterThan(5);
    }
  });

  it('no reutiliza anclajes idénticos en más de dos preguntas', () => {
    const counts = new Map<string, number>();
    for (const q of MODEL.questions) for (const o of q.options) counts.set(o, (counts.get(o) ?? 0) + 1);
    const repeated = [...counts.entries()].filter(([, n]) => n > 2);
    expect(repeated).toEqual([]);
  });

  it('asigna peso positivo, evidencia sugerida y al menos una regla a cada pregunta', () => {
    for (const q of MODEL.questions) {
      expect(q.weight).toBeGreaterThan(0);
      expect(q.evidence.length).toBeGreaterThan(5);
      expect(q.ruleIds.length).toBeGreaterThan(0);
    }
  });

  it('mantiene coherencia bidireccional entre preguntas y reglas', () => {
    const ruleIds = new Set(MODEL.rules.map((r) => r.id));
    expect(ruleIds.size).toBe(MODEL.rules.length);
    for (const q of MODEL.questions) for (const r of q.ruleIds) expect(ruleIds.has(r)).toBe(true);
    for (const rule of MODEL.rules) {
      for (const qid of rule.questionIds) {
        const q = MODEL.questions.find((x) => x.id === qid);
        expect(q, `${rule.id} → ${qid}`).toBeDefined();
        expect(q!.ruleIds).toContain(rule.id);
        expect(q!.dimension).toBe(rule.dimension);
      }
      for (const dep of rule.dependsOn) expect(ruleIds.has(dep)).toBe(true);
    }
  });

  it('referencia solo preguntas existentes en alertas y casos de uso', () => {
    const ids = new Set(MODEL.questions.map((q) => q.id));
    for (const a of MODEL.alerts) expect(ids.has(a.questionId)).toBe(true);
    for (const uc of MODEL.useCases) for (const d of uc.dependencies) expect(ids.has(d.questionId)).toBe(true);
  });

  it('cubre en las alertas seguridad, privacidad y supervisión humana', () => {
    const cats = new Set(MODEL.alerts.map((a) => a.category));
    expect(cats).toEqual(new Set(['seguridad', 'privacidad', 'supervision']));
  });

  it('solo habilita «No aplica» en preguntas con condición justificada, y nunca por falta de adopción de IA en D1, D4–D6 ni D8', () => {
    const withNa = MODEL.questions.filter((q) => q.naCondition);
    expect(withNa.length).toBeGreaterThan(0);
    for (const q of withNa) expect(['D2', 'D3', 'D7']).toContain(q.dimension);
  });

  it('tiene versión semántica, cambios registrados y umbrales contiguos', () => {
    expect(parseVersion(MODEL.version)).not.toBeNull();
    expect(MODEL.changelog[0].version).toBe(MODEL.version);
    expect(MODEL.levels.map((l) => l.min)).toEqual([0, 20, 40, 60, 80]);
    const w = MODEL.priorityWeights;
    expect(w.value + w.viability + w.urgency).toBeCloseTo(1, 10);
  });

  it('declara el número correcto de reglas, alertas y casos de uso en el registro de cambios', () => {
    const text = MODEL.changelog[0].changes.join(' ');
    expect(text).toContain(`${MODEL.rules.length} reglas`);
    expect(text).toContain(`${MODEL.alerts.length} alertas`);
    expect(text).toContain(`${MODEL.useCases.length} casos de uso`);
    expect(MODEL.useCases.length).toBeGreaterThanOrEqual(5);
  });
});
