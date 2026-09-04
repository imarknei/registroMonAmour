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
    case 'limpieza_utensilios':
      return 'Utensilios de Limpieza';
    default:
      return category;
  }
}

export function getExpenseCategoryLabel(category: string): string {
  switch (category) {
    case 'proveedores':
      return 'Proveedores / Mercadería';
    case 'mantenimiento':
      return 'Mantenimiento / Reparaciones';
    case 'servicios':
      return 'Servicios Básicos';
    case 'limpieza_insumos':
      return 'Insumos de Limpieza';
    case 'personal_adelanto':
      return 'Adelanto / Jornal Personal';
    case 'retiro_administracion':
      return 'Retiro de Efectivo (Administración / Dueño)';
    case 'otros':
      return 'Otros Pagos';
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
    case 'personalizado':
    case 'custom':
      return '✨ Paquete Personalizado';
    default:
      return plan.toUpperCase();
  }
}

export function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'efectivo':
      return '💵 Efectivo';
    case 'qr_vendis':
      return '📱 QR Vendis';
    case 'qr_union':
      return '🏦 QR Banco Unión';
    case 'qr':
      return '📱 QR';
    case 'mixto':
      return '💳 Mixto';
    default:
      return method;
  }
}

/**
 * Determina si la fecha corresponde a Fin de Semana (Viernes, Sábado o Domingo)
 */
export function isWeekendTariffDay(date = new Date()): boolean {
  const day = date.getDay(); // 0 = Domingo, 5 = Viernes, 6 = Sábado
  return day === 0 || day === 5 || day === 6;
}

/**
 * Obtiene el precio efectivo de 2 horas según el día de la semana
 * - Viernes, Sábados y Domingos: Ventilador 75 Bs, Aire 85 Bs, Suite Tantra 95 Bs
 * - Lunes a Jueves: Tarifas regulares estándar (Ventilador 70 Bs, Aire 80 Bs, Suite 80 Bs)
 */
export function getEffective2hPrice(
  roomType: string,
  roomTariff?: { price2h?: number; price2hWeekend?: number },
  date = new Date()
): number {
  const isWeekend = isWeekendTariffDay(date);

  if (isWeekend) {
    if (roomTariff?.price2hWeekend !== undefined) return roomTariff.price2hWeekend;
    if (roomType === 'ventilador') return 75;
    if (roomType === 'aire') return 85;
    if (roomType === 'suite') return 95;
    if (roomTariff?.price2h !== undefined) return roomTariff.price2h;
    if (roomType === 'jacuzzi') return 180;
    if (roomType === 'golden_suite') return 140;
  }

  return (
    roomTariff?.price2h ??
    (roomType === 'ventilador' ? 70 : roomType === 'aire' ? 80 : roomType === 'suite' ? 80 : 80)
  );
}

/**
 * Calcula el precio con descuento especial para empleados/personal:
 * - Descuento de 2 Bs en Bebidas (con y sin alcohol: sodas, cervezas, aguas, etc.)
 * - Descuento de 1 Bs en Galletas y Snacks
 */
export function getStaffDiscountedPrice(product: { category?: string; price: number }): {
  originalPrice: number;
  staffPrice: number;
  discount: number;
} {
  let discount = 0;
  if (product.category === 'bebidas_alcohol' || product.category === 'bebidas_sin_alcohol') {
    discount = 2;
  } else if (product.category === 'snacks') {
    discount = 1;
  }

  const staffPrice = Math.max(0, product.price - discount);
  return {
    originalPrice: product.price,
    staffPrice,
    discount,
  };
}
