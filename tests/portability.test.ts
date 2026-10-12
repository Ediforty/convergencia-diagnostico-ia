import { describe, expect, it } from 'vitest';
import { MODEL } from '../src/model';
import { compareAssessments } from '../src/engine/compare';
import { evaluate } from '../src/engine/evaluate';
import { createAssessment, createFollowUp } from '../src/engine/factory';
import { EXPORT_FORMAT, exportAssessment, parseImport } from '../src/engine/portability';
import { AssessmentRepository, STORAGE_KEY, type KeyValueStore } from '../src/storage/repository';
import { createDemoAssessments } from '../src/demo/demo';
import { allAnswers, assessmentWith, na, unknown, val } from './helpers';

function sample() {
  const a = assessmentWith({ 'D1.01': val(3, 'verificada'), 'D2.06': na(), 'D4.02': unknown() });
  a.answers['D1.01'].comment = 'Acta de comité de marzo';
  a.answers['D1.01'].evidenceRef = 'Acta 03/2026';
  a.context.organizationName = 'Organización de prueba';
  a.roadmapAdjustments = { 'BASE-VALIDAR': { status: 'completada', updatedAt: '2026-10-01T00:00:00.000Z' } };
  return a;
}

const envelope = (text: string) => JSON.parse(text);

describe('exportación e importación JSON', () => {
  it('conserva la evaluación completa en un ciclo exportar → importar', () => {
    const a = sample();
    const result = parseImport(exportAssessment(a), MODEL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.assessment).toEqual(JSON.parse(JSON.stringify(a)));
    expect(evaluate(MODEL, result.assessment).dimensions).toEqual(evaluate(MODEL, a).dimensions);
    expect(result.warnings).toEqual([]);
  });

  it('rechaza contenido que no es JSON o no es una evaluación de ConvergencIA', () => {
    expect(parseImport('{no es json', MODEL)).toEqual({ ok: false, errors: ['El archivo no contiene JSON válido.'] });
    const r = parseImport(JSON.stringify({ format: 'otro', assessment: {} }), MODEL);
    expect(r.ok).toBe(false);
    expect(parseImport('[]', MODEL).ok).toBe(false);
  });

  it('rechaza una versión de formato no soportada', () => {
    const e = envelope(exportAssessment(sample()));
    e.formatVersion = 99;
    expect(parseImport(JSON.stringify(e), MODEL).ok).toBe(false);
  });

  it('rechaza una versión mayor del modelo incompatible', () => {
    const e = envelope(exportAssessment(sample()));
    e.assessment.modelVersion = '2.0.0';
    const r = parseImport(JSON.stringify(e), MODEL);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/incompatible/);
  });

  it('acepta una versión menor compatible con advertencia', () => {
    const e = envelope(exportAssessment(sample()));
    e.assessment.modelVersion = '1.3.0';
    const r = parseImport(JSON.stringify(e), MODEL);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings[0]).toMatch(/1\.3\.0/);
  });

  it('rechaza respuestas a preguntas inexistentes, valores fuera de escala y evidencias no válidas', () => {
    const e = envelope(exportAssessment(sample()));
    e.assessment.answers['D9.01'] = { kind: 'valor', value: 2, evidenceStatus: 'declarada' };
    e.assessment.answers['D1.02'] = { kind: 'valor', value: 7, evidenceStatus: 'declarada' };
    e.assessment.answers['D1.03'] = { kind: 'valor', value: 2, evidenceStatus: 'certificada' };
    const r = parseImport(JSON.stringify(e), MODEL);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveLength(3);
  });

  it('rechaza un contexto con estructura no válida', () => {
    const e = envelope(exportAssessment(sample()));
    e.assessment.context.objectives = 'eficiencia';
    e.assessment.context.modality = 'remota';
    const r = parseImport(JSON.stringify(e), MODEL);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(2);
  });

  it('descarta campos desconocidos del contexto', () => {
    const e = envelope(exportAssessment(sample()));
    e.assessment.context.contrasena = 'no debería guardarse';
    const r = parseImport(JSON.stringify(e), MODEL);
    expect(r.ok).toBe(true);
    if (r.ok) expect('contrasena' in r.assessment.context).toBe(false);
  });

  it('advierte cuando «No aplica» se usa en una pregunta que no lo admite', () => {
    const e = envelope(exportAssessment(sample()));
    e.assessment.answers['D8.01'] = { kind: 'no-aplica', naJustification: 'x', evidenceStatus: 'declarada' };
    const r = parseImport(JSON.stringify(e), MODEL);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join(' ')).toMatch(/D8\.01/);
  });

  it('identifica el formato en el archivo exportado', () => {
    const e = envelope(exportAssessment(sample()));
    expect(e.format).toBe(EXPORT_FORMAT);
    expect(e.modelVersion).toBe(MODEL.version);
  });
});

describe('comparación temporal', () => {
  it('compara evaluaciones compatibles de la misma organización y ordena por fecha', () => {
    const first = assessmentWith(allAnswers(1));
    first.context.assessmentDate = '2026-01-10';
    const second = { ...createFollowUp(MODEL, first), answers: allAnswers(3) };
    second.context = { ...second.context, assessmentDate: '2026-06-10' };
    const r = compareAssessments(MODEL, second, first);
    expect(r.compatible).toBe(true);
    if (!r.compatible) return;
    expect(r.earlier.id).toBe(first.id);
    expect(r.dimensions.every((d) => d.delta === 50)).toBe(true);
    expect(r.indices.every((i) => i.delta === 50)).toBe(true);
  });

  it('no compara versiones metodológicas incompatibles', () => {
    const a = assessmentWith(allAnswers(1));
    const b = { ...createFollowUp(MODEL, a), modelVersion: '2.0.0' };
    const r = compareAssessments(MODEL, a, b);
    expect(r.compatible).toBe(false);
    if (!r.compatible) expect(r.reason).toMatch(/incompatibles/);
  });

  it('compara versiones menores distintas con una nota', () => {
    const a = assessmentWith(allAnswers(1));
    const b = { ...createFollowUp(MODEL, a), modelVersion: '1.1.0', answers: allAnswers(2) };
    const r = compareAssessments(MODEL, a, b);
    expect(r.compatible).toBe(true);
    if (r.compatible) expect(r.notes.join(' ')).toMatch(/compatibles/);
  });

  it('no compara organizaciones distintas', () => {
    const r = compareAssessments(MODEL, createAssessment(MODEL), createAssessment(MODEL));
    expect(r.compatible).toBe(false);
  });

  it('muestra delta nulo cuando un resultado no tiene información', () => {
    const a = assessmentWith({});
    const b = { ...createFollowUp(MODEL, a), answers: allAnswers(2) };
    const r = compareAssessments(MODEL, a, b);
    expect(r.compatible).toBe(true);
    if (r.compatible) expect(r.dimensions.every((d) => d.delta === null)).toBe(true);
  });
});

describe('datos de demostración', () => {
  it('están marcados como ficticios y son evaluables', () => {
    const demos = createDemoAssessments(MODEL);
    expect(demos).toHaveLength(2);
    for (const d of demos) {
      expect(d.isDemo).toBe(true);
      expect(d.context.organizationName).toMatch(/FICTICIA/);
      const r = evaluate(MODEL, d);
      expect(r.issues).toEqual([]);
      expect(r.dimensions.every((x) => x.score !== null)).toBe(true);
    }
    const cmp = compareAssessments(MODEL, demos[0], demos[1]);
    expect(cmp.compatible).toBe(true);
  });
});

describe('repositorio local', () => {
  function memory(): KeyValueStore & { data: Map<string, string> } {
    const data = new Map<string, string>();
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    };
  }

  it('guarda, recupera borradores, elimina y borra todo', () => {
    const store = memory();
    const repo = new AssessmentRepository(store);
    const a = sample();
    repo.save(a);
    const reloaded = new AssessmentRepository(store);
    expect(reloaded.get(a.id)).toEqual(JSON.parse(JSON.stringify(a)));
    const b = createAssessment(MODEL);
    reloaded.save(b);
    reloaded.delete(a.id);
    expect(reloaded.list().map((x) => x.id)).toEqual([b.id]);
    reloaded.clearAll();
    expect(store.data.has(STORAGE_KEY)).toBe(false);
    expect(reloaded.list()).toEqual([]);
  });

  it('tolera datos locales dañados', () => {
    const store = memory();
    store.setItem(STORAGE_KEY, '{dañado');
    expect(new AssessmentRepository(store).list()).toEqual([]);
  });

  it('notifica cambios a los suscriptores', () => {
    const repo = new AssessmentRepository(memory());
    let calls = 0;
    const off = repo.subscribe(() => calls++);
    repo.save(createAssessment(MODEL));
    off();
    repo.save(createAssessment(MODEL));
    expect(calls).toBe(1);
  });
});
