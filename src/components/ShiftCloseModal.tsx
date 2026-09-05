import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getNetworkIsoString } from '../services/firebase';
import { formatBs, getRoomTypeLabel } from '../utils/formatUtils';
import { formatDateTime, formatTimeOnly } from '../utils/timeUtils';
import {
  X,
  DollarSign,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  Lock,
  LogOut,
  UserCheck,
  Coins,
  ArrowRightLeft,
  BedDouble,
  Info,
  ShieldAlert,
  Edit3,
  Receipt,
  MinusCircle,
  Landmark,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  Sparkles,
  Camera,
  ArrowLeft,
} from 'lucide-react';
import { SYSTEM_USERS } from '../data/initialData';

interface ShiftCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShiftCloseModal: React.FC<ShiftCloseModalProps> = ({ isOpen, onClose }) => {
  const { currentShift, currentUser, closeCurrentShift, rooms, staffMembers } = useApp();

  // Paso actual: 1 = Conteo ciego, 2 = Cuadre (para captura) y distribución de efectivo
  const [step, setStep] = useState<1 | 2>(1);

  // Paso 1: Relevo y Conteo Físico
  const [responsibleName, setResponsibleName] = useState<string>('');
  const [nextReceptionistName, setNextReceptionistName] = useState<string>('');
  const [totalPhysicalCash, setTotalPhysicalCash] = useState<string>('');
  const [declaredQrVendis, setDeclaredQrVendis] = useState<string>('');
  const [declaredQrUnion, setDeclaredQrUnion] = useState<string>('');

  // Paso 2: Distribución de efectivo y observaciones
  const [handoverFloat, setHandoverFloat] = useState<string>('100');
  const [cashDeliveredAtClose, setCashDeliveredAtClose] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializar nombres y fondo inicial al abrir
  useEffect(() => {
    if (currentShift) {
      setResponsibleName(currentShift.responsiblePersonName || currentShift.receptionistName || currentUser.name);
      const initFloat = currentShift.initialCashFloat !== undefined ? currentShift.initialCashFloat : 100;
      setHandoverFloat(initFloat.toString());

      const defaultNext =
        currentShift.receptionistId === 'user-recep-dia'
          ? 'Recepcionista Noche'
          : 'Recepcionista Día';
      setNextReceptionistName(defaultNext);
      setStep(1);
    }
  }, [currentShift, currentUser, isOpen]);

  if (!isOpen || !currentShift) return null;

  const initialFloat = currentShift.initialCashFloat || 100;
  const expectedCashSales = currentShift.expectedCash || 0;
  const expectedQrVendis = currentShift.expectedQrVendis || 0;
  const expectedQrUnion = currentShift.expectedQrUnion || 0;
  const expectedQrTotal = currentShift.expectedQr || (expectedQrVendis + expectedQrUnion);
  const totalShiftExpensesCash = currentShift.totalExpensesCash || 0;

  // Efectivo que DEBERÍA haber físicamente en la gaveta antes de separar sobre
  // Fondo Inicial + Ventas Efectivo - Pagos/Gastos Efectivo
  const expectedCashInDrawer = Math.max(0, initialFloat + expectedCashSales - totalShiftExpensesCash);

  // Valores numéricos del conteo declarado en Paso 1
  const numTotalPhysicalCash = parseFloat(totalPhysicalCash) || 0;
  const numDeclaredQrVendis = parseFloat(declaredQrVendis) || 0;
  const numDeclaredQrUnion = parseFloat(declaredQrUnion) || 0;
  const numDeclaredQrTotal = numDeclaredQrVendis + numDeclaredQrUnion;

  // Diferencias exactas
  const diffCash = numTotalPhysicalCash - expectedCashInDrawer;
  const diffQrVendis = numDeclaredQrVendis - expectedQrVendis;
  const diffQrUnion = numDeclaredQrUnion - expectedQrUnion;
  const diffQr = numDeclaredQrTotal - expectedQrTotal;
  const totalDiff = diffCash + (diffQrVendis !== 0 || diffQrUnion !== 0 ? (diffQrVendis + diffQrUnion) : diffQr);

  const isExact = Math.abs(totalDiff) <= 0.01;
  const hasDeficit = totalDiff < -0.01;
  const hasSurplus = totalDiff > 0.01;
  const discountAmt = hasDeficit ? Math.abs(totalDiff) : 0;
  const surplusAmt = hasSurplus ? totalDiff : 0;

  // Valores numéricos de distribución en Paso 2
  const numHandoverFloat = parseFloat(handoverFloat) || 0;
  const numCashDelivered = parseFloat(cashDeliveredAtClose) || 0;
  const totalDistributedCash = numHandoverFloat + numCashDelivered;
  const distributionDiff = totalDistributedCash - numTotalPhysicalCash;
  const isDistributionBalanced = Math.abs(distributionDiff) <= 0.01;

  // Ir al Paso 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsibleName.trim()) {
      alert('Por favor indica quién está entregando la caja.');
      return;
    }
    if (!nextReceptionistName.trim()) {
      alert('Por favor indica quién está recibiendo la caja.');
      return;
    }
    if (totalPhysicalCash.trim() === '') {
      alert('Por favor ingresa el monto total de efectivo contado en gaveta (puede ser 0 si no hay dinero).');
      return;
    }

    // Pre-llenar distribución sugerida: caja chica = fondo inicial, sobre = resto
    const defaultFloat = Math.min(initialFloat, numTotalPhysicalCash);
    const defaultSobre = Math.max(0, numTotalPhysicalCash - defaultFloat);
    setHandoverFloat(defaultFloat.toString());
    setCashDeliveredAtClose(defaultSobre.toString());

    setStep(2);
  };

  // Confirmar Cierre Final
  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    closeCurrentShift(
      responsibleName.trim(),
      nextReceptionistName.trim(),
      numTotalPhysicalCash,
      numDeclaredQrVendis,
      numDeclaredQrUnion,
      numHandoverFloat,
      notes.trim() || undefined,
      numCashDelivered
    );

    setIsSubmitting(false);
    onClose();
    setStep(1);
    setTotalPhysicalCash('');
    setCashDeliveredAtClose('');
    setDeclaredQrVendis('');
    setDeclaredQrUnion('');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-in my-auto">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-rose-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-bold shadow-inner shrink-0">
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {step === 1 ? 'Cierre de Caja y Relevo de Turno' : 'Comprobante de Arqueo y Distribución'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-rose-200 font-medium">
                  {currentShift.receptionistName} • {currentShift.shiftType === 'noche' ? '🌙 Turno Noche' : '☀️ Turno Día'}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white uppercase">
                  Paso {step} de 2
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* PASO 1: CONTEO FÍSICO CIEGO EN GAVETA */}
        {/* ========================================================= */}
        {step === 1 && (
          <form onSubmit={handleProceedToStep2} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs">
            {/* Aviso de Conteo Ciego */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-amber-950 text-xs sm:text-sm">
                  Paso 1: Conteo Ciego de Caja
                </strong>
                <span className="text-[11px] text-amber-800">
                  Cuenta físicamente todo el efectivo y vouchers QR que tienes en caja. Al registrar los montos, pasarás a la siguiente ventana donde verás si la caja está cuadrada para sacar la captura de comprobante.
                </span>
              </div>
            </div>

            {/* Relevo de Personas */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-brand-600" />
                Personas Responsables del Relevo
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs">
                    Persona que Entrega la Caja <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Rosario"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block text-xs">
                    Persona que Recibe la Caja <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Estela / Catalina"
                    value={nextReceptionistName}
                    onChange={(e) => setNextReceptionistName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Conteo de Efectivo en Gaveta */}
            <div className="bg-emerald-50/60 p-4 rounded-2xl border-2 border-emerald-300 space-y-2">
              <label className="font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5 text-xs sm:text-sm">
                <Coins className="w-4 h-4 text-emerald-600" />
                Efectivo Total Contado en Gaveta (Bs) <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-emerald-850">
                Cuenta absolutamente <strong>todo el dinero en billetes y monedas</strong> que hay en la gaveta en este momento, antes de apartar el sobre o cambio.
              </p>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0.00"
                  value={totalPhysicalCash}
                  onChange={(e) => setTotalPhysicalCash(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 rounded-xl border-2 border-emerald-400 font-mono font-black text-lg text-slate-900 bg-white focus:outline-none focus:border-emerald-600 shadow-inner"
                  autoFocus
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-sm">
                  Bs
                </span>
              </div>
            </div>

            {/* Conteo de Comprobantes QR */}
            <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-200 space-y-3">
              <span className="font-extrabold text-sky-950 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                <QrCode className="w-4 h-4 text-sky-600" />
                Comprobantes / Vouchers QR Recaudados en Turno
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-xs block">
                    Total QR Vendis (Bs)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={declaredQrVendis}
                      onChange={(e) => setDeclaredQrVendis(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-sky-300 font-mono font-bold text-sm bg-white focus:outline-none focus:border-sky-500"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                      Bs
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Comprobantes cobrados por Vendis</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 text-xs block">
                    Total QR Banco Unión (Bs)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={declaredQrUnion}
                      onChange={(e) => setDeclaredQrUnion(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-sky-300 font-mono font-bold text-sm bg-white focus:outline-none focus:border-sky-500"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                      Bs
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Transferencias y QR Banco Unión</span>
                </div>
              </div>
            </div>

            {/* Botón de Continuar a Paso 2 */}
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
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-brand-600/20 transition-all flex items-center gap-2"
              >
                <span>Registrar Conteo y Ver Cuadre</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* PASO 2: RESULTADOS DEL CUADRE (CAPTURA) Y DISTRIBUCIÓN */}
        {/* ========================================================= */}
        {step === 2 && (
          <form onSubmit={handleConfirmClose} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs">
            {/* COMPROBANTE LISTO PARA CAPTURA DE PANTALLA */}
            <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl border-2 border-slate-800 space-y-3.5 relative overflow-hidden">
              {/* Marca de agua decorativa */}
              <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
                <Receipt className="w-44 h-44 text-white" />
              </div>

              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-300 block">
                    Motel Mon Amour • Comprobante de Arqueo
                  </span>
                  <strong className="text-sm sm:text-base font-black tracking-tight block text-white">
                    Relevo de Turno: {currentShift.shiftType === 'noche' ? '🌙 Noche' : '☀️ Día'}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Fecha y Hora</span>
                  <strong className="text-xs font-mono text-slate-200">{formatDateTime(getNetworkIsoString())}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 border-b border-white/10 pb-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Entrega Caja:</span>
                  <strong className="text-white font-bold">{responsibleName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Recibe Caja:</span>
                  <strong className="text-white font-bold">{nextReceptionistName}</strong>
                </div>
              </div>

              {/* Comparador Efectivo */}
              <div className="space-y-1 text-slate-300 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Fondo Inicial de Turno (Caja Chica):</span>
                  <strong className="font-mono text-slate-200">{formatBs(initialFloat)}</strong>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-emerald-400 font-medium">(+) Ventas del Turno en Efectivo:</span>
                  <strong className="font-mono text-emerald-400">+{formatBs(expectedCashSales)}</strong>
                </div>
                {totalShiftExpensesCash > 0 && (
                  <div className="flex justify-between py-0.5">
                    <span className="text-rose-400 font-medium">(-) Pagos / Gastos en Efectivo:</span>
                    <strong className="font-mono text-rose-400">-{formatBs(totalShiftExpensesCash)}</strong>
                  </div>
                )}
                <div className="flex justify-between py-1 border-t border-white/10 text-slate-200 font-bold">
                  <span>= Efectivo que DEBÍA haber en caja:</span>
                  <strong className="font-mono text-white text-sm">{formatBs(expectedCashInDrawer)}</strong>
                </div>
                <div className="flex justify-between py-1 bg-white/5 px-2.5 rounded-xl text-white font-bold">
                  <span>TOTAL DECLARADO EN CONTEO:</span>
                  <strong className="font-mono text-emerald-300 text-sm">{formatBs(numTotalPhysicalCash)}</strong>
                </div>
              </div>

              {/* Comparador QR */}
              {(expectedQrTotal > 0 || numDeclaredQrTotal > 0) && (
                <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[10px] text-sky-300 block font-bold">QR Vendis</span>
                    <div className="flex justify-between font-mono">
                      <span>Esp: {formatBs(expectedQrVendis)}</span>
                      <span className="text-white font-bold">Dec: {formatBs(numDeclaredQrVendis)}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-[10px] text-indigo-300 block font-bold">QR Banco Unión</span>
                    <div className="flex justify-between font-mono">
                      <span>Esp: {formatBs(expectedQrUnion)}</span>
                      <span className="text-white font-bold">Dec: {formatBs(numDeclaredQrUnion)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* GRAN BANNER DE ESTADO DEL ARQUEO */}
              <div
                className={`p-3.5 rounded-2xl text-center border-2 transition-all shadow-md ${
                  isExact
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : hasDeficit
                    ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                    : 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {isExact ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : hasDeficit ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                  )}
                  <strong className="text-sm sm:text-base font-black uppercase tracking-wide">
                    {isExact
                      ? '✅ CAJA CUADRADA EXACTA (0.00 Bs)'
                      : hasDeficit
                      ? `🔴 FALTANTE EN CAJA: -${formatBs(discountAmt)}`
                      : `🟢 DEMASÍA / SOBRANTE: +${formatBs(surplusAmt)}`}
                  </strong>
                </div>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {isExact
                    ? 'El dinero físico en gaveta coincide exactamente con las ventas y gastos del sistema.'
                    : hasDeficit
                    ? 'Atención: Hay un faltante de dinero sobre lo registrado. Saca captura de este reporte.'
                    : 'Hay un excedente en caja sobre lo registrado por el sistema.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 pt-1">
                <Camera className="w-3.5 h-3.5 text-rose-300" />
                <span>📸 Saca captura de pantalla de este cuadro para enviar al grupo de administración</span>
              </div>
            </div>

            {/* DISTRIBUCIÓN DEL EFECTIVO CONTADO */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-3xl border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Distribución del Efectivo Contado ({formatBs(numTotalPhysicalCash)})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Indica cuánto de este dinero guardas en sobre para el dueño y cuánto dejas en gaveta para el relevo.
                  </p>
                </div>
              </div>

              {/* Botones rápidos de distribución */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fl = Math.min(100, numTotalPhysicalCash);
                    setHandoverFloat(fl.toString());
                    setCashDeliveredAtClose(Math.max(0, numTotalPhysicalCash - fl).toString());
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  ⚡ Dejar 100 Bs en caja chica y resto en sobre
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fl = Math.min(initialFloat, numTotalPhysicalCash);
                    setHandoverFloat(fl.toString());
                    setCashDeliveredAtClose(Math.max(0, numTotalPhysicalCash - fl).toString());
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  ⚡ Dejar fondo inicial ({formatBs(initialFloat)}) en caja chica
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHandoverFloat(numTotalPhysicalCash.toString());
                    setCashDeliveredAtClose('0');
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors"
                >
                  ⚡ Todo a caja chica (0 en sobre)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1. Efectivo en Sobre */}
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border-2 border-amber-300 space-y-1">
                  <label className="font-extrabold text-amber-950 block text-xs">
                    1. Efectivo en SOBRE para Administración / Dueño (Bs)
                  </label>
                  <span className="text-[10px] text-amber-800 block">
                    Dinero retirado en sobre para entregar a Marco.
                  </span>
                  <div className="relative pt-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={cashDeliveredAtClose}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCashDeliveredAtClose(val);
                        const num = parseFloat(val) || 0;
                        if (num <= numTotalPhysicalCash) {
                          setHandoverFloat(Math.max(0, numTotalPhysicalCash - num).toString());
                        }
                      }}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border-2 border-amber-400 font-mono font-black text-base text-slate-900 bg-white focus:outline-none focus:border-amber-600"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                      Bs
                    </span>
                  </div>
                </div>

                {/* 2. Caja Chica dejada */}
                <div className="bg-emerald-50/70 p-3.5 rounded-2xl border-2 border-emerald-300 space-y-1">
                  <label className="font-extrabold text-emerald-950 block text-xs">
                    2. Caja Chica que se queda en GAVETA (Bs)
                  </label>
                  <span className="text-[10px] text-emerald-800 block">
                    Fondo de cambio entregado físicamente al relevo.
                  </span>
                  <div className="relative pt-1">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={handoverFloat}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHandoverFloat(val);
                        const num = parseFloat(val) || 0;
                        if (num <= numTotalPhysicalCash) {
                          setCashDeliveredAtClose(Math.max(0, numTotalPhysicalCash - num).toString());
                        }
                      }}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border-2 border-emerald-400 font-mono font-black text-base text-slate-900 bg-white focus:outline-none focus:border-emerald-600"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs">
                      Bs
                    </span>
                  </div>
                </div>
              </div>

              {/* Indicador de suma de distribución */}
              <div
                className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-between ${
                  isDistributionBalanced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <span>
                  Sobre ({formatBs(numCashDelivered)}) + Caja Chica ({formatBs(numHandoverFloat)}) = <strong>{formatBs(totalDistributedCash)}</strong>
                </span>
                <span>
                  {isDistributionBalanced ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Cuadra con total contado ({formatBs(numTotalPhysicalCash)})
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      Dif: {distributionDiff > 0 ? '+' : ''}{formatBs(distributionDiff)} vs contado ({formatBs(numTotalPhysicalCash)})
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Observaciones Opcionales */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block text-xs">
                Observaciones del Cierre (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Se dejó el sobre en administración..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver a corregir conteo</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Cerrando turno...' : 'Confirmar Cierre y Relevar Turno'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
