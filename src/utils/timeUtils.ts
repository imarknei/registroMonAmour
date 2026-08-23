export interface OvertimeCalculation {
  isOvertime: boolean;
  overtimeMinutes: number;
  overtimeSeconds: number;
  gracePeriodActive: boolean;
  overtimeCharge: number;
  remainingMinutes: number;
  remainingSeconds: number;
  isWarning: boolean; // Less than 10 minutes remaining
  percentElapsed: number;
}

/**
 * Calculates countdown, overtime, and penalty charge based on the exact rule:
 * - 0 - 5 min overtime: 0 Bs (Grace period)
 * - 6 - 20 min overtime: 10 Bs
 * - 21 - 30 min overtime: 20 Bs
 * - 31 - 40 min overtime: 30 Bs (+10 Bs per each 10 min block)
 */
export function calculateStayTime(startTimeIso: string, durationMinutes: number): OvertimeCalculation {
  const start = new Date(startTimeIso).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - start);
  const totalAllocatedMs = durationMinutes * 60 * 1000;
  
  const diffMs = totalAllocatedMs - elapsedMs;
  const percentElapsed = Math.min(100, (elapsedMs / totalAllocatedMs) * 100);

  if (diffMs >= 0) {
    // Still in normal paid time
    const totalRemainingSec = Math.floor(diffMs / 1000);
    const remainingMinutes = Math.floor(totalRemainingSec / 60);
    const remainingSeconds = totalRemainingSec % 60;
    const isWarning = remainingMinutes < 10;

    return {
      isOvertime: false,
      overtimeMinutes: 0,
      overtimeSeconds: 0,
      gracePeriodActive: false,
      overtimeCharge: 0,
      remainingMinutes,
      remainingSeconds,
      isWarning,
      percentElapsed,
    };
  } else {
    // Exceeded allocated time
    const totalOvertimeSec = Math.floor(Math.abs(diffMs) / 1000);
    const overtimeMinutes = Math.floor(totalOvertimeSec / 60);
    const overtimeSeconds = totalOvertimeSec % 60;

    let overtimeCharge = 0;
    let gracePeriodActive = false;

    if (overtimeMinutes <= 5) {
      gracePeriodActive = true;
      overtimeCharge = 0;
    } else if (overtimeMinutes <= 20) {
      overtimeCharge = 10;
    } else {
      // 21 min onwards -> 10 + ceil((min - 20) / 10) * 10
      const extraBlocks = Math.ceil((overtimeMinutes - 20) / 10);
      overtimeCharge = 10 + extraBlocks * 10;
    }

    return {
      isOvertime: true,
      overtimeMinutes,
      overtimeSeconds,
      gracePeriodActive,
      overtimeCharge,
      remainingMinutes: 0,
      remainingSeconds: 0,
      isWarning: false,
      percentElapsed: 100,
    };
  }
}

/**
 * Format minutes and seconds into MM:SS or HH:MM:SS
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
 * Get the Monday and Sunday for the week of a given date (ISO Week)
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
