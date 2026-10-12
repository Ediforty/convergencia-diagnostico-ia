import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model';
import type { Answer, AssessmentModel } from '../src/model/types';
import {
  classify,
  formatScore,
  resolveAnswer,
  scoreDimension,
  scoreIndex,
  versionsCompatible,
} from '../src/engine/scoring';
import { evaluate } from '../src/engine/evaluate';
import { allAnswers, assessmentWith, idsOf, na, unitWeightModel, unknown, val } from './helpers';

const level = (v: number) => classify(v, MODEL.levels).label;

describe('valores mínimos y máximos', () => {
  it('todas las respuestas en 0 producen 0 en cada dimensión, nivel Inicial y cobertura 100', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(0)));
    for (const d of r.dimensions) {
      expect(d.score).toBe(0);
      expect(d.coverage).toBe(100);
      expect(d.status).toBe('completa');
      expect(d.level?.label).toBe('Inicial');
    }
    expect(r.indices.map((i) => i.value)).toEqual([0, 0, 0]);
  });

  it('todas las respuestas en 4 producen 100 y nivel Optimizada', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(4)));
    for (const d of r.dimensions) {
      expect(d.score).toBe(100);
      expect(d.level?.label).toBe('Optimizada');
    }
    expect(r.indices.every((i) => i.value === 100 && i.status === 'completo')).toBe(true);
  });

  it('una evaluación vacía no inventa resultados', () => {
    const r = evaluate(MODEL, assessmentWith({}));
    for (const d of r.dimensions) {
      expect(d.score).toBeNull();
      expect(d.coverage).toBe(0);
      expect(d.status).toBe('sin-informacion');
      expect(d.level).toBeNull();
    }
    expect(r.indices.every((i) => i.status === 'no-calculable' && i.value === null)).toBe(true);
    expect(r.recommendations).toEqual([]);
  });
});

describe('fórmula de puntuación ponderada', () => {
  it('aplica 100 × Σ(peso × valor) / (4 × Σ peso puntuado) con los pesos reales', () => {
    // D1.01 y D1.02 pesan 1,5; el resto de D1 queda pendiente (peso total D1 = 9).
    const d = scoreDimension(MODEL, 'D1', { 'D1.01': val(4), 'D1.02': val(0) });
    expect(d.score).toBeCloseTo((100 * (1.5 * 4 + 1.5 * 0)) / (4 * 3), 10);
    expect(d.score).toBeCloseTo(50, 10);
    expect(d.coverage).toBeCloseTo((100 * 3) / 9, 10);
    expect(d.status).toBe('provisional');
  });

  it('pondera más las preguntas de mayor peso', () => {
    const answers: Record<string, Answer> = Object.fromEntries(idsOf('D6').map((id) => [id, val(0)]));
    answers['D6.02'] = val(4); // peso 1,5
    const heavy = scoreDimension(MODEL, 'D6', answers).score!;
    const answers2: Record<string, Answer> = Object.fromEntries(idsOf('D6').map((id) => [id, val(0)]));
    answers2['D6.03'] = val(4); // peso 1
    const light = scoreDimension(MODEL, 'D6', answers2).score!;
    expect(heavy).toBeCloseTo((100 * 6) / (4 * 9.5), 10);
    expect(light).toBeCloseTo((100 * 4) / (4 * 9.5), 10);
    expect(heavy).toBeGreaterThan(light);
  });
});

describe('respuestas faltantes y «No sé»', () => {
  const m = unitWeightModel();

  it('«No sé» no entra en el denominador de puntuación pero sí en el de cobertura', () => {
    const ids = idsOf('D2', m);
    const answers: Record<string, Answer> = {};
    ids.slice(0, 4).forEach((id) => (answers[id] = val(4)));
    ids.slice(4).forEach((id) => (answers[id] = unknown()));
    const d = scoreDimension(m, 'D2', answers);
    expect(d.score).toBe(100);
    expect(d.coverage).toBe(50);
    expect(d.status).toBe('provisional');
    expect(d.counts.unknown).toBe(4);
  });

  it('las preguntas pendientes se tratan igual que «No sé» en la cobertura', () => {
    const ids = idsOf('D3', m);
    const answers: Record<string, Answer> = {};
    ids.slice(0, 6).forEach((id) => (answers[id] = val(2)));
    const d = scoreDimension(m, 'D3', answers);
    expect(d.score).toBe(50);
    expect(d.coverage).toBe(75);
    expect(d.counts.pending).toBe(2);
    expect(d.status).toBe('completa');
  });

  it('una dimensión solo con «No sé» muestra «Sin información suficiente»', () => {
    const answers = Object.fromEntries(idsOf('D4').map((id) => [id, unknown()]));
    const d = scoreDimension(MODEL, 'D4', answers);
    expect(d.score).toBeNull();
    expect(d.status).toBe('sin-informacion');
    expect(d.coverage).toBe(0);
  });
});

describe('exclusiones justificadas («No aplica»)', () => {
  it('excluye la pregunta de ambos denominadores cuando existe condición y justificación', () => {
    const answers: Record<string, Answer> = Object.fromEntries(idsOf('D2').map((id) => [id, val(2)]));
    answers['D2.06'] = na();
    const d = scoreDimension(MODEL, 'D2', answers);
    expect(d.score).toBe(50);
    expect(d.coverage).toBe(100);
    expect(d.counts.excluded).toBe(1);
    expect(d.applicableWeight).toBe(7);
  });

  it('sin justificación, «No aplica» se trata como pendiente y se informa', () => {
    const q = MODEL.questions.find((x) => x.id === 'D2.06')!;
    const r = resolveAnswer(q, na('   '));
    expect(r.state).toBe('pendiente');
    expect(r.issue).toMatch(/justificación/);
  });

  it('en una pregunta sin condición de exclusión, «No aplica» no se acepta', () => {
    const q = MODEL.questions.find((x) => x.id === 'D8.01')!;
    const r = resolveAnswer(q, na());
    expect(r.state).toBe('pendiente');
    const result = evaluate(MODEL, assessmentWith({ 'D8.01': na() }));
    expect(result.issues).toEqual([{ questionId: 'D8.01', issue: 'Esta pregunta no admite «No aplica».' }]);
  });

  it('una dimensión con solo la exclusión respondida no tiene información suficiente', () => {
    const d = scoreDimension(MODEL, 'D2', { 'D2.06': na() });
    expect(d.score).toBeNull();
    expect(d.status).toBe('sin-informacion');
  });

  it('valores fuera de la escala no se puntúan', () => {
    const q = MODEL.questions[0];
    expect(resolveAnswer(q, { kind: 'valor', value: 5 as never, evidenceStatus: 'declarada' }).state).toBe('pendiente');
    expect(resolveAnswer(q, { kind: 'valor', value: 2.5 as never, evidenceStatus: 'declarada' }).state).toBe('pendiente');
  });
});

describe('umbral de cobertura del 70 %', () => {
  /** D1 con pesos 6,5 y 0,5 × 7 → peso total exacto de 10. */
  function model70(): AssessmentModel {
    return {
      ...MODEL,
      questions: MODEL.questions.map((q) =>
        q.dimension === 'D1' ? { ...q, weight: q.id === 'D1.01' ? 6.5 : 0.5 } : q,
      ),
    };
  }

  it('exactamente 70 % de cobertura no es provisional', () => {
    const d = scoreDimension(model70(), 'D1', { 'D1.01': val(3), 'D1.02': val(3) });
    expect(d.coverage).toBe(70);
    expect(d.status).toBe('completa');
  });

  it('por debajo del 70 % la puntuación es provisional', () => {
    const d = scoreDimension(model70(), 'D1', { 'D1.01': val(3) });
    expect(d.coverage).toBe(65);
    expect(d.status).toBe('provisional');
    expect(d.score).toBe(75);
  });

  it('tolera errores de coma flotante en el límite exacto del 70 %', () => {
    // Con estos pesos, 0,15 + 0,2 + 0,7 = 1,05 de 1,5 (70 % exacto), pero en coma flotante da 69,99999999999999.
    const weights = [0.15, 0.2, 0.7, 0.15, 0.05, 0.1, 0.1, 0.05];
    const ids = idsOf('D1');
    const m: AssessmentModel = {
      ...MODEL,
      questions: MODEL.questions.map((q) => (q.dimension === 'D1' ? { ...q, weight: weights[ids.indexOf(q.id)] } : q)),
    };
    const d = scoreDimension(m, 'D1', { [ids[0]]: val(1), [ids[1]]: val(1), [ids[2]]: val(1) });
    expect(d.coverage).toBeLessThan(70);
    expect(d.coverage).toBeCloseTo(70, 9);
    expect(d.status).toBe('completa');
  });
});

describe('límites de clasificación (valor sin redondear)', () => {
  it.each([
    [0, 'Inicial'],
    [19.999999, 'Inicial'],
    [20, 'En desarrollo'],
    [39.99, 'En desarrollo'],
    [40, 'Definida'],
    [59.9999, 'Definida'],
    [60, 'Gestionada'],
    [79.99, 'Gestionada'],
    [80, 'Optimizada'],
    [100, 'Optimizada'],
  ])('%s → %s', (value, label) => {
    expect(level(value)).toBe(label);
  });

  it('clasifica con el valor sin redondear aunque la visualización redondee', () => {
    expect(formatScore(79.96)).toBe('80,0');
    expect(level(79.96)).toBe('Gestionada');
    expect(formatScore(19.97)).toBe('20,0');
    expect(level(19.97)).toBe('Inicial');
  });

  it('una dimensión con puntuación exacta de 20 se clasifica En desarrollo', () => {
    const m = unitWeightModel();
    const ids = idsOf('D5', m);
    const answers = { [ids[0]]: val(1), [ids[1]]: val(1), [ids[2]]: val(1), [ids[3]]: val(1), [ids[4]]: val(0) };
    const d = scoreDimension(m, 'D5', answers);
    expect(d.score).toBe(20);
    expect(d.level?.label).toBe('En desarrollo');
  });

  it('formatea con un decimal y coma', () => {
    expect(formatScore(45.25)).toMatch(/^45,[23]$/);
    expect(formatScore(100)).toBe('100,0');
    expect(formatScore(null)).toBe('—');
  });
});

describe('índices compuestos', () => {
  it('calcula tres resultados separados y no un índice único', () => {
    const r = evaluate(MODEL, assessmentWith(allAnswers(2)));
    expect(r.indices.map((i) => i.id)).toEqual(['tecnologica', 'preparacion-ia', 'adopcion-ia']);
    expect(r.indices.every((i) => i.value === 50)).toBe(true);
  });

  it('promedia D1–D6 con pesos iguales para madurez tecnológica', () => {
    const answers = allAnswers(0);
    idsOf('D1').forEach((id) => (answers[id] = val(4)));
    const r = evaluate(MODEL, assessmentWith(answers));
    const tech = r.indices.find((i) => i.id === 'tecnologica')!;
    expect(tech.value).toBeCloseTo(100 / 6, 10);
    const prep = r.indices.find((i) => i.id === 'preparacion-ia')!;
    expect(prep.value).toBeCloseTo(100 / 5, 10);
    expect(prep.level?.label).toBe('En desarrollo');
  });

  it('adopción de IA es exactamente el resultado de D8', () => {
    const answers = allAnswers(1);
    idsOf('D8').forEach((id, i) => (answers[id] = val(i % 2 === 0 ? 3 : 1)));
    const r = evaluate(MODEL, assessmentWith(answers));
    const d8 = r.dimensions.find((d) => d.dimension === 'D8')!;
    expect(r.indices.find((i) => i.id === 'adopcion-ia')!.value).toBe(d8.score);
  });

  it('es provisional si una dimensión necesaria tiene cobertura menor al 70 %', () => {
    const answers = allAnswers(2);
    idsOf('D7').slice(0, 4).forEach((id) => delete answers[id]);
    const r = evaluate(MODEL, assessmentWith(answers));
    const prep = r.indices.find((i) => i.id === 'preparacion-ia')!;
    expect(prep.status).toBe('provisional');
    expect(prep.provisionalDimensions).toEqual(['D7']);
    expect(prep.value).not.toBeNull();
    expect(r.indices.find((i) => i.id === 'tecnologica')!.status).toBe('completo');
  });

  it('no se calcula si falta por completo una dimensión necesaria', () => {
    const answers = allAnswers(2);
    idsOf('D4').forEach((id) => delete answers[id]);
    const r = evaluate(MODEL, assessmentWith(answers));
    for (const id of ['tecnologica', 'preparacion-ia']) {
      const idx = r.indices.find((i) => i.id === id)!;
      expect(idx.status).toBe('no-calculable');
      expect(idx.value).toBeNull();
      expect(idx.missingDimensions).toEqual(['D4']);
    }
    expect(r.indices.find((i) => i.id === 'adopcion-ia')!.status).toBe('completo');
  });

  it('usa los pesos declarados en la definición del índice', () => {
    const dims = MODEL.dimensions.map((d) => scoreDimension(MODEL, d.id, allAnswers(0)));
    dims[0] = { ...dims[0], score: 100 };
    const idx = scoreIndex(MODEL, { ...MODEL.indices[0], weights: { D1: 5, D2: 1, D3: 1, D4: 1, D5: 1, D6: 1 } }, dims);
    expect(idx.value).toBeCloseTo(50, 10);
  });
});

describe('evidencia y versiones', () => {
  it('cuenta la evidencia por estado sin mezclarla con la puntuación', () => {
    const answers = { 'D6.01': val(3, 'verificada'), 'D6.02': val(3, 'declarada'), 'D6.03': val(3, 'referenciada') };
    const d = scoreDimension(MODEL, 'D6', answers);
    expect(d.evidence).toEqual({ declarada: 1, referenciada: 1, verificada: 1 });
    const d2 = scoreDimension(MODEL, 'D6', {
      'D6.01': val(3, 'declarada'),
      'D6.02': val(3, 'declarada'),
      'D6.03': val(3, 'declarada'),
    });
    expect(d.score).toBe(d2.score);
  });

  it('considera compatibles solo versiones con la misma versión mayor', () => {
    expect(versionsCompatible('1.0.0', '1.4.2')).toBe(true);
    expect(versionsCompatible('1.0.0', '2.0.0')).toBe(false);
    expect(versionsCompatible('1.0', '1.0.0')).toBe(false);
  });
});
