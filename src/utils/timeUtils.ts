export interface OvertimeCalculation {
  isOvertime: boolean;
  overtimeMinutes: number;
  overtimeSeconds: number;
  gracePeriodActive: boolean; // Primeros 10 minutos de espera -> 0 Bs de recargo
  extraHoursCount: number; // Cantidad de horas extras cobradas (1, 2, 3...)
  extraHourRate: number; // Tarifa por hora extra configurada para la habitación (ej. 30 Bs o 40 Bs)
  overtimeCharge: number; // 0 si está dentro de los 10 min de espera, o extraHoursCount * extraHourRate
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
 * - A partir del minuto 11: cobra automáticamente 1 hora extra completa con el precio configurado (30 Bs o 40 Bs según la habitación).
 * - Cada 60 minutos adicionales (con sus 10 min de tolerancia), se suma otra hora extra.
 */
export function calculateStayTime(
  startTimeIso: string,
  durationMinutes: number,
  extraHourPrice: number = 30
): OvertimeCalculation {
  const start = new Date(startTimeIso).getTime();
  const now = Date.now();
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
      extraHoursCount: 0,
      extraHourRate: extraHourPrice,
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
    let extraHoursCount = 0;

    // Regla de 10 minutos de espera:
    if (overtimeMinutes <= 10) {
      // De 0 a 10 minutos de espera: NO COBRA NADA (0 Bs)
      gracePeriodActive = true;
      extraHoursCount = 0;
      overtimeCharge = 0;
    } else {
      // Minuto 11 en adelante: Cobra 1 hora extra automáticamente (o más si excede 1h+10m)
      gracePeriodActive = false;
      // Minutos 11 a 70: 1 hora extra
      // Minutos 71 a 130: 2 horas extras
      extraHoursCount = 1 + Math.floor(Math.max(0, overtimeMinutes - 11) / 60);
      overtimeCharge = extraHoursCount * extraHourPrice;
    }

    return {
      isOvertime: true,
      overtimeMinutes,
      overtimeSeconds,
      gracePeriodActive,
      extraHoursCount,
      extraHourRate: extraHourPrice,
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
