/**
 * Formats a number to Bolivianos currency (Bs)
 */
export function formatBs(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 Bs';
  
  // Format with comma or period according to Bolivian standard
  const formatted = new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} Bs`;
}

/**
 * Return user-friendly name for room type
 */
export function getRoomTypeLabel(type: string): string {
  switch (type) {
    case 'suite':
      return 'Suite';
    case 'ventilador':
      return 'Ventilador';
    case 'jacuzzi':
      return 'Jacuzzi';
    case 'aire':
      return 'Aire Acondicionado';
    case 'golden_suite':
      return 'Golden Suite (Karaoke)';
    default:
      return type;
  }
}

/**
 * Return badge styling for room type
 */
export function getRoomTypeBadge(type: string): { bg: string; text: string; border: string } {
  switch (type) {
    case 'golden_suite':
      return {
        bg: 'bg-amber-100 text-amber-900 border-amber-300',
        text: 'text-amber-800',
        border: 'border-amber-400',
      };
    case 'jacuzzi':
      return {
        bg: 'bg-purple-100 text-purple-900 border-purple-300',
        text: 'text-purple-800',
        border: 'border-purple-400',
      };
    case 'suite':
      return {
        bg: 'bg-rose-100 text-rose-900 border-rose-300',
        text: 'text-rose-800',
        border: 'border-rose-400',
      };
    case 'aire':
      return {
        bg: 'bg-sky-100 text-sky-900 border-sky-300',
        text: 'text-sky-800',
        border: 'border-sky-400',
      };
    case 'ventilador':
      return {
        bg: 'bg-teal-100 text-teal-900 border-teal-300',
        text: 'text-teal-800',
        border: 'border-teal-400',
      };
    default:
      return {
        bg: 'bg-slate-100 text-slate-800 border-slate-300',
        text: 'text-slate-700',
        border: 'border-slate-300',
      };
  }
}

export function getCategoryLabel(category: string): string {
  switch (category) {
    case 'preservativos':
      return 'Preservativos e Íntimo';
    case 'bebidas_alcohol':
      return 'Bebidas con Alcohol';
    case 'bebidas_sin_alcohol':
      return 'Bebidas sin Alcohol';
    case 'snacks':
      return 'Snacks y Chocolates';
    case 'higiene_otros':
      return 'Higiene y Otros';
    default:
      return category;
  }
}

export function getPlanLabel(plan: string): string {
  switch (plan) {
    case '1h':
      return '1 Hora';
    case '2h':
      return '2 Horas';
    case '3h':
      return '3 Horas';
    case '2h_noche':
      return '2h Suite Noche';
    case 'bonflix_2h':
    case 'bonflix_150':
      return '2h Bonflix (150 Bs)';
    case 'bonflix_4h':
    case 'bonflix_190':
      return '4h Bonflix (190 Bs)';
    case 'promo3h':
    case 'promo190':
      return 'Promo 3 Horas';
    case 'noche':
    case 'noche12h':
      return 'Noche (12h)';
    default:
      return plan.toUpperCase();
  }
}
