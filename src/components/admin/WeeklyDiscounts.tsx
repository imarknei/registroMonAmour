import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Shift, StaffMember, StaffConsumption, StaffSettlement, StaffSettlementDiscountItem } from '../../types';
import { formatBs, getPaymentMethodLabel } from '../../utils/formatUtils';
import { getWeekRange, formatDateTime, formatDateOnly } from '../../utils/timeUtils';
import {
  CalendarDays,
  UserCheck,
  AlertTriangle,
  DollarSign,
  QrCode,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  Coffee,
  Coins,
  Receipt,
  Plus,
  Trash2,
  Clock,
  Building,
  Check,
  X,
  History,
  CreditCard,
  Edit3,
} from 'lucide-react';
import { StaffSettlementReceiptModal } from '../StaffSettlementReceiptModal';
import { ShiftAdjustmentModal } from './ShiftAdjustmentModal';

export const WeeklyDiscounts: React.FC = () => {
  const {
    shiftsHistory,
    staffConsumptions,
    staffSettlements,
    staffMembers,
    recordStaffSettlement,
    removeStaffConsumption,
    currentUser,
    updateShiftInHistory,
  } = useApp();

  const currentWeekInfo = getWeekRange(new Date());
  const [selectedWeekKey, setSelectedWeekKey] = useState<string>(currentWeekInfo.weekKey);
  const [activeTab, setActiveTab] = useState<'settlement' | 'history' | 'consumptions'>('settlement');

  // Selected staff for payroll settlement
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffMembers[0]?.id || 'user-recep-dia');
  const [baseSalaryInput, setBaseSalaryInput] = useState<string>('700');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'qr'>('efectivo');
  const [notes, setNotes] = useState<string>('');
  const [adjustingShift, setAdjustingShift] = useState<Shift | null>(null);

  // Selected discounts toggles (IDs of shifts & consumptions to include in deduction)
  const [selectedShiftShortageIds, setSelectedShiftShortageIds] = useState<Record<string, boolean>>({});
  const [selectedConsumptionIds, setSelectedConsumptionIds] = useState<Record<string, boolean>>({});

  // Additional custom discount
  const [customDiscountDesc, setCustomDiscountDesc] = useState<string>('');
  const [customDiscountAmount, setCustomDiscountAmount] = useState<string>('');

  // Receipt Modal
  const [viewingSettlement, setViewingSettlement] = useState<StaffSettlement | null>(null);

  // Weeks list
  const allWeekKeys = Array.from(
    new Set([
      currentWeekInfo.weekKey,
      ...shiftsHistory.map((s) => getWeekRange(s.endTime || s.startTime).weekKey),
      ...staffConsumptions.map((c) => getWeekRange(c.date).weekKey),
    ])
  ).sort().reverse();

  const currentSelectedWeekRange = getWeekRange(new Date());
  const weekStart = currentSelectedWeekRange.startDate;
  const weekEnd = currentSelectedWeekRange.endDate;

  const currentStaff = staffMembers.find((m) => m.id === selectedStaffId) || staffMembers[0];

  // Shifts of selected staff for this week (or generally by receptionist name/id)
  const staffShifts = shiftsHistory.filter((s) => {
    const isStaff =
      s.receptionistId === selectedStaffId ||
      s.receptionistName?.toLowerCase().includes(currentStaff?.name.toLowerCase()) ||
      s.responsiblePersonName?.toLowerCase().includes(currentStaff?.name.toLowerCase());
    const shiftWeek = getWeekRange(s.endTime || s.startTime).weekKey;
    return isStaff && shiftWeek === selectedWeekKey;
  });

  // Shifts with shortage
  const shiftsWithShortage = staffShifts.filter((s) => (s.discountAmount || 0) > 0);

  // Consumptions of selected staff that belong to this week or are unpaid (excluyendo los ya pagados en el acto)
  const staffUnsettledConsumptions = staffConsumptions.filter((c) => {
    const isStaff =
      c.staffId === selectedStaffId ||
      c.staffName?.toLowerCase().includes(currentStaff?.name.toLowerCase());
    return isStaff && !c.isSettled && !c.isPaid;
  });

  // Detección de posibles retiros no anotados al cierre
  const isSuspiciousWithdrawal = (s: Shift) => {
    const hasDeficit = (s.discountAmount || 0) > 0 || (s.totalDifference && s.totalDifference < -0.01);
    const noDelivered = !s.cashDeliveredAtClose || s.cashDeliveredAtClose === 0;
    const hasCashSales = (s.expectedCash || 0) > 0;
    const floatOnly = s.totalPhysicalCashInDrawer === s.handoverCashFloat || (s.declaredCash || 0) === 0;
    const deficitMatchesSales = (s.discountAmount || 0) >= (s.expectedCash || 0) * 0.8;
    return hasDeficit && noDelivered && hasCashSales && (floatOnly || deficitMatchesSales);
  };

  const handleQuickRepairShift = (s: Shift) => {
    const floatLeft = s.handoverCashFloat !== undefined ? s.handoverCashFloat : (s.initialCashFloat || 100);
    updateShiftInHistory(s.id, {
      cashDeliveredAtClose: s.expectedCash,
      totalPhysicalCashInDrawer: floatLeft + (s.expectedCash || 0),
      declaredQrVendis: s.declaredQrVendis || s.expectedQrVendis || 0,
      declaredQrUnion: s.declaredQrUnion || s.expectedQrUnion || 0,
      notes: (s.notes ? s.notes + ' | ' : '') + 'Asentado retiro de ventas en efectivo entregado a administración.',
    });
  };

  const handleQuickRepairAllWeekShifts = () => {
    const suspicious = shiftsWithShortage.filter(isSuspiciousWithdrawal);
    if (suspicious.length === 0) return;
    suspicious.forEach((s) => handleQuickRepairShift(s));
  };

  // Auto-initialize selected discounts checkboxes when staff or week changes
  React.useEffect(() => {
    if (currentStaff?.defaultWeeklySalary) {
      setBaseSalaryInput(currentStaff.defaultWeeklySalary.toString());
    }

    const initShifts: Record<string, boolean> = {};
    shiftsWithShortage.forEach((s) => {
      if (!s.isSettled) {
        // Desmarcar por defecto si es un posible retiro de ventas no anotado para no castigar sueldo injustamente
        initShifts[s.id] = !isSuspiciousWithdrawal(s);
      }
    });
    setSelectedShiftShortageIds(initShifts);

    const initCons: Record<string, boolean> = {};
    staffUnsettledConsumptions.forEach((c) => {
      initCons[c.id] = true;
    });
    setSelectedConsumptionIds(initCons);
  }, [selectedStaffId, selectedWeekKey]);

  // Calculations
  const numBaseSalary = parseFloat(baseSalaryInput) || 0;
  const numCustomDiscount = parseFloat(customDiscountAmount) || 0;

  // Selected shift shortage total
  const selectedShortageTotal = shiftsWithShortage.reduce((sum, s) => {
    if (selectedShiftShortageIds[s.id] && !s.isSettled) {
      return sum + (s.discountAmount || 0);
    }
    return sum;
  }, 0);

  // Selected consumptions total
  const selectedConsumptionTotal = staffUnsettledConsumptions.reduce((sum, c) => {
    if (selectedConsumptionIds[c.id]) {
      return sum + c.totalAmount;
    }
    return sum;
  }, 0);

  const totalDiscounts = selectedShortageTotal + selectedConsumptionTotal + numCustomDiscount;
  const netPaidAmount = Math.max(0, numBaseSalary - totalDiscounts);

  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff) return;

    // Build discount items list
    const discountItems: StaffSettlementDiscountItem[] = [];

    shiftsWithShortage.forEach((s) => {
      if (selectedShiftShortageIds[s.id] && !s.isSettled && (s.discountAmount || 0) > 0) {
        discountItems.push({
          id: `disc-shift-${s.id}`,
          type: 'shift_shortage',
          refId: s.id,
          description: `Faltante Turno ${s.shiftType === 'noche' ? 'Noche' : 'Día'} (${formatDateOnly(s.endTime || s.startTime)})`,
          amount: s.discountAmount || 0,
          date: s.endTime || s.startTime,
        });
      }
    });

    staffUnsettledConsumptions.forEach((c) => {
      if (selectedConsumptionIds[c.id]) {
        const prodSummary = c.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ');
        discountItems.push({
          id: `disc-cons-${c.id}`,
          type: 'staff_consumption',
          refId: c.id,
          description: `Consumo Minibar: ${prodSummary} (${formatDateOnly(c.date)})`,
          amount: c.totalAmount,
          date: c.date,
        });
      }
    });

    if (numCustomDiscount > 0) {
      discountItems.push({
        id: `disc-custom-${Date.now()}`,
        type: 'custom_discount',
        description: customDiscountDesc.trim() || 'Descuento / Adelanto acordado',
        amount: numCustomDiscount,
        date: new Date().toISOString(),
      });
    }

    const newSettlement = recordStaffSettlement({
      staffId: currentStaff.id,
      staffName: currentStaff.name,
      periodStart: weekStart,
      periodEnd: weekEnd,
      weekKey: selectedWeekKey,
      baseSalary: numBaseSalary,
      daysWorkedCount: staffShifts.length,
      shiftsWorkedCount: staffShifts.length,
      discounts: discountItems,
      totalDiscounts,
      netPaidAmount,
      notes: notes.trim() || undefined,
      paymentMethod,
    });

    setViewingSettlement(newSettlement);
    setCustomDiscountDesc('');
    setCustomDiscountAmount('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-brand-600" />
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Pagos Semanales y Liquidación por Personal
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Liquidación de sueldos con deducción automática de faltantes de caja y consumo de personal.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('settlement')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'settlement'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Liquidar Pago
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial de Pagos ({staffSettlements.length})
          </button>

          <button
            onClick={() => setActiveTab('consumptions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'consumptions'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coffee className="w-3.5 h-3.5" />
            Consumos Personal ({staffConsumptions.length})
          </button>
        </div>
      </div>

      {/* TAB 1: LIQUIDACIÓN Y PAGO SEMANAL */}
      {activeTab === 'settlement' && (
        <div className="space-y-6">
          {/* Selectores de Personal y Semana */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-brand-600" />
                Seleccionar Personal / Empleado
              </label>
              <div className="grid grid-cols-2 gap-2">
                {staffMembers.map((staff) => (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedStaffId === staff.id
                        ? 'border-brand-600 bg-rose-50/80 text-brand-900 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs block font-bold leading-tight">{staff.name}</span>
                    <span className="text-[10px] text-slate-400 block">{staff.shiftName || staff.role}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-brand-600" />
                Semana a Liquidar
              </label>
              <select
                value={selectedWeekKey}
                onChange={(e) => setSelectedWeekKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {allWeekKeys.map((wKey) => (
                  <option key={wKey} value={wKey}>
                    {wKey === currentWeekInfo.weekKey ? `⭐ Esta Semana (${wKey})` : `Semana ${wKey}`}
                  </option>
                ))}
              </select>

              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Turnos trabajados en la semana:</span>
                <strong className="font-mono text-slate-900 font-black">{staffShifts.length} turnos</strong>
              </div>
            </div>
          </div>

          {/* Formulario de Liquidación */}
          <form onSubmit={handleConfirmSettlement} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            {/* Header del Empleado */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Planilla de Liquidación Semanal
                </span>
                <h3 className="text-xl font-black text-slate-900">{currentStaff.name}</h3>
                <span className="text-xs text-slate-500">{currentStaff.shiftName || currentStaff.role}</span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Semana</span>
                <span className="font-mono font-black text-brand-700 text-base">{selectedWeekKey}</span>
              </div>
            </div>

            {/* 1. Sueldo Base a Pagar */}
            <div className="bg-emerald-50/60 p-4 rounded-2xl border-2 border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  1. Monto Base Acordado a Pagar (Bs) <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                  {formatBs(numBaseSalary)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Monto del sueldo base o jornal semanal acordado con el empleado.
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={baseSalaryInput}
                  onChange={(e) => setBaseSalaryInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-emerald-300 font-mono font-black text-base text-slate-900 bg-white focus:outline-none focus:border-emerald-600"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Bs
                </span>
              </div>
            </div>

            {/* 2. Faltantes de Caja en Turnos Trabajados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  2. Faltantes de Caja en sus Turnos ({shiftsWithShortage.length})
                </span>
                <span className="text-xs font-bold text-rose-700 font-mono">
                  Deducción seleccionada: -{formatBs(selectedShortageTotal)}
                </span>
              </div>

              {shiftsWithShortage.length === 0 ? (
                <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ¡Excelente! Este empleado no tiene ningún faltante de caja registrado en esta semana.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {shiftsWithShortage.some(isSuspiciousWithdrawal) && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Se detectaron <strong>{shiftsWithShortage.filter(isSuspiciousWithdrawal).length} turnos</strong> con posibles retiros de ventas no anotados. Se han <strong>desmarcado automáticamente</strong> para no descontarlos del sueldo.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleQuickRepairAllWeekShifts}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-black shrink-0 shadow-sm transition-all"
                      >
                        ⚡ Asentar Retiros y Cuadrar
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {shiftsWithShortage.map((shift) => {
                      const isChecked = selectedShiftShortageIds[shift.id] ?? true;
                      const isSuspicious = isSuspiciousWithdrawal(shift);
                      return (
                        <div
                          key={shift.id}
                          className={`p-3 rounded-xl border transition-all ${
                            shift.isSettled
                              ? 'bg-slate-50 border-slate-200 opacity-60'
                              : isChecked
                              ? 'bg-rose-50/70 border-rose-300'
                              : isSuspicious
                              ? 'bg-amber-50/50 border-amber-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                disabled={shift.isSettled}
                                checked={shift.isSettled ? false : isChecked}
                                onChange={(e) =>
                                  setSelectedShiftShortageIds((prev) => ({
                                    ...prev,
                                    [shift.id]: e.target.checked,
                                  }))
                                }
                                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900">
                                    Turno {shift.shiftType === 'noche' ? 'Noche' : 'Día'} • {formatDateTime(shift.endTime || shift.startTime)}
                                  </span>
                                  {isSuspicious && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black">
                                      ⚠️ Retiro no anotado
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500">
                                  Entregado por: {shift.responsiblePersonName || shift.receptionistName} | Ventas Efectivo: {formatBs(shift.expectedCash)}
                                </span>
                              </div>
                            </label>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {isSuspicious && !shift.isSettled && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickRepairShift(shift)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-lg text-[10px] font-black flex items-center gap-1 shadow-sm transition-all"
                                  title="Asentar retiro de ventas en efectivo y cuadrar turno a 0.00 Bs"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>⚡ Cuadrar</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setAdjustingShift(shift)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-300 flex items-center gap-1 transition-colors"
                                title="Editar arqueo y retiros"
                              >
                                <Edit3 className="w-3 h-3 text-slate-500" />
                                <span>Ajustar</span>
                              </button>

                              <div>
                                {shift.isSettled ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                    ✓ Ya Liquidado
                                  </span>
                                ) : (
                                  <span className="font-mono font-black text-xs text-rose-700">
                                    -{formatBs(shift.discountAmount || 0)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Consumos de Personal Acumulados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-600" />
                  3. Consumo de Minibar del Personal ({staffUnsettledConsumptions.length} pendientes)
                </span>
                <span className="text-xs font-bold text-amber-700 font-mono">
                  Deducción seleccionada: -{formatBs(selectedConsumptionTotal)}
                </span>
              </div>

              {staffUnsettledConsumptions.length === 0 ? (
                <div className="p-3.5 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 text-xs italic">
                  No hay consumos de minibar pendientes de descuento para este empleado.
                </div>
              ) : (
                <div className="space-y-2">
                  {staffUnsettledConsumptions.map((cons) => {
                    const isChecked = selectedConsumptionIds[cons.id] ?? true;
                    return (
                      <label
                        key={cons.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setSelectedConsumptionIds((prev) => ({
                                ...prev,
                                [cons.id]: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {cons.items.map((it) => `${it.quantity}x ${it.productName}`).join(' + ')}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Fecha: {formatDateTime(cons.date)} {cons.notes ? `• "${cons.notes}"` : ''}
                            </span>
                          </div>
                        </div>

                        <span className="font-mono font-black text-xs text-amber-800">
                          -{formatBs(cons.totalAmount)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Otros Descuentos / Ajustes Manuales */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                4. Otros Descuentos o Adelantos (Opcional)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Motivo (Ej. Adelanto en efectivo 100 Bs)..."
                  value={customDiscountDesc}
                  onChange={(e) => setCustomDiscountDesc(e.target.value)}
                  className="px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />

                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Monto a descontar (0.00)"
                    value={customDiscountAmount}
                    onChange={(e) => setCustomDiscountAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                    Bs
                  </span>
                </div>
              </div>
            </div>

            {/* RESUMEN FINANCIERO Y CÁLCULO NETO */}
            <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 text-white rounded-2xl space-y-3 shadow-lg">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-300 border-b border-slate-700 pb-2">
                Resumen de Liquidación y Pago Neto
              </h4>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Sueldo Base Semanal:</span>
                  <span className="font-mono font-bold text-white">+{formatBs(numBaseSalary)}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>(-) Descuento Faltantes de Caja Seleccionados:</span>
                  <span className="font-mono font-bold">-{formatBs(selectedShortageTotal)}</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span>(-) Descuento Consumo de Minibar Seleccionado:</span>
                  <span className="font-mono font-bold">-{formatBs(selectedConsumptionTotal)}</span>
                </div>
                {numCustomDiscount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>(-) Otros Descuentos / Adelantos:</span>
                    <span className="font-mono font-bold">-{formatBs(numCustomDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-rose-300 font-bold pt-1 border-t border-slate-700">
                  <span>Total Deducciones:</span>
                  <span className="font-mono">-{formatBs(totalDiscounts)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block">
                    TOTAL NETO A PAGAR A {currentStaff.name.toUpperCase()}:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Dinero líquido a entregar al empleado
                  </span>
                </div>
                <span className="text-3xl font-black font-mono text-emerald-400">
                  {formatBs(netPaidAmount)}
                </span>
              </div>
            </div>

            {/* Método de Pago y Notas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Método de Pago Empleado
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'efectivo', label: 'Efectivo' },
                    { key: 'transferencia', label: 'Transferencia' },
                    { key: 'qr', label: 'QR Bancario' },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setPaymentMethod(m.key as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                        paymentMethod === m.key
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observaciones / Notas
                </label>
                <input
                  type="text"
                  placeholder="Ej. Pago realizado conforme sin reclamos..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* Botón de Confirmación */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Confirmar y Marcar Pago Realizado ({formatBs(netPaidAmount)})
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: HISTORIAL DE PAGOS REALIZADOS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-brand-600" />
              Historial de Liquidaciones Semanales Pagadas
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {staffSettlements.length} pagos registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Empleado</th>
                  <th className="py-3 px-4">Semana</th>
                  <th className="py-3 px-4 text-right">Sueldo Base</th>
                  <th className="py-3 px-4 text-right">Descuentos</th>
                  <th className="py-3 px-4 text-right">Neto Pagado</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4">Fecha Pago</th>
                  <th className="py-3 px-4 text-right">Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Aún no se han registrado pagos semanales.
                    </td>
                  </tr>
                ) : (
                  staffSettlements.map((settle) => (
                    <tr key={settle.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {settle.staffName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-700">
                        {settle.weekKey}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        {formatBs(settle.baseSalary)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-700">
                        -{formatBs(settle.totalDiscounts)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        {formatBs(settle.netPaidAmount)}
                      </td>
                      <td className="py-3.5 px-4 capitalize font-semibold">
                        {settle.paymentMethod}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDateTime(settle.paymentDate)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setViewingSettlement(settle)}
                          className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold rounded-lg border border-slate-200 text-xs transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONSUMOS DE PERSONAL REGISTRADOS */}
      {activeTab === 'consumptions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <Coffee className="w-4 h-4 text-brand-600" />
              Registro de Todos los Consumos del Personal
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {staffConsumptions.length} consumos registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Empleado</th>
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Productos Consumidos</th>
                  <th className="py-3 px-4 text-right">Total (Bs)</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffConsumptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay consumos de personal registrados aún.
                    </td>
                  </tr>
                ) : (
                  staffConsumptions.map((cons) => (
                    <tr key={cons.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {cons.staffName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatDateTime(cons.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">
                          {cons.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                        </span>
                        {cons.notes && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                            {cons.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-black text-brand-700">
                        {formatBs(cons.totalAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cons.isPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : cons.isSettled
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {cons.isPaid
                            ? `✓ Pagado en el Acto (${getPaymentMethodLabel(cons.paymentMethod || 'efectivo')})`
                            : cons.isSettled
                            ? '✓ Descontado en Pago Semanal'
                            : '⏳ Pendiente de Descuento'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!cons.isSettled && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar este consumo de ${cons.staffName} y reponer el stock?`)) {
                                removeStaffConsumption(cons.id, true);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
                            title="Anular y reponer stock"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE COMPROBANTE DE PAGO */}
      {viewingSettlement && (
        <StaffSettlementReceiptModal
          settlement={viewingSettlement}
          onClose={() => setViewingSettlement(null)}
        />
      )}

      {/* MODAL DE AJUSTE DE ARQUEO Y RETIROS */}
      <ShiftAdjustmentModal
        shift={adjustingShift}
        isOpen={!!adjustingShift}
        onClose={() => setAdjustingShift(null)}
      />
    </div>
  );
};
