export interface OvertimeCalculation {
  isOvertime: boolean;
  overtimeMinutes: number;
  overtimeSeconds: number;
  gracePeriodActive: boolean; // Primeros 10 minutos de espera -> 0 Bs de recargo
  extraBlocksCount: number; // Cantidad de fracciones de 20 min cobradas (1, 2, 3...)
  extraBlockRate: number; // Tarifa por fracción de 20 min (10 Bs)
  extraHoursCount: number; // Para compatibilidad (fracciones de 20 min)
  extraHourRate: number; // Tarifa por fracción (10 Bs)
  overtimeCharge: number; // 0 si está dentro de los 10 min de espera, o extraBlocksCount * 10 Bs
  remainingMinutes: number;
  remainingSeconds: number;
  isWarning: boolean; // Menos de 10 minutos restantes
  percentElapsed: number;
}

/**
 * Regla de Control de Tiempo y Recargos Motel Mon Amour:
 * - Cuenta regresiva hasta 0.
 * - Al llegar a 0, arranca el cronómetro de tiempo excedido.
 * - Durante los primeros 10 minutos de espera (0 a 10 min): 0 Bs (tolerancia gratuita de espera).
 * - A partir del minuto 11: cobra 10 Bs por cada 20 minutos de tiempo excedido:
 *   - Minutos 11 a 20: 10 Bs (1er bloque de 20 min)
 *   - Minutos 21 a 40: 20 Bs (2do bloque de 20 min)
 *   - Minutos 41 a 60: 30 Bs (3er bloque de 20 min)
 *   - Minutos 61 a 80: 40 Bs (4to bloque de 20 min)
 *   - etc., sucesivamente a 10 Bs por cada 20 minutos hasta la salida.
 */
export function calculateStayTime(
  startTimeIso: string,
  durationMinutes: number,
  extraHourPrice: number = 30,
  nowMs?: number
): OvertimeCalculation {
  const start = new Date(startTimeIso).getTime();
  const now = nowMs || Date.now();
  const elapsedMs = Math.max(0, now - start);
  const totalAllocatedMs = durationMinutes * 60 * 1000;
  
  const diffMs = totalAllocatedMs - elapsedMs;
  const percentElapsed = Math.min(100, (elapsedMs / totalAllocatedMs) * 100);

  if (diffMs >= 0) {
    // Aún dentro del tiempo pagado normal
    const totalRemainingSec = Math.floor(diffMs / 1000);
    const remainingMinutes = Math.floor(totalRemainingSec / 60);
    const remainingSeconds = totalRemainingSec % 60;
    const isWarning = remainingMinutes < 10;

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
      isWarning,
      percentElapsed,
    };
  } else {
    // Tiempo excedido (Cronómetro activo)
    const totalOvertimeSec = Math.floor(Math.abs(diffMs) / 1000);
    const overtimeMinutes = Math.floor(totalOvertimeSec / 60);
    const overtimeSeconds = totalOvertimeSec % 60;

    let overtimeCharge = 0;
    let gracePeriodActive = false;
    let extraBlocksCount = 0;

    // Regla de 10 minutos de espera gratuita:
    if (overtimeMinutes <= 10) {
      // De 0 a 10 minutos de espera: NO COBRA NADA (0 Bs)
      gracePeriodActive = true;
      extraBlocksCount = 0;
      overtimeCharge = 0;
    } else {
      // Minuto 11 en adelante: Cobra 10 Bs por cada 20 minutos de cronómetro
      // Minutos 11 a 20: 1 bloque -> 10 Bs
      // Minutos 21 a 40: 2 bloques -> 20 Bs
      // Minutos 41 a 60: 3 bloques -> 30 Bs
      // Minutos 61 a 80: 4 bloques -> 40 Bs
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

export function formatTimeOnly(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('es-BO', {
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
 * Obtener rango de lunes a domingo para reportes semanales (ISO Week)
 */
export function getWeekRange(dateInput: Date | string): {
  weekKey: string;
  startDate: string;
  endDate: string;
  label: string;
} {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  const day = d.getDay();
  // Monday is 1, Sunday is 0
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // ISO Week number
  const tempDate = new Date(monday.getTime());
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);

  const weekKey = `${monday.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  
  const label = `Semana ${weekNumber} (${monday.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' })})`;

  return {
    weekKey,
    startDate: monday.toISOString(),
    endDate: sunday.toISOString(),
    label,
  };
}
