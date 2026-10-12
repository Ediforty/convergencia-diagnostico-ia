/**
 * Persistencia local en el navegador (localStorage).
 * Límites: no cifra los datos, no es un respaldo y no aísla a los usuarios del mismo dispositivo y navegador.
 * No registra el contenido de las evaluaciones en la consola.
 */
import type { Assessment } from '../model/types';

export const STORAGE_KEY = 'convergencia:v1:evaluaciones';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StorageStatus = { available: true } | { available: false; reason: string };

export class AssessmentRepository {
  private cache: Assessment[] | null = null;
  private listeners = new Set<() => void>();

  constructor(private readonly store: KeyValueStore | null) {}

  status(): StorageStatus {
    if (!this.store) return { available: false, reason: 'El navegador no permite almacenamiento local.' };
    return { available: true };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  list(): Assessment[] {
    if (this.cache) return this.cache;
    let parsed: Assessment[] = [];
    try {
      const raw = this.store?.getItem(STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      parsed = Array.isArray(data) ? data : [];
    } catch {
      // Datos locales dañados: se ignoran sin registrar su contenido.
      parsed = [];
    }
    this.cache = parsed;
    return parsed;
  }

  get(id: string): Assessment | undefined {
    return this.list().find((a) => a.id === id);
  }

  private persist(next: Assessment[]) {
    this.cache = next;
    this.store?.setItem(STORAGE_KEY, JSON.stringify(next));
    this.emit();
  }

  /** Guarda (crea o reemplaza) una evaluación. Lanza un error si el almacenamiento falla (p. ej., cuota). */
  save(assessment: Assessment): void {
    const list = this.list();
    const idx = list.findIndex((a) => a.id === assessment.id);
    const next = idx >= 0 ? list.map((a, i) => (i === idx ? assessment : a)) : [...list, assessment];
    this.persist(next);
  }

  saveMany(assessments: Assessment[]): void {
    const map = new Map(this.list().map((a) => [a.id, a]));
    for (const a of assessments) map.set(a.id, a);
    this.persist([...map.values()]);
  }

  delete(id: string): void {
    this.persist(this.list().filter((a) => a.id !== id));
  }

  clearAll(): void {
    this.cache = [];
    this.store?.removeItem(STORAGE_KEY);
    this.emit();
  }
}

function browserStore(): KeyValueStore | null {
  try {
    const s = globalThis.localStorage;
    const probe = '__convergencia_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export const repository = new AssessmentRepository(typeof window === 'undefined' ? null : browserStore());
