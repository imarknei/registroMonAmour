import { Shift, Stay } from '../types';

export interface StayContribution {
  isEntryInThisShift: boolean;
  isCheckoutInThisShift: boolean;
  isPrepaid: boolean;
  prepCash: number;
  prepVendis: number;
  prepUnion: number;
  prepTotal: number;
  consCash: number;
  consVendis: number;
  consUnion: number;
  finalCash: number;
  finalVendis: number;
  finalUnion: number;
  finalTotal: number;
  shiftCash: number;
  shiftQrVendis: number;
  shiftQrUnion: number;
  shiftTotal: number;
}

/**
 * Calcula con exactitud y aislamiento total de canales cuánto dinero aportó
 * una estadía específica a un turno dado (en efectivo, QR Vendis y QR Unión).
 */
export const getStayContribution = (s: Stay, targetShift: Shift): StayContribution => {
  const shiftStartTime = new Date(targetShift.startTime).getTime();
  const shiftEndTime = targetShift.endTime ? new Date(targetShift.endTime).getTime() : Infinity;

  const stayStartTime = new Date(s.startTime).getTime();
  const stayEndTime = s.endTime ? new Date(s.endTime).getTime() : null;
  const matchesReceptionist = s.receptionistId === targetShift.receptionistId;

  const isEntryInThisShift = s.entryShiftId
    ? s.entryShiftId === targetShift.id
    : (!s.entryShiftId && matchesReceptionist && stayStartTime >= shiftStartTime && stayStartTime <= shiftEndTime);

  // REGLA CRÍTICA: Una estadía SOLO puede computar cobro de salida si REALMENTE se completó
  // y tiene endTime definido dentro del turno. Las habitaciones activas NUNCA tienen cobro de salida.
  const isStayCompleted = s.status === 'completed' && Boolean(s.endTime);
  const isCheckoutInThisShift = isStayCompleted && (s.checkoutShiftId
    ? s.checkoutShiftId === targetShift.id
    : (!s.checkoutShiftId && (s.checkoutReceptionistId === targetShift.receptionistId || matchesReceptionist) && stayEndTime !== null && stayEndTime >= shiftStartTime && stayEndTime <= shiftEndTime));

  // 1. Prepago / Adelanto al ingresar
  let prepCash = 0;
  let prepVendis = 0;
  let prepUnion = 0;
  if (s.isPrepaid) {
    prepCash = s.prepaidCash || 0;
    prepVendis = s.prepaidQrVendis || 0;
    prepUnion = s.prepaidQrUnion || 0;
    if (prepCash === 0 && prepVendis === 0 && prepUnion === 0) {
      const pAmt = s.prepaidAmount || s.baseRoomPrice || 0;
      if (s.paymentMethod === 'efectivo') prepCash = pAmt;
      else if (s.paymentMethod === 'qr_vendis' || s.paymentMethod === 'qr') prepVendis = pAmt;
      else if (s.paymentMethod === 'qr_union') prepUnion = pAmt;
    }
  }
  const prepTotal = prepCash + prepVendis + prepUnion;

  // 2. Consumos pagados al momento
  let consCash = 0;
  let consVendis = 0;
  let consUnion = 0;
  (s.consumptions || []).forEach((c) => {
    const cTime = c.paidAt ? new Date(c.paidAt).getTime() : stayStartTime;
    const isThisShiftCons =
      c.isPaid &&
      (c.paidShiftId === targetShift.id ||
        (!c.paidShiftId && c.paidReceptionistId === targetShift.receptionistId) ||
        (!c.paidShiftId && matchesReceptionist && cTime >= shiftStartTime && cTime <= shiftEndTime));

    if (isThisShiftCons) {
      if (c.paymentMethod === 'efectivo') consCash += c.subtotal;
      else if (c.paymentMethod === 'qr_vendis' || c.paymentMethod === 'qr') consVendis += c.subtotal;
      else if (c.paymentMethod === 'qr_union') consUnion += c.subtotal;
    }
  });

  // 3. Saldo al salir / checkout
  let finalCash = 0;
  let finalVendis = 0;
  let finalUnion = 0;
  if (isCheckoutInThisShift) {
    let fc = s.finalCashPaid;
    let fv = s.finalQrVendisPaid;
    let fu = s.finalQrUnionPaid;
    if (fc === undefined && fv === undefined && fu === undefined) {
      if (s.isPrepaid) {
        fc = Math.max(0, (s.cashPaid || 0) - (s.prepaidCash || 0));
        fv = Math.max(0, (s.qrVendisPaid || 0) - (s.prepaidQrVendis || 0));
        fu = Math.max(0, (s.qrUnionPaid || 0) - (s.prepaidQrUnion || 0));
      } else {
        fc = s.cashPaid || 0;
        fv = s.qrVendisPaid || 0;
        fu = s.qrUnionPaid || 0;
        if (fc === 0 && fv === 0 && fu === 0) {
          const tot = s.totalAmount || s.baseRoomPrice || 0;
          if (s.paymentMethod === 'efectivo') fc = tot;
          else if (s.paymentMethod === 'qr_vendis' || s.paymentMethod === 'qr') fv = tot;
          else if (s.paymentMethod === 'qr_union') fu = tot;
        }
      }
    }
    finalCash = fc || 0;
    finalVendis = fv || 0;
    finalUnion = fu || 0;
  }

  // Totales recaudados en este turno
  let shiftCash = 0;
  let shiftQrVendis = 0;
  let shiftQrUnion = 0;

  if (isEntryInThisShift && s.isPrepaid) {
    shiftCash += prepCash;
    shiftQrVendis += prepVendis;
    shiftQrUnion += prepUnion;
  }

  shiftCash += consCash;
  shiftQrVendis += consVendis;
  shiftQrUnion += consUnion;

  if (isCheckoutInThisShift) {
    if (!isEntryInThisShift || !s.isPrepaid) {
      shiftCash += finalCash;
      shiftQrVendis += finalVendis;
      shiftQrUnion += finalUnion;
    } else {
      if (finalCash > 0) shiftCash += finalCash;
      if (finalVendis > 0) shiftQrVendis += finalVendis;
      if (finalUnion > 0) shiftQrUnion += finalUnion;
    }
  }

  const shiftTotal = shiftCash + shiftQrVendis + shiftQrUnion;

  return {
    isEntryInThisShift,
    isCheckoutInThisShift,
    isPrepaid: Boolean(s.isPrepaid),
    prepCash,
    prepVendis,
    prepUnion,
    prepTotal,
    consCash,
    consVendis,
    consUnion,
    finalCash,
    finalVendis,
    finalUnion,
    finalTotal: finalCash + finalVendis + finalUnion,
    shiftCash,
    shiftQrVendis,
    shiftQrUnion,
    shiftTotal,
  };
};
