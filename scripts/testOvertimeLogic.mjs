// Función exacta de calculateStayTime
function calculateStayTime(startTimeIso, durationMinutes, extraHourPrice = 30) {
  const start = new Date(startTimeIso).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - start);
  const totalAllocatedMs = durationMinutes * 60 * 1000;
  
  const diffMs = totalAllocatedMs - elapsedMs;
  const percentElapsed = Math.min(100, (elapsedMs / totalAllocatedMs) * 100);

  if (diffMs >= 0) {
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
    const totalOvertimeSec = Math.floor(Math.abs(diffMs) / 1000);
    const overtimeMinutes = Math.floor(totalOvertimeSec / 60);
    const overtimeSeconds = totalOvertimeSec % 60;

    let overtimeCharge = 0;
    let gracePeriodActive = false;
    let extraHoursCount = 0;

    if (overtimeMinutes <= 10) {
      gracePeriodActive = true;
      extraHoursCount = 0;
      overtimeCharge = 0;
    } else {
      gracePeriodActive = false;
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

function runTests() {
  console.log('--- INICIANDO PRUEBAS DE REGLA DE TIEMPO Y HORA EXTRA ---');

  const now = Date.now();

  // Caso 1: Dentro del tiempo (le quedan 20 minutos)
  const startCase1 = new Date(now - 40 * 60 * 1000).toISOString();
  const calc1 = calculateStayTime(startCase1, 60, 30);
  console.log('Caso 1 (Quedan 20 min):', {
    isOvertime: calc1.isOvertime,
    remainingMinutes: calc1.remainingMinutes,
    overtimeCharge: calc1.overtimeCharge,
  });
  if (calc1.isOvertime !== false || calc1.overtimeCharge !== 0) throw new Error('Fallo en Caso 1');

  // Caso 2: 5 minutos de tiempo excedido (Espera)
  const startCase2 = new Date(now - 65 * 60 * 1000).toISOString();
  const calc2 = calculateStayTime(startCase2, 60, 30);
  console.log('Caso 2 (Excedido 5 min):', {
    isOvertime: calc2.isOvertime,
    overtimeMinutes: calc2.overtimeMinutes,
    gracePeriodActive: calc2.gracePeriodActive,
    overtimeCharge: calc2.overtimeCharge,
  });
  if (!calc2.isOvertime || !calc2.gracePeriodActive || calc2.overtimeCharge !== 0) throw new Error('Fallo en Caso 2 (5 min espera)');

  // Caso 3: 10 minutos de tiempo excedido (Límite de espera gratuito)
  const startCase3 = new Date(now - 70 * 60 * 1000).toISOString();
  const calc3 = calculateStayTime(startCase3, 60, 30);
  console.log('Caso 3 (Excedido 10 min):', {
    isOvertime: calc3.isOvertime,
    overtimeMinutes: calc3.overtimeMinutes,
    gracePeriodActive: calc3.gracePeriodActive,
    overtimeCharge: calc3.overtimeCharge,
  });
  if (!calc3.isOvertime || !calc3.gracePeriodActive || calc3.overtimeCharge !== 0) throw new Error('Fallo en Caso 3 (10 min espera)');

  // Caso 4: 11 minutos de tiempo excedido en Habitación Ventilador (tarifa hora extra: 30 Bs)
  const startCase4 = new Date(now - 71 * 60 * 1000).toISOString();
  const calc4 = calculateStayTime(startCase4, 60, 30);
  console.log('Caso 4 (Excedido 11 min, tarifa 30 Bs):', {
    isOvertime: calc4.isOvertime,
    overtimeMinutes: calc4.overtimeMinutes,
    gracePeriodActive: calc4.gracePeriodActive,
    extraHoursCount: calc4.extraHoursCount,
    overtimeCharge: calc4.overtimeCharge,
  });
  if (!calc4.isOvertime || calc4.gracePeriodActive || calc4.extraHoursCount !== 1 || calc4.overtimeCharge !== 30) {
    throw new Error('Fallo en Caso 4 (11 min debe cobrar 30 Bs)');
  }

  // Caso 5: 11 minutos de tiempo excedido en Habitación Jacuzzi (tarifa hora extra: 40 Bs)
  const startCase5 = new Date(now - 71 * 60 * 1000).toISOString();
  const calc5 = calculateStayTime(startCase5, 60, 40);
  console.log('Caso 5 (Excedido 11 min, tarifa 40 Bs):', {
    isOvertime: calc5.isOvertime,
    overtimeMinutes: calc5.overtimeMinutes,
    gracePeriodActive: calc5.gracePeriodActive,
    extraHoursCount: calc5.extraHoursCount,
    overtimeCharge: calc5.overtimeCharge,
  });
  if (!calc5.isOvertime || calc5.gracePeriodActive || calc5.extraHoursCount !== 1 || calc5.overtimeCharge !== 40) {
    throw new Error('Fallo en Caso 5 (11 min Jacuzzi debe cobrar 40 Bs)');
  }

  // Caso 6: 72 minutos de tiempo excedido en Jacuzzi (1h 12m extra -> cobra 2 horas extras = 80 Bs)
  const startCase6 = new Date(now - 132 * 60 * 1000).toISOString();
  const calc6 = calculateStayTime(startCase6, 60, 40);
  console.log('Caso 6 (Excedido 72 min, tarifa 40 Bs):', {
    isOvertime: calc6.isOvertime,
    overtimeMinutes: calc6.overtimeMinutes,
    extraHoursCount: calc6.extraHoursCount,
    overtimeCharge: calc6.overtimeCharge,
  });
  if (calc6.extraHoursCount !== 2 || calc6.overtimeCharge !== 80) {
    throw new Error('Fallo en Caso 6 (72 min debe cobrar 2 horas = 80 Bs)');
  }

  console.log('🎉 ¡TODAS LAS PRUEBAS DE COBRO Y ESPERA PASARON EXITOSAMENTE!');
}

runTests();
