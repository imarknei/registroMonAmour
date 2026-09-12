import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Stay, Shift } from '../types';
import { formatBs, getPaymentMethodLabel, getRoomTypeLabel } from '../utils/formatUtils';
import { formatDateTime, formatTimeOnly } from '../utils/timeUtils';
import { getStayContribution } from '../utils/shiftAuditUtils';
import {
  X,
  DollarSign,
  QrCode,
  Landmark,
  Receipt,
  MinusCircle,
  BedDouble,
  ShoppingBag,
  Coffee,
  Sparkles,
  Printer,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Coins,
  AlertCircle,
  ArrowDownLeft,
} from 'lucide-react';

interface LiveShiftAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveShiftAuditModal: React.FC<LiveShiftAuditModalProps> = ({ isOpen, onClose }) => {
  const {
    currentShift,
    currentUser,
    completedStays,
    rooms,
    extraConsumptions,
    staffConsumptions,
    expenses,
    incomes,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'rooms' | 'extras' | 'staff' | 'expenses' | 'incomes'>('rooms');

  // Todas las estadías que tuvieron actividad en el turno actual
  const shiftStays = useMemo(() => {
    if (!currentShift) return [];

    const shiftStart = new Date(currentShift.startTime).getTime();
    const shiftEnd = currentShift.endTime ? new Date(currentShift.endTime).getTime() : Infinity;
    const matchesReceptionist = (rId?: string) => rId === currentShift.receptionistId;

    const allStaysMap = new Map<string, Stay>();
    (completedStays || []).forEach((s) => {
      if (s && s.id) allStaysMap.set(s.id, s);
    });
    (rooms || []).forEach((r) => {
      if (r && r.currentStay && r.currentStay.id) {
        allStaysMap.set(r.currentStay.id, r.currentStay);
      }
    });

    const list: { stay: Stay; contribution: ReturnType<typeof getStayContribution> }[] = [];

    allStaysMap.forEach((s) => {
      if (s.status === 'cancelled') return;
      const start = new Date(s.startTime).getTime();
      const end = s.endTime ? new Date(s.endTime).getTime() : null;

      const isEntry = s.entryShiftId
        ? s.entryShiftId === currentShift.id
        : (!s.entryShiftId && matchesReceptionist(s.receptionistId) && start >= shiftStart && start <= shiftEnd);

      const isStayCompleted = s.status === 'completed' && Boolean(s.endTime);
      const isCheckout = isStayCompleted && (s.checkoutShiftId
        ? s.checkoutShiftId === currentShift.id
        : (!s.checkoutShiftId && (matchesReceptionist(s.checkoutReceptionistId) || matchesReceptionist(s.receptionistId)) && end !== null && end >= shiftStart && end <= shiftEnd));

      const hasCons = (s.consumptions || []).some((c) => {
        if (!c.isPaid) return false;
        const cTime = c.paidAt ? new Date(c.paidAt).getTime() : start;
        return (
          c.paidShiftId === currentShift.id ||
          (!c.paidShiftId && matchesReceptionist(c.paidReceptionistId)) ||
          (!c.paidShiftId && matchesReceptionist(s.receptionistId) && cTime >= shiftStart && cTime <= shiftEnd)
        );
      });

      if (isEntry || isCheckout || hasCons) {
        const contribution = getStayContribution(s, currentShift);
        list.push({ stay: s, contribution });
      }
    });

    // Ordenar de más reciente a más antigua
    return list.sort((a, b) => {
      const timeA = a.stay.endTime ? new Date(a.stay.endTime).getTime() : new Date(a.stay.startTime).getTime();
      const timeB = b.stay.endTime ? new Date(b.stay.endTime).getTime() : new Date(b.stay.startTime).getTime();
      return timeB - timeA;
    });
  }, [currentShift, completedStays, rooms]);

  // Consumos extras de este turno
  const shiftExtras = useMemo(() => {
    if (!currentShift) return [];
    const shiftStart = new Date(currentShift.startTime).getTime();
    const shiftEnd = currentShift.endTime ? new Date(currentShift.endTime).getTime() : Infinity;

    return extraConsumptions.filter((ec) => {
      if (ec.shiftId && ec.shiftId === currentShift.id) return true;
      const t = new Date(ec.date).getTime();
      return ec.registeredById === currentShift.receptionistId && t >= shiftStart && t <= shiftEnd;
    });
  }, [currentShift, extraConsumptions]);

  // Consumos de personal de este turno
  const shiftStaffCons = useMemo(() => {
    if (!currentShift) return [];
    const shiftStart = new Date(currentShift.startTime).getTime();
    const shiftEnd = currentShift.endTime ? new Date(currentShift.endTime).getTime() : Infinity;

    return staffConsumptions.filter((sc) => {
      if (sc.shiftId && sc.shiftId === currentShift.id) return true;
      const t = new Date(sc.date).getTime();
      return t >= shiftStart && t <= shiftEnd;
    });
  }, [currentShift, staffConsumptions]);

  // Egresos del turno
  const shiftExpenses = useMemo(() => {
    if (!currentShift) return [];
    const shiftStart = new Date(currentShift.startTime).getTime();
    const shiftEnd = currentShift.endTime ? new Date(currentShift.endTime).getTime() : Infinity;

    return expenses.filter((e) => {
      if (e.shiftId && e.shiftId === currentShift.id) return true;
      const t = new Date(e.timestamp).getTime();
      return t >= shiftStart && t <= shiftEnd;
    });
  }, [currentShift, expenses]);

  // Ingresos del turno actual (alquileres, vueltos, cambio, etc.)
  const shiftIncomes = useMemo(() => {
    if (!currentShift) return [];
    const shiftStart = new Date(currentShift.startTime).getTime();
    const shiftEnd = currentShift.endTime ? new Date(currentShift.endTime).getTime() : Infinity;

    return (incomes || []).filter((inc) => {
      if (inc.shiftId && inc.shiftId === currentShift.id) return true;
      const t = new Date(inc.timestamp).getTime();
      return inc.registeredById === currentShift.receptionistId && t >= shiftStart && t <= shiftEnd;
    });
  }, [currentShift, incomes]);

  const incomesCash = useMemo(() => {
    return shiftIncomes
      .filter((inc) => inc.paymentMethod === 'efectivo')
      .reduce((sum, inc) => sum + inc.amount, 0);
  }, [shiftIncomes]);

  if (!isOpen || !currentShift) return null;

  const initialFloat = currentShift.initialCashFloat || 100;
  const cashSales = currentShift.expectedCash || 0;
  const totalIncomesCash = currentShift.totalIncomesCash !== undefined ? currentShift.totalIncomesCash : incomesCash;
  const operationalExpensesCash = currentShift.operationalExpensesCash || 0;
  const expectedCashInDrawer = Math.max(0, initialFloat + cashSales + totalIncomesCash - operationalExpensesCash);

  const qrVendis = currentShift.expectedQrVendis || 0;
  const qrUnion = currentShift.expectedQrUnion || 0;
  const qrTotal = currentShift.expectedQr || (qrVendis + qrUnion);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Desglose de Caja en Vivo
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Turno Activo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {currentShift.receptionistName} • Iniciado: {formatDateTime(currentShift.startTime)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              title="Imprimir desglose de caja"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body content scrollable */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Main Formula & Totals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Fondo Inicial */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
                <span>Caja Chica Inicial</span>
                <Landmark className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-xl font-black font-mono text-slate-800">
                {formatBs(initialFloat)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Fondo recibido al iniciar</span>
            </div>

            {/* 2. Ventas Efectivo */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold mb-1">
                <span>(+) Ventas Efectivo</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xl font-black font-mono text-emerald-700">
                +{formatBs(cashSales)}
              </span>
              <span className="text-[10px] text-emerald-600/80 mt-1">Habitaciones + extras</span>
            </div>

            {/* 3. Otros Ingresos Efectivo */}
            <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-teal-800 text-xs font-semibold mb-1">
                <span>(+) Otros Ingresos</span>
                <ArrowDownLeft className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-xl font-black font-mono text-teal-700">
                +{formatBs(totalIncomesCash)}
              </span>
              <span className="text-[10px] text-teal-600/80 mt-1">Alquiler / vueltos / cambio</span>
            </div>

            {/* 4. Gastos Efectivo */}
            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between">
              <div className="flex items-center justify-between text-rose-800 text-xs font-semibold mb-1">
                <span>(-) Gastos Efectivo</span>
                <MinusCircle className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-xl font-black font-mono text-rose-700">
                -{formatBs(operationalExpensesCash)}
              </span>
              <span className="text-[10px] text-rose-600/80 mt-1">Egresos pagados de caja</span>
            </div>

            {/* 5. TOTAL QUE DEBE HABER EN GAVETA AHORA */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-700/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-100 text-xs font-semibold mb-1">
                <span>= EN GAVETA AHORA</span>
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
              </div>
              <span className="text-2xl font-black font-mono text-white tracking-tight">
                {formatBs(expectedCashInDrawer)}
              </span>
              <span className="text-[10px] text-emerald-100/90 mt-1">
                Fondo + Ventas + Ing. - Gastos
              </span>
            </div>
          </div>

          {/* QR Summary Row */}
          <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-sky-950 uppercase tracking-wide block">
                  Cobros por Código QR (Bancos)
                </span>
                <span className="text-[11px] text-sky-700">
                  Comprobantes digitales recibidos (no van en la gaveta física)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6">
              <div>
                <span className="text-[10px] text-purple-700 font-bold uppercase block">QR Vendis</span>
                <span className="text-sm font-black font-mono text-purple-900">{formatBs(qrVendis)}</span>
              </div>
              <div className="h-6 w-px bg-sky-200" />
              <div>
                <span className="text-[10px] text-blue-700 font-bold uppercase block">QR B. Unión</span>
                <span className="text-sm font-black font-mono text-blue-900">{formatBs(qrUnion)}</span>
              </div>
              <div className="h-6 w-px bg-sky-200" />
              <div>
                <span className="text-[10px] text-sky-800 font-bold uppercase block">Total QR</span>
                <span className="text-base font-black font-mono text-sky-900">{formatBs(qrTotal)}</span>
              </div>
            </div>
          </div>

          {/* Tabs Selector */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'rooms'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>Habitaciones ({shiftStays.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('extras')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'extras'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Ventas Mostrador / Extras ({shiftExtras.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'staff'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Consumos Personal ({shiftStaffCons.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'expenses'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Gastos ({shiftExpenses.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('incomes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === 'incomes'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Ingresos a Caja ({shiftIncomes.length})</span>
            </button>
          </div>

          {/* Tab 1: Habitaciones */}
          {activeTab === 'rooms' && (
            <div className="space-y-3">
              {shiftStays.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <BedDouble className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    Aún no hay habitaciones registradas ni cobradas en este turno.
                  </p>
                </div>
              ) : (
                shiftStays.map(({ stay, contribution }) => {
                  const room = rooms.find((r) => r.id === stay.roomId);
                  const roomNum = stay.roomName || room?.number || '??';
                  const roomType = stay.roomType || room?.type || 'simple';

                  return (
                    <div
                      key={stay.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-brand-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                          {roomNum}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-800">
                              Habitación {roomNum}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold uppercase">
                              {getRoomTypeLabel(roomType)}
                            </span>
                            {stay.status === 'completed' ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                                Salida completada
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                                En curso / Ocupada
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                            <span>Ingreso: {formatTimeOnly(stay.startTime)}</span>
                            {stay.endTime && (
                              <>
                                <span>•</span>
                                <span>Salida: {formatTimeOnly(stay.endTime)}</span>
                              </>
                            )}
                            {stay.vehiclePlate && (
                              <>
                                <span>•</span>
                                <span className="font-mono font-semibold text-slate-700">Placa: {stay.vehiclePlate}</span>
                              </>
                            )}
                          </div>

                          {/* Detalle de conceptos cobrados */}
                          <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                            {contribution.isEntryInThisShift && contribution.prepTotal > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                Prepago: {formatBs(contribution.prepTotal)}
                              </span>
                            )}
                            {contribution.consCash + contribution.consVendis + contribution.consUnion > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">
                                Consumos en curso: {formatBs(contribution.consCash + contribution.consVendis + contribution.consUnion)}
                              </span>
                            )}
                            {contribution.isCheckoutInThisShift && contribution.finalTotal > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                                Saldo Salida: {formatBs(contribution.finalTotal)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Montos aportados por canal en este turno */}
                      <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 gap-1 shrink-0">
                        {contribution.shiftCash > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-semibold">Efectivo:</span>
                            <span className="text-xs font-black font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              +{formatBs(contribution.shiftCash)}
                            </span>
                          </div>
                        )}
                        {contribution.shiftQrVendis > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-semibold">QR Vendis:</span>
                            <span className="text-xs font-black font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                              +{formatBs(contribution.shiftQrVendis)}
                            </span>
                          </div>
                        )}
                        {contribution.shiftQrUnion > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-semibold">QR Unión:</span>
                            <span className="text-xs font-black font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                              +{formatBs(contribution.shiftQrUnion)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">Total Turno:</span>
                          <span className="text-sm font-black font-mono text-slate-900">
                            {formatBs(contribution.shiftTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Ventas Extras / Mostrador */}
          {activeTab === 'extras' && (
            <div className="space-y-3">
              {shiftExtras.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    No hay ventas directas ni consumos extras en este turno.
                  </p>
                </div>
              ) : (
                shiftExtras.map((ec) => (
                  <div
                    key={ec.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{ec.description}</span>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(ec.date)} • Registrado por: {ec.registeredByName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black font-mono text-emerald-700 block">
                        +{formatBs(ec.totalAmount)}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        {getPaymentMethodLabel(ec.paymentMethod)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Consumos Personal */}
          {activeTab === 'staff' && (
            <div className="space-y-3">
              {shiftStaffCons.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Coffee className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    No hay consumos de personal registrados en este turno.
                  </p>
                </div>
              ) : (
                shiftStaffCons.map((sc) => (
                  <div
                    key={sc.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{sc.staffName}</span>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(sc.date)} • {sc.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black font-mono text-slate-800 block">
                        {formatBs(sc.totalAmount)}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          sc.isPaid ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {sc.isPaid
                          ? `Pagado (${getPaymentMethodLabel(sc.paymentMethod || 'efectivo')})`
                          : 'Descuento Semanal'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 4: Gastos */}
          {activeTab === 'expenses' && (
            <div className="space-y-3">
              {shiftExpenses.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    No hay gastos ni retiros registrados en este turno.
                  </p>
                </div>
              ) : (
                shiftExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">{exp.description}</span>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(exp.timestamp)} • Categoría: {exp.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black font-mono text-rose-700 block">
                        -{formatBs(exp.amount)}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        {getPaymentMethodLabel(exp.paymentMethod)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 5: Ingresos a Caja */}
          {activeTab === 'incomes' && (
            <div className="space-y-3">
              {shiftIncomes.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <ArrowDownLeft className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    No se han registrado otros ingresos (alquileres, vueltos, dinero para cambio) en este turno.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-semibold">
                    <span>Lista de Ingresos Registrados ({shiftIncomes.length})</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      Total Efectivo a Gaveta: +{formatBs(incomesCash)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {shiftIncomes.map((inc) => (
                      <div
                        key={inc.id}
                        className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <strong className="text-slate-900 font-black text-xs block">
                              {inc.description}
                            </strong>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {inc.category === 'alquiler'
                                  ? 'Alquiler'
                                  : inc.category === 'cambio_compras'
                                  ? 'Cambio de Compras'
                                  : inc.category === 'dinero_para_cambio'
                                  ? 'Dinero para Cambio'
                                  : inc.category === 'ingreso_extra'
                                  ? 'Ingreso Extra'
                                  : 'Otros'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {getPaymentMethodLabel(inc.paymentMethod)}
                              </span>
                              {inc.receiptNumber && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Recibo #{inc.receiptNumber}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono font-black text-emerald-700 text-sm shrink-0">
                            +{formatBs(inc.amount)}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Registrado: {formatTimeOnly(inc.timestamp)}</span>
                          {inc.registeredByName && <span>Por: {inc.registeredByName}</span>}
                        </div>
                        {inc.notes && (
                          <p className="text-[10px] italic text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            "{inc.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Cálculo puro en tiempo real sin acumuladores en memoria</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            Cerrar Vista
          </button>
        </div>
      </div>
    </div>
  );
};
