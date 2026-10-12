import { useEffect, useSyncExternalStore } from 'react';

/** Enrutador mínimo basado en el fragmento (#/ruta). Funciona sin servidor especial. */
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

function snapshot() {
  return window.location.hash.replace(/^#/, '') || '/';
}

export function useRoute(): { path: string; segments: string[]; query: URLSearchParams } {
  const raw = useSyncExternalStore(subscribe, snapshot, () => '/');
  const [path, qs] = raw.split('?');
  return { path, segments: path.split('/').filter(Boolean), query: new URLSearchParams(qs ?? '') };
}

export function navigate(to: string) {
  window.location.hash = to;
}

export function href(to: string) {
  return `#${to}`;
}

/** Lleva el foco al título principal al cambiar de página (navegación con teclado y lectores de pantalla). */
let initialRoute = true;

export function useFocusOnRoute(key: string) {
  useEffect(() => {
    // En la carga inicial se respeta el orden natural de foco (primero, «Saltar al contenido»).
    if (initialRoute) {
      initialRoute = false;
      return;
    }
    // Si la ruta apunta a una pregunta concreta, la página gestiona su propio desplazamiento.
    if (window.location.hash.includes('?p=')) return;
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: false });
    }
    window.scrollTo({ top: 0 });
  }, [key]);
}
