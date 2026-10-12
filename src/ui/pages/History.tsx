import { useRef, useState } from 'react';
import { MODEL } from '../../model';
import type { Assessment } from '../../model/types';
import { assessmentDate } from '../../engine/compare';
import { evaluate } from '../../engine/evaluate';
import { createFollowUp, newId } from '../../engine/factory';
import { exportAssessment, parseImport } from '../../engine/portability';
import { formatScore } from '../../engine/scoring';
import { repository } from '../../storage/repository';
import { ConfirmButton, downloadText, slug } from '../components/common';
import { formatDate } from '../labels';
import { href, navigate } from '../router';
import { saveAssessment, useAssessments } from '../store';
import { loadDemo, startNewAssessment } from './Welcome';

export function exportToFile(a: Assessment) {
  downloadText(`convergencia-${slug(a.context.organizationName)}-${assessmentDate(a)}.json`, exportAssessment(a));
}

function groupByOrganization(list: Assessment[]) {
  const groups = new Map<string, Assessment[]>();
  for (const a of list) groups.set(a.organizationId, [...(groups.get(a.organizationId) ?? []), a]);
  return [...groups.values()].map((g) => g.sort((x, y) => assessmentDate(y).localeCompare(assessmentDate(x))));
}

export function History() {
  const list = useAssessments();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ kind: 'ok' | 'error'; lines: string[] } | null>(null);

  async function onImport(file: File) {
    const text = await file.text();
    const r = parseImport(text, MODEL);
    if (!r.ok) {
      setImportMsg({ kind: 'error', lines: r.errors });
      return;
    }
    let a = r.assessment;
    const lines = [...r.warnings];
    if (repository.get(a.id)) {
      a = { ...a, id: newId() };
      lines.push('Ya existía una evaluación con el mismo identificador; se importó como copia.');
    }
    const s = saveAssessment(a);
    if (!s.ok) {
      setImportMsg({ kind: 'error', lines: [s.message] });
      return;
    }
    setImportMsg({ kind: 'ok', lines: [`Evaluación «${a.context.organizationName || 'sin nombre'}» importada.`, ...lines] });
  }

  const groups = groupByOrganization(list);
  return (
    <>
      <h1>Mis evaluaciones</h1>
      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn--teal" onClick={startNewAssessment}>
          Nueva evaluación
        </button>
        <button type="button" className="btn btn--secondary" onClick={() => fileRef.current?.click()}>
          Importar JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="Seleccionar archivo JSON de evaluación"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
        <button type="button" className="btn btn--secondary" onClick={loadDemo}>
          Cargar demostración ficticia
        </button>
      </div>
      {importMsg && (
        <div className={`notice ${importMsg.kind === 'ok' ? 'notice--info' : 'notice--crit'}`} role="status">
          <p>
            <strong>{importMsg.kind === 'ok' ? 'Importación correcta.' : 'No se pudo importar el archivo.'}</strong>
          </p>
          <ul>
            {importMsg.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {groups.length === 0 && (
        <div className="card">
          <p>No hay evaluaciones guardadas en este navegador.</p>
        </div>
      )}

      {groups.map((group) => {
        const org = group[0];
        return (
          <section key={org.organizationId} className="card" aria-labelledby={`org-${org.organizationId}`}>
            <div className="btn-row" style={{ justifyContent: 'space-between' }}>
              <h2 id={`org-${org.organizationId}`} style={{ margin: 0 }}>
                {org.context.organizationName || 'Organización sin nombre'}{' '}
                {org.isDemo && <span className="badge badge--demo">DEMO ficticia</span>}
              </h2>
              <div className="btn-row">
                {group.length >= 2 && (
                  <a className="btn btn--secondary" href={href(`/comparar?a=${group[1].id}&b=${group[0].id}`)}>
                    Comparar en el tiempo
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    const next = createFollowUp(MODEL, group[0]);
                    const r = saveAssessment(next);
                    if (r.ok) navigate(`/evaluacion/${next.id}/contexto`);
                  }}
                >
                  Nueva evaluación de esta organización
                </button>
              </div>
            </div>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Versión</th>
                    <th scope="col" className="num">Respondidas</th>
                    <th scope="col" className="num">Madurez tec.</th>
                    <th scope="col" className="num">Prep. IA</th>
                    <th scope="col" className="num">Adopción IA</th>
                    <th scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((a) => {
                    const r = evaluate(MODEL, a);
                    return (
                      <tr key={a.id}>
                        <td>{formatDate(assessmentDate(a))}</td>
                        <td>{a.status === 'finalizada' ? 'Finalizada' : 'Borrador'}</td>
                        <td>{a.modelVersion}</td>
                        <td className="num">
                          {r.overall.answered}/{r.overall.total}
                        </td>
                        {r.indices.map((i) => (
                          <td key={i.id} className="num">
                            {i.value === null ? 'N/C' : formatScore(i.value)}
                            {i.status === 'provisional' ? '*' : ''}
                          </td>
                        ))}
                        <td>
                          <div className="btn-row">
                            <a className="btn btn--ghost" href={href(`/evaluacion/${a.id}/${a.status === 'borrador' ? 'cuestionario' : 'resultados'}`)}>
                              {a.status === 'borrador' ? 'Continuar' : 'Abrir'}
                            </a>
                            <button type="button" className="btn btn--ghost" onClick={() => exportToFile(a)}>
                              Exportar JSON
                            </button>
                            <ConfirmButton
                              className="btn btn--ghost"
                              label="Eliminar"
                              title="Eliminar evaluación"
                              message={
                                <p>
                                  Se eliminará la evaluación del {formatDate(assessmentDate(a))} de este navegador. Esta
                                  acción no se puede deshacer. Si la necesita, expórtela antes.
                                </p>
                              }
                              confirmLabel="Eliminar definitivamente"
                              onConfirm={() => repository.delete(a.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted small">N/C = no calculable por falta de información. * = provisional.</p>
          </section>
        );
      })}
    </>
  );
}

export function DataPage() {
  const list = useAssessments();
  const status = repository.status();
  return (
    <>
      <h1>Datos locales y privacidad</h1>
      <div className="card">
        <h2>Dónde se guardan sus datos</h2>
        <ul>
          <li>Las evaluaciones se guardan en el almacenamiento local (localStorage) de este navegador, en este dispositivo.</li>
          <li>La aplicación no envía respuestas a servidores ni a servicios de IA externos. El diagnóstico se calcula localmente.</li>
          <li>
            <strong>Límites:</strong> el almacenamiento local no está cifrado, no es un respaldo (se pierde si se borran
            los datos del navegador) y no separa usuarios: cualquier persona que use este navegador puede ver las
            evaluaciones.
          </li>
          <li>Para conservar o trasladar una evaluación, expórtela en JSON y guarde el archivo en un lugar seguro.</li>
          <li>No registre contraseñas, secretos empresariales ni datos personales en comentarios o referencias de evidencia.</li>
        </ul>
        <p>
          Estado del almacenamiento:{' '}
          {status.available ? <strong>disponible</strong> : <strong>no disponible — {status.reason}</strong>}. Evaluaciones
          guardadas: <strong>{list.length}</strong>.
        </p>
      </div>
      <div className="card">
        <h2>Borrar todos los datos locales</h2>
        <p>Elimina todas las evaluaciones, borradores y ajustes de hoja de ruta guardados en este navegador.</p>
        <ConfirmButton
          className="btn btn--danger"
          label="Borrar todos los datos locales"
          title="Borrar todos los datos"
          message={
            <p>
              Se eliminarán <strong>{list.length}</strong> evaluaciones de este navegador. Esta acción no se puede
              deshacer.
            </p>
          }
          confirmLabel="Borrar todo"
          onConfirm={() => {
            repository.clearAll();
            navigate('/');
          }}
        />
      </div>
    </>
  );
}
