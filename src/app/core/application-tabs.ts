/**
 * Pestañas del detalle de postulación. Se exporta como módulo independiente
 * para evitar dependencias circulares entre `application-detail` y los
 * helpers de "próxima acción" / guidance.
 */
export type Tab =
  | 'data'
  | 'documents'
  | 'interviews'
  | 'occupational'
  | 'hiring'
  | 'induction'
  | 'functional';
