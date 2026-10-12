import { MODEL } from '../../model';
import { createAssessment } from '../../engine/factory';
import { createDemoAssessments } from '../../demo/demo';
import { repository } from '../../storage/repository';
import { href, navigate } from '../router';
import { saveAssessment } from '../store';

export function startNewAssessment() {
  const a = createAssessment(MODEL);
  const r = saveAssessment(a);
  if (r.ok) navigate(`/evaluacion/${a.id}/contexto`);
  else alert(r.message);
}

export function loadDemo() {
  try {
    repository.saveMany(createDemoAssessments(MODEL));
    navigate('/evaluacion/demo-evaluacion-2/resultados');
  } catch {
    alert('No se pudo guardar la demostración en el almacenamiento local.');
  }
}

export function Welcome() {
  return (
    <>
      <section className="hero">
        <h1>Diagnóstico de Madurez Tecnológica e IA</h1>
        <p>
          Evalúe su organización en ocho dimensiones, entienda su nivel de madurez y obtenga una hoja de ruta de 30, 60
          y 90 días para adoptar tecnología e inteligencia artificial de forma útil, segura y sostenible.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn--teal" onClick={startNewAssessment}>
            Iniciar una evaluación
          </button>
          <button type="button" className="btn btn--secondary" onClick={loadDemo}>
            Ver demostración (organización ficticia)
          </button>
          <a className="btn btn--secondary" href={href('/evaluaciones')}>
            Mis evaluaciones
          </a>
        </div>
      </section>

      <div className="grid grid--3">
        <div className="card">
          <h2>Tres resultados, no uno</h2>
          <p>
            Separamos <strong>madurez tecnológica</strong>, <strong>preparación para IA</strong> y{' '}
            <strong>adopción y valor de IA</strong>. Un índice único ocultaría desequilibrios importantes.
          </p>
        </div>
        <div className="card">
          <h2>Cálculo transparente</h2>
          <p>
            Cada puntuación muestra su cobertura, su evidencia y las respuestas que la originan. Las recomendaciones
            indican qué preguntas las sustentan.
          </p>
        </div>
        <div className="card">
          <h2>Decisiones concretas</h2>
          <p>
            Recomendaciones con responsable, esfuerzo, indicador y plazo; casos de uso priorizados y bloqueados cuando
            faltan fundamentos críticos de seguridad, privacidad o supervisión humana.
          </p>
        </div>
      </div>

      <div className="card">
        <h2>Cómo funciona</h2>
        <ol>
          <li>Registre el contexto de la organización (puede omitir datos personales).</li>
          <li>
            Responda 64 preguntas en 8 dimensiones (unos 30–45 minutos). Puede responder «No sé»; el avance se guarda
            como borrador automáticamente.
          </li>
          <li>Revise el tablero de resultados, las alertas, las recomendaciones y la hoja de ruta.</li>
          <li>Imprima o guarde el informe en PDF y exporte la evaluación en JSON.</li>
        </ol>
        <p className="muted small">
          {MODEL.name}, versión {MODEL.version}. {MODEL.disclaimer}
        </p>
      </div>

      <div className="notice notice--info" role="note">
        <p>
          <strong>Privacidad:</strong> sus respuestas se guardan solo en el almacenamiento local de este navegador y no
          se envían a ningún servicio externo. Este almacenamiento no está cifrado, no es un respaldo y cualquier persona
          con acceso a este navegador puede verlo. <a href={href('/datos')}>Gestionar datos locales</a>.
        </p>
      </div>
    </>
  );
}
