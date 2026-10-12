import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model';
import type { OrgContext } from '../src/model/types';
import { evaluate } from '../src/engine/evaluate';
import { emptyContext } from '../src/engine/factory';
import { applyAdjustments } from '../src/engine/roadmap';
import { scoreDimension } from '../src/engine/scoring';
import { allAnswers, assessmentWith, unknown, val } from './helpers';

const ctx = (patch: Partial<OrgContext> = {}): OrgContext => ({ ...emptyContext(), ...patch });

describe('alertas críticas', () => {
  it('no hay alertas cuando todas las prácticas están implementadas', () => {
    expect(evaluate(MODEL, assessmentWith(allAnswers(4))).alerts).toEqual([]);
  });

  it('activa la alerta de verificación en dos pasos con valor ≤ 1, no con 2', () => {
    const a1 = allAnswers(4);
    a1['D6.02'] = val(1);
    const r1 = evaluate(MODEL, assessmentWith(a1));
    expect(r1.alerts.map((a) => [a.rule.id, a.status])).toEqual([['AL-MFA', 'activa']]);
    const a2 = allAnswers(4);
    a2['D6.02'] = val(2);
    expect(evaluate(MODEL, assessmentWith(a2)).alerts).toEqual([]);
  });

  it('trata «No sé» y las preguntas críticas sin responder como riesgo por verificar', () => {
    const a = allAnswers(4);
    a['D7.03'] = unknown();
    delete a['D7.05'];
    const r = evaluate(MODEL, assessmentWith(a, { context: ctx({ sensitiveData: ['personales'] }) }));
    const priv = r.alerts.find((x) => x.rule.id === 'AL-PRIVACIDAD')!;
    expect(priv.status).toBe('por-verificar');
    expect(priv.contextNote).toMatch(/datos personales/);
    expect(r.alerts.find((x) => x.rule.id === 'AL-SUPERVISION')!.status).toBe('por-verificar');
  });

  it('no altera la puntuación: la dimensión se calcula igual con o sin alerta', () => {
    const a = allAnswers(4);
    a['D6.05'] = val(0);
    const r = evaluate(MODEL, assessmentWith(a));
    expect(r.alerts.some((x) => x.rule.id === 'AL-RESPALDO' && x.status === 'activa')).toBe(true);
    expect(r.dimensions.find((d) => d.dimension === 'D6')!.score).toBe(scoreDimension(MODEL, 'D6', a).score);
    expect(r.dimensions.find((d) => d.dimension === 'D6')!.score).toBeCloseTo((100 * (9.5 * 4 - 1.5 * 4)) / (4 * 9.5), 10);
  });

  it('cubre las tres categorías cuando fallan todos los fundamentos', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(0)));
    expect(new Set(r.alerts.map((a) => a.rule.category))).toEqual(new Set(['seguridad', 'privacidad', 'supervision']));
    expect(r.alerts).toHaveLength(MODEL.alerts.length);
  });
});

describe('recomendaciones trazables', () => {
  it('no genera recomendaciones si no hay brechas ni información por verificar', () => {
    expect(evaluate(MODEL, assessmentWith(allAnswers(4))).recommendations).toEqual([]);
  });

  it('con todas las prácticas en 0 activa todas las reglas como brecha observada', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(0)));
    expect(r.recommendations).toHaveLength(MODEL.rules.length);
    expect(r.recommendations.every((x) => x.type === 'brecha')).toBe(true);
    const crit = r.recommendations.filter((x) => x.priority === 'critica').map((x) => x.ruleId).sort();
    expect(crit).toEqual(['R-D6-1', 'R-D6-2', 'R-D7-1', 'R-D7-3']);
    expect(r.recommendations[0].priority).toBe('critica');
  });

  it('cada recomendación incluye hallazgo, preguntas, acción, resultado, responsable, esfuerzo, indicador, plazo y razón', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(1)));
    for (const rec of r.recommendations) {
      expect(rec.finding).toBeTruthy();
      expect(rec.evidence.some((e) => e.triggers)).toBe(true);
      expect(rec.action).toBeTruthy();
      expect(rec.expectedResult).toBeTruthy();
      expect(rec.owner).toBeTruthy();
      expect(['bajo', 'medio', 'alto']).toContain(rec.effort);
      expect(rec.indicator).toBeTruthy();
      expect([30, 60, 90]).toContain(rec.horizon);
      expect(rec.priorityReason).toBeTruthy();
    }
  });

  it('usa el umbral de cada regla (≤ 2 en reglas críticas) e identifica la pregunta que la activa', () => {
    const a = allAnswers(4);
    a['D6.01'] = val(2);
    const r = evaluate(MODEL, assessmentWith(a));
    expect(r.recommendations.map((x) => x.id)).toEqual(['R-D6-1']);
    const rec = r.recommendations[0];
    expect(rec.priority).toBe('alta');
    expect(rec.evidence.filter((e) => e.triggers).map((e) => e.questionId)).toEqual(['D6.01']);
  });

  it('distingue información pendiente de verificar de una brecha observada', () => {
    const a = allAnswers(4);
    a['D1.01'] = unknown();
    const r = evaluate(MODEL, assessmentWith(a));
    expect(r.recommendations).toHaveLength(1);
    expect(r.recommendations[0].type).toBe('verificacion');
    expect(r.recommendations[0].id).toBe('VER-R-D1-1');
    expect(r.recommendations[0].finding).toMatch(/No se registra una brecha observada/);
  });

  it('una brecha observada prevalece sobre la información faltante en la misma regla', () => {
    const a = allAnswers(4);
    a['D1.01'] = val(1);
    a['D1.08'] = unknown();
    const r = evaluate(MODEL, assessmentWith(a));
    expect(r.recommendations.map((x) => [x.id, x.type])).toEqual([['R-D1-1', 'brecha']]);
  });

  it('las preguntas sin responder no generan recomendaciones por sí solas', () => {
    const a = allAnswers(4);
    delete a['D2.04'];
    expect(evaluate(MODEL, assessmentWith(a)).recommendations).toEqual([]);
  });

  it('marca dependencias abiertas entre recomendaciones', () => {
    const a = allAnswers(4);
    a['D1.03'] = val(0);
    a['D1.01'] = val(0);
    const r = evaluate(MODEL, assessmentWith(a));
    const rec = r.recommendations.find((x) => x.id === 'R-D1-3')!;
    expect(rec.dependencies).toEqual([{ ruleId: 'R-D1-1', title: expect.any(String), open: true }]);
  });

  it('las fortalezas se basan en prácticas con valor ≥ 3', () => {
    const a = allAnswers(2);
    a['D4.01'] = val(4);
    a['D2.03'] = val(3);
    const r = evaluate(MODEL, assessmentWith(a));
    expect(r.strengths.map((s) => s.questionId)).toEqual(['D4.01', 'D2.03']);
  });
});

describe('casos de uso y prioridad', () => {
  const context = ctx({ processes: ['facturacion'], objectives: ['eficiencia'] });

  it('aplica Prioridad = 0,4 × valor + 0,35 × viabilidad + 0,25 × urgencia con explicación', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(4), { context }));
    const uc = r.useCases.find((u) => u.useCase.id === 'UC-FACTURAS')!;
    expect(uc.relevant).toBe(true);
    expect(uc.value.score).toBe(5); // 3 base + 2 por objetivo
    expect(uc.viability.score).toBe(5); // 1 + 4 × 100 / 100
    expect(uc.urgency.score).toBe(4); // 2 + 2 por proceso
    expect(uc.priority).toBeCloseTo(0.4 * 5 + 0.35 * 5 + 0.25 * 4, 10);
    expect(uc.status).toBe('apto-piloto');
    expect(uc.value.explanation.length).toBeGreaterThan(0);
    expect(uc.priorityFormula).toContain('4.75');
  });

  it('calcula la viabilidad con las dimensiones requeridas y la penaliza por restricción alta', () => {
    const a = allAnswers(2);
    const r = evaluate(MODEL, assessmentWith(a, { context: { ...context, capacityConstraint: 'alta' } }));
    const uc = r.useCases.find((u) => u.useCase.id === 'UC-FACTURAS')!;
    // D3 = D4 = 50 → 1 + 4 × 0,5 = 3; −1 por restricción alta con esfuerzo medio.
    expect(uc.viability.score).toBe(2);
  });

  it('suma urgencia si existe uso informal de IA', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(4), { context: { ...context, aiUseLevel: 'individual' } }));
    expect(r.useCases.find((u) => u.useCase.id === 'UC-FACTURAS')!.urgency.score).toBe(5);
  });

  it('solo recomienda casos justificados por el contexto', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(4), { context: ctx() }));
    expect(r.useCases.every((u) => !u.relevant)).toBe(true);
  });

  it('una dependencia crítica bloquea el despliegue aunque la prioridad sea alta', () => {
    const a = allAnswers(4);
    a['D7.05'] = val(1);
    const r = evaluate(MODEL, assessmentWith(a, { context }));
    const uc = r.useCases.find((u) => u.useCase.id === 'UC-FACTURAS')!;
    expect(uc.priority).toBeGreaterThan(4);
    expect(uc.status).toBe('bloqueado');
    expect(r.useCases.every((u) => u.status === 'bloqueado')).toBe(true);
  });

  it('«No sé» en una dependencia crítica también bloquea', () => {
    const a = allAnswers(4);
    a['D7.03'] = unknown();
    const r = evaluate(MODEL, assessmentWith(a, { context }));
    expect(r.useCases.find((u) => u.useCase.id === 'UC-FACTURAS')!.status).toBe('bloqueado');
  });

  it('una dependencia no crítica deja el caso condicionado', () => {
    const a = allAnswers(4);
    a['D5.03'] = val(1);
    const r = evaluate(MODEL, assessmentWith(a, { context }));
    expect(r.useCases.find((u) => u.useCase.id === 'UC-FACTURAS')!.status).toBe('condicionado');
  });
});

describe('hoja de ruta 30/60/90', () => {
  const context = ctx({ processes: ['facturacion', 'ventas'], objectives: ['eficiencia'] });

  it('cada acción tiene entregable, responsable, dependencia e indicador', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(1), { context }));
    expect(r.roadmap.length).toBeGreaterThan(0);
    for (const a of r.roadmap) {
      expect([30, 60, 90]).toContain(a.stage);
      expect(a.deliverable).toBeTruthy();
      expect(a.owner).toBeTruthy();
      expect(a.dependency).toBeTruthy();
      expect(a.indicator).toBeTruthy();
    }
  });

  it('con fundamentos sólidos programa pilotos a 60 días y la decisión a 90', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(4), { context }));
    const ids = r.roadmap.map((a) => a.id);
    expect(ids).toContain('UC-UC-FACTURAS-PILOTO');
    expect(r.roadmap.find((a) => a.id === 'UC-UC-FACTURAS-PILOTO')!.stage).toBe(60);
    expect(r.roadmap.find((a) => a.id === 'BASE-DECISION-PILOTO')!.stage).toBe(90);
    expect(r.roadmap.filter((a) => a.id.endsWith('-PILOTO') && a.origin.type === 'caso-uso').length).toBeLessThanOrEqual(2);
  });

  it('si todos los casos están bloqueados no programa pilotos sino resolver dependencias', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(0), { context }));
    expect(r.roadmap.some((a) => a.id.endsWith('-PILOTO') && a.origin.type === 'caso-uso')).toBe(false);
    expect(r.roadmap.some((a) => a.id.endsWith('-PREPARAR'))).toBe(true);
    expect(r.roadmap.filter((a) => a.stage === 30).length).toBeGreaterThan(2);
  });

  it('los ajustes del consultor conservan la recomendación original', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(0), { context }));
    const target = r.roadmap.find((a) => a.id === 'REC-R-D6-1')!;
    const eff = applyAdjustments(r.roadmap, {
      'REC-R-D6-1': { stage: 60, priority: 'media', status: 'en-curso', note: 'Proveedor disponible en 45 días', updatedAt: '2026-10-01' },
    });
    const adjusted = eff.find((a) => a.id === 'REC-R-D6-1')!;
    expect(adjusted.stage).toBe(60);
    expect(adjusted.priority).toBe('media');
    expect(adjusted.status).toBe('en-curso');
    expect(adjusted.adjustedFields.sort()).toEqual(['priority', 'stage']);
    expect(adjusted.original.stage).toBe(target.stage);
    expect(adjusted.original.priority).toBe('critica');
    expect(eff.find((a) => a.id === 'BASE-VALIDAR')!.status).toBe('pendiente');
  });
});
