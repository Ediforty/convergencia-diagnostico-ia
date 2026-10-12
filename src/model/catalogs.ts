/** Catálogos de opciones del contexto organizacional. Los identificadores son estables. */

export interface Option {
  id: string;
  label: string;
}

export const SECTORS: Option[] = [
  { id: 'comercio', label: 'Comercio' },
  { id: 'manufactura', label: 'Manufactura' },
  { id: 'servicios-profesionales', label: 'Servicios profesionales' },
  { id: 'salud', label: 'Salud' },
  { id: 'educacion', label: 'Educación' },
  { id: 'financiero', label: 'Servicios financieros' },
  { id: 'logistica', label: 'Logística y transporte' },
  { id: 'agro', label: 'Agroindustria' },
  { id: 'construccion', label: 'Construcción' },
  { id: 'tecnologia', label: 'Tecnología' },
  { id: 'sector-publico', label: 'Sector público' },
  { id: 'defensa-seguridad', label: 'Defensa y seguridad' },
  { id: 'sin-animo-lucro', label: 'Organización sin ánimo de lucro' },
  { id: 'otro', label: 'Otro' },
];

export const SIZE_RANGES: Option[] = [
  { id: '1-10', label: '1 a 10 personas' },
  { id: '11-50', label: '11 a 50 personas' },
  { id: '51-200', label: '51 a 200 personas' },
  { id: '201-1000', label: '201 a 1.000 personas' },
  { id: '1000+', label: 'Más de 1.000 personas' },
];

export const ROLES: Option[] = [
  { id: 'direccion', label: 'Dirección o gerencia' },
  { id: 'tecnologia', label: 'Responsable de tecnología' },
  { id: 'operaciones', label: 'Operaciones o procesos' },
  { id: 'finanzas', label: 'Finanzas o administración' },
  { id: 'talento', label: 'Talento humano' },
  { id: 'consultor', label: 'Consultor externo' },
  { id: 'academico', label: 'Liderazgo académico' },
  { id: 'otro', label: 'Otro' },
];

export const OBJECTIVES: Option[] = [
  { id: 'eficiencia', label: 'Reducir tiempos y trabajo manual' },
  { id: 'crecimiento-ventas', label: 'Aumentar ventas' },
  { id: 'experiencia-cliente', label: 'Mejorar la experiencia del cliente' },
  { id: 'control-costos', label: 'Controlar costos' },
  { id: 'decisiones-datos', label: 'Decidir con datos' },
  { id: 'conocimiento', label: 'Conservar y compartir el conocimiento interno' },
  { id: 'cumplimiento', label: 'Cumplimiento normativo y control' },
  { id: 'seguridad', label: 'Reducir riesgos de seguridad' },
];

export const PROCESSES: Option[] = [
  { id: 'facturacion', label: 'Facturación y cuentas por pagar o cobrar' },
  { id: 'compras', label: 'Compras y proveedores' },
  { id: 'ventas', label: 'Ventas y gestión comercial' },
  { id: 'atencion-cliente', label: 'Atención al cliente' },
  { id: 'documentacion', label: 'Gestión documental y archivo' },
  { id: 'talento-humano', label: 'Talento humano' },
  { id: 'administracion', label: 'Tareas administrativas (correos, agenda, trámites)' },
  { id: 'reportes', label: 'Reportes e indicadores' },
  { id: 'inventario', label: 'Inventario y logística' },
  { id: 'produccion', label: 'Producción u operación del servicio' },
];

export const TOOLS: Option[] = [
  { id: 'hojas-calculo', label: 'Hojas de cálculo' },
  { id: 'correo-corporativo', label: 'Correo corporativo' },
  { id: 'suite-colaboracion', label: 'Suite de colaboración en la nube' },
  { id: 'erp', label: 'Sistema de gestión empresarial (ERP)' },
  { id: 'crm', label: 'Sistema de gestión de clientes (CRM)' },
  { id: 'contabilidad', label: 'Software contable' },
  { id: 'facturacion-electronica', label: 'Facturación electrónica' },
  { id: 'mensajeria', label: 'Mensajería instantánea' },
  { id: 'ia-generativa', label: 'Asistentes de IA generativa' },
  { id: 'bi', label: 'Herramientas de análisis o tableros' },
];

export const AI_USE_LEVELS: Option[] = [
  { id: 'ninguno', label: 'No se usa IA' },
  { id: 'individual', label: 'Uso individual e informal de herramientas de IA' },
  { id: 'pilotos', label: 'Pilotos o pruebas organizadas' },
  { id: 'operacion', label: 'IA integrada en procesos en operación' },
];

export const SENSITIVE_DATA: Option[] = [
  { id: 'personales', label: 'Datos personales de clientes o empleados' },
  { id: 'salud', label: 'Datos de salud' },
  { id: 'financieros', label: 'Datos financieros o de pago' },
  { id: 'menores', label: 'Datos de menores de edad' },
  { id: 'propiedad-intelectual', label: 'Propiedad intelectual o secretos comerciales' },
  { id: 'reservada', label: 'Información reservada o clasificada' },
  { id: 'ninguna', label: 'Ninguna de las anteriores' },
  { id: 'no-se', label: 'No lo sé' },
];

export const CONSTRAINT_LEVELS: Option[] = [
  { id: 'baja', label: 'Restricción baja' },
  { id: 'media', label: 'Restricción media' },
  { id: 'alta', label: 'Restricción alta' },
];

/** Categorías de datos que se consideran personales a efectos de dependencias de casos de uso. */
export const PERSONAL_DATA_CATEGORIES = ['personales', 'salud', 'financieros', 'menores', 'no-se'];

export function labelOf(options: Option[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}
