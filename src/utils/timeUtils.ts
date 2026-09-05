import { getNetworkTimestamp } from '../services/firebase';

export interface OvertimeCalculation {
  isOvertime: boolean;
  overtimeMinutes: number;
  overtimeSeconds: number;
  gracePeriodActive: boolean; // Primeros 10 minutos de espera -> 0 Bs de recargo
  extraBlocksCount: number; // Cantidad de fracciones de 20 min cobradas (1, 2, 3...)
  extraBlockRate: number; // Tarifa por fracción de 20 min (10 Bs)
  extraHoursCount: number; // Para compatibilidad (fracciones de 20 min)
  extraHourRate: number; // Tarifa por fracción (10 Bs)
  overtimeCharge: number; // Monto extra acumulado
  remainingMinutes: number;
  remainingSeconds: number;
  isWarning: boolean; // Menos de 10 minutos restantes
  percentElapsed: number;
  // Regla de Conversión Automática a Noche Completa (12 horas):
  autoNightConverted: boolean; // True si superó las 3 horas (180 min) y pasó automáticamente a tarifa de noche
  nightPriceApplied?: number; // Precio de noche de la habitación
  totalElapsedMinutes: number; // Minutos totales transcurridos desde que ingresó
  effectiveDurationMinutes: number; // Minutos totales asignados (ej. 60, 120 o 720)
}

/**
 * Regla de Control de Tiempo y Tarifas Motel Mon Amour:
 * 1. La primera hora / tiempo inicial transcurre normalmente.
 * 2. Si el huésped se queda más tiempo (hora 2 y hora 3 hasta 180 min):
 *    - 10 minutos de tolerancia gratuita de espera.
 *    - A partir del minuto 11: se suma 10 Bs por cada 20 minutos de tiempo excedido.
 * 3. PASANDO LAS 3 HORAS (minuto 181 en adelante):
 *    - AUTOMÁTICAMENTE pasa a precio por NOCHE de 12 horas (720 min).
 *    - El costo de la habitación se fija al precio de noche de esa habitación.
 *    - El huésped recibe las 12 horas completas de permanencia y el cronómetro/temporizador
 *      cuenta el tiempo restante hasta completar las 12 horas.
 * 4. Si supera las 12 horas (720 min), aplican horas extras sobre la tarifa de noche.
 */
export function calculateStayTime(
  startTimeIso: string,
  durationMinutes: number,
  extraHourPrice: number = 30,
  nowMs?: number,
  options?: {
    priceNight?: number;
    baseRoomPrice?: number;
    chosenPlan?: string;
  }
): OvertimeCalculation {
  const start = new Date(startTimeIso).getTime();
  const now = nowMs !== undefined ? nowMs : getNetworkTimestamp();
  const elapsedMs = Math.max(0, now - start);
  const totalElapsedMinutes = Math.floor(elapsedMs / (60 * 1000));

  const isAlreadyNightPlan = options?.chosenPlan === 'noche' || durationMinutes >= 720;
  const isCustomPlan =
    options?.chosenPlan === 'personalizado' ||
    options?.chosenPlan === 'custom' ||
    Boolean(options?.chosenPlan?.toLowerCase().includes('personalizado'));
  const isBonflixPlan =
    options?.chosenPlan === 'bonflix_2h' ||
    options?.chosenPlan === 'bonflix_4h' ||
    options?.chosenPlan === 'bonflix_150' ||
    options?.chosenPlan === 'bonflix_190' ||
    Boolean(options?.chosenPlan?.toLowerCase().includes('bonflix'));

  const priceNight = options?.priceNight || 140;
  const baseRoomPrice = options?.baseRoomPrice !== undefined ? options.baseRoomPrice : 45;

  // CASO 1: Ya era un plan de noche de 12 horas contratado desde el inicio
  if (isAlreadyNightPlan) {
    const totalAllocatedMs = 720 * 60 * 1000;
    const diffMs = totalAllocatedMs - elapsedMs;
    const percentElapsed = Math.min(100, (elapsedMs / totalAllocatedMs) * 100);

    if (diffMs >= 0) {
      const totalRemainingSec = Math.floor(diffMs / 1000);
      const remainingMinutes = Math.floor(totalRemainingSec / 60);
      const remainingSeconds = totalRemainingSec % 60;
      return {
        isOvertime: false,
        overtimeMinutes: 0,
        overtimeSeconds: 0,
        gracePeriodActive: false,
        extraBlocksCount: 0,
        extraBlockRate: 10,
        extraHoursCount: 0,
        extraHourRate: 10,
        overtimeCharge: 0,
        remainingMinutes,
        remainingSeconds,
        isWarning: remainingMinutes < 10,
        percentElapsed,
        autoNightConverted: false,
        totalElapsedMinutes,
        effectiveDurationMinutes: 720,
      };
    } else {
      const totalOvertimeSec = Math.floor(Math.abs(diffMs) / 1000);
      const overtimeMinutes = Math.floor(totalOvertimeSec / 60);
      const overtimeSeconds = totalOvertimeSec % 60;

      let overtimeCharge = 0;
      let gracePeriodActive = false;
      let extraBlocksCount = 0;

      if (overtimeMinutes <= 10) {
        gracePeriodActive = true;
        extraBlocksCount = 0;
        overtimeCharge = 0;
      } else {
        gracePeriodActive = false;
        extraBlocksCount = Math.ceil(overtimeMinutes / 20);
        overtimeCharge = extraBlocksCount * 10;
      }

      return {
        isOvertime: true,
        overtimeMinutes,
        overtimeSeconds,
        gracePeriodActive,
        extraBlocksCount,
        extraBlockRate: 10,
        extraHoursCount: extraBlocksCount,
        extraHourRate: 10,
        overtimeCharge,
        remainingMinutes: 0,
        remainingSeconds: 0,
        isWarning: false,
        percentElapsed: 100,
        autoNightConverted: false,
        totalElapsedMinutes,
        effectiveDurationMinutes: 720,
      };
    }
  }

  // CASO 2: PLAN PERSONALIZADO O PROMO BONFLIX (Tiempo acordado fijo)
  // No aplica pasar automáticamente al precio de noche. Se respeta el tiempo pactado y se cobra sobretiempo con tolerancia de 10 min.
  if (isCustomPlan || isBonflixPlan) {
    const totalAllocatedMs = durationMinutes * 60 * 1000;
    const diffMs = totalAllocatedMs - elapsedMs;
    const percentElapsed = Math.min(100, (elapsedMs / totalAllocatedMs) * 100);

    if (diffMs >= 0) {
      const totalRemainingSec = Math.floor(diffMs / 1000);
      const remainingMinutes = Math.floor(totalRemainingSec / 60);
      const remainingSeconds = totalRemainingSec % 60;
      return {
        isOvertime: false,
        overtimeMinutes: 0,
        overtimeSeconds: 0,
        gracePeriodActive: false,
        extraBlocksCount: 0,
        extraBlockRate: 10,
        extraHoursCount: 0,
        extraHourRate: 10,
        overtimeCharge: 0,
        remainingMinutes,
        remainingSeconds,
        isWarning: remainingMinutes < 10,
        percentElapsed,
        autoNightConverted: false,
        totalElapsedMinutes,
        effectiveDurationMinutes: durationMinutes,
      };
    } else {
      const totalOvertimeSec = Math.floor(Math.abs(diffMs) / 1000);
      const overtimeMinutes = Math.floor(totalOvertimeSec / 60);
      const overtimeSeconds = totalOvertimeSec % 60;

      let overtimeCharge = 0;
      let gracePeriodActive = false;
      let extraBlocksCount = 0;

      if (overtimeMinutes <= 10) {
        gracePeriodActive = true;
        extraBlocksCount = 0;
        overtimeCharge = 0;
      } else {
        gracePeriodActive = false;
        extraBlocksCount = Math.ceil(overtimeMinutes / 20);
        overtimeCharge = extraBlocksCount * 10; // 10 Bs por cada 20 min = 30 Bs adicionales por cada hora
      }

      return {
        isOvertime: true,
        overtimeMinutes,
        overtimeSeconds,
        gracePeriodActive,
        extraBlocksCount,
        extraBlockRate: 10,
        extraHoursCount: extraBlocksCount,
        extraHourRate: 10,
        overtimeCharge,
        remainingMinutes: 0,
        remainingSeconds: 0,
        isWarning: false,
        percentElapsed: 100,
        autoNightConverted: false,
        totalElapsedMinutes,
        effectiveDurationMinutes: durationMinutes,
      };
    }
  }

  // CASO 2: Empezó por horas (1h, 2h, 3h, etc.)
  // Si lleva hasta 3 horas (<= 180 min):
  if (totalElapsedMinutes <= 180) {
    const totalAllocatedMs = durationMinutes * 60 * 1000;
    const diffMs = totalAllocatedMs - elapsedMs;
    const percentElapsed = Math.min(100, (elapsedMs / totalAllocatedMs) * 100);

    if (diffMs >= 0) {
      // Dentro de su tiempo inicial
      const totalRemainingSec = Math.floor(diffMs / 1000);
      const remainingMinutes = Math.floor(totalRemainingSec / 60);
      const remainingSeconds = totalRemainingSec % 60;
      return {
        isOvertime: false,
        overtimeMinutes: 0,
        overtimeSeconds: 0,
        gracePeriodActive: false,
        extraBlocksCount: 0,
        extraBlockRate: 10,
        extraHoursCount: 0,
        extraHourRate: 10,
        overtimeCharge: 0,
        remainingMinutes,
        remainingSeconds,
        isWarning: remainingMinutes < 10,
        percentElapsed,
        autoNightConverted: false,
        totalElapsedMinutes,
        effectiveDurationMinutes: durationMinutes,
      };
    } else {
      // Entre su duración y las 3 horas: Horas extras
      const totalOvertimeSec = Math.floor(Math.abs(diffMs) / 1000);
      const overtimeMinutes = Math.floor(totalOvertimeSec / 60);
      const overtimeSeconds = totalOvertimeSec % 60;

      let overtimeCharge = 0;
      let gracePeriodActive = false;
      let extraBlocksCount = 0;

      if (overtimeMinutes <= 10) {
        gracePeriodActive = true;
        extraBlocksCount = 0;
        overtimeCharge = 0;
      } else {
        gracePeriodActive = false;
        extraBlocksCount = Math.ceil(overtimeMinutes / 20);
        const rawOvertimeCharge = extraBlocksCount * 10;
        const maxNightDifference = Math.max(0, priceNight - baseRoomPrice);
        overtimeCharge = Math.min(rawOvertimeCharge, maxNightDifference);
      }

      return {
        isOvertime: true,
        overtimeMinutes,
        overtimeSeconds,
        gracePeriodActive,
        extraBlocksCount,
        extraBlockRate: 10,
        extraHoursCount: extraBlocksCount,
        extraHourRate: 10,
        overtimeCharge,
        remainingMinutes: 0,
        remainingSeconds: 0,
        isWarning: false,
        percentElapsed: 100,
        autoNightConverted: false,
        totalElapsedMinutes,
        effectiveDurationMinutes: durationMinutes,
      };
    }
  }

  // CASO 3: PASÓ LAS 3 HORAS (> 180 min)
  // CONVERSIÓN AUTOMÁTICA A TARIFA DE NOCHE (12 HORAS / 720 MINUTOS)
  const totalNightAllocatedMs = 720 * 60 * 1000;
  const nightDiffMs = totalNightAllocatedMs - elapsedMs;
  const percentElapsed = Math.min(100, (elapsedMs / totalNightAllocatedMs) * 100);

  // Recargo de ajuste para que Tarifa Base + Recargo = Precio de Noche
  const nightConversionCharge = Math.max(0, priceNight - baseRoomPrice);

  if (nightDiffMs >= 0) {
    // Está entre la hora 3 y la hora 12: ¡Tiene derecho a las 12 horas completas de noche!
    const totalRemainingSec = Math.floor(nightDiffMs / 1000);
    const remainingMinutes = Math.floor(totalRemainingSec / 60);
    const remainingSeconds = totalRemainingSec % 60;

    return {
      isOvertime: false, // Ahora está cubierto dentro de sus 12 horas de noche
      overtimeMinutes: 0,
      overtimeSeconds: 0,
      gracePeriodActive: false,
      extraBlocksCount: 0,
      extraBlockRate: 10,
      extraHoursCount: 0,
      extraHourRate: 10,
      overtimeCharge: nightConversionCharge,
      remainingMinutes,
      remainingSeconds,
      isWarning: remainingMinutes < 10,
      percentElapsed,
      autoNightConverted: true,
      nightPriceApplied: priceNight,
      totalElapsedMinutes,
      effectiveDurationMinutes: 720,
    };
  } else {
    // Superó incluso las 12 horas completas:
    const totalOvertimeSec = Math.floor(Math.abs(nightDiffMs) / 1000);
    const overtimeMinutes = Math.floor(totalOvertimeSec / 60);
    const overtimeSeconds = totalOvertimeSec % 60;

    let extraAfterNight = 0;
    let gracePeriodActive = false;
    let extraBlocksCount = 0;

    if (overtimeMinutes <= 10) {
      gracePeriodActive = true;
      extraBlocksCount = 0;
      extraAfterNight = 0;
    } else {
      gracePeriodActive = false;
      extraBlocksCount = Math.ceil(overtimeMinutes / 20);
      extraAfterNight = extraBlocksCount * 10;
    }

    return {
      isOvertime: true,
      overtimeMinutes,
      overtimeSeconds,
      gracePeriodActive,
      extraBlocksCount,
      extraBlockRate: 10,
      extraHoursCount: extraBlocksCount,
      extraHourRate: 10,
      overtimeCharge: nightConversionCharge + extraAfterNight,
      remainingMinutes: 0,
      remainingSeconds: 0,
      isWarning: false,
      percentElapsed: 100,
      autoNightConverted: true,
      nightPriceApplied: priceNight,
      totalElapsedMinutes,
      effectiveDurationMinutes: 720,
    };
  }
}

/**
 * Formatear minutos y segundos en MM:SS o HH:MM:SS
 */
export function formatTimerDisplay(minutes: number, seconds: number): string {
  const m = Math.floor(minutes);
  const s = Math.floor(seconds);

  if (m >= 60) {
    const hours = Math.floor(m / 60);
    const remMinutes = m % 60;
    return `${hours.toString().padStart(2, '0')}:${remMinutes.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const BOLIVIA_TIMEZONE = 'America/La_Paz';

/**
 * Obtiene la fecha en formato YYYY-MM-DD en la zona horaria oficial de Bolivia (America/La_Paz, UTC-4).
 * Es inmune a la zona horaria del sistema operativo del cliente.
 */
export function getBoliviaDateKey(dateInput?: Date | string | number): string {
  try {
    const d = dateInput !== undefined
      ? (typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput)
      : new Date();
    return new Intl.DateTimeFormat('en-CA', { timeZone: BOLIVIA_TIMEZONE }).format(d);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/**
 * Obtiene el timestamp en milisegundos correspondiente al inicio del día (00:00:00.000) en hora de Bolivia.
 */
export function getBoliviaStartOfDay(dateInput?: Date | string | number): number {
  const dateKey = getBoliviaDateKey(dateInput);
  return Date.parse(`${dateKey}T00:00:00-04:00`);
}

/**
 * Obtiene el timestamp en milisegundos correspondiente al inicio del mes (día 1 a las 00:00:00.000) en hora de Bolivia.
 */
export function getBoliviaStartOfMonth(dateInput?: Date | string | number): number {
  const dateKey = getBoliviaDateKey(dateInput);
  return Date.parse(`${dateKey.slice(0, 7)}-01T00:00:00-04:00`);
}

/**
 * Obtiene la hora exacta (0-23) en la zona horaria de Bolivia.
 */
export function getBoliviaHour(dateInput?: Date | string | number): number {
  try {
    const d = dateInput !== undefined
      ? (typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput)
      : new Date();
    const str = new Intl.DateTimeFormat('en-US', {
      timeZone: BOLIVIA_TIMEZONE,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(d);
    return parseInt(str, 10);
  } catch {
    return new Date().getHours();
  }
}

/**
 * Obtiene el día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado) en hora de Bolivia.
 */
export function getBoliviaDayOfWeek(dateInput?: Date | string | number): number {
  try {
    const d = dateInput !== undefined
      ? (typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput)
      : new Date();
    const weekdayStr = new Intl.DateTimeFormat('en-US', {
      timeZone: BOLIVIA_TIMEZONE,
      weekday: 'short',
    }).format(d);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[weekdayStr] ?? 0;
  } catch {
    return new Date().getDay();
  }
}

export function formatTimeOnly(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-BO', {
      timeZone: BOLIVIA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--:--';
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-BO', {
      timeZone: BOLIVIA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--/--/----';
  }
}

export function formatDateOnly(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-BO', {
      timeZone: BOLIVIA_TIMEZONE,
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '--/--/----';
  }
}

/**
 * Obtener rango de lunes a domingo para reportes semanales (ISO Week) fijado estrictamente en hora de Bolivia.
 */
export function getWeekRange(dateInput: Date | string): {
  weekKey: string;
  startDate: string;
  endDate: string;
  label: string;
} {
  const todayStartMs = getBoliviaStartOfDay(dateInput);
  const day = getBoliviaDayOfWeek(dateInput);
  // Monday is 1, Sunday is 0
  const diffToMondayDays = day === 0 ? -6 : 1 - day;
  const mondayStartMs = todayStartMs + (diffToMondayDays * 24 * 60 * 60 * 1000);
  const sundayEndMs = mondayStartMs + (7 * 24 * 60 * 60 * 1000) - 1;

  const monday = new Date(mondayStartMs);
  const sunday = new Date(sundayEndMs);

  const mondayYear = parseInt(getBoliviaDateKey(mondayStartMs).slice(0, 4), 10);
  const jan4Ms = Date.parse(`${mondayYear}-01-04T00:00:00-04:00`);
  const jan4Day = getBoliviaDayOfWeek(jan4Ms);
  const jan4MondayMs = jan4Ms - ((jan4Day === 0 ? 6 : jan4Day - 1) * 86400000);
  const weekNumber = 1 + Math.round((mondayStartMs - jan4MondayMs) / (7 * 86400000));

  const weekKey = `${mondayYear}-W${Math.max(1, weekNumber).toString().padStart(2, '0')}`;
  const label = `Semana ${Math.max(1, weekNumber)} (${monday.toLocaleDateString('es-BO', { timeZone: BOLIVIA_TIMEZONE, day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('es-BO', { timeZone: BOLIVIA_TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' })})`;

  return {
    weekKey,
    startDate: monday.toISOString(),
    endDate: sunday.toISOString(),
    label,
  };
}
