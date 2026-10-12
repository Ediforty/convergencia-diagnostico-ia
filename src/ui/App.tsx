import { MODEL } from '../model';
import type { DimensionId } from '../model/types';
import { NotFound } from './components/common';
import { Compare } from './pages/Compare';
import { ContextForm } from './pages/ContextForm';
import { DataPage, History } from './pages/History';
import { Methodology } from './pages/Methodology';
import { Questionnaire } from './pages/Questionnaire';
import { Report } from './pages/Report';
import { Results } from './pages/Results';
import { Roadmap } from './pages/Roadmap';
import { Welcome } from './pages/Welcome';
import { href, useFocusOnRoute, useRoute } from './router';
import { useAssessment, useDiagnosis } from './store';

const DIM_IDS = MODEL.dimensions.map((d) => d.id) as string[];

function AssessmentRoute({ id, section, sub, focus }: { id: string; section: string; sub?: string; focus?: string }) {
  const assessment = useAssessment(id);
  const diagnosis = useDiagnosis(assessment);
  if (!assessment || !diagnosis) return <NotFound />;
  switch (section) {
    case 'contexto':
      return <ContextForm assessment={assessment} />;
    case 'cuestionario': {
      const dim = (sub && DIM_IDS.includes(sub) ? sub : 'D1') as DimensionId;
      return <Questionnaire assessment={assessment} dim={dim} focus={focus} />;
    }
    case 'hoja-de-ruta':
      return <Roadmap assessment={assessment} diagnosis={diagnosis} />;
    case 'informe':
      return <Report assessment={assessment} diagnosis={diagnosis} />;
    default:
      return <Results assessment={assessment} diagnosis={diagnosis} />;
  }
}

function Page() {
  const { segments, query } = useRoute();
  useFocusOnRoute(segments.slice(0, 4).join('/'));
  switch (segments[0]) {
    case undefined:
      return <Welcome />;
    case 'evaluaciones':
      return <History />;
    case 'evaluacion':
      return <AssessmentRoute id={segments[1]} section={segments[2] ?? 'resultados'} sub={segments[3]} focus={query.get('p') ?? undefined} />;
    case 'comparar':
      return <Compare a={query.get('a') ?? undefined} b={query.get('b') ?? undefined} />;
    case 'metodologia':
      return <Methodology />;
    case 'datos':
      return <DataPage />;
    default:
      return <NotFound what="La página" />;
  }
}

export function App() {
  const { segments } = useRoute();
  const top = segments[0] ?? '';
  const nav = [
    ['', 'Inicio'],
    ['evaluaciones', 'Mis evaluaciones'],
    ['comparar', 'Comparar'],
    ['metodologia', 'Metodología'],
    ['datos', 'Datos y privacidad'],
  ];
  return (
    <>
      <a className="skip-link" href="#contenido" onClick={(e) => {
        e.preventDefault();
        document.getElementById('contenido')?.focus();
      }}>
        Saltar al contenido
      </a>
      <header className="app-header">
        <div className="app-header__inner">
          <a className="brand" href={href('/')} aria-label="ConvergencIA, inicio">
            <span className="brand__name">
              Converg<span>IA</span>
            </span>
            <span className="brand__tag">Diagnóstico de Madurez Tecnológica e IA</span>
          </a>
          <nav className="app-nav" aria-label="Navegación principal">
            {nav.map(([k, label]) => (
              <a key={k} href={href(`/${k}`)} aria-current={top === k ? 'page' : undefined}>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="contenido" tabIndex={-1}>
        <Page />
      </main>
      <footer className="app-footer">
        ConvergencIA · Modelo v{MODEL.version} · Diagnóstico orientativo; no es una certificación. Los datos se guardan solo
        en este navegador.
      </footer>
    </>
  );
}
