/**
 * Próxima acción contextual a partir del estado del pipeline.
 *
 * Centraliza la guía "¿qué hago ahora?" tanto del backoffice (RR.HH.) como
 * del portal del trabajador, para que cada pantalla muestre el mismo CTA y
 * mensaje según el estado actual de la postulación.
 */

import { Tab } from './application-tabs';

export interface AdminNextAction {
  /** Pestaña a la que redirige el CTA en el detalle de postulación. */
  tab: Tab;
  /** Mensaje principal de la tarjeta hero. */
  title: string;
  /** Subtexto explicando por qué esta es la próxima acción. */
  hint: string;
  /** Texto del CTA. */
  cta: string;
  /** Icono Material Symbol asociado a la acción. */
  icon: string;
}

export type WorkerSection = 'documentos' | 'induccion' | 'funcional' | 'inicio';

export interface WorkerNextAction {
  section: WorkerSection;
  title: string;
  hint: string;
  cta: string;
  icon: string;
}

export function adminNextAction(status: string): AdminNextAction {
  switch (status) {
    case 'applied':
      return {
        tab: 'documents',
        title: 'Verifica los datos y solicita los documentos',
        hint: 'El postulante ya aplicó. Confirma sus datos básicos e invítalo al portal para que cargue su documentación.',
        cta: 'Revisar documentos',
        icon: 'folder_shared',
      };
    case 'docs_pending':
    case 'docs_incomplete':
      return {
        tab: 'documents',
        title: 'Esperando que el postulante suba documentos',
        hint: 'Aún faltan documentos obligatorios. Puedes reenviar la invitación al portal o cargar archivos en su nombre.',
        cta: 'Ver checklist',
        icon: 'pending_actions',
      };
    case 'docs_review':
      return {
        tab: 'documents',
        title: 'Aprueba o rechaza los documentos cargados',
        hint: 'Hay documentos pendientes de revisión. Aprueba los válidos o pide correcciones con un motivo claro.',
        cta: 'Revisar ahora',
        icon: 'fact_check',
      };
    case 'docs_approved':
      return {
        tab: 'interviews',
        title: 'Programa la entrevista',
        hint: 'Los documentos están aprobados. Crea una sesión con la plantilla adecuada para el cargo.',
        cta: 'Crear sesión',
        icon: 'forum',
      };
    case 'interview_pending':
      return {
        tab: 'interviews',
        title: 'Realiza la entrevista programada',
        hint: 'Una vez completada, registra las respuestas y notas en la sesión.',
        cta: 'Abrir sesión',
        icon: 'event_available',
      };
    case 'interview_done':
      return {
        tab: 'occupational',
        title: 'Envía el examen ocupacional a la IPS',
        hint: 'Descarga el PDF prellenado y envíalo al correo de la IPS para iniciar el proceso médico.',
        cta: 'Enviar a IPS',
        icon: 'medical_services',
      };
    case 'occ_pending':
    case 'occ_sent':
      return {
        tab: 'occupational',
        title: 'Esperando resultado de la IPS',
        hint: 'Cuando recibas el resultado, regístralo y adjunta el PDF.',
        cta: 'Registrar resultado',
        icon: 'hourglass_top',
      };
    case 'occ_result_received':
    case 'hiring_pending':
      return {
        tab: 'hiring',
        title: 'Toma la decisión de contratación',
        hint: 'Con el resultado de la IPS y la entrevista listos, define si el postulante es contratado.',
        cta: 'Decidir',
        icon: 'how_to_vote',
      };
    case 'hired':
    case 'induction_org':
      return {
        tab: 'induction',
        title: 'Inicia la inducción organizacional',
        hint: 'El postulante fue contratado. Asegúrate que recorra los módulos y firme reglamento, políticas y contrato.',
        cta: 'Ver inducción',
        icon: 'school',
      };
    case 'induction_org_done':
    case 'induction_theory':
    case 'induction_epp_pending':
    case 'induction_practice':
      return {
        tab: 'functional',
        title: 'Acompaña la inducción funcional y entrega de EPP',
        hint: 'Carga manual del cargo, registra entrega de dotación y evidencia las actividades teóricas y prácticas.',
        cta: 'Plan funcional',
        icon: 'engineering',
      };
    case 'onboarding_complete':
      return {
        tab: 'data',
        title: 'Onboarding completo',
        hint: 'El proceso terminó. Esta postulación pasa al equipo operativo.',
        cta: 'Ver datos',
        icon: 'verified',
      };
    case 'rejected':
      return {
        tab: 'data',
        title: 'Postulación descartada',
        hint: 'Revisa la nota y el motivo registrados al rechazar.',
        cta: 'Ver detalles',
        icon: 'block',
      };
    default:
      return {
        tab: 'data',
        title: 'Revisa la postulación',
        hint: 'Confirma los datos y avanza por las pestañas según el flujo.',
        cta: 'Abrir',
        icon: 'arrow_forward',
      };
  }
}

export function workerNextAction(status: string, docsPending: number): WorkerNextAction {
  if (
    status === 'docs_pending' ||
    status === 'docs_incomplete' ||
    status === 'docs_review' ||
    docsPending > 0
  ) {
    return {
      section: 'documentos',
      title: docsPending > 0
        ? `Te faltan ${docsPending} documento${docsPending === 1 ? '' : 's'} por subir`
        : 'Espera la revisión de tus documentos',
      hint:
        docsPending > 0
          ? 'Sube cada documento desde tu celular o computador. Solo aceptamos PDF o imágenes claras.'
          : 'Tu cargue está completo. RR.HH. los está revisando.',
      cta: 'Ir a mis documentos',
      icon: 'folder_shared',
    };
  }
  if (status === 'docs_approved' || status === 'interview_pending') {
    return {
      section: 'inicio',
      title: 'Te contactaremos para tu entrevista',
      hint: 'RR.HH. te llamará o escribirá pronto para coordinar tu entrevista presencial o virtual.',
      cta: 'Volver al inicio',
      icon: 'phone_in_talk',
    };
  }
  if (status === 'interview_done' || status === 'occ_pending' || status === 'occ_sent') {
    return {
      section: 'inicio',
      title: 'Tu examen ocupacional está en proceso',
      hint: 'La IPS realizará tu examen médico. Apenas recibamos el resultado te contactaremos.',
      cta: 'Volver al inicio',
      icon: 'medical_services',
    };
  }
  if (status === 'occ_result_received' || status === 'hiring_pending') {
    return {
      section: 'inicio',
      title: 'Estamos preparando tu contratación',
      hint: 'Pronto te confirmaremos el inicio de tu vinculación con HASES.',
      cta: 'Volver al inicio',
      icon: 'how_to_vote',
    };
  }
  if (status === 'hired' || status === 'induction_org') {
    return {
      section: 'induccion',
      title: 'Comienza tu inducción organizacional',
      hint: 'Revisa los módulos audiovisuales y firma el reglamento, las políticas y el contrato.',
      cta: 'Empezar inducción',
      icon: 'school',
    };
  }
  if (
    status === 'induction_org_done' ||
    status === 'induction_theory' ||
    status === 'induction_epp_pending' ||
    status === 'induction_practice'
  ) {
    return {
      section: 'funcional',
      title: 'Continúa con tu plan funcional',
      hint: 'Lee el manual del cargo y completa las actividades teóricas y prácticas.',
      cta: 'Ir al plan funcional',
      icon: 'engineering',
    };
  }
  if (status === 'onboarding_complete') {
    return {
      section: 'inicio',
      title: '¡Felicidades, completaste tu onboarding!',
      hint: 'Bienvenido al equipo HASES. Tu líder operativo te dará las indicaciones siguientes.',
      cta: 'Ver mi inicio',
      icon: 'celebration',
    };
  }
  if (status === 'rejected') {
    return {
      section: 'inicio',
      title: 'Tu postulación fue cerrada',
      hint: 'En esta oportunidad no continuamos. Gracias por tu interés en HASES.',
      cta: 'Ver inicio',
      icon: 'block',
    };
  }
  return {
    section: 'documentos',
    title: 'Empecemos por tus documentos',
    hint: 'Sube cada documento solicitado para avanzar en tu proceso.',
    cta: 'Ir a documentos',
    icon: 'folder_shared',
  };
}
