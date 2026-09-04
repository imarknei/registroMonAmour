import React, { useState, useEffect } from 'react';
import { Shift, Expense } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatBs, getPaymentMethodLabel, getExpenseCategoryLabel } from '../../utils/formatUtils';
import { formatDateTime, formatDateOnly } from '../../utils/timeUtils';
import {
  X,
  ShieldCheck,
  Coins,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  QrCode,
  Sparkles,
  Receipt,
  UserCheck,
  Calendar,
  Save,
  ArrowRight,
} from 'lucide-react';

interface ShiftAdjustmentModalProps {
  shift: Shift | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ShiftAdjustmentModal: React.FC<ShiftAdjustmentModalProps> = ({
  shift,
  isOpen,
  onClose,
  onSaved,
}) => {
  const { updateShiftInHistory, expenses } = useApp();

  const [handoverCashFloat, setHandoverCashFloat] = useState<string>('100');
  const [totalPhysicalCashInDrawer, setTotalPhysicalCashInDrawer] = useState<string>('100');
  const [cashDeliveredAtClose, setCashDeliveredAtClose] = useState<string>('0');
  const [declaredQrVendis, setDeclaredQrVendis] = useState<string>('0');
  const [declaredQrUnion, setDeclaredQrUnion] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (shift) {
      const startingFloat = shift.initialCashFloat !== undefined ? shift.initialCashFloat : 100;
      const handover = shift.handoverCashFloat !== undefined ? shift.handoverCashFloat : startingFloat;
      setHandoverCashFloat(handover.toString());

      // Si ya tenía cashDeliveredAtClose registrado, usarlo; si no, por defecto 0
      const delivered = shift.cashDeliveredAtClose || 0;
      setCashDeliveredAtClose(delivered.toString());

      // Dinero físico en gaveta
      const physical = shift.totalPhysicalCashInDrawer !== undefined ? shift.totalPhysicalCashInDrawer : handover;
      setTotalPhysicalCashInDrawer(physical.toString());

      setDeclaredQrVendis((shift.declaredQrVendis || shift.expectedQrVendis || 0).toString());
      setDeclaredQrUnion((shift.declaredQrUnion || shift.expectedQrUnion || 0).toString());
      setNotes(shift.notes || '');
    }
  }, [shift]);

  if (!isOpen || !shift) return null;

  // Cálculos dinámicos
  const startingFloat = shift.initialCashFloat !== undefined ? shift.initialCashFloat : 100;
  const expectedSalesCash = shift.expectedCash || 0;
  const expectedSalesQrVendis = shift.expectedQrVendis || 0;
  const expectedSalesQrUnion = shift.expectedQrUnion || 0;
  const expectedSalesQrTotal = shift.expectedQr || (expectedSalesQrVendis + expectedSalesQrUnion);

  // Gastos operativos en efectivo (excluyendo el retiro para no duplicar)
  const existingDelivered = shift.cashDeliveredAtClose || 0;
  let operationalExpensesCash = shift.totalExpensesCash || 0;
  if (existingDelivered > 0 && operationalExpensesCash >= existingDelivered) {
    operationalExpensesCash -= existingDelivered;
  }

  const numHandoverFloat = parseFloat(handoverCashFloat) || 0;
  const numPhysicalInDrawer = parseFloat(totalPhysicalCashInDrawer) || 0;
  const numCashDelivered = parseFloat(cashDeliveredAtClose) || 0;
  const numQrVendis = parseFloat(declaredQrVendis) || 0;
  const numQrUnion = parseFloat(declaredQrUnion) || 0;
  const numQrTotal = numQrVendis + numQrUnion;

  // Efectivo que DEBERÍA haber en caja antes de apartar el sobre
  const expectedCashInDrawer = Math.max(0, startingFloat + expectedSalesCash - operationalExpensesCash);

  // Efectivo físico contado (si totalPhysicalCashInDrawer ya incluye todo el dinero, o si se sumó caja chica + sobre):
  const effectiveCountedCash = Math.max(
    numPhysicalInDrawer,
    numHandoverFloat + numCashDelivered
  );
  const diffCash = effectiveCountedCash - expectedCashInDrawer;

  // Cotejo de QR
  const diffQrVendis = numQrVendis - expectedSalesQrVendis;
  const diffQrUnion = numQrUnion - expectedSalesQrUnion;
  const diffQr = numQrTotal - expectedSalesQrTotal;

  const totalDiff = diffCash + (diffQrVendis !== 0 || diffQrUnion !== 0 ? (diffQrVendis + diffQrUnion) : diffQr);
  const hasDeficit = totalDiff < -0.01;
  const hasSurplus = totalDiff > 0.01;
  const isExact = Math.abs(totalDiff) <= 0.01;

  // Acciones Rápidas
  const handleQuickBalanceSales = () => {
    // Asentar retiro igual a las ventas en efectivo y total contado = caja chica + sobre
    setCashDeliveredAtClose(expectedSalesCash.toString());
    setTotalPhysicalCashInDrawer((numHandoverFloat + expectedSalesCash).toString());
  };

  const handleQuickBalanceQR = () => {
    setDeclaredQrVendis(expectedSalesQrVendis.toString());
    setDeclaredQrUnion(expectedSalesQrUnion.toString());
  };

  const handleQuickBalanceAll = () => {
    handleQuickBalanceSales();
    handleQuickBalanceQR();
    if (!notes.includes('Asentado retiro de ventas')) {
      const noteAddition = 'Ajuste de auditoría: Asentado retiro de ventas en efectivo por entrega a administración.';
      setNotes((prev) => (prev ? `${prev} | ${noteAddition}` : noteAddition));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const success = updateShiftInHistory(shift.id, {
      handoverCashFloat: numHandoverFloat,
      totalPhysicalCashInDrawer: numPhysicalInDrawer,
      cashDeliveredAtClose: numCashDelivered,
      declaredQrVendis: numQrVendis,
      declaredQrUnion: numQrUnion,
      declaredQr: numQrTotal,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);
    if (success) {
      if (onSaved) onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-in my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-rose-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold shadow-inner shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Auditoría y Ajuste de Arqueo / Retiros
              </h2>
              <p className="text-[11px] sm:text-xs text-rose-200 font-medium">
                {shift.receptionistName} • {shift.shiftType === 'noche' ? '🌙 Turno Noche' : '☀️ Turno Día'} • {formatDateTime(shift.endTime || shift.startTime)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {/* Resumen del Sistema */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-extrabold uppercase text-slate-600 tracking-wider text-[11px]">
                Datos Registrados por el Sistema en el Turno
              </span>
              <span className="font-mono font-bold text-slate-500">
                Fondo Inicial: {formatBs(startingFloat)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Ventas Efec.</span>
                <strong className="text-emerald-700 font-mono text-sm">+{formatBs(expectedSalesCash)}</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">QR Vendis</span>
                <strong className="text-sky-700 font-mono text-sm">+{formatBs(expectedSalesQrVendis)}</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">QR B. Unión</span>
                <strong className="text-indigo-700 font-mono text-sm">+{formatBs(expectedSalesQrUnion)}</strong>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Gastos Operativos</span>
                <strong className="text-rose-600 font-mono text-sm">-{formatBs(operationalExpensesCash)}</strong>
              </div>
            </div>
          </div>

          {/* Botón de Cuadre Instantáneo */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <strong className="text-amber-950 font-black block text-xs">
                ¿Este turno entregó todo el efectivo de ventas a administración en sobre?
              </strong>
              <span className="text-[11px] text-amber-800">
                Aplica con 1 clic el retiro de {formatBs(expectedSalesCash)} y cuadra el arqueo exactamente a 0.00 Bs.
              </span>
            </div>
            <button
              type="button"
              onClick={handleQuickBalanceAll}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>⚡ Cuadrar Turno Instantáneamente</span>
            </button>
          </div>

          {/* Formulario de Campos Editables */}
          <div className="space-y-4">
            {/* 1. Retiro / Entrega de Efectivo a Administración */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border-2 border-emerald-300 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Efectivo Retirado / Entregado a Administración (Bs)
                </label>
                <button
                  type="button"
                  onClick={handleQuickBalanceSales}
                  className="text-[10px] font-bold text-emerald-800 bg-white hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300 transition-colors"
                >
                  Asentar Ventas ({formatBs(expectedSalesCash)})
                </button>
              </div>
              <p className="text-[11px] text-emerald-800">
                Efectivo que el recepcionista puso en sobre, entregó a Marco o a administración al cierre.
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={cashDeliveredAtClose}
                  onChange={(e) => setCashDeliveredAtClose(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border-2 border-emerald-400 font-mono font-black text-base text-slate-900 bg-white focus:outline-none focus:border-emerald-600"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                  Bs
                </span>
              </div>
            </div>

            {/* 2. Gaveta y Caja Chica Dejada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800 block text-xs">
                  Caja Chica Dejada para Sig. Turno (Bs)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={handoverCashFloat}
                    onChange={(e) => {
                      setHandoverCashFloat(e.target.value);
                      if (totalPhysicalCashInDrawer === handoverCashFloat) {
                        setTotalPhysicalCashInDrawer(e.target.value);
                      }
                    }}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white focus:outline-none focus:border-brand-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                    Bs
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Fondo de cambio entregado al relevo</span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="font-bold text-slate-800 block text-xs">
                  Efectivo Físico Quedado en Gaveta (Bs)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={totalPhysicalCashInDrawer}
                    onChange={(e) => setTotalPhysicalCashInDrawer(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white focus:outline-none focus:border-brand-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                    Bs
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Total en caja después de realizar el retiro</span>
              </div>
            </div>

            {/* 3. Comprobantes QR Declarados */}
            <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sky-950 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                  <QrCode className="w-4 h-4 text-sky-600" />
                  Comprobantes QR Auditados
                </span>
                <button
                  type="button"
                  onClick={handleQuickBalanceQR}
                  className="text-[10px] font-bold text-sky-800 bg-white hover:bg-sky-100 px-2 py-0.5 rounded-lg border border-sky-300 transition-colors"
                >
                  Cuadrar con Ventas QR
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px] block">
                    QR Vendis (Esperado: {formatBs(expectedSalesQrVendis)})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={declaredQrVendis}
                      onChange={(e) => setDeclaredQrVendis(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-sky-300 font-mono font-bold text-sm bg-white focus:outline-none focus:border-sky-500"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                      Bs
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-[11px] block">
                    QR Banco Unión (Esperado: {formatBs(expectedSalesQrUnion)})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={declaredQrUnion}
                      onChange={(e) => setDeclaredQrUnion(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-sky-300 font-mono font-bold text-sm bg-white focus:outline-none focus:border-sky-500"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                      Bs
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block text-xs">
                Observaciones del Ajuste de Auditoría
              </label>
              <input
                type="text"
                placeholder="Ej: Retiro en sobre verificado por administración..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* AUDITORÍA EN VIVO / RESULTADO DEL AJUSTE */}
          <div
            className={`p-4 rounded-2xl border-2 space-y-2 ${
              isExact
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : hasDeficit
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                {isExact ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : hasDeficit ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                ) : (
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                )}
                Resultado del Cuadre con estos valores:
              </span>
              <span className="font-mono font-black text-sm">
                {isExact ? '0.00 Bs (CUADRADO EXACTO)' : totalDiff > 0 ? `+${formatBs(totalDiff)} (DEMASÍA)` : `-${formatBs(Math.abs(totalDiff))} (FALTANTE)`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-current/10">
              <div className="flex justify-between">
                <span>Total Efectivo Contado (Gaveta + Sobre):</span>
                <strong className="font-mono">{formatBs(effectiveCountedCash)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Efectivo que debía haber en gaveta:</span>
                <strong className="font-mono">{formatBs(expectedCashInDrawer)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Diferencia Efectivo:</span>
                <strong className="font-mono">{diffCash >= 0 ? `+${formatBs(diffCash)}` : `-${formatBs(Math.abs(diffCash))}`}</strong>
              </div>
              <div className="flex justify-between">
                <span>Diferencia QR:</span>
                <strong className="font-mono">{diffQr >= 0 ? `+${formatBs(diffQr)}` : `-${formatBs(Math.abs(diffQr))}`}</strong>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar y Cuadrar Turno'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
